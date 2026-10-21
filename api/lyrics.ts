export const config = {
  runtime: "nodejs",
  maxDuration: 10,
};

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { title, artist, duration } = req.query;
  if (!title) return res.status(200).json({ syncedLyrics: null, plainLyrics: null });

  try {
    const cleanTitle = encodeURIComponent(String(title).replace(/\(.*?\)|\[.*?\]/g, "").trim());
    const cleanArtist = encodeURIComponent(String(artist || "").replace(/\(.*?\)|\[.*?\]/g, "").trim());
    const dur = Math.round(Number(duration) || 0);

    const url = `https://lrclib.net/api/get?track_name=${cleanTitle}&artist_name=${cleanArtist}${dur ? `&duration=${dur}` : ""}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "AyushMuzic/1.0" },
      signal: AbortSignal.timeout(6000),
    });

    if (response.ok) {
      const data = await response.json();
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
      return res.status(200).json(data);
    }

    const searchUrl = `https://lrclib.net/api/search?track_name=${cleanTitle}&artist_name=${cleanArtist}`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "AyushMuzic/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (searchRes.ok) {
      const list = await searchRes.json();
      if (Array.isArray(list) && list.length > 0) {
        res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
        return res.status(200).json(list[0]);
      }
    }

    return res.status(200).json({ syncedLyrics: null, plainLyrics: null });
  } catch {
    return res.status(200).json({ syncedLyrics: null, plainLyrics: null });
  }
}
