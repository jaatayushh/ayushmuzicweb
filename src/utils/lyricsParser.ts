import yaml from 'yaml';

export interface WordInfo {
  time: number;
  text: string;
  duration?: number;
}

export interface LineInfo {
  id: string;
  time: number;
  text: string;
  words?: WordInfo[];
}

export interface LyricsData {
  mode: 'word' | 'line';
  lines: LineInfo[];
}

/**
 * Parses a standard LRC file format.
 * Matches lines like "[01:23.45]Some lyric line"
 */
export function parseLrc(lrcText: string): LyricsData {
  if (!lrcText || typeof lrcText !== 'string') {
    return { mode: 'line', lines: [] };
  }

  const lines = lrcText.split(/\r?\n/);
  const result: LineInfo[] = [];
  const timeRegex = /\[(\d+):(\d{2})(?:[.:,](\d{1,3}))?\]/g;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (/^\[(ar|ti|al|by|offset|length|re|ve):/i.test(trimmed)) return;

    const matches = Array.from(trimmed.matchAll(timeRegex));
    if (matches.length === 0) return;

    const text = trimmed.replace(timeRegex, '').trim();

    matches.forEach((match) => {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisRaw = match[3];

      let fraction = 0;
      if (millisRaw) {
        if (millisRaw.length === 1) fraction = parseInt(millisRaw, 10) / 10;
        else if (millisRaw.length === 2) fraction = parseInt(millisRaw, 10) / 100;
        else if (millisRaw.length === 3) fraction = parseInt(millisRaw, 10) / 1000;
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

  result.sort((a, b) => a.time - b.time);

  return { mode: 'line', lines: result };
}

/**
 * Parses YAML word-sync lyrics format.
 * Expects a structure with `lines` array containing `time`, `text`, and optional `words` array.
 */
export function parseYamlLyrics(yamlText: string): LyricsData | null {
  try {
    const parsed = yaml.parse(yamlText);
    if (!parsed || !Array.isArray(parsed.lines)) return null;

    const lines: LineInfo[] = parsed.lines.map((line: any, index: number) => {
      return {
        id: `yaml_${index}_${line.time}`,
        time: Number(line.time) || 0,
        text: String(line.text || ''),
        words: Array.isArray(line.words)
          ? line.words.map((w: any) => ({
              time: Number(w.time) || 0,
              text: String(w.text || ''),
              duration: w.duration !== undefined ? Number(w.duration) : undefined,
            }))
          : undefined,
      };
    });
    
    // Check if we actually have any words for word-sync mode
    const hasWords = lines.some((l) => l.words && l.words.length > 0);
    if (!hasWords) {
        // If no word-timing data is present, fallback to returning it as line-sync or null
        // We'll treat it as line sync if it has lines, else null.
        if (lines.length > 0) {
           return { mode: 'line', lines };
        }
        return null; 
    }

    return { mode: 'word', lines };
  } catch (error) {
    console.error('Failed to parse YAML lyrics', error);
    return null;
  }
}
