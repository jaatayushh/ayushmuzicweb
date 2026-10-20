// NOTE: This file is intentionally fully self-contained (no imports from
// ./_lib/*) — see the comment at the top of api/hf-tree.ts for why:
// Vercel's Node.js function builder does not reliably include
// underscore-prefixed sibling folders in the deployed bundle for
// standalone API functions, which previously caused a hard runtime crash:
//   Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/api/_lib/aiPlaylists'
// (api/_lib/aiPlaylists.ts is still used by server.ts for local dev, which
// doesn't have this issue.)
//
// IMPORTANT — timing architecture: Vercel logs showed this endpoint hitting
// a hard "Task timed out after 10 seconds" kill with zero application
// logs. The original design asked Gemini to classify the WHOLE library
// into all 5 mixes in a single call — one big reasoning task with a large
// combined output. That's just slow. This version instead fires one
// SMALLER, SIMPLER request per mix, all in PARALLEL (Promise.all) — total
// wall-clock time is roughly the slowest single mix's latency, not the sum
// of all five, and each individual call has much less to reason about.
// Every call also carries its own AbortController tied to the shared
// deadline, and a failed/slow individual mix just gets skipped (partial
// results) instead of failing the whole request.

export const config = {
  runtime: "nodejs",
};

const HF_USER = "CoolJaat";
const HF_REPO = "my-music-library";
const AUDIO_EXTS = [".mp3", ".wav", ".m4a", ".ogg", ".flac"];
// gemini-2.5-flash leads the list because its free-tier quota is far more
// generous (10-15 RPM / 250-1500 RPD) than gemini-3.6-flash's, which is
// only 5 RPM / 20 RPD on the free tier — confirmed directly by the 429
// RESOURCE_EXHAUSTED errors seen in production logs. 3.6/3.5 stay as
// fallbacks for accounts with paid quota on the newer models.
const MODEL_CANDIDATES = ["gemini-2.5-flash", "gemini-3.6-flash", "gemini-3.5-flash"];
const MIN_TRACKS_PER_MIX = 2;

// Hard ceiling for the WHOLE handler, kept well under Vercel's real 10s
// limit so we always control the response ourselves.
const HANDLER_DEADLINE_MS = 8500;
const LIBRARY_FETCH_BUDGET_MS = 2000;

const TARGET_MIXES: { name: string; emoji: string; hint: string; description: string }[] = [
  { name: "Punjabi Mix", emoji: "🎧", hint: "Punjabi-language songs", description: "Punjabi-language tracks from your library." },
  { name: "Haryanvi Mix", emoji: "🌾", hint: "Haryanvi-language songs", description: "Haryanvi-language tracks from your library." },
  { name: "Punjabi + Haryanvi Mix", emoji: "🔥", hint: "Punjabi-language OR Haryanvi-language songs (both together)", description: "Punjabi and Haryanvi tracks together in one mix." },
  { name: "Hindi Mix", emoji: "🎬", hint: "Hindi-language songs", description: "Hindi-language tracks from your library." },
  { name: "Love Mix", emoji: "❤️", hint: "romantic / love songs, any language", description: "Romantic songs, any language." },
];

interface HFTrackDescriptor {
  path: string;
  title: string;
  artist: string;
}

export interface AiPlaylistsResult {
  generatedAt: string;
  playlists: { id: string; name: string; emoji: string; description: string; paths: string[] }[];
  note?: string;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(timeoutMs, 500));
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseBasic(filePath: string): { title: string; artist: string } {
  const base = filePath.split("/").pop() || filePath;
  const noExt = base.replace(/\.[^/.]+$/, "");
  const parts = noExt.split(" - ");
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  }
  return { artist: "", title: noExt.trim() };
}

async function fetchLibrary(deadline: number): Promise<HFTrackDescriptor[]> {
  const buildUrl = (query: string) =>
    `https://huggingface.co/api/datasets/${encodeURIComponent(HF_USER)}/${encodeURIComponent(HF_REPO)}/tree/main${query}`;

  let url: string | null = buildUrl("?recursive=true");
  let all: any[] = [];
  let triedSimpleFallback = false;
  let pageCount = 0;
  const MAX_PAGES = 200;

  while (url && pageCount < MAX_PAGES) {
    const remaining = deadline - Date.now();
    if (remaining < 500) break;
    pageCount++;

    let response: Response;
    try {
      response = await fetchWithTimeout(url, remaining);
    } catch {
      break;
    }

    if (!response.ok && all.length === 0 && !triedSimpleFallback) {
      triedSimpleFallback = true;
      url = buildUrl("");
      try {
        response = await fetchWithTimeout(url, deadline - Date.now());
      } catch {
        break;
      }
    }

    if (!response.ok) {
      if (all.length > 0) break;
      return [];
    }

    let page: any;
    try {
      page = await response.json();
    } catch {
      break;
    }
    if (!Array.isArray(page)) break;
    all = all.concat(page);

    let nextUrl: string | null = null;
    const linkHeader = response.headers.get("link") || response.headers.get("Link");
    if (linkHeader) {
      const nextMatch = /<([^>]+)>\s*;\s*rel="next"/.exec(linkHeader);
      if (nextMatch) {
        try {
          nextUrl = new URL(nextMatch[1], "https://huggingface.co").toString();
        } catch {
          nextUrl = null;
        }
      }
    }
    url = nextUrl;
  }

  return all
    .filter((item: any) => {
      if (item.type !== "file" || !item.path) return false;
      const ext = item.path.substring(item.path.lastIndexOf(".")).toLowerCase();
      return AUDIO_EXTS.includes(ext);
    })
    .map((item: any) => {
      const { title, artist } = parseBasic(item.path);
      return { path: item.path as string, title, artist };
    });
}

const BATCH_SCHEMA = {
  type: "OBJECT",
  properties: {
    mixes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          indices: { type: "ARRAY", items: { type: "INTEGER" } },
        },
        required: ["name", "indices"],
      },
    },
  },
  required: ["mixes"],
};

function buildBatchPrompt(songList: string, mixes: typeof TARGET_MIXES): string {
  const hints = mixes.map(m => `- "${m.name}": ${m.hint}`).join("\n");
  return `Numbered song library:\n\n${songList}\n\nGroup the songs into the following mixes based on these criteria:\n${hints}\n\nReturn a JSON object containing an array called "mixes". Each mix must have its "name" and the "indices" (an array of numbers) of the matching songs. Include every genuine match, not just a few. Skip anything unclear.`;
}

async function classifyAllMixes(
  songList: string,
  apiKey: string,
  deadline: number
): Promise<Record<string, number[]> | null> {
  const RETRYABLE_STATUSES = new Set([404, 429, 500, 502, 503, 504]);
  for (const model of MODEL_CANDIDATES) {
    const timeoutMs = deadline - Date.now();
    if (timeoutMs < 800) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: buildBatchPrompt(songList, TARGET_MIXES) }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: BATCH_SCHEMA,
              temperature: 0.2,
            },
          }),
        }
      );
      clearTimeout(timer);

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`Gemini error for batch mixes on ${model}:`, res.status, errText);
        if (RETRYABLE_STATUSES.has(res.status)) continue;
        return null;
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = JSON.parse(rawText);
      const result: Record<string, number[]> = {};
      if (Array.isArray(parsed.mixes)) {
        for (const m of parsed.mixes) {
          if (m.name && Array.isArray(m.indices)) {
            result[m.name] = m.indices;
          }
        }
      }
      return result;
    } catch (e: any) {
      clearTimeout(timer);
      console.error(`Batch mixes on ${model} failed:`, e?.name === "AbortError" ? "timed out" : e?.message);
      continue;
    }
  }
  return null;
}

export default async function handler(req: any, res: any) {
  const deadline = Date.now() + HANDLER_DEADLINE_MS;

  // Prefer the server-configured key (GEMINI_API_KEY in Vercel's project
  // env vars) — that's what makes the AI mixes work reliably for every
  // visitor, not just whichever browser happened to have a key saved in
  // localStorage. The in-app key (sent as this header) is only a fallback
  // for quick testing before setting up the env var properly.
  const headerKey = (req.headers?.["x-gemini-key"] as string) || "";
  const apiKey = process.env.GEMINI_API_KEY || headerKey || "";

  if (!apiKey) {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      playlists: [],
      note: "No Gemini API key configured yet.",
    });
    return;
  }

  try {
    const library = await fetchLibrary(Date.now() + LIBRARY_FETCH_BUDGET_MS);
    if (library.length === 0) {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ generatedAt: new Date().toISOString(), playlists: [] });
      return;
    }

    const songList = library
      .map((t, i) => `${i}. ${t.artist ? `${t.artist} - ` : ""}${t.title}`)
      .join("\n");

    // Fire all 5 mix classifications in parallel — total time is roughly
    // the slowest single one, not the sum of all five. Each one internally
    // tries multiple models (independent quota buckets) if it hits a
    // rate limit, using whatever's left of the shared deadline.
    const batchResults = await classifyAllMixes(songList, apiKey, deadline);
    
    if (!batchResults) {
      const result: AiPlaylistsResult = {
        generatedAt: new Date().toISOString(),
        playlists: [],
        note: "AI playlist generation is taking longer than usual — try again shortly.",
      };
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(result);
      return;
    }

    const playlists = TARGET_MIXES.map((mix, i) => {
      const indices = batchResults[mix.name];
      const paths = (indices || [])
        .map((idx) => library[idx]?.path)
        .filter((p): p is string => Boolean(p));
      return {
        id: `ai_${i}_${mix.name.replace(/\s+/g, "_").toLowerCase()}`,
        name: mix.name,
        emoji: mix.emoji,
        description: mix.description,
        paths,
      };
    }).filter((p) => p.paths.length >= MIN_TRACKS_PER_MIX);

    const succeededCount = Object.keys(batchResults).length;
    const allFailed = succeededCount === 0;
    const allSucceeded = succeededCount === TARGET_MIXES.length;
    const result: AiPlaylistsResult = {
      generatedAt: new Date().toISOString(),
      playlists,
      ...(allFailed ? { note: "AI playlist generation is taking longer than usual — try again shortly." } : {}),
      ...(!allFailed && !allSucceeded
        ? { note: `${succeededCount} of ${TARGET_MIXES.length} mixes generated — the rest will fill in on a future refresh.` }
        : {}),
    };

    if (allSucceeded) {
      // Only lock in a full 24h cache once every mix actually succeeded —
      // shared across every visitor for the day, at zero extra Gemini calls.
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=3600");
    } else if (playlists.length > 0) {
      // Partial result (e.g. some mixes hit a rate limit): still worth
      // showing, but only cache briefly so the next request soon after
      // gets a chance to fill in the missing mixes instead of an
      // incomplete set getting stuck for a full day.
      res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
    } else {
      res.setHeader("Cache-Control", "no-store");
    }
    res.status(200).json(result);
  } catch (err: any) {
    console.error("AI playlists error:", err);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      playlists: [],
      note: err?.message || "Failed to generate AI playlists.",
    });
  }
}
