import { Innertube, UniversalCache } from "youtubei.js";
import { Readable } from "stream";

export const config = {
  runtime: "nodejs",
  maxDuration: 15,
};

// In-memory cache for direct audio stream URLs (4 hour TTL)
const streamCache = new Map<string, { url: string; timestamp: number }>();
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

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
  res.setHeader("Access-Control-Expose-Headers", "Accept-Ranges, Content-Encoding, Content-Length, Content-Range, Content-Type");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  if (req.method === "OPTIONS") return res.status(200).end();

  const videoId = (req.query.videoId as string) || "";
  if (!videoId) {
    return res.status(400).send("Missing videoId parameter");
  }

  try {
    let directUrl: string | null = null;
    const cached = streamCache.get(videoId);
    if (cached && Date.now() - cached.timestamp < 14400000) {
      directUrl = cached.url;
    } else {
      const yt = await getYT();
      let info: any = null;

      // Primary client: IOS (returns direct audio URLs with valid signature)
      try {
        info = await yt.getBasicInfo(videoId, "IOS");
      } catch (err: any) {
        console.warn("IOS getBasicInfo failed, trying ANDROID/WEB fallback:", err.message);
      }

      if (!info) {
        try {
          info = await yt.getBasicInfo(videoId, "ANDROID");
        } catch {}
      }
      if (!info) {
        try {
          info = await yt.getBasicInfo(videoId, "WEB");
        } catch {}
      }

      if (!info) {
        return res.status(502).json({ error: "Failed to fetch stream info for " + videoId });
      }

      const formats = info.streaming_data?.adaptive_formats || [];
      const audioFormats = formats
        .filter((f: any) => f.mime_type?.startsWith("audio/") && f.url)
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

      if (audioFormats.length > 0) {
        directUrl = audioFormats[0].url;
      } else {
        // Fallback to regular formats
        const regFormats = (info.streaming_data?.formats || []).filter((f: any) => f.url);
        if (regFormats.length > 0) {
          directUrl = regFormats[0].url;
        }
      }

      if (!directUrl) {
        return res.status(404).json({ error: "No playable stream URL found" });
      }

      streamCache.set(videoId, { url: directUrl, timestamp: Date.now() });
    }

    // Forward range request to Google CDN for seeking support
    const fetchHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };
    if (req.headers.range) {
      fetchHeaders["Range"] = req.headers.range as string;
    }

    const audioRes = await fetch(directUrl, { headers: fetchHeaders });
    res.status(audioRes.status);

    const headersToForward = ["content-type", "content-length", "content-range", "accept-ranges"];
    for (const h of headersToForward) {
      const val = audioRes.headers.get(h);
      if (val) res.setHeader(h, val);
    }
    if (!res.getHeader("accept-ranges")) {
      res.setHeader("Accept-Ranges", "bytes");
    }

    if (audioRes.body) {
      if (typeof (audioRes.body as any).pipe === "function") {
        (audioRes.body as any).pipe(res);
      } else {
        Readable.fromWeb(audioRes.body as any).pipe(res);
      }
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error(`Stream error for videoId=${videoId}:`, err.message);
    res.status(502).json({ error: "Stream failed: " + err.message });
  }
}
