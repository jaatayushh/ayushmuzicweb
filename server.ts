import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Readable } from "stream";
import cors from "cors";
import { Innertube, UniversalCache } from "youtubei.js";
import { exec } from "child_process";
import { promisify } from "util";
import { fetchFullTree, HF_USER, HF_REPO, SERVER_HF_TOKEN } from "./api/_lib/hf";
import { generateAiPlaylists } from "./api/_lib/aiPlaylists";
import type { AiPlaylistsResult } from "./api/_lib/aiPlaylists";

const execAsync = promisify(exec);

// In-memory cache for stream URLs
const streamCache = new Map<string, { url: string; timestamp: number }>();
let ytInstance: any = null;

async function getYT() {
  if (!ytInstance) {
    try {
      ytInstance = await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true,
      });
      console.log("✓ InnerTube initialized in AyushMuzic");
    } catch (e: any) {
      console.error("InnerTube init error:", e.message);
    }
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
  if (typeof item.coverArtUrl === "string") candidates.push({ url: item.coverArtUrl, width: 500 });

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
    if (videoId && !videoId.startsWith("MPRE") && !videoId.startsWith("VL") && !videoId.startsWith("UC") && !videoId.includes(".") && !videoId.includes("/")) {
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
    return "";
  }

  // 1. Google User Content (YouTube Music official album artwork)
  // e.g. https://yt3.googleusercontent.com/...=w60-h60-l90-rj
  if (rawUrl.includes("googleusercontent.com") || rawUrl.includes("ggpht.com")) {
    let upgraded = rawUrl
      .replace(/=w\d+-h\d+[^&?]*/g, "=w800-h800-l90-rj")
      .replace(/=s\d+[^&?]*/g, "=s800-c-k-c0x00ffffff-no-rj");
    if (!upgraded.includes("=w") && !upgraded.includes("=s")) {
      upgraded += "=w800-h800-l90-rj";
    }
    return upgraded;
  }

  // 2. YouTube standard video thumbnail
  if (rawUrl.includes("i.ytimg.com") || rawUrl.includes("img.youtube.com")) {
    if (videoId && !videoId.startsWith("MPRE") && !videoId.startsWith("VL") && !videoId.startsWith("UC") && !videoId.includes(".") && !videoId.includes("/")) {
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
  const duration = item.duration?.seconds || (typeof item.duration === "number" ? item.duration : 200);

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
    gradientColors: ["#8b5cf6", "#0c0c0e"] as [string, string],
    source: "yt",
    hasLyrics: true,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure data directories exist for uploaded APK persistence
  const APK_DIR = path.join(process.cwd(), "data", "apk");
  const APK_FILE = path.join(APK_DIR, "SpotifyMine.apk");
  const APK_INFO_FILE = path.join(APK_DIR, "apk-info.json");

  try {
    if (!fs.existsSync(APK_DIR)) {
      fs.mkdirSync(APK_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("Failed to ensure APK directory:", err);
  }

  app.use(cors());
  app.use(express.json());

  // -------------------------------------------------------------
  // YouTube Music Search & Scrape
  // -------------------------------------------------------------
  app.get("/api/search", async (req, res) => {
    const q = ((req.query.q as string) || "").trim();
    const type = ((req.query.type as string) || "song").toLowerCase();
    if (!q) {
      return res.json({ songs: [], tracks: [], artists: [], albums: [], playlists: [] });
    }

    try {
      const yt = await getYT();
      const search = await yt.music.search(q, { type: type === "all" ? undefined : (type as any) });
      const rawSongs = search.songs?.contents || search.contents?.[0]?.contents || search.contents || [];
      const tracks = rawSongs.map(formatYtTrack).filter(Boolean);

      const artists = (search.artists?.contents || []).map((item: any) => ({
        channelId: item.id || item.endpoint?.payload?.browseId,
        name: item.name || item.title?.text || item.title || "Artist",
        thumbnail: getHighResCoverUrl(item.thumbnails?.[0]?.url, item.id || ""),
        subscribers: item.subscribers?.text || "",
      })).filter((a: any) => a.channelId);

      const albums = (search.albums?.contents || []).map((item: any) => ({
        browseId: item.id || item.endpoint?.payload?.browseId,
        title: item.title?.text || item.title || "Album",
        artist: item.author?.name || (item.artists?.[0]?.name) || "",
        year: item.year?.text || "",
        thumbnail: getHighResCoverUrl(item.thumbnails?.[0]?.url, item.id || ""),
      })).filter((a: any) => a.browseId);

      const playlists = (search.playlists?.contents || []).map((item: any) => ({
        playlistId: item.id || item.endpoint?.payload?.browseId,
        title: item.title?.text || item.title || "Playlist",
        author: item.author?.name || "",
        songCount: item.item_count?.text || "",
        thumbnail: getHighResCoverUrl(item.thumbnails?.[0]?.url, item.id || ""),
      })).filter((p: any) => p.playlistId);

      return res.json({
        tracks,
        songs: tracks,
        artists,
        albums,
        playlists,
      });
    } catch (err: any) {
      console.error("YouTube search error, trying yt-dlp fallback:", err.message);
      try {
        const cmd = `yt-dlp --no-warnings --default-search "ytsearch15" --dump-json "${q.replace(/"/g, '')}"`;
        const { stdout } = await execAsync(cmd, { timeout: 20000 });
        const lines = stdout.split(/\r?\n/).filter(Boolean);
        const tracks = lines.map((line) => {
          try {
            const data = JSON.parse(line);
            return {
              id: `yt_${data.id}`,
              path: data.id,
              title: data.title || "Untitled",
              artist: data.uploader || data.artist || "Unknown Artist",
              album: "Single",
              duration: data.duration || 200,
              audioUrl: `/api/stream?videoId=${data.id}`,
              coverArtUrl: getHighResCoverUrl(data.thumbnail, data.id),
              gradientColors: ["#1db954", "#121212"] as [string, string],
              source: "yt" as const,
              hasLyrics: true,
            };
          } catch {
            return null;
          }
        }).filter(Boolean);

        return res.json({
          tracks,
          songs: tracks,
          artists: [],
          albums: [],
          playlists: [],
        });
      } catch (fallbackErr: any) {
        return res.status(500).json({ error: err.message, tracks: [], songs: [] });
      }
    }
  });

  // -------------------------------------------------------------
  // YouTube Music Home Feed (Quick picks, Trending)
  // -------------------------------------------------------------
  app.get("/api/home", async (req, res) => {
    const mood = (req.query.mood as string) || "";
    try {
      const yt = await getYT();
      const query = mood ? `${mood} songs music` : "Top Global Trending Hits 2026";
      const search = await yt.music.search(query, { type: "song" });
      const rawSongs = search.songs?.contents || search.contents?.[0]?.contents || search.contents || [];
      const tracks = rawSongs.slice(0, 30).map(formatYtTrack).filter(Boolean);

      return res.json({
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
      console.error("Home feed error:", err.message);
      return res.json({
        tracks: [],
        sections: [],
      });
    }
  });

  // -------------------------------------------------------------
  // YouTube Related / Up-Next Tracks According to Song (Infinite / Deep Queue)
  // -------------------------------------------------------------
  app.get("/api/related", async (req, res) => {
    const videoId = (req.query.videoId as string) || "";
    const title = (req.query.title as string) || "";
    const artist = (req.query.artist as string) || "";
    const page = parseInt((req.query.page as string) || "1", 10);

    if (!videoId && !title && !artist) return res.json({ tracks: [] });

    try {
      const yt = await getYT();
      let tracks: any[] = [];
      const seen = new Set<string>();
      if (videoId) seen.add(videoId);

      // 1. YouTube Music getUpNext — Pure Song Radio / Up-Next algorithm from YouTube Music!
      if (videoId && !videoId.startsWith("MPRE") && !videoId.startsWith("VL") && !videoId.includes(".") && !videoId.includes("/")) {
        try {
          const upNext: any = await yt.music.getUpNext(videoId);
          if (Array.isArray(upNext?.contents)) {
            for (const it of upNext.contents) {
              const formatted = formatYtTrack(it);
              if (formatted && formatted.path && !seen.has(formatted.path)) {
                seen.add(formatted.path);
                tracks.push(formatted);
              }
            }
          }
        } catch (e: any) {
          console.warn("yt.music.getUpNext error:", e.message);
        }
      }

      // 2. YouTube Music getRelated across ALL sections
      if (tracks.length < 50 && videoId && !videoId.startsWith("MPRE") && !videoId.includes(".") && !videoId.includes("/")) {
        try {
          const related: any = await yt.music.getRelated(videoId);
          if (Array.isArray(related?.contents)) {
            for (const section of related.contents) {
              const items = section.contents || section.items || [];
              for (const it of items) {
                const formatted = formatYtTrack(it);
                if (formatted && formatted.path && !seen.has(formatted.path)) {
                  seen.add(formatted.path);
                  tracks.push(formatted);
                }
              }
            }
          }
        } catch (e: any) {
          console.warn("yt.music.getRelated error:", e.message);
        }
      }

      // 3. Artist radio & Song radio search to enrich queue up to 70+ songs
      const searchQueries = [
        artist ? `${artist} radio songs` : null,
        title && artist ? `${title} ${artist} similar songs` : null,
        artist ? `${artist} top tracks` : null,
        title ? `${title} radio mix` : null,
      ].filter(Boolean) as string[];

      for (const q of searchQueries) {
        if (tracks.length >= 70) break;
        try {
          const search: any = await yt.music.search(q, { type: "song" });
          const rawSongs = search.songs?.contents || search.contents?.[0]?.contents || search.contents || [];
          for (const it of rawSongs) {
            const formatted = formatYtTrack(it);
            if (formatted && formatted.path && !seen.has(formatted.path)) {
              seen.add(formatted.path);
              tracks.push(formatted);
            }
          }
        } catch (e: any) {
          console.warn("Additional search query failed:", q, e.message);
        }
      }

      return res.json({ tracks, total: tracks.length });
    } catch (err: any) {
      console.error("Related error:", err.message);
      return res.json({ tracks: [] });
    }
  });

  // -------------------------------------------------------------
  // Real Audio Streaming Proxy (HTTP 206 Partial Content, exact song)
  // -------------------------------------------------------------
  app.get("/api/stream", async (req, res) => {
    const videoId = (req.query.videoId as string) || "";
    if (!videoId) return res.status(400).send("Missing videoId parameter");

    try {
      let directUrl: string | null = null;
      const cached = streamCache.get(videoId);
      if (cached && (Date.now() - cached.timestamp < 14400000)) {
        directUrl = cached.url;
      } else {
        const cmd = `yt-dlp --no-warnings -g -f "ba/b" "https://www.youtube.com/watch?v=${videoId}"`;
        const { stdout } = await execAsync(cmd, { timeout: 25000 });
        const urls = stdout.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith("http"));
        if (!urls.length) throw new Error("No stream URL extracted by yt-dlp");
        directUrl = urls[0];
        streamCache.set(videoId, { url: directUrl, timestamp: Date.now() });
      }

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
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
      res.setHeader("Access-Control-Expose-Headers", "Accept-Ranges, Content-Encoding, Content-Length, Content-Range, Content-Type");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

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
  });

  // -------------------------------------------------------------
  // Synced Lyrics via LRCLIB Proxy
  // -------------------------------------------------------------
  app.get("/api/lyrics", async (req, res) => {
    const { title, artist, duration } = req.query;
    if (!title) return res.json({ syncedLyrics: null, plainLyrics: null });

    try {
      const cleanTitle = encodeURIComponent(String(title).replace(/\(.*?\)|\[.*?\]/g, "").trim());
      const cleanArtist = encodeURIComponent(String(artist || "").replace(/\(.*?\)|\[.*?\]/g, "").trim());
      const dur = Math.round(Number(duration) || 0);

      const url = `https://lrclib.net/api/get?track_name=${cleanTitle}&artist_name=${cleanArtist}${dur ? `&duration=${dur}` : ""}`;
      const response = await fetch(url, {
        headers: { "User-Agent": "SpotifyMine/1.0" },
        signal: AbortSignal.timeout(6000),
      });

      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }

      const searchUrl = `https://lrclib.net/api/search?track_name=${cleanTitle}&artist_name=${cleanArtist}`;
      const searchRes = await fetch(searchUrl, {
        headers: { "User-Agent": "SpotifyMine/1.0" },
        signal: AbortSignal.timeout(6000),
      });
      if (searchRes.ok) {
        const list = await searchRes.json();
        if (Array.isArray(list) && list.length > 0) {
          return res.json(list[0]);
        }
      }

      return res.json({ syncedLyrics: null, plainLyrics: null });
    } catch {
      return res.json({ syncedLyrics: null, plainLyrics: null });
    }
  });

  // Hugging Face Proxy API Endpoint
  app.get("/api/hf-tree", async (req, res) => {
    const user = (req.query.user as string) || HF_USER;
    const repo = (req.query.repo as string) || HF_REPO;

    try {
      const data = await fetchFullTree(user, repo);
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=15, stale-while-revalidate=30");
      return res.json(data);
    } catch (err: any) {
      console.error("HF fetch error:", err);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({
        error: err.message || "Failed to fetch from Hugging Face",
        user,
        repo,
        tracks: [],
      });
    }
  });

  // AI-Generated Themed Playlists (Punjabi Mix, Haryanvi Mix, Hindi Mix,
  // Love Mix) — regenerated once per day, cached in memory here so every
  // request during the day sees the same result, mirroring the 24h edge
  // cache used on Vercel. Accepts the Gemini key from the browser (entered
  // in-app, sent as a header) or falls back to a server env var.
  let aiPlaylistsCache: { result: AiPlaylistsResult; expiresAt: number } | null = null;
  app.get("/api/ai-playlists", async (req, res) => {
    // Prefer the server-configured key so behavior matches Vercel exactly.
    const headerKey = (req.headers["x-gemini-key"] as string) || "";
    const apiKey = process.env.GEMINI_API_KEY || headerKey || "";

    if (!apiKey) {
      return res.json({ generatedAt: new Date().toISOString(), playlists: [], note: "No Gemini API key configured yet." });
    }

    try {
      if (aiPlaylistsCache && aiPlaylistsCache.expiresAt > Date.now()) {
        return res.json(aiPlaylistsCache.result);
      }
      const result = await generateAiPlaylists(apiKey);
      aiPlaylistsCache = { result, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
      return res.json(result);
    } catch (err: any) {
      console.error("AI playlists error:", err);
      return res.status(200).json({
        generatedAt: new Date().toISOString(),
        playlists: [],
        note: err?.message || "Failed to generate AI playlists.",
      });
    }
  });

  // Hugging Face Audio Streaming Proxy
  const AUDIO_MIME_TYPES: Record<string, string> = {
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
  };

  function mimeTypeForFile(file: string): string | null {
    const ext = file.split(".").pop()?.toLowerCase();
    return (ext && AUDIO_MIME_TYPES[ext]) || null;
  }

  app.get("/api/audio", async (req, res) => {
    const user = (req.query.user as string) || "CoolJaat";
    const repo = (req.query.repo as string) || "my-music-library";
    const file = (req.query.file as string);

    if (!file) {
      return res.status(400).send("Missing file parameter");
    }

    try {
      const url = `https://huggingface.co/datasets/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/resolve/main/${encodeURIComponent(file)}`;
      
      const fetchOptions: RequestInit = {
        method: req.method,
        headers: {},
        redirect: 'follow',
      };
      
      if (req.headers.range) {
        (fetchOptions.headers as any).range = req.headers.range;
      }
      
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        return res.status(response.status).send(`Error fetching audio: ${response.statusText}`);
      }

      const headers = new Headers(response.headers);
      headers.delete('content-encoding');

      const correctMime = mimeTypeForFile(file);
      if (correctMime) {
        headers.set('content-type', correctMime);
      }
      headers.set('content-disposition', 'inline');
      if (!headers.has('accept-ranges')) {
        headers.set('accept-ranges', 'bytes');
      }

      headers.set('access-control-allow-origin', '*');
      headers.set('access-control-allow-methods', 'GET, HEAD, OPTIONS');
      headers.set('access-control-allow-headers', 'Content-Type, Range');
      headers.set('access-control-expose-headers', 'Accept-Ranges, Content-Encoding, Content-Length, Content-Range, Content-Type');
      headers.set('cross-origin-resource-policy', 'cross-origin');

      res.status(response.status);
      headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      if (response.body) {
        Readable.fromWeb(response.body as any).pipe(res);
      } else {
        res.end();
      }

    } catch (err: any) {
      console.error("Proxy audio error:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  // Hugging Face Admin Token Status Check
  app.get("/api/admin/hf-status", (_req, res) => {
    const effectiveToken = process.env.HF_TOKEN || SERVER_HF_TOKEN;
    const hasToken = Boolean(effectiveToken && effectiveToken.trim().length > 0);
    const masked = hasToken
      ? `${effectiveToken.slice(0, 5)}••••••••••••••••••••${effectiveToken.slice(-4)}`
      : "";
    res.json({
      hasServerToken: hasToken,
      maskedToken: masked,
    });
  });

  // Admin: delete a song from the Hugging Face dataset repo using server-stored HF token
  app.post("/api/admin-delete", async (req, res) => {
    try {
      const { user, repo, path: filePath, apiKey } = req.body || {};

      if (!user || !repo || !filePath) {
        return res.status(400).json({ error: "Missing user, repo, or path" });
      }

      const effectiveToken = (apiKey && apiKey.trim()) || process.env.HF_TOKEN || SERVER_HF_TOKEN;
      if (!effectiveToken) {
        return res.status(400).json({ error: "Missing Hugging Face API key" });
      }

      const commitUrl = `https://huggingface.co/api/datasets/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/commit/main`;
      const basename = filePath.replace(/\.[^./]+$/, "");
      const ops = [
        { key: "header", value: { summary: `Delete ${filePath} via SpotifyMine admin panel` } },
        { key: "deletedFile", value: { path: filePath } },
        { key: "deletedFile", value: { path: `${basename}.jpg` } },
      ];
      const ndjson = ops.map((op) => JSON.stringify(op)).join("\n");

      const response = await fetch(commitUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
          "Content-Type": "application/x-ndjson",
        },
        body: ndjson,
      });

      const text = await response.text();

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Hugging Face rejected the delete (${response.status}): ${text.slice(0, 300)}`,
        });
      }

      return res.json({ ok: true });
    } catch (err: any) {
      console.error("Admin delete error:", err);
      return res.status(500).json({ error: err?.message || "Internal Server Error" });
    }
  });

  // --- APK Management Endpoints ---

  // 1. Get APK status & metadata
  app.get("/api/apk/info", (_req, res) => {
    try {
      const customExists = fs.existsSync(APK_FILE);
      if (customExists) {
        const stats = fs.statSync(APK_FILE);
        let meta = { filename: "SpotifyMine.apk", uploadedAt: stats.mtime.toISOString(), size: stats.size };
        if (fs.existsSync(APK_INFO_FILE)) {
          try {
            const raw = fs.readFileSync(APK_INFO_FILE, "utf-8");
            meta = { ...meta, ...JSON.parse(raw) };
          } catch {}
        }
        return res.json({
          hasCustomApk: true,
          size: stats.size,
          filename: meta.filename || "SpotifyMine.apk",
          uploadedAt: meta.uploadedAt || stats.mtime.toISOString(),
          downloadUrl: "/api/apk/download",
        });
      }

      // Default public APK check
      const pubApk = path.join(process.cwd(), "public", "SpotifyMine.apk");
      if (fs.existsSync(pubApk)) {
        const stats = fs.statSync(pubApk);
        return res.json({
          hasCustomApk: false,
          size: stats.size,
          filename: "SpotifyMine.apk (Built-in)",
          uploadedAt: stats.mtime.toISOString(),
          downloadUrl: "/api/apk/download",
        });
      }

      return res.json({
        hasCustomApk: false,
        size: 0,
        filename: "SpotifyMine.apk",
        uploadedAt: null,
        downloadUrl: "/api/apk/download",
      });
    } catch (err: any) {
      console.error("APK info error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 2. Download APK (Serves admin uploaded APK with top priority)
  const handleApkDownload = (_req: express.Request, res: express.Response) => {
    if (fs.existsSync(APK_FILE)) {
      res.setHeader("Content-Type", "application/vnd.android.package-archive");
      res.setHeader("Content-Disposition", 'attachment; filename="ayushmuzic.apk"');
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      return res.sendFile(APK_FILE);
    }

    const pubApk = path.join(process.cwd(), "public", "SpotifyMine.apk");
    if (fs.existsSync(pubApk)) {
      res.setHeader("Content-Type", "application/vnd.android.package-archive");
      res.setHeader("Content-Disposition", 'attachment; filename="ayushmuzic.apk"');
      return res.sendFile(pubApk);
    }

    return res.status(404).send("APK file not found on server.");
  };

  app.get("/api/apk/download", handleApkDownload);
  app.get("/ayushmuzic.apk", handleApkDownload);
  app.get("/spotify.apk", handleApkDownload);
  app.get("/soptify.apk", handleApkDownload);
  app.get("/SpotifyMine.apk", handleApkDownload);

  // 3. Upload APK by Admin (Streaming binary upload to avoid memory bottlenecks)
  app.post("/api/admin/upload-apk", (req, res) => {
    try {
      const originalFilename = decodeURIComponent(
        (req.headers["x-filename"] as string) || "SpotifyMine.apk"
      );

      const tmpFile = path.join(APK_DIR, `SpotifyMine_${Date.now()}.tmp`);
      const writeStream = fs.createWriteStream(tmpFile);

      let bytesReceived = 0;

      req.on("data", (chunk) => {
        bytesReceived += chunk.length;
      });

      req.pipe(writeStream);

      writeStream.on("finish", () => {
        try {
          if (bytesReceived === 0) {
            if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
            return res.status(400).json({ error: "No file content received." });
          }

          // Atomically replace existing APK file
          if (fs.existsSync(APK_FILE)) {
            try {
              fs.unlinkSync(APK_FILE);
            } catch {}
          }
          fs.renameSync(tmpFile, APK_FILE);

          // Save metadata
          const meta = {
            filename: originalFilename,
            size: bytesReceived,
            uploadedAt: new Date().toISOString(),
            custom: true,
          };
          fs.writeFileSync(APK_INFO_FILE, JSON.stringify(meta, null, 2), "utf-8");

          return res.json({
            ok: true,
            message: "APK uploaded successfully!",
            info: meta,
          });
        } catch (err: any) {
          console.error("Error finalizing APK upload:", err);
          if (fs.existsSync(tmpFile)) {
            try { fs.unlinkSync(tmpFile); } catch {}
          }
          return res.status(500).json({ error: "Failed to finalize uploaded APK file." });
        }
      });

      writeStream.on("error", (err) => {
        console.error("Write stream error:", err);
        if (fs.existsSync(tmpFile)) {
          try { fs.unlinkSync(tmpFile); } catch {}
        }
        return res.status(500).json({ error: "Failed to write APK file to disk." });
      });

      req.on("error", (err) => {
        console.error("Request stream error during APK upload:", err);
        if (fs.existsSync(tmpFile)) {
          try { fs.unlinkSync(tmpFile); } catch {}
        }
        return res.status(500).json({ error: "Network error during upload." });
      });
    } catch (err: any) {
      console.error("Admin upload APK route error:", err);
      return res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  });

  // 4. Reset custom APK (Deletes custom uploaded APK and reverts to default)
  app.post("/api/admin/reset-apk", (_req, res) => {
    try {
      if (fs.existsSync(APK_FILE)) {
        fs.unlinkSync(APK_FILE);
      }
      if (fs.existsSync(APK_INFO_FILE)) {
        fs.unlinkSync(APK_INFO_FILE);
      }
      return res.json({ ok: true, message: "Custom APK removed. Reverted to default." });
    } catch (err: any) {
      console.error("Reset APK error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", hf_config: { user: "CoolJaat", repo: "my-music-library" } });
  });

  // Website directory for the AyushMuzic landing/info website
  const websiteDir = path.join(process.cwd(), "website");

  // Static assets for the landing website and downloads
  app.use("/website", express.static(websiteDir));
  app.use("/downloads", express.static(path.join(websiteDir, "downloads")));

  // Main / Root route serves the AyushMuzic info website
  app.get("/", (_req, res) => {
    res.sendFile(path.join(websiteDir, "index.html"));
  });

  // Vite & Player App Setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });

    // Handle /play route for the music player app
    app.get(["/play", "/play/*"], async (req, res, next) => {
      try {
        const rawHtml = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        const html = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (err: any) {
        vite.ssrFixStacktrace(err);
        next(err);
      }
    });

    // Vite middlewares handle /src/*, /@vite/client, /node_modules, /public/*, etc.
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    // Handle /play route in production
    app.get(["/play", "/play/*"], (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

    // Serve static production build files
    app.use(express.static(distPath));

    // Fallback route
    app.get("*", (req, res) => {
      if (req.path.startsWith("/play")) {
        res.sendFile(path.join(distPath, "index.html"));
      } else {
        res.sendFile(path.join(websiteDir, "index.html"));
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
