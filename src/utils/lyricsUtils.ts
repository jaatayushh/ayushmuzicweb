// Utility for checking and caching lyrics availability across the application
import { Track } from '../types';

// In-memory cache for track LRC availability: track.path -> boolean (true = has lyrics, false = no lyrics)
const lyricsAvailabilityCache = new Map<string, boolean>();
const pendingChecks = new Map<string, Promise<boolean>>();

/**
 * Returns the LRC URL for a track path in the dataset.
 */
export function getTrackLrcUrl(path: string): string {
  const lrcPath = path.replace(/\.[^/.]+$/, '.lrc');
  return `https://huggingface.co/datasets/CoolJaat/my-music-library/resolve/main/${encodeURIComponent(lrcPath)}`;
}

/**
 * Check if lyrics are available for a given track.
 * Fast path: if track.hasLyrics or track.lrc is provided, resolves immediately.
 * Checks against in-memory cache first, then issues a lightweight HEAD/GET fetch if not cached.
 */
export async function checkLyricsAvailable(track: Track | null | undefined): Promise<boolean> {
  if (!track || !track.path) return false;

  if (track.source === 'yt') {
    return true;
  }

  // 1. If explicitly pre-tagged
  if (track.hasLyrics !== undefined) {
    lyricsAvailabilityCache.set(track.path, track.hasLyrics);
    return track.hasLyrics;
  }

  // 2. If raw LRC string exists on track
  if (track.lrc && track.lrc.trim().length > 0) {
    lyricsAvailabilityCache.set(track.path, true);
    return true;
  }

  // 3. Check memory cache
  if (lyricsAvailabilityCache.has(track.path)) {
    return lyricsAvailabilityCache.get(track.path)!;
  }

  // 4. Check if already in-flight
  if (pendingChecks.has(track.path)) {
    return pendingChecks.get(track.path)!;
  }

  // 5. Query HF repository for the .lrc file
  const checkPromise = (async () => {
    try {
      const url = getTrackLrcUrl(track.path);
      // HEAD request or range request to be lightweight
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) {
        lyricsAvailabilityCache.set(track.path, true);
        return true;
      }
      // If HEAD is not supported or returns 404
      if (res.status === 404) {
        lyricsAvailabilityCache.set(track.path, false);
        return false;
      }
      // Fallback try with GET if HEAD was blocked
      const getRes = await fetch(url, { method: 'GET' });
      const available = getRes.ok;
      lyricsAvailabilityCache.set(track.path, available);
      return available;
    } catch {
      lyricsAvailabilityCache.set(track.path, false);
      return false;
    } finally {
      pendingChecks.delete(track.path);
    }
  })();

  pendingChecks.set(track.path, checkPromise);
  return checkPromise;
}

/**
 * Synchronous cache lookup for instant rendering if known.
 */
export function getCachedLyricsAvailable(track: Track | null | undefined): boolean | undefined {
  if (!track || !track.path) return false;
  if (track.source === 'yt') return true;
  if (track.hasLyrics !== undefined) return track.hasLyrics;
  if (track.lrc && track.lrc.trim().length > 0) return true;
  return lyricsAvailabilityCache.get(track.path);
}

/**
 * Mark a set of paths as having lyrics (e.g. from directory listing)
 */
export function seedLyricsAvailability(lrcPaths: Set<string>) {
  // If we receive the full set of .lrc paths from dataset tree
  lrcPaths.forEach(p => {
    lyricsAvailabilityCache.set(p, true);
  });
}
