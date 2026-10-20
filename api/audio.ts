export const config = {
  runtime: "nodejs",
};

// Hugging Face serves Git-LFS-tracked files (which audio always is) with
// Content-Type: application/octet-stream. Safari's <audio> element treats
// that content type as explicitly unplayable and refuses to load it, even
// though the underlying bytes are perfectly valid audio (Chrome/Firefox/
// Android sniff the bytes and play it anyway, which is why this only shows
// up on Safari/iOS). We override the header ourselves based on file
// extension so every browser gets an accurate, playable Content-Type.
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

export default async function handler(req: any, res: any) {
  const user = (req.query.user as string) || "CoolJaat";
  const repo = (req.query.repo as string) || "my-music-library";
  const file = req.query.file as string;

  if (!file) {
    res.status(400).send("Missing file parameter");
    return;
  }

  try {
    const url = `https://huggingface.co/datasets/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/resolve/main/${encodeURIComponent(file)}`;

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {},
      redirect: "follow",
    };

    if (req.headers.range) {
      (fetchOptions.headers as any).range = req.headers.range;
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      res.status(response.status).send(`Error fetching audio: ${response.statusText}`);
      return;
    }

    const headers = new Headers(response.headers);
    headers.delete("content-encoding");

    // Force a correct, sniff-proof audio Content-Type (see comment above) —
    // this is the actual iOS Safari playback fix.
    const correctMime = mimeTypeForFile(file);
    if (correctMime) {
      headers.set("content-type", correctMime);
    }
    // Force inline playback instead of a "download" disposition, and make
    // sure Safari knows byte-range seeking is supported even if the upstream
    // response omitted it.
    headers.set("content-disposition", "inline");
    if (!headers.has("accept-ranges")) {
      headers.set("accept-ranges", "bytes");
    }

    headers.set("access-control-allow-origin", "*");
    headers.set("access-control-allow-methods", "GET, HEAD, OPTIONS");
    headers.set("access-control-allow-headers", "Content-Type, Range");
    headers.set("access-control-expose-headers", "Accept-Ranges, Content-Encoding, Content-Length, Content-Range, Content-Type");
    headers.set("cross-origin-resource-policy", "cross-origin");

    res.status(response.status);
    headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (response.body) {
      const reader = response.body.getReader();
      // Stream chunks directly to the Node response
      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        res.write(Buffer.from(value));
        return pump();
      };
      await pump();
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error("Proxy audio error:", err);
    res.status(500).send("Internal Server Error");
  }
}
