import { AudioSource, Track } from '../types';

export const HF_CONFIG = {
  HF_USER: "CoolJaat",
  HF_REPO: "my-music-library",
};

export const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg', '.flac'];

// Formats iOS/macOS Safari's <audio> element can actually decode. .ogg and
// .flac are NOT in this list — Safari has no decoder for either, on any
// platform, regardless of Content-Type headers.
const SAFARI_PLAYABLE_EXTENSIONS = new Set(['mp3', 'm4a', 'aac', 'wav']);

/**
 * True for both iOS Safari and desktop macOS Safari (but not Chrome/Firefox
 * running on iOS, which are still just Safari's engine under the hood but
 * report themselves distinctly — CriOS/FxiOS/EdgiOS — and not real Safari).
 */
export function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS|Chromium|Android/i.test(ua);
}

/**
 * Hugging Face serves Git-LFS-tracked audio (i.e. all of it) with
 * Content-Type: application/octet-stream. Chrome/Firefox/Android sniff the
 * bytes and play it fine; Safari refuses outright — that's the entire
 * reason songs fail to play on iPhone/iPad while working everywhere else.
 * For Safari, route through our /api/audio proxy, which overrides the
 * Content-Type with the correct audio/* value before the browser ever sees
 * it. Every other browser keeps streaming straight from the CDN (faster,
 * no server hop, matches the bandwidth-optimization work already in place).
 */
export function getStreamableAudioUrl(track: { path: string; audioUrl: string; source?: AudioSource }): string {
  if (track.source === 'yt' || track.audioUrl?.startsWith('/api/stream')) {
    return track.audioUrl;
  }
  if (!isSafariBrowser()) return track.audioUrl;
  return `/api/audio?user=${encodeURIComponent(HF_CONFIG.HF_USER)}&repo=${encodeURIComponent(HF_CONFIG.HF_REPO)}&file=${encodeURIComponent(track.path)}`;
}

/** True if this file's extension is one Safari can actually decode/play. */
export function isSafariPlayable(path: string): boolean {
  if (!path.includes('.')) return true; // YouTube videoId or generic stream
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return SAFARI_PLAYABLE_EXTENSIONS.has(ext);
}

/**
 * Automatically upgrades thumbnails to full HD resolution (800x800 or 1080p).
 * Replaces Google User Content low-res parameters (=w60-h60...) with =w800-h800-l90-rj
 * and YouTube video thumbnails with maxresdefault.jpg.
 */
export function getHighResCoverUrl(rawUrl: string | undefined | null, videoId?: string): string {
  if (!rawUrl) {
    if (videoId && !videoId.startsWith('MPRE') && !videoId.startsWith('VL') && !videoId.startsWith('UC') && !videoId.includes('.') && !videoId.includes('/')) {
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
    return '';
  }

  // 1. Google User Content (YouTube Music official album artwork)
  if (rawUrl.includes('googleusercontent.com') || rawUrl.includes('ggpht.com')) {
    let upgraded = rawUrl
      .replace(/=w\d+-h\d+[^&?]*/g, '=w800-h800-l90-rj')
      .replace(/=s\d+[^&?]*/g, '=s800-c-k-c0x00ffffff-no-rj');
    if (!upgraded.includes('=w') && !upgraded.includes('=s')) {
      upgraded += '=w800-h800-l90-rj';
    }
    return upgraded;
  }

  // 2. YouTube standard video thumbnail
  if (rawUrl.includes('i.ytimg.com') || rawUrl.includes('img.youtube.com')) {
    if (videoId && !videoId.startsWith('MPRE') && !videoId.startsWith('VL') && !videoId.startsWith('UC') && !videoId.includes('.') && !videoId.includes('/')) {
      // Use hqdefault which is guaranteed to exist across all YouTube videos
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
    return rawUrl;
  }

  return rawUrl;
}

/**
 * Format string into title case, keeping numbers and short acronyms
 */
function formatWords(str: string): string {
  if (!str) return '';
  return str
    .split(' ')
    .filter(Boolean)
    .map(word => {
      if (/^[0-9]+$/.test(word) || (word.toUpperCase() === word && word.length <= 3)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * STRICT PARSING & POSTER DERIVATION RULES:
 * 1. Never display file extensions (.mp3, .jpg, .png, .wav, etc.) in UI.
 * 2. Replace dashes and underscores with clean spacing.
 * 3. Parse "Artist Name - Song Title.mp3":
 *    - Song Title: Display clean song title only.
 *    - Artist Name: Display clean artist name.
 * 4. Poster image URL format:
 *    https://huggingface.co/datasets/CoolJaat/my-music-library/resolve/main/${encodeURIComponent(basename)}.jpg
 */
export function parseTrackMetadata(path: string): {
  title: string;
  artist: string;
  basename: string;
  posterUrl: string;
  audioUrl: string;
} {
  // Extract filename from path
  const filename = path.split('/').pop() || path;

  // Remove any audio/image file extensions strictly
  const basename = filename.replace(/\.(mp3|wav|m4a|ogg|flac|jpg|jpeg|png)$/gi, '');

  // Direct Hugging Face asset endpoints
  const posterUrl = `https://huggingface.co/datasets/${HF_CONFIG.HF_USER}/${HF_CONFIG.HF_REPO}/resolve/main/${encodeURIComponent(basename)}.jpg`;
  const audioUrl = `https://huggingface.co/datasets/${HF_CONFIG.HF_USER}/${HF_CONFIG.HF_REPO}/resolve/main/${encodeURIComponent(path)}`;

  // Clean string by replacing underscores with spaces
  let cleanStr = basename.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

  // Parse "Song Title - Artist Name" or "Artist - Title" format
  if (cleanStr.includes(' - ')) {
    const parts = cleanStr.split(' - ');
    const rawTitle = parts[0].trim();
    const rawArtist = parts.slice(1).join(' - ').trim();

    const title = formatWords(rawTitle);
    const artist = formatWords(rawArtist);

    return {
      title: title || 'Untitled Track',
      artist: artist || 'CoolJaat',
      basename,
      posterUrl,
      audioUrl,
    };
  } else if (cleanStr.includes('-')) {
    const parts = cleanStr.split('-');
    const rawTitle = parts[0].trim();
    const rawArtist = parts.slice(1).join('-').trim();

    const title = formatWords(rawTitle);
    const artist = formatWords(rawArtist);

    return {
      title: title || 'Untitled Track',
      artist: artist || 'CoolJaat',
      basename,
      posterUrl,
      audioUrl,
    };
  }

  // Fallback if no dash separator
  const title = formatWords(cleanStr);
  return {
    title: title || 'Untitled Track',
    artist: 'CoolJaat',
    basename,
    posterUrl,
    audioUrl,
  };
}

/**
 * Backward compatible cleanFileName helper
 */
export function cleanFileName(path: string): string {
  return parseTrackMetadata(path).title;
}

/**
 * Generate deterministic vivid gradient color pairs from a string hash
 */
export function getGradientColors(str: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const palettes: [string, string][] = [
    ['#FF3366', '#191414'], // Spotify Green & Dark
    ['#8E2DE2', '#4A00E0'], // Vivid Violet
    ['#FF416C', '#8A2387'], // Neon Rose & Purple
    ['#00B4DB', '#0083B0'], // Deep Electric Cyan
    ['#F7971E', '#FFD200'], // Warm Amber
    ['#FC466B', '#3F5EFB'], // Electric Crimson & Blue
    ['#00F2FE', '#4FACFE'], // Bright Turquoise
    ['#11998E', '#38EF7D'], // Emerald Mint
  ];

  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a dynamic SVG cover art Data URL as fallback
 */
export function generateCoverArt(title: string, artist: string, colors: [string, string]): string {
  const rawInitials = title
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const initials = escapeXml(rawInitials);
  const displayTitle = escapeXml(title.length > 22 ? title.substring(0, 20) + '...' : title);
  const displayArtist = escapeXml(artist.length > 25 ? artist.substring(0, 23) + '...' : artist);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colors[0]}" />
          <stop offset="100%" stop-color="${colors[1]}" />
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000" flood-opacity="0.4"/>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
      
      <!-- Abstract decorative circles -->
      <circle cx="240" cy="60" r="90" fill="white" fill-opacity="0.08" />
      <circle cx="60" cy="240" r="110" fill="black" fill-opacity="0.15" />
      
      <!-- Initials Badge -->
      <circle cx="150" cy="115" r="45" fill="black" fill-opacity="0.25" filter="url(#shadow)" />
      <text x="150" y="127" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="36" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">
        ${initials || '🎵'}
      </text>
      
      <!-- Title text -->
      <text x="150" y="185" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="16" fill="#FFFFFF" text-anchor="middle">
        ${displayTitle}
      </text>
      <text x="150" y="210" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="500" font-size="13" fill="#FFFFFF" fill-opacity="0.75" text-anchor="middle">
        ${displayArtist}
      </text>
    </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Format seconds into mm:ss
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Time-based dynamic greeting
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  } else if (hour >= 12 && hour < 18) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

/**
 * Fisher-Yates shuffle — returns a new, randomly-ordered copy of the array.
 * Used so the home page never shows tracks alphabetically and reshuffles
 * every time the app is opened.
 */
export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Build direct HF audio streaming URL
 */
export function getHFAudioUrl(user: string, repo: string, path: string): string {
  return `https://huggingface.co/datasets/${user}/${repo}/resolve/main/${encodeURIComponent(path)}`;
}

