import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import {
  ActiveTab,
  AiPlaylist,
  Playlist,
  RepeatMode,
  ToastMessage,
  Track
} from './types';
import {
  parseTrackMetadata,
  HF_CONFIG,
  SUPPORTED_AUDIO_EXTENSIONS,
  shuffleArray,
  getStreamableAudioUrl,
  isSafariBrowser,
  isSafariPlayable,
  getHighResCoverUrl
} from './utils/audioUtils';
import { Storage } from './utils/storage';
import { seedLyricsAvailability } from './utils/lyricsUtils';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MainView } from './components/MainView';
import { PlayerBar } from './components/PlayerBar';
import { QueueModal } from './components/QueueModal';
import { Toast } from './components/Toast';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { ExpandedNowPlayingModal } from './components/ExpandedNowPlayingModal';
import { InstallAppModal } from './components/InstallAppModal';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function App() {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Helper to add notification toasts
  const addToast = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // "Install App" (PWA) State
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    const installedHandler = () => setDeferredInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  // Maximized Full-Screen Player State
  const [isMaximizedPlayerOpen, setIsMaximizedPlayerOpen] = useState(false);
  const [maximizedInitialTab, setMaximizedInitialTab] = useState<'art' | 'lyrics'>('art');

  // Audio Tracks 
  const [tracks, setTracks] = useState<Track[]>([]);
  // AI-generated daily playlists (Punjabi Mix, Haryanvi Mix, Hindi Mix,
  // Love Mix...) — same for every visitor for the day, regenerated once
  // every 24h server-side.
  const [aiPlaylists, setAiPlaylists] = useState<AiPlaylist[]>([]);

  const [isLoadingHF, setIsLoadingHF] = useState(false);

  // Playlists & Local State
  const [playlists, setPlaylists] = useState<Playlist[]>(() => Storage.getCustomPlaylists());
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>(() => Storage.getLikedTrackIds());

  // Player State
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState<number>(() => Storage.getVolume());
  const [isMuted, setIsMutedState] = useState<boolean>(() => Storage.getMuted());
  const [isShuffle, setIsShuffle] = useState(true);
  // Last few track ids played during smart shuffle, so it doesn't repeat
  // the same handful of songs back-to-back. A ref (not state) since it's
  // only read/written at track-transition time, never needs to re-render.
  const recentlyShuffledIdsRef = useRef<string[]>([]);
  // Stable shuffled play order — computed once when shuffle is switched on
  // (and reshuffled only after a full pass completes), instead of being
  // re-randomized on every render/re-shuffle-in-place.
  const [shuffledOrder, setShuffledOrder] = useState<Track[]>([]);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [userQueue, setUserQueue] = useState<Track[]>([]);
  const [isAutoplay, setIsAutoplay] = useState(true);

  // Sidebar Collapse State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Playlist Modals State
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);

  // Silent 1-second audio carrier for native background playback and Lock-Screen MediaSession
  const SILENT_AUDIO_WAV =
    'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

  // Audio Ref — rendered as a real DOM element below
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);
  const isYtTrackActiveRef = useRef<boolean>(false);
  const pendingYtTrackRef = useRef<Track | null>(null);
  const [, setPreloadedTrackId] = useState<string | null>(null);

  // Mutable refs to prevent stale closure bugs in third-party async listeners
  const handleNextTrackRef = useRef<() => void>(() => {});
  const handlePrevTrackRef = useRef<() => void>(() => {});
  const handleTogglePlayPauseRef = useRef<() => void>(() => {});
  const handleSeekRef = useRef<(time: number) => void>(() => {});
  const currentTrackRef = useRef<Track | null>(null);
  const repeatModeRef = useRef<RepeatMode>('off');
  const isPlayingRef = useRef<boolean>(false);
  const isTransitioningRef = useRef<boolean>(false);

  // Chunked-streaming buffered progress (drives the grey "downloaded" bar)
  const [bufferedPercent, setBufferedPercent] = useState(0);

  // Auto-generated playlists: play counts & recently played (persisted locally)
  const [playCounts, setPlayCounts] = useState<Record<string, number>>(() => Storage.getPlayCounts());
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>(() => Storage.getRecentlyPlayed());
  const [playedTrackIds, setPlayedTrackIds] = useState<string[]>([]);

  // Dynamic Home Feed Grounded in Recently Played Songs
  const [homeRelatedTracks, setHomeRelatedTracks] = useState<Track[]>([]);

  useEffect(() => {
    const recentIds = Storage.getRecentlyPlayed();
    if (recentIds.length === 0) return;
    const latestId = recentIds[0];
    const latest = tracks.find((t) => t.id === latestId);
    const videoId = latest?.path || latestId.replace(/^yt_/, '');
    if (!videoId || videoId.startsWith('hf_')) return;

    fetch(`/api/related?videoId=${encodeURIComponent(videoId)}&title=${encodeURIComponent(latest?.title || '')}&artist=${encodeURIComponent(latest?.artist || '')}`)
      .then((r) => (r.ok ? r.json() : { tracks: [] }))
      .then((data) => {
        if (Array.isArray(data.tracks) && data.tracks.length > 0) {
          setHomeRelatedTracks(data.tracks);
        }
      })
      .catch(() => {});
  }, [recentlyPlayedIds, tracks]);

  const isYouTubeTrack = useCallback((track: Track | null): boolean => {
    if (!track) return false;
    if (track.source === 'yt') return true;
    if (track.audioUrl && (track.audioUrl.includes('videoId=') || track.audioUrl.startsWith('/api/stream'))) return true;
    if (track.path && !track.path.includes('.') && !track.path.includes('/') && track.path.length >= 10) return true;
    return false;
  }, []);

  const isBenignPlayError = useCallback((err: any) => {
    return (
      err?.name === 'AbortError' ||
      err?.message?.includes('interrupted') ||
      err?.message?.includes('pause') ||
      err?.message?.includes('removed')
    );
  }, []);

  const playTrackAudio = useCallback(
    (track: Track) => {
      if (isYouTubeTrack(track)) {
        isYtTrackActiveRef.current = true;
        // Keep native audio element actively playing with silent carrier so mobile OS keeps background audio alive & shows lock screen media session
        const audio = audioRef.current;
        if (audio) {
          if (audio.src !== SILENT_AUDIO_WAV) {
            audio.src = SILENT_AUDIO_WAV;
            audio.loop = true;
          }
          audio.play().catch(() => {});
        }

        const yt = ytPlayerRef.current;
        if (yt && isYtReadyRef.current && typeof yt.loadVideoById === 'function') {
          try {
            yt.loadVideoById({ videoId: track.path, startSeconds: 0 });
            yt.playVideo();
          } catch (e) {
            console.warn('Error calling loadVideoById:', e);
          }
        } else {
          pendingYtTrackRef.current = track;
        }

        setIsPlaying(true);
        if (track.duration && track.duration > 0) {
          setDuration(track.duration);
        }
        document.title = `${track.title} • ${track.artist || 'AyushMuzic'}`;
      } else {
        isYtTrackActiveRef.current = false;
        // Pause YouTube player
        const yt = ytPlayerRef.current;
        if (yt && typeof yt.pauseVideo === 'function') {
          try {
            yt.pauseVideo();
          } catch {}
        }

        const audio = audioRef.current;
        if (audio) {
          audio.loop = false;
          const streamUrl = track.audioUrl || getStreamableAudioUrl(track);
          audio.src = streamUrl;
          audio.currentTime = 0;
          audio.load();
          audio
            .play()
            .then(() => {
              setIsPlaying(true);
              document.title = `${track.title} • ${track.artist || 'AyushMuzic'}`;
            })
            .catch((err) => {
              if (!isBenignPlayError(err)) {
                console.error('Play error:', err);
                addToast(`Failed to play ${track.title}.`, 'error');
              }
              setIsPlaying(false);
            });
        }
      }
    },
    [isYouTubeTrack, isBenignPlayError, addToast]
  );

  const markTrackAsPlayed = useCallback((trackId: string) => {
    setPlayedTrackIds((prev) => (prev.includes(trackId) ? prev : [...prev, trackId]));
  }, []);

  const trackPlayStart = useCallback((track: Track) => {
    setPlayCounts(Storage.incrementPlayCount(track.id));
    const updated = Storage.addRecentlyPlayed(track.id);
    setRecentlyPlayedIds(updated);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Dynamic related songs queue based on the currently playing song (Endless Queue)
  const [relatedQueue, setRelatedQueue] = useState<Track[]>([]);
  const [isLoadingMoreQueue, setIsLoadingMoreQueue] = useState(false);

  // Fetch recommended songs related to the playing song (Endless Song Radio)
  const fetchRelatedSongs = useCallback(async (targetTrack: Track, append = false) => {
    if (!targetTrack) return;
    try {
      const queryParams = new URLSearchParams({
        videoId: targetTrack.path || '',
        title: targetTrack.title || '',
        artist: targetTrack.artist || '',
        page: append ? '2' : '1',
      });
      const res = await fetch(`/api/related?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tracks) && data.tracks.length > 0) {
          const freshRelated: Track[] = data.tracks.filter(
            (t: Track) => t.id !== targetTrack.id
          );
          if (append) {
            setRelatedQueue((prev) => {
              const existingIds = new Set([targetTrack.id, ...prev.map((t) => t.id), ...playedTrackIds]);
              const newTracks = freshRelated.filter((t) => !existingIds.has(t.id));
              return [...prev, ...newTracks];
            });
          } else {
            setRelatedQueue(freshRelated);
          }
          // Enrich global pool with these recommendations
          setTracks((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const newTracks = freshRelated.filter((t) => !existingIds.has(t.id));
            return newTracks.length > 0 ? [...prev, ...newTracks] : prev;
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch related songs for queue:', err);
    }
  }, [playedTrackIds]);

  // Endless queue auto-loader (loads more when scrolling or playing through queue)
  const loadMoreRelatedSongs = useCallback(async () => {
    if (isLoadingMoreQueue || !currentTrack) return;
    setIsLoadingMoreQueue(true);
    try {
      const seedTrack = relatedQueue[relatedQueue.length - 1] || currentTrack;
      await fetchRelatedSongs(seedTrack, true);
    } finally {
      setIsLoadingMoreQueue(false);
    }
  }, [isLoadingMoreQueue, currentTrack, relatedQueue, fetchRelatedSongs]);

  // "Up Next" queue derived dynamically according to the playing song
  const upNextQueue = useMemo(() => {
    const userQueueIds = new Set(userQueue.map((t) => t.id));
    const playedSet = new Set(playedTrackIds);

    // Prioritize songs related to the current playing track
    if (relatedQueue.length > 0) {
      const filteredRelated = relatedQueue.filter(
        (t) => t.id !== currentTrack?.id && !userQueueIds.has(t.id) && !playedSet.has(t.id)
      );
      if (filteredRelated.length > 0) {
        return filteredRelated;
      }
    }

    if (tracks.length === 0) return [];

    const baseSequence = isShuffle && shuffledOrder.length > 0 ? shuffledOrder : tracks;
    let unplayed = baseSequence.filter(
      (t) => t.id !== currentTrack?.id && !userQueueIds.has(t.id) && !playedSet.has(t.id)
    );

    if (unplayed.length === 0) {
      unplayed = baseSequence.filter(
        (t) => t.id !== currentTrack?.id && !userQueueIds.has(t.id)
      );
    }

    return unplayed;
  }, [relatedQueue, isShuffle, shuffledOrder, tracks, currentTrack, userQueue, playedTrackIds]);

  // Calculate next upcoming track for smooth preloading & gapless playback
  const getNextTrackToPlay = useCallback((): Track | null => {
    if (userQueue.length > 0) {
      return userQueue[0];
    }
    if (relatedQueue.length > 0) {
      const firstRelated = relatedQueue.find((t) => t.id !== currentTrack?.id && !playedTrackIds.includes(t.id));
      if (firstRelated) return firstRelated;
    }
    if (upNextQueue.length > 0) {
      return upNextQueue[0];
    }
    if (tracks.length === 0) return null;

    const baseSequence = isShuffle && shuffledOrder.length > 0 ? shuffledOrder : tracks;
    const currentIdx = baseSequence.findIndex((t) => t.id === currentTrack?.id);
    if (currentIdx !== -1 && currentIdx < baseSequence.length - 1) {
      return baseSequence[currentIdx + 1];
    }
    return baseSequence[0] || null;
  }, [tracks, userQueue, relatedQueue, upNextQueue, isShuffle, shuffledOrder, currentTrack, playedTrackIds]);

  // Audio Ended Listener (Continuous & Gapless Playback)
  const handleNextTrack = useCallback(async () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 1200);

    const current = currentTrackRef.current;
    let nextTrack: Track | null = null;

    if (userQueue.length > 0) {
      // 1. Pop from manual Add-to-Queue list
      nextTrack = userQueue[0];
      setUserQueue((prev) => prev.slice(1));
    } else if (relatedQueue.length > 0) {
      // 2. Play next song according to the current song's recommendations (skip current or already played)
      const candidate =
        relatedQueue.find((t) => t.id !== current?.id && !playedTrackIds.includes(t.id)) ||
        relatedQueue.find((t) => t.id !== current?.id) ||
        relatedQueue[0];
      nextTrack = candidate;
      setRelatedQueue((prev) => prev.filter((t) => t.id !== candidate.id));
      if (relatedQueue.length <= 5) {
        loadMoreRelatedSongs();
      }
    } else if (upNextQueue.length > 0) {
      // 3. Play exact top item from Up Next queue
      nextTrack = upNextQueue[0];
    } else if (tracks.length > 0) {
      // 4. Fallback to general tracks sequence
      const baseSequence = isShuffle && shuffledOrder.length > 0 ? shuffledOrder : tracks;
      const currentIdx = baseSequence.findIndex((t) => t.id === current?.id);
      if (currentIdx !== -1 && currentIdx < baseSequence.length - 1) {
        nextTrack = baseSequence[currentIdx + 1];
      } else {
        nextTrack = baseSequence[0];
      }
    }

    // Safari (iOS/macOS) fallback for unplayable extensions
    if (nextTrack && isSafariBrowser() && !isSafariPlayable(nextTrack.path)) {
      const playableTracks = tracks.filter((t) => isSafariPlayable(t.path));
      nextTrack = playableTracks.length > 0
        ? playableTracks[Math.floor(Math.random() * playableTracks.length)]
        : null;
    }

    if (nextTrack) {
      setCurrentTrack(nextTrack);
      markTrackAsPlayed(nextTrack.id);
      trackPlayStart(nextTrack);
      setBufferedPercent(0);

      // Keep recommendations fresh according to the newly playing track
      fetchRelatedSongs(nextTrack);

      playTrackAudio(nextTrack);
    }
  }, [tracks, isShuffle, shuffledOrder, userQueue, relatedQueue, upNextQueue, playedTrackIds, markTrackAsPlayed, trackPlayStart, fetchRelatedSongs, loadMoreRelatedSongs, playTrackAudio]);

  handleNextTrackRef.current = handleNextTrack;

  // Preload next upcoming track into browser media cache as soon as current song is playing/loaded
  useEffect(() => {
    if (!currentTrack || tracks.length === 0) return;

    let nextTrack = getNextTrackToPlay();
    if (!nextTrack || nextTrack.id === currentTrack.id) return;

    if (isSafariBrowser() && !isSafariPlayable(nextTrack.path)) {
      const playableTracks = tracks.filter((t) => isSafariPlayable(t.path));
      if (playableTracks.length > 0) {
        nextTrack = playableTracks[0];
      }
    }

    let isMounted = true;

    const runPreload = async () => {
      try {
        const nextUrl = nextTrack!.audioUrl || getStreamableAudioUrl(nextTrack!);

        if (!isMounted || !nextUrl) return;

        // Pre-fetch into browser cache so buffers are pre-warmed for immediate playback
        if (nextUrl.startsWith('http')) {
          fetch(nextUrl, { mode: 'cors', cache: 'force-cache' }).catch(() => {});
        }

        if (isMounted) {
          setPreloadedTrackId(nextTrack!.id);
        }
      } catch (err) {
        console.warn('Preload next track warning:', err);
      }
    };

    // Begin preloading 400ms after track starts so current track playback receives primary bandwidth
    const timer = setTimeout(runPreload, 400);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [currentTrack?.id, userQueue, upNextQueue, isShuffle, shuffledOrder, tracks, getNextTrackToPlay]);

  // Initialize HTML5 Audio Element event listeners
  // The <audio> element itself is rendered in the JSX below (required for iOS Safari)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (isYtTrackActiveRef.current) return;
      setCurrentTime(audio.currentTime);
      if (
        'mediaSession' in navigator &&
        typeof navigator.mediaSession.setPositionState === 'function' &&
        audio.duration &&
        !isNaN(audio.duration) &&
        audio.currentTime <= audio.duration
      ) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate || 1.0,
            position: audio.currentTime,
          });
        } catch {}
      }
    };

    const handleLoadedMetadata = () => {
      if (isYtTrackActiveRef.current) return;
      setDuration(audio.duration || 0);
    };

    const handleProgress = () => {
      try {
        if (audio.buffered.length > 0 && audio.duration) {
          const end = audio.buffered.end(audio.buffered.length - 1);
          setBufferedPercent(Math.min(100, (end / audio.duration) * 100));
        }
      } catch {
        // buffered ranges can throw briefly during src swaps — ignore
      }
    };

    const handleAudioError = (e: Event) => {
      if (isYtTrackActiveRef.current) return;
      console.error('Audio playback error:', e);
      addToast('Error loading audio stream. Skipping to next track...', 'error');
      setIsPlaying(false);
      setTimeout(() => {
        handleNextTrackRef.current();
      }, 1500);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('error', handleAudioError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('error', handleAudioError);
    };
  }, [addToast]);

  // Audio Ended Listener
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (isYtTrackActiveRef.current) return;
      if (repeatModeRef.current === 'one' && currentTrackRef.current) {
        audio.currentTime = 0;
        audio.play().catch((err) => {
          if (!err?.name?.includes('Abort') && !err?.message?.includes('interrupted')) {
            console.error('Repeat play error:', err);
          }
        });
      } else {
        handleNextTrackRef.current();
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Sync Volume & Mute with Both Native Audio and YouTube Background Player
  useEffect(() => {
    const currentVol = isMuted ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = currentVol;
    }
    const yt = ytPlayerRef.current;
    if (yt && typeof yt.setVolume === 'function') {
      try {
        yt.setVolume(currentVol * 100);
        if (isMuted) yt.mute();
        else yt.unMute();
      } catch {}
    }
  }, [volume, isMuted]);

  // YouTube IFrame API background player initialization and time-ticker
  useEffect(() => {
    let ticker: any = null;

    const setupPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      if (ytPlayerRef.current) return;

      try {
        ytPlayerRef.current = new window.YT.Player('youtube-player-mount', {
          height: '200',
          width: '200',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (event: any) => {
              isYtReadyRef.current = true;
              event.target.setVolume(isMuted ? 0 : volume * 100);
              if (pendingYtTrackRef.current) {
                const pending = pendingYtTrackRef.current;
                pendingYtTrackRef.current = null;
                event.target.loadVideoById({ videoId: pending.path, startSeconds: 0 });
                event.target.playVideo();
              }
            },
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                const dur = event.target.getDuration();
                if (dur && !isNaN(dur) && dur > 0) {
                  setDuration(dur);
                }
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
              } else if (event.data === window.YT.PlayerState.ENDED) {
                if (repeatModeRef.current === 'one' && currentTrackRef.current) {
                  event.target.seekTo(0, true);
                  event.target.playVideo();
                } else {
                  handleNextTrackRef.current();
                }
              }
            },
            onError: (err: any) => {
              console.warn('YouTube Player error code:', err?.data);
              setTimeout(() => {
                handleNextTrackRef.current();
              }, 1200);
            },
          },
        });
      } catch (err) {
        console.warn('Failed to construct YT.Player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      setupPlayer();
    } else {
      window.onYouTubeIframeAPIReady = setupPlayer;
    }

    // High frequency ticker to synchronize current time, duration and mediaSession position
    ticker = setInterval(() => {
      if (isYtTrackActiveRef.current && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const t = ytPlayerRef.current.getCurrentTime();
          const d = ytPlayerRef.current.getDuration();
          if (typeof t === 'number' && !isNaN(t) && t >= 0) {
            setCurrentTime(t);
          }
          if (typeof d === 'number' && !isNaN(d) && d > 0) {
            setDuration(d);
            // End-of-track watchdog for mobile:
            // Mobile YouTube iframes often hang/stall in the last 0.6 seconds without firing ENDED
            if (t > 0 && d - t <= 0.6 && !isTransitioningRef.current) {
              if (repeatModeRef.current === 'one' && currentTrackRef.current) {
                ytPlayerRef.current.seekTo(0, true);
              } else {
                handleNextTrackRef.current();
              }
            }
          }
          // Sync MediaSession position state for lock screen scrubber
          if (
            'mediaSession' in navigator &&
            typeof navigator.mediaSession.setPositionState === 'function' &&
            d > 0 &&
            t >= 0 &&
            t <= d
          ) {
            try {
              navigator.mediaSession.setPositionState({
                duration: d,
                playbackRate: 1.0,
                position: t,
              });
            } catch {}
          }
        } catch {}
      }
    }, 250);

    return () => {
      if (ticker) clearInterval(ticker);
    };
  }, [volume, isMuted]);

  // Save Last Played Track position periodically
  useEffect(() => {
    if (currentTrack && currentTime > 0) {
      Storage.setLastPlayed(currentTrack.id, currentTime);
    }
  }, [currentTrack, currentTime]);

  // Fetch Hugging Face Dataset Tree & Apply Strict Poster / Metadata Rules
  const fetchHFMusicLibrary = useCallback(async (isRetry = false) => {
    setIsLoadingHF(true);

    try {
      const response = await fetch(
        `/api/hf-tree?user=${encodeURIComponent(HF_CONFIG.HF_USER)}&repo=${encodeURIComponent(HF_CONFIG.HF_REPO)}`
      );

      if (!response.ok) {
        // Transient blip (cold start, brief HF hiccup)? Try once more
        // silently before bothering the user with an error toast.
        if (!isRetry) {
          setTimeout(() => fetchHFMusicLibrary(true), 1500);
          return;
        }
        const errBody = await response.json().catch(() => null);
        addToast(
          errBody?.error
            ? `Couldn't load your library: ${errBody.error}`
            : "Couldn't load your music library right now. Try refreshing.",
          'error'
        );
        setTracks([]);
        setIsLoadingHF(false);
        return;
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        // Collect all .lrc file basenames / paths from the dataset for instant lookup
        const lrcFileBasenames = new Set<string>();
        const lrcFilePaths = new Set<string>();

        data.forEach((item: any) => {
          if (item.type === 'file' && item.path && item.path.toLowerCase().endsWith('.lrc')) {
            lrcFilePaths.add(item.path);
            const base = item.path.replace(/\.[^/.]+$/, '');
            lrcFileBasenames.add(base.toLowerCase());
          }
        });

        seedLyricsAvailability(lrcFilePaths);

        const audioFiles = data.filter((item: any) => {
          if (item.type !== 'file' || !item.path) return false;
          const ext = item.path.substring(item.path.lastIndexOf('.')).toLowerCase();
          return SUPPORTED_AUDIO_EXTENSIONS.includes(ext);
        });

        let hfTracks: Track[] = [];
        if (audioFiles.length > 0) {
          hfTracks = audioFiles.map((file: any) => {
            const metadata = parseTrackMetadata(file.path);
            const base = file.path.replace(/\.[^/.]+$/, '').toLowerCase();
            const hasLyrics = lrcFileBasenames.has(base);

            return {
              id: `hf_${HF_CONFIG.HF_USER}_${HF_CONFIG.HF_REPO}_${file.path}`,
              path: file.path,
              title: metadata.title,
              artist: metadata.artist,
              album: 'Single',
              duration: 210,
              audioUrl: metadata.audioUrl,
              gradientColors: ['#FF3366', '#0c0c0e'] as [string, string],
              coverArtUrl: metadata.posterUrl,
              size: file.size,
              source: 'hf',
              dateAdded: 'Recently',
              hasLyrics,
            };
          });
        }

        // Also fetch YouTube Music trending / quick picks
        let ytTracks: Track[] = [];
        try {
          const ytRes = await fetch('/api/home');
          if (ytRes.ok) {
            const ytData = await ytRes.json();
            if (Array.isArray(ytData.tracks)) {
              ytTracks = ytData.tracks;
            }
          }
        } catch {
          // ignore
        }

        const combined = [...hfTracks, ...ytTracks];
        setTracks(combined);
      } else {
        // Fallback to YouTube Music home if HF data is not an array
        let ytTracks: Track[] = [];
        try {
          const ytRes = await fetch('/api/home');
          if (ytRes.ok) {
            const ytData = await ytRes.json();
            if (Array.isArray(ytData.tracks)) {
              ytTracks = ytData.tracks;
            }
          }
        } catch {
          // ignore
        }
        setTracks(ytTracks);
      }
    } catch (err: any) {
      // Fallback to YouTube Music home on network failure
      try {
        const ytRes = await fetch('/api/home');
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          if (Array.isArray(ytData.tracks) && ytData.tracks.length > 0) {
            setTracks(ytData.tracks);
            return;
          }
        }
      } catch {
        // ignore
      }
      if (!isRetry) {
        setTimeout(() => fetchHFMusicLibrary(true), 1500);
        return;
      }
      console.warn('Hugging Face dataset offline, YouTube home used instead:', err?.message || err);
      setTracks([]);
    } finally {
      setIsLoadingHF(false);
    }
  }, [addToast]);

  // Mount Fetch
  useEffect(() => {
    fetchHFMusicLibrary();
  }, [fetchHFMusicLibrary]);

  // Shuffle defaults to on, so seed the stable shuffled order as soon as
  // the library loads — otherwise it'd stay empty until the user manually
  // toggled shuffle off and back on.
  useEffect(() => {
    if (isShuffle && tracks.length > 0 && shuffledOrder.length === 0) {
      setShuffledOrder(shuffleArray(tracks));
    }
  }, [isShuffle, tracks, shuffledOrder.length]);

  // Fetch AI-Generated Daily Playlists
  // (Punjabi Mix / Haryanvi Mix / Hindi Mix / Love Mix, etc. — server picks
  // and caches these once per day; every visitor sees the same set.)
  const [rawAiPlaylists, setRawAiPlaylists] = useState<
    { id: string; name: string; emoji: string; description: string; paths: string[] }[]
  >([]);

  useEffect(() => {
    const geminiKey = Storage.getGeminiKey();
    fetch('/api/ai-playlists', {
      headers: geminiKey ? { 'x-gemini-key': geminiKey } : undefined,
    })
      .then((res) => (res.ok ? res.json() : { playlists: [] }))
      .then((data) => setRawAiPlaylists(Array.isArray(data?.playlists) ? data.playlists : []))
      .catch(() => setRawAiPlaylists([]));
  }, []);

  // Resolve each AI playlist's file paths against the loaded track library.
  // Re-runs whenever the library or the raw AI playlist data changes.
  useEffect(() => {
    if (tracks.length === 0 || rawAiPlaylists.length === 0) {
      setAiPlaylists([]);
      return;
    }
    const byPath = new Map(tracks.map((t) => [t.path, t]));
    const resolved: AiPlaylist[] = rawAiPlaylists
      .map((p) => ({
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        description: p.description,
        tracks: p.paths.map((path) => byPath.get(path)).filter((t): t is Track => Boolean(t)),
      }))
      .filter((p) => p.tracks.length > 0);
    setAiPlaylists(resolved);
  }, [tracks, rawAiPlaylists]);

  // Restore Last Played Track from Storage (only once on initial load, never during playback)
  const hasRestoredLastPlayedRef = useRef(false);
  useEffect(() => {
    if (hasRestoredLastPlayedRef.current || currentTrack || isPlaying) return;
    if (tracks.length === 0) return;

    hasRestoredLastPlayedRef.current = true;
    const lastPlayed = Storage.getLastPlayed();
    if (lastPlayed) {
      const track = tracks.find((t) => t.id === lastPlayed.trackId);
      if (track) {
        setCurrentTrack(track);
        if (audioRef.current) {
          audioRef.current.src = getStreamableAudioUrl(track);
        }
        return;
      }
    }
    setCurrentTrack(tracks[0]);
  }, [tracks, currentTrack, isPlaying]);

  // Play Specific Track
  const handlePlayTrack = useCallback(
    async (track: Track, _customQueue?: Track[]) => {
      let willPlay = false;

      if (currentTrack?.id === track.id) {
        handleTogglePlayPause();
        willPlay = !isPlaying;
      } else if (track.source !== 'yt' && isSafariBrowser() && !isSafariPlayable(track.path)) {
        // Safari has no decoder for .ogg/.flac on any platform — bail out
        addToast(`"${track.title}" isn't a format Safari can play. Try it in Chrome instead.`, 'error');
        return;
      } else {
        setCurrentTrack(track);
        setTracks((prev) => (prev.some((t) => t.id === track.id) ? prev : [track, ...prev]));
        markTrackAsPlayed(track.id);
        trackPlayStart(track);
        setBufferedPercent(0);

        // The queue is strictly according to the song played (Song Radio), no matter from where it was started
        setUserQueue([]);

        // Generate dynamic endless queue according to the played song
        fetchRelatedSongs(track);

        playTrackAudio(track);
        willPlay = true;
      }

      if (willPlay) {
        setMaximizedInitialTab('art');
        setIsMaximizedPlayerOpen(true);
      }
    },
    [currentTrack, isPlaying, addToast, trackPlayStart, markTrackAsPlayed, fetchRelatedSongs, playTrackAudio]
  );

  const handleAddToQueue = useCallback((track: Track) => {
    setUserQueue((prev) => {
      if (prev.some((t) => t.id === track.id)) {
        addToast(`"${track.title}" is already in your queue`, 'info');
        return prev;
      }
      addToast(`Added "${track.title}" to queue`, 'success');
      return [...prev, track];
    });
  }, [addToast]);

  // Play / Pause Toggle
  const handleTogglePlayPause = useCallback(() => {
    if (!currentTrack && tracks.length > 0) {
      handlePlayTrack(tracks[0]);
      return;
    }
    if (!currentTrack) return;

    if (isYtTrackActiveRef.current) {
      const yt = ytPlayerRef.current;
      const audio = audioRef.current;
      if (yt && typeof yt.getPlayerState === 'function') {
        try {
          const state = yt.getPlayerState();
          if (state === 1) {
            yt.pauseVideo();
            if (audio) audio.pause();
            setIsPlaying(false);
          } else {
            yt.playVideo();
            if (audio) {
              if (audio.src !== SILENT_AUDIO_WAV) {
                audio.src = SILENT_AUDIO_WAV;
                audio.loop = true;
              }
              audio.play().catch(() => {});
            }
            setIsPlaying(true);
          }
        } catch {
          if (isPlaying) {
            yt.pauseVideo();
            if (audio) audio.pause();
            setIsPlaying(false);
          } else {
            yt.playVideo();
            if (audio) {
              if (audio.src !== SILENT_AUDIO_WAV) {
                audio.src = SILENT_AUDIO_WAV;
                audio.loop = true;
              }
              audio.play().catch(() => {});
            }
            setIsPlaying(true);
          }
        }
      } else {
        setIsPlaying((prev) => !prev);
      }
    } else {
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            if (!isBenignPlayError(err)) {
              console.error('Play error:', err);
              addToast('Playback blocked or failed.', 'error');
            }
          });
      }
    }
  }, [currentTrack, isPlaying, tracks, isBenignPlayError, addToast, handlePlayTrack]);

  handleTogglePlayPauseRef.current = handleTogglePlayPause;

  // Previous Track Logic
  const handlePrevTrack = useCallback(() => {
    if (tracks.length === 0) return;

    if (isYtTrackActiveRef.current) {
      if (currentTime > 3) {
        handleSeek(0);
        return;
      }
    } else {
      const audio = audioRef.current;
      if (audio && audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
      }
    }

    if (playedTrackIds.length >= 2) {
      const prevTrackId = playedTrackIds[playedTrackIds.length - 2];
      const prevTrack = tracks.find((t) => t.id === prevTrackId);
      if (prevTrack) {
        setPlayedTrackIds((prev) => prev.slice(0, -1));
        setCurrentTrack(prevTrack);
        playTrackAudio(prevTrack);
        return;
      }
    }

    const currentIndex = tracks.findIndex((t) => t.id === currentTrack?.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : tracks.length - 1;
    handlePlayTrack(tracks[prevIndex]);
  }, [tracks, currentTrack, playedTrackIds, handlePlayTrack, currentTime, playTrackAudio]);

  handlePrevTrackRef.current = handlePrevTrack;

  // Seek Progress
  const handleSeek = useCallback((time: number) => {
    if (isYtTrackActiveRef.current) {
      const yt = ytPlayerRef.current;
      if (yt && typeof yt.seekTo === 'function') {
        try {
          yt.seekTo(time, true);
        } catch {}
      }
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
      }
    }
    setCurrentTime(time);
    if ('mediaSession' in navigator && typeof navigator.mediaSession.setPositionState === 'function' && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: 1.0,
          position: time,
        });
      } catch {}
    }
  }, [duration]);

  handleSeekRef.current = handleSeek;
  currentTrackRef.current = currentTrack;
  repeatModeRef.current = repeatMode;
  isPlayingRef.current = isPlaying;

  // Volume Change
  const handleVolumeChange = useCallback((newVol: number) => {
    setVolumeState(newVol);
    Storage.setVolume(newVol);
    if (isMuted && newVol > 0) {
      setIsMutedState(false);
      Storage.setMuted(false);
    }
  }, [isMuted]);

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMutedState(nextMuted);
    Storage.setMuted(nextMuted);
  }, [isMuted]);

  // Toggle Shuffle & Repeat Modes
  const handleToggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const nextShuffle = !prev;
      if (nextShuffle) {
        setShuffledOrder(shuffleArray(tracks));
        recentlyShuffledIdsRef.current = [];
        setIsQueueOpen(true);
        addToast('Shuffle On — Opening Up Next Queue', 'info');
      } else {
        addToast('Shuffle Off', 'info');
      }
      return nextShuffle;
    });
  }, [addToast, tracks]);

  const handleToggleRepeat = useCallback(() => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const nextIndex = (modes.indexOf(repeatMode) + 1) % modes.length;
    const nextMode = modes[nextIndex];
    setRepeatMode(nextMode);
    addToast(`Repeat: ${nextMode.toUpperCase()}`, 'info');
  }, [repeatMode, addToast]);

  // Toggle Favorite / Liked Song
  const handleToggleLike = useCallback((trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = Storage.toggleLikedTrack(trackId);
    setLikedTrackIds(updated);
    const isNowLiked = updated.includes(trackId);
    addToast(isNowLiked ? 'Saved to Liked Songs' : 'Removed from Liked Songs', 'info');
  }, [addToast]);

  // Create Custom Playlist
  const handleCreatePlaylist = useCallback(
    (name: string, description?: string) => {
      const newPlaylist: Playlist = {
        id: `pl_${Date.now()}`,
        name,
        description: description || 'Custom User Playlist',
        gradient: 'from-[#FF3366] to-teal-800',
        trackIds: [],
        isCustom: true,
      };

      const updated = [...playlists, newPlaylist];
      setPlaylists(updated);
      Storage.setCustomPlaylists(updated);
      addToast(`Created playlist "${name}"!`, 'success');

      setActivePlaylistId(newPlaylist.id);
      setActiveTab('playlist');
    },
    [playlists, addToast]
  );

  // Toggle Track in Custom Playlist
  const handleToggleTrackInPlaylist = useCallback(
    (trackId: string, playlistId: string) => {
      let plName = '';
      let isAdded = false;
      let newTrackIds: string[] = [];
      const targetTrack = tracks.find((t) => t.id === trackId);

      const updated = playlists.map((pl) => {
        if (pl.id === playlistId) {
          plName = pl.name;
          const exists = pl.trackIds.includes(trackId);
          isAdded = !exists;
          newTrackIds = exists
            ? pl.trackIds.filter((id) => id !== trackId)
            : [...pl.trackIds, trackId];
          return { ...pl, trackIds: newTrackIds };
        }
        return pl;
      });

      setPlaylists(updated);
      Storage.setCustomPlaylists(updated);

      if (targetTrack) {
        if (isAdded) {
          addToast(`Added "${targetTrack.title}" to ${plName}`, 'success');
        } else {
          addToast(`Removed "${targetTrack.title}" from ${plName}`, 'info');
        }
      }
    },
    [playlists, tracks, addToast]
  );

  // Remove Track from Playlist
  const handleRemoveTrackFromPlaylist = useCallback(
    (trackId: string, playlistId: string) => {
      handleToggleTrackInPlaylist(trackId, playlistId);
    },
    [handleToggleTrackInPlaylist]
  );

  // Delete Custom Playlist
  const handleDeletePlaylist = useCallback(
    (playlistId: string) => {
      const pl = playlists.find((p) => p.id === playlistId);
      const updated = playlists.filter((p) => p.id !== playlistId);
      setPlaylists(updated);
      Storage.setCustomPlaylists(updated);

      if (activePlaylistId === playlistId) {
        setActivePlaylistId(null);
        setActiveTab('library');
      }
      addToast(`Deleted playlist "${pl?.name || ''}"`, 'info');
    },
    [playlists, activePlaylistId, addToast]
  );

  // Select Active Playlist
  const handleSelectPlaylist = useCallback((playlistId: string) => {
    setActivePlaylistId(playlistId);
    setActiveTab('playlist');
  }, []);

  // Keyboard Shortcuts (Space, Arrows, M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlayPause();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (audioRef.current) {
          handleSeek(Math.min(audioRef.current.currentTime + 5, duration));
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (audioRef.current) {
          handleSeek(Math.max(audioRef.current.currentTime - 5, 0));
        }
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTogglePlayPause, handleSeek, handleToggleMute, duration]);

  // Helper to ensure absolute URL for media session artwork (required by mobile OS notifications)
  const toAbsoluteUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    try {
      return new URL(url, window.location.origin).href;
    } catch {
      return url;
    }
  };

  // Media Session API — provides lock-screen / notification controls, title, artist, and cover art
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    const highResCover = getHighResCoverUrl(currentTrack.coverArtUrl, currentTrack.path);
    const resolvedArtwork = toAbsoluteUrl(highResCover || currentTrack.coverArtUrl || '/pwa-512x512.png');

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title || 'Unknown Title',
      artist: currentTrack.artist || 'AyushMuzic',
      album: currentTrack.album || 'AyushMuzic',
      artwork: resolvedArtwork
        ? [
            { src: resolvedArtwork, sizes: '512x512', type: 'image/jpeg' },
            { src: resolvedArtwork, sizes: '256x256', type: 'image/jpeg' },
            { src: resolvedArtwork, sizes: '192x192', type: 'image/jpeg' },
            { src: resolvedArtwork, sizes: '96x96', type: 'image/jpeg' },
          ]
        : [],
    });
  }, [currentTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // Use ref-based handlers so we never recreate listeners on every state change and avoid stale closures
    navigator.mediaSession.setActionHandler('play', () => handleTogglePlayPauseRef.current());
    navigator.mediaSession.setActionHandler('pause', () => handleTogglePlayPauseRef.current());
    navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevTrackRef.current());
    navigator.mediaSession.setActionHandler('nexttrack', () => handleNextTrackRef.current());
    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) handleSeekRef.current(details.seekTime);
      });
    } catch {
      // seekto isn't supported in every browser — safe to ignore
    }

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      try {
        navigator.mediaSession.setActionHandler('seekto', null);
      } catch {}
    };
  }, []);

  // --- View Transitions Helper ---
  const navigateTab = useCallback((tab: ActiveTab) => {
    // Check if the browser supports View Transitions API
    if (!document.startViewTransition) {
      setActiveTab(tab);
      return;
    }
    
    // Trigger the native OS-like crossfade/transition animation
    document.startViewTransition(() => {
      flushSync(() => {
        setActiveTab(tab);
      });
    });
  }, []);


  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white font-sans overflow-hidden select-none">
      <audio
        ref={audioRef}
        playsInline
        preload="auto"
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0.001,
          pointerEvents: 'none',
        }}
      />
      <div
        id="youtube-player-mount"
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '200px',
          height: '200px',
          opacity: 1,
          pointerEvents: 'none',
          zIndex: -999,
        }}
      />
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={navigateTab}
          likedCount={likedTrackIds.length}
          playlists={playlists}
          onRequestCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
          activePlaylistId={activePlaylistId}
          setActivePlaylistId={setActivePlaylistId}
          onOpenQueue={() => setIsQueueOpen(true)}
          onCloseSidebar={() => setIsSidebarOpen(false)}
          isSidebarOpen={isSidebarOpen}
        />

        <div className="flex-1 flex flex-col min-w-0 bg-black overflow-hidden">
          <Header
            activeTab={activeTab}
            setActiveTab={navigateTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onOpenInstallModal={() => setIsInstallModalOpen(true)}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            isSidebarOpen={isSidebarOpen}
          />

          <MainView
            activeTab={activeTab}
            setActiveTab={navigateTab}
            tracks={tracks}
            homeRelatedTracks={homeRelatedTracks}
            isLoadingHF={isLoadingHF}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            likedTrackIds={likedTrackIds}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onPlayTrack={(track, customQueue) => {
              handlePlayTrack(track, customQueue);
            }}
            onToggleLike={handleToggleLike}
            playlists={playlists}
            activePlaylistId={activePlaylistId}
            onRequestCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
            onAddToPlaylist={(track) => setAddToPlaylistTrack(track)}
            onAddToQueue={(track) => {
              setUserQueue((prev) => [...prev, track]);
              addToast(`Added "${track.title}" to Queue`, 'success');
            }}
            onRemoveFromPlaylist={handleRemoveTrackFromPlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            onSelectPlaylist={(id) => {
              setActivePlaylistId(id);
              setActiveTab('playlist');
            }}
            onSeek={handleSeek}
            onPlayPause={handleTogglePlayPause}
            playCounts={playCounts}
            recentlyPlayedIds={recentlyPlayedIds}
            onRefreshLibrary={fetchHFMusicLibrary}
            addToast={addToast}
            aiPlaylists={aiPlaylists}
          />
        </div>
      </div>

      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        bufferedPercent={bufferedPercent}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        isLiked={currentTrack ? likedTrackIds.includes(currentTrack.id) : false}
        activeTab={activeTab}
        onPlayPause={handleTogglePlayPause}
        onPrevTrack={handlePrevTrack}
        onNextTrack={handleNextTrack}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleLike={handleToggleLike}
        onOpenQueue={() => setIsQueueOpen(true)}
        onToggleLyrics={() => {
          setMaximizedInitialTab('lyrics');
          setIsMaximizedPlayerOpen(true);
        }}
        onOpenMaximizedPlayer={(tab) => {
          setMaximizedInitialTab(tab || 'art');
          setIsMaximizedPlayerOpen(true);
        }}
      />

      {/* Maximized Full-Screen Player Modal */}
      <ExpandedNowPlayingModal
        isOpen={isMaximizedPlayerOpen}
        onClose={() => setIsMaximizedPlayerOpen(false)}
        audioRef={audioRef}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        bufferedPercent={bufferedPercent}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        isLiked={currentTrack ? likedTrackIds.includes(currentTrack.id) : false}
        initialTab={maximizedInitialTab}
        onPlayPause={handleTogglePlayPause}
        onPrevTrack={handlePrevTrack}
        onNextTrack={handleNextTrack}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleLike={handleToggleLike}
        onOpenQueue={() => setIsQueueOpen(true)}
        queue={upNextQueue}
        userQueue={userQueue}
        isAutoplay={isAutoplay}
        onToggleAutoplay={() => setIsAutoplay((prev) => !prev)}
        onRemoveFromQueue={(idx) => setUserQueue((prev) => prev.filter((_, i) => i !== idx))}
        onPlayTrack={(t) => handlePlayTrack(t)}
        onLoadMoreQueue={loadMoreRelatedSongs}
        isLoadingMore={isLoadingMoreQueue}
      />

      {/* Queue Drawer Modal */}
      <QueueModal
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        queue={upNextQueue}
        userQueue={userQueue}
        currentTrack={currentTrack}
        onPlayTrack={(track) => {
          handlePlayTrack(track);
          setIsQueueOpen(false);
        }}
        isAutoplay={isAutoplay}
        onToggleAutoplay={() => setIsAutoplay(!isAutoplay)}
        onRemoveFromQueue={(index) => setUserQueue((prev) => prev.filter((_, i) => i !== index))}
        isShuffle={isShuffle}
        onLoadMoreQueue={loadMoreRelatedSongs}
        isLoadingMore={isLoadingMoreQueue}
      />

      {/* Create Custom Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
        onCreatePlaylist={handleCreatePlaylist}
      />

      {/* Add Track to Playlist Modal */}
      <AddToPlaylistModal
        isOpen={!!addToPlaylistTrack}
        onClose={() => setAddToPlaylistTrack(null)}
        track={addToPlaylistTrack}
        playlists={playlists}
        onToggleTrackInPlaylist={handleToggleTrackInPlaylist}
        onCreateNewPlaylist={() => setIsCreatePlaylistOpen(true)}
      />

      {/* Pure PWA Install Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredInstallPrompt}
        onInstalled={() => {
          setDeferredInstallPrompt(null);
          addToast('AyushMuzic Web App installed successfully!', 'success');
        }}
      />
    </div>
  );
}
