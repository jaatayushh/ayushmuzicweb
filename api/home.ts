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
    });
  }
  return ytInstance;
}

function extractCover(item: any): string {
  if (!item) return "";
  const candidates: any[] = [];
  if (Array.isArray(item.thumbnails)) candidates.push(...item.thumbnails);
  if (Array.isArray(item.thumbnail)) candidates.push(...item.thumbnail);
  if (Array.isArray(item.thumbnail?.thumbnails)) candidates.push(...item.thumbnail.thumbnails);
  if (Array.isArray(item.thumbnail?.contents)) candidates.push(...item.thumbnail.contents);
  if (Array.isArray(item.thumbnail_renderer?.thumbnails)) candidates.push(...item.thumbnail_renderer.thumbnails);
  if (typeof item.thumbnail?.url === "string") candidates.push({ url: item.thumbnail.url, width: 300 });
  if (typeof item.thumbnail === "string") candidates.push({ url: item.thumbnail, width: 300 });

  if (candidates.length > 0) {
    const valid = candidates.filter((c) => c && typeof c.url === "string" && c.url.startsWith("http"));
    if (valid.length > 0) {
      const sorted = [...valid].sort((a, b) => (b.width || 0) - (a.width || 0));
      return sorted[0].url;
    }
  }
  return "";
}

function getHighResCoverUrl(rawUrl: string | undefined | null, videoId: string): string {
  if (!rawUrl) {
    if (videoId && !videoId.startsWith("MPRE") && !videoId.startsWith("VL") && !videoId.startsWith("UC")) {
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
    return "";
  }

  if (rawUrl.includes("googleusercontent.com") || rawUrl.includes("ggpht.com")) {
    let upgraded = rawUrl
      .replace(/=w\d+-h\d+[^&?]*/g, "=w800-h800-l90-rj")
      .replace(/=s\d+[^&?]*/g, "=s800-c-k-c0x00ffffff-no-rj");
    if (!upgraded.includes("=w") && !upgraded.includes("=s")) {
      upgraded += "=w800-h800-l90-rj";
    }
    return upgraded;
  }

  if (rawUrl.includes("i.ytimg.com") || rawUrl.includes("img.youtube.com")) {
    if (videoId && !videoId.startsWith("MPRE") && !videoId.startsWith("VL") && !videoId.startsWith("UC")) {
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
    return rawUrl;
  }

  return rawUrl;
}

function formatYtTrack(item: any): any {
  if (!item) return null;
  let videoId = item.video_id || item.videoId || item.endpoint?.payload?.videoId;
  if (!videoId && item.id && typeof item.id === "string") {
    if (!item.id.startsWith("MPRE") && !item.id.startsWith("VL") && !item.id.startsWith("UC") && !item.id.startsWith("FEmusic")) {
      videoId = item.id;
    }
  }
  if (!videoId) return null;

  const title = item.title?.text || (typeof item.title === "string" ? item.title : item.header?.title?.text || "Untitled");
  let artist = "";
  if (Array.isArray(item.artists)) {
    artist = item.artists.map((a: any) => (typeof a === "string" ? a : a?.name)).filter(Boolean).join(", ");
  }
  if (!artist) {
    artist = item.author?.name || (typeof item.author === "string" ? item.author : "") || "Unknown Artist";
  }

  const album = item.album?.name || (typeof item.album === "string" ? item.album : "Single");
  const duration = item.duration?.seconds || (typeof item.duration === "number" ? item.duration : 210);

  const rawCover = extractCover(item);
  const coverArtUrl = getHighResCoverUrl(rawCover, videoId);

  return {
    id: `yt_${videoId}`,
    path: videoId,
    title,
    artist: artist || "Unknown Artist",
    album: album || "Single",
    duration,
    audioUrl: `/api/stream?videoId=${videoId}`,
    coverArtUrl,
    gradientColors: ["#8b5cf6", "#121212"] as [string, string],
    source: "yt" as const,
    hasLyrics: true,
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const mood = (req.query.mood as string) || "";
  try {
    const yt = await getYT();
    const query = mood ? `${mood} songs music` : "Top Global Trending Hits 2026";
    const search: any = await yt.music.search(query, { type: "song" });
    const rawSongs = search.songs?.contents || search.contents?.[0]?.contents || search.contents || [];
    const tracks = rawSongs.slice(0, 30).map(formatYtTrack).filter(Boolean);

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({
      title: mood ? `${mood} Hits` : "Quick Picks & Trending",
      tracks,
      sections: [
        {
          title: "Quick picks",
          type: "songs",
          items: tracks.slice(0, 12),
        },
        {
          title: "Top charts & Trending",
          type: "songs",
          items: tracks.slice(12, 24),
        },
      ],
    });
  } catch (err: any) {
    console.error("Home feed serverless error:", err.message);
    return res.status(200).json({
      title: "Popular Hits",
      tracks: [],
      sections: [],
    });
  }
}
