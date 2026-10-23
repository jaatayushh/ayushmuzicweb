import { Innertube, UniversalCache } from "youtubei.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 15,
};

let ytInstance: any = null;

async function getYT() {
  if (!ytInstance) {
    ytInstance = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
    });
  }
  return ytInstance;
}

function cleanString(str: string): string {
  if (!str) return "";
  return str
    .replace(/\(.*?\)|\[.*?\]/g, "") // remove parenthesized/bracketed text
    .replace(/(?:official\s*(?:music\s*)?video|official\s*audio|lyric(?:s)?\s*video|audio|remastered)/gi, "")
    .replace(/\s*feat\.?.*$/i, "")
    .replace(/\s*ft\.?.*$/i, "")
    .replace(/[|•-].*$/, "") // remove trailing metadata after | or -
    .trim();
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { title, artist, duration, videoId } = req.query;
  if (!title && !videoId) return res.status(200).json({ syncedLyrics: null, plainLyrics: null });

  const rawTitle = String(title || "");
  const rawArtist = String(artist || "");
  const cleanedTitle = cleanString(rawTitle) || rawTitle;
  const cleanedArtist = cleanString(rawArtist) || rawArtist;
  const dur = Math.round(Number(duration) || 0);

  // 1. Try LRCLIB exact match
  try {
    const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(cleanedArtist)}${dur ? `&duration=${dur}` : ""}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "AyushMuzic/1.0 (https://ayushmuzic.vercel.app)" },
      signal: AbortSignal.timeout(4000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.syncedLyrics || data.plainLyrics) {
        res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
        return res.status(200).json(data);
      }
    }
  } catch {}

  // 2. Try LRCLIB search query
  try {
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanedTitle} ${cleanedArtist}`.trim())}`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "AyushMuzic/1.0 (https://ayushmuzic.vercel.app)" },
      signal: AbortSignal.timeout(4000),
    });

    if (searchRes.ok) {
      const list = await searchRes.json();
      if (Array.isArray(list) && list.length > 0) {
        const best = list.find((item: any) => item.syncedLyrics) || list[0];
        if (best.syncedLyrics || best.plainLyrics) {
          res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
          return res.status(200).json(best);
        }
      }
    }
  } catch {}

  // 3. Fallback: YouTube Music's Official Lyrics API via Innertube
  const vid = String(videoId || "").replace(/^yt_/, "").trim();
  if (vid && vid.length >= 8) {
    try {
      const yt = await getYT();
      const ytLyrics = await yt.music.getLyrics(vid);
      if (ytLyrics?.description?.text) {
        const plainLyrics = ytLyrics.description.text;
        res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
        return res.status(200).json({
          syncedLyrics: null,
          plainLyrics,
        });
      }
    } catch (e: any) {
      console.warn("YouTube Music getLyrics fallback error:", e.message);
    }
  }

  return res.status(200).json({ syncedLyrics: null, plainLyrics: null });
}
