export interface LrcLine {
  id: string;
  time: number; // In seconds (float)
  text: string;
}

/**
 * Parses raw LRC string content into sorted chronological LrcLine objects.
 * Handles multiple timestamp tags per line e.g. [00:12.34][01:05.12] Line text
 */
export function parseLrc(lrcText: string): LrcLine[] {
  if (!lrcText || typeof lrcText !== 'string') return [];

  const lines = lrcText.split(/\r?\n/);
  const result: LrcLine[] = [];

  // Match timestamp tags e.g. [01:23.45], [1:23:45], [00:12], [01:23,45]
  const timeRegex = /\[(\d+):(\d{2})(?:[.:,](\d{1,3}))?\]/g;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Skip metadata headers like [ar:Artist], [ti:Title], [al:Album], [by:], [offset:]
    if (/^\[(ar|ti|al|by|offset|length|re|ve):/i.test(trimmed)) {
      return;
    }

    const matches = Array.from(trimmed.matchAll(timeRegex));
    if (matches.length === 0) return;

    // Extract lyric text by removing all timestamp tags
    const text = trimmed.replace(timeRegex, '').trim();

    matches.forEach((match) => {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisRaw = match[3];

      let fraction = 0;
      if (millisRaw) {
        if (millisRaw.length === 1) {
          fraction = parseInt(millisRaw, 10) / 10;
        } else if (millisRaw.length === 2) {
          fraction = parseInt(millisRaw, 10) / 100;
        } else if (millisRaw.length === 3) {
          fraction = parseInt(millisRaw, 10) / 1000;
        }
      }

      const totalTime = minutes * 60 + seconds + fraction;

      if (!isNaN(totalTime) && text) {
        result.push({
          id: `lrc_${totalTime}_${Math.random().toString(36).substring(2, 7)}`,
          time: totalTime,
          text,
        });
      }
    });
  });

  // Sort chronologically by timestamp
  result.sort((a, b) => a.time - b.time);

  return result;
}

/**
 * Find active line index given current time in seconds
 */
export function getActiveLineIndex(lines: LrcLine[], currentTime: number): number {
  if (!lines || lines.length === 0) return -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    if (currentTime >= lines[i].time) {
      return i;
    }
  }

  return -1;
}

/**
 * Fallback demo LRC generator for tracks that don't have built-in lyrics
 */
export function generateSampleLrc(title: string, artist: string, duration: number = 200): string {
  const lineInterval = Math.max(4, Math.floor(duration / 18));
  const sampleLyrics = [
    `[00:02.00] 🎵 (Intro - ${title})`,
    `[00:08.00] Yeah, turn the music up in the headphones`,
    `[00:14.00] Walking down the illuminated midnight streets`,
    `[00:20.00] Feel the rhythm pulsing through the city beat`,
    `[00:27.00] Every single note taking us away tonight`,
    `[00:34.00] Lost inside the sound under glowing neon lights`,
    `[00:42.00] 💫 (Chorus)`,
    `[00:46.00] Listening to ${title} by ${artist}`,
    `[00:52.00] Feel the energy flow through your mind`,
    `[00:58.00] We are living in the golden harmony`,
    `[01:05.00] No worries left behind, just you and me`,
    `[01:12.00] 🎷 (Instrumental Solo)`,
    `[01:22.00] Echoes of the melody rising up so high`,
    `[01:29.00] Stars aligning across the endless sky`,
    `[01:36.00] Can you hear the bass resonance deep inside?`,
    `[01:44.00] Hold on tight, let's take another ride`,
    `[01:52.00] 💫 (Chorus)`,
    `[01:56.00] Listening to ${title} by ${artist}`,
    `[02:03.00] Music grounds us, free and unified`,
    `[02:10.00] Feel the beat fading out into the night...`,
    `[02:18.00] 🎵 (Outro)`,
  ];

  return sampleLyrics.join('\n');
}
