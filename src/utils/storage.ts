import { Playlist, Track } from '../types';

const KEYS = {
  LIKED_TRACKS: 'spotify_liked_tracks_v1',
  VOLUME: 'spotify_volume_v1',
  MUTED: 'spotify_muted_v1',
  LAST_PLAYED: 'spotify_last_played_v1',
  PLAYLISTS: 'spotify_playlists_v1',
  UPLOADED_TRACKS: 'spotify_uploaded_tracks_v1',
  PLAY_COUNTS: 'spotify_play_counts_v1',
  RECENTLY_PLAYED: 'spotify_recently_played_v1',
  HF_ADMIN_KEY: 'spotify_hf_admin_key_v1',
  GEMINI_KEY: 'spotify_gemini_key_v1',
};

export const Storage = {
  getLikedTrackIds(): string[] {
    try {
      const data = localStorage.getItem(KEYS.LIKED_TRACKS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setLikedTrackIds(ids: string[]): void {
    try {
      localStorage.setItem(KEYS.LIKED_TRACKS, JSON.stringify(ids));
    } catch (e) {
      console.error('Failed to save liked tracks to localStorage', e);
    }
  },

  toggleLikedTrack(id: string): string[] {
    const ids = this.getLikedTrackIds();
    const index = ids.indexOf(id);
    let updated: string[];
    if (index >= 0) {
      updated = ids.filter(i => i !== id);
    } else {
      updated = [...ids, id];
    }
    this.setLikedTrackIds(updated);
    return updated;
  },

  getVolume(): number {
    try {
      const vol = localStorage.getItem(KEYS.VOLUME);
      return vol !== null ? parseFloat(vol) : 1.0;
    } catch {
      return 1.0;
    }
  },

  setVolume(volume: number): void {
    try {
      localStorage.setItem(KEYS.VOLUME, volume.toString());
    } catch (e) {
      console.error('Failed to save volume', e);
    }
  },

  getMuted(): boolean {
    try {
      return localStorage.getItem(KEYS.MUTED) === 'true';
    } catch {
      return false;
    }
  },

  setMuted(muted: boolean): void {
    try {
      localStorage.setItem(KEYS.MUTED, String(muted));
    } catch (e) {
      console.error('Failed to save muted state', e);
    }
  },

  getLastPlayed(): { trackId: string; currentTime: number } | null {
    try {
      const data = localStorage.getItem(KEYS.LAST_PLAYED);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setLastPlayed(trackId: string, currentTime: number): void {
    try {
      localStorage.setItem(KEYS.LAST_PLAYED, JSON.stringify({ trackId, currentTime }));
    } catch (e) {
      console.error('Failed to save last played', e);
    }
  },

  getCustomPlaylists(): Playlist[] {
    try {
      const data = localStorage.getItem(KEYS.PLAYLISTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setCustomPlaylists(playlists: Playlist[]): void {
    try {
      localStorage.setItem(KEYS.PLAYLISTS, JSON.stringify(playlists));
    } catch (e) {
      console.error('Failed to save playlists', e);
    }
  },

  getUploadedTracks(): Track[] {
    try {
      const data = localStorage.getItem(KEYS.UPLOADED_TRACKS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveUploadedTracks(tracks: Track[]): void {
    try {
      localStorage.setItem(KEYS.UPLOADED_TRACKS, JSON.stringify(tracks));
    } catch (e) {
      console.error('Failed to save uploaded tracks', e);
    }
  },

  // ---- Play Counts (powers "Top Played" auto-generated playlist) ----
  getPlayCounts(): Record<string, number> {
    try {
      const data = localStorage.getItem(KEYS.PLAY_COUNTS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  incrementPlayCount(trackId: string): Record<string, number> {
    const counts = this.getPlayCounts();
    counts[trackId] = (counts[trackId] || 0) + 1;
    try {
      localStorage.setItem(KEYS.PLAY_COUNTS, JSON.stringify(counts));
    } catch (e) {
      console.error('Failed to save play counts', e);
    }
    return counts;
  },

  // ---- Recently Played (most-recent first, capped) ----
  getRecentlyPlayed(): string[] {
    try {
      const data = localStorage.getItem(KEYS.RECENTLY_PLAYED);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addRecentlyPlayed(trackId: string): string[] {
    const existing = this.getRecentlyPlayed().filter((id) => id !== trackId);
    const updated = [trackId, ...existing].slice(0, 50);
    try {
      localStorage.setItem(KEYS.RECENTLY_PLAYED, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save recently played', e);
    }
    return updated;
  },

  // ---- Admin: Hugging Face write-access API key (kept in this browser only) ----
  getHfAdminKey(): string {
    try {
      return localStorage.getItem(KEYS.HF_ADMIN_KEY) || '';
    } catch {
      return '';
    }
  },

  setHfAdminKey(key: string): void {
    try {
      if (key) {
        localStorage.setItem(KEYS.HF_ADMIN_KEY, key);
      } else {
        localStorage.removeItem(KEYS.HF_ADMIN_KEY);
      }
    } catch (e) {
      console.error('Failed to save admin key', e);
    }
  },

  // ---- AI Mixes: Gemini API key (kept in this browser only, sent as a
  // request header — never baked into the deployed frontend bundle) ----
  getGeminiKey(): string {
    try {
      return localStorage.getItem(KEYS.GEMINI_KEY) || '';
    } catch {
      return '';
    }
  },

  setGeminiKey(key: string): void {
    try {
      if (key) {
        localStorage.setItem(KEYS.GEMINI_KEY, key);
      } else {
        localStorage.removeItem(KEYS.GEMINI_KEY);
      }
    } catch (e) {
      console.error('Failed to save Gemini key', e);
    }
  },
};
