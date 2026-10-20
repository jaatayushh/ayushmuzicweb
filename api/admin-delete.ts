import { SERVER_HF_TOKEN } from "./_lib/hf";

export const config = {
  runtime: "nodejs",
};

// Deletes a file (and its matching poster jpg, if any) from a Hugging Face
// dataset repo using the HF "commit" API using the server-configured HF token.
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { user, repo, path, apiKey } = body;

    if (!user || !repo || !path) {
      res.status(400).json({ error: "Missing user, repo, or path" });
      return;
    }
    const effectiveToken = (apiKey && apiKey.trim()) || process.env.HF_TOKEN || SERVER_HF_TOKEN;

    if (!effectiveToken) {
      res.status(400).json({ error: "Missing Hugging Face API key" });
      return;
    }

    const commitUrl = `https://huggingface.co/api/datasets/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/commit/main`;

    // Also try deleting the matching poster image, best-effort.
    const basename = path.replace(/\.[^./]+$/, "");
    const ops = [
      { key: "header", value: { summary: `Delete ${path} via SpotifyMine admin panel` } },
      { key: "deletedFile", value: { path } },
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
      res.status(response.status).json({
        error: `Hugging Face rejected the delete (${response.status}): ${text.slice(0, 300)}`,
      });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("Admin delete error:", err);
    res.status(500).json({ error: err?.message || "Internal Server Error" });
  }
}
