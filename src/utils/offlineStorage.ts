import { Track } from '../types';

const DB_NAME = 'SpotifyMineOfflineDB';
const DB_VERSION = 1;
const STORE_TRACKS = 'downloaded_tracks';
const STORE_BLOBS = 'audio_blobs';

export interface DownloadedTrackData {
  track: Track;
  lrcText?: string;
  downloadedAt: number;
}

let dbInstance: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Download a track (audio blob + LRC lyrics + metadata)
export async function downloadTrack(
  track: Track,
  onProgress?: (percent: number) => void
): Promise<void> {
  const db = await getDB();

  // 1. Fetch Audio File
  const audioRes = await fetch(track.audioUrl);
  if (!audioRes.ok) throw new Error('Failed to download audio file');

  const contentLength = Number(audioRes.headers.get('content-length')) || 0;
  const reader = audioRes.body?.getReader();
  const chunks: Uint8Array[] = [];
  let receivedLength = 0;

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedLength += value.length;
        if (contentLength > 0 && onProgress) {
          onProgress(Math.round((receivedLength / contentLength) * 100));
        }
      }
    }
  }

  const audioBlob = new Blob(chunks, { type: audioRes.headers.get('content-type') || 'audio/mpeg' });

  // 2. Try fetching LRC synced lyrics
  let lrcText: string | undefined = track.lrc;
  if (!lrcText) {
    try {
      const lrcPath = track.path.replace(/\.[^/.]+$/, '.lrc');
      const lrcUrl = `https://huggingface.co/datasets/CoolJaat/my-music-library/resolve/main/${encodeURIComponent(lrcPath)}`;
      const lrcRes = await fetch(lrcUrl);
      if (lrcRes.ok) {
        lrcText = await lrcRes.text();
      }
    } catch {
      // Ignore missing LRC
    }
  }

  // 3. Store Audio Blob and Metadata in IndexedDB
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_TRACKS, STORE_BLOBS], 'readwrite');
    const tracksStore = tx.objectStore(STORE_TRACKS);
    const blobsStore = tx.objectStore(STORE_BLOBS);

    const trackData: DownloadedTrackData = {
      track: {
        ...track,
        lrc: lrcText,
      },
      lrcText,
      downloadedAt: Date.now(),
    };

    tracksStore.put({ id: track.id, ...trackData });
    blobsStore.put(audioBlob, track.id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Remove downloaded track
export async function removeDownloadedTrack(trackId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRACKS, STORE_BLOBS], 'readwrite');
    tx.objectStore(STORE_TRACKS).delete(trackId);
    tx.objectStore(STORE_BLOBS).delete(trackId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Get all downloaded track IDs
export async function getDownloadedTrackIds(): Promise<string[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const request = tx.objectStore(STORE_TRACKS).getAllKeys();
    request.onsuccess = () => resolve((request.result as string[]) || []);
    request.onerror = () => reject(request.error);
  });
}

// Get all downloaded tracks with blob URLs
export async function getAllDownloadedTracks(): Promise<{ track: Track; lrcText?: string }[]> {
  const db = await getDB();
  const trackEntries: any[] = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const request = tx.objectStore(STORE_TRACKS).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

  const result: { track: Track; lrcText?: string }[] = [];

  for (const entry of trackEntries) {
    const blob: Blob | null = await new Promise((resolve) => {
      const tx = db.transaction(STORE_BLOBS, 'readonly');
      const request = tx.objectStore(STORE_BLOBS).get(entry.id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });

    if (blob) {
      const localBlobUrl = URL.createObjectURL(blob);
      result.push({
        track: {
          ...entry.track,
          audioUrl: localBlobUrl,
        },
        lrcText: entry.lrcText,
      });
    }
  }

  return result;
}

// Get local audio URL for a single track if downloaded
export async function getLocalAudioUrl(trackId: string): Promise<string | null> {
  const db = await getDB();
  const blob: Blob | null = await new Promise((resolve) => {
    const tx = db.transaction(STORE_BLOBS, 'readonly');
    const request = tx.objectStore(STORE_BLOBS).get(trackId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });

  if (blob) {
    return URL.createObjectURL(blob);
  }
  return null;
}
