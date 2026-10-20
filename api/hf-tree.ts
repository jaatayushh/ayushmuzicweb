// NOTE: This file is intentionally fully self-contained (no imports from
// ./_lib/*). Vercel's Node.js function builder does not reliably include
// underscore-prefixed sibling folders in the deployed bundle for
// standalone API functions — importing from api/_lib/hf.ts here caused a
// hard runtime crash in production:
//   Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/api/_lib/hf'
// even though it works perfectly in local dev (tsx resolves it fine).
// Duplicating the small amount of logic here avoids relying on Vercel's
// cross-file bundling behavior entirely. (api/_lib/hf.ts is still used by
// server.ts for local dev, which doesn't have this issue.)

export const config = {
  runtime: "nodejs",
};

const HF_USER = "CoolJaat";
const HF_REPO = "my-music-library";

async function fetchWithTimeout(url: string, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFullTree(user: string, repo: string): Promise<any[]> {
  const buildUrl = (query: string) =>
    `https://huggingface.co/api/datasets/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/tree/main${query}`;

  let url: string | null = buildUrl("?recursive=true");
  let all: any[] = [];
  let triedSimpleFallback = false;
  let pageCount = 0;
  const MAX_PAGES = 200;
  const TIME_BUDGET_MS = 8000; // stay safely under Vercel Hobby's real 10s limit
  const startedAt = Date.now();

  while (url && pageCount < MAX_PAGES) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      console.warn(`HF tree pagination hit its time budget after ${pageCount} page(s); returning ${all.length} entries collected so far.`);
      break;
    }
    pageCount++;

    let response: Response;
    try {
      response = await fetchWithTimeout(url);
    } catch (networkErr) {
      console.error("HF tree fetch failed mid-pagination:", networkErr);
      break;
    }

    if (!response.ok && all.length === 0 && !triedSimpleFallback) {
      triedSimpleFallback = true;
      url = buildUrl("");
      try {
        response = await fetchWithTimeout(url);
      } catch (networkErr) {
        console.error("HF tree simple-fallback fetch failed:", networkErr);
        break;
      }
    }

    if (!response.ok) {
      if (all.length > 0) break;
      throw new Error(`Hugging Face API returned status ${response.status}`);
    }

    let page: any;
    try {
      page = await response.json();
    } catch (parseErr) {
      console.error("HF tree page wasn't valid JSON:", parseErr);
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

  console.log(`HF tree fetch: ${pageCount} page(s), ${all.length} total entries, ${Date.now() - startedAt}ms`);
  return all;
}

export default async function handler(req: any, res: any) {
  const user = (req.query.user as string) || HF_USER;
  const repo = (req.query.repo as string) || HF_REPO;

  try {
    const data = await fetchFullTree(user, repo);
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=15, stale-while-revalidate=30");
    res.status(200).json(data);
  } catch (err: any) {
    console.error("HF fetch error:", err);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      error: err?.message || "Failed to fetch from Hugging Face",
      user,
      repo,
      tracks: [],
    });
  }
}
