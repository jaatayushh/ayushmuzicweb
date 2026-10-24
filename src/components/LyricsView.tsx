import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Track } from '../types';
import { parseLrc, parseYamlLyrics, LyricsData } from '../utils/lyricsParser';
import { Sparkles, Music, Mic2, Play, Pause, AlignCenter, Loader2 } from 'lucide-react';
import { generateCoverArt, getHighResCoverUrl } from '../utils/audioUtils';

type FetchState = 'idle' | 'loading' | 'found' | 'not_found';

interface LyricsViewProps {
  audioRef?: React.RefObject<HTMLAudioElement>;
  currentTrack: Track | null;
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onPlayPause?: () => void;
  rawLrc?: string;
}

export const LyricsView: React.FC<LyricsViewProps> = ({
  audioRef,
  currentTrack,
  currentTime,
  isPlaying,
  onSeek,
  onPlayPause,
  rawLrc,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const userScrollTimerRef = useRef<any>(null);
  const handleUserScroll = useCallback(() => {
    setAutoScroll(false);
    if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
    userScrollTimerRef.current = setTimeout(() => {
      setAutoScroll(true);
    }, 3500);
  }, []);
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const fetchAbortRef = useRef<AbortController | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Parse rawLrc if provided (mostly for fallback/testing)
  const rawLrcData = useMemo(() => {
    if (!rawLrc) return null;
    return parseLrc(rawLrc);
  }, [rawLrc]);

  useEffect(() => {
    if (!currentTrack) {
      setLyricsData(null);
      setFetchState('idle');
      return;
    }

    if (rawLrcData) {
      setLyricsData(rawLrcData);
      setFetchState('found');
      return;
    }

    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }

    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setFetchState('loading');
    setLyricsData(null);
    setActiveIndex(-1);

    const basePath = currentTrack.path.replace(/\.[^/.]+$/, '');
    const yamlPath = basePath + '.lyrics.yaml';
    const lrcPath = basePath + '.lrc';
    
    const baseUrl = 'https://huggingface.co/datasets/CoolJaat/my-music-library/resolve/main/';
    const yamlUrl = baseUrl + encodeURIComponent(yamlPath);
    const lrcUrl = baseUrl + encodeURIComponent(lrcPath);

    const fetchLyrics = async () => {
      // If it's a YouTube track, fetch from LRCLIB first with YouTube fallback
      if (currentTrack.source === 'yt' || !currentTrack.path.includes('.')) {
        try {
          const cleanTitle = currentTrack.title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
          const cleanArtist = currentTrack.artist.replace(/\(.*?\)|\[.*?\]/g, '').trim();
          const vid = currentTrack.path || (currentTrack.id || '').replace(/^yt_/, '');
          const lrclibUrl = `/api/lyrics?title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(cleanArtist)}&duration=${Math.round(currentTrack.duration || 0)}&videoId=${encodeURIComponent(vid)}`;
          const lrclibRes = await fetch(lrclibUrl, { signal: controller.signal });
          if (lrclibRes.ok) {
            const lrcData = await lrclibRes.json();
            if (lrcData.syncedLyrics) {
              const parsed = parseLrc(lrcData.syncedLyrics);
              if (parsed.lines.length > 0) {
                setLyricsData(parsed);
                setFetchState('found');
                return;
              }
            } else if (lrcData.plainLyrics) {
              const plainLines = lrcData.plainLyrics.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
              const totalDuration = currentTrack.duration || 180;
              const step = totalDuration / Math.max(1, plainLines.length);
              const dummyLines = plainLines.map((text: string, idx: number) => ({
                id: `plain_${idx}`,
                time: idx * step,
                text: text.trim(),
              }));
              setLyricsData({ mode: 'line', lines: dummyLines });
              setFetchState('found');
              return;
            }
          }
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }

      try {
        // 1. Try YAML first
        const yamlRes = await fetch(yamlUrl, { signal: controller.signal });
        if (yamlRes.ok) {
          const text = await yamlRes.text();
          const parsed = parseYamlLyrics(text);
          if (parsed) {
            setLyricsData(parsed);
            setFetchState('found');
            return;
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }

      try {
        // 2. Fallback to LRC
        const lrcRes = await fetch(lrcUrl, { signal: controller.signal });
        if (lrcRes.ok) {
          const text = await lrcRes.text();
          const parsed = parseLrc(text);
          setLyricsData(parsed);
          setFetchState('found');
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }

      // 3. Fallback to LRCLIB / YouTube Music if not already checked
      try {
        const cleanTitle = currentTrack.title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
        const cleanArtist = currentTrack.artist.replace(/\(.*?\)|\[.*?\]/g, '').trim();
        const vid = currentTrack.path || (currentTrack.id || '').replace(/^yt_/, '');
        const lrclibUrl = `/api/lyrics?title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(cleanArtist)}&duration=${Math.round(currentTrack.duration || 0)}&videoId=${encodeURIComponent(vid)}`;
        const lrclibRes = await fetch(lrclibUrl, { signal: controller.signal });
        if (lrclibRes.ok) {
          const lrcData = await lrclibRes.json();
          if (lrcData.syncedLyrics) {
            const parsed = parseLrc(lrcData.syncedLyrics);
            if (parsed.lines.length > 0) {
              setLyricsData(parsed);
              setFetchState('found');
              return;
            }
          } else if (lrcData.plainLyrics) {
            const plainLines = lrcData.plainLyrics.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
            const totalDuration = currentTrack.duration || 180;
            const step = totalDuration / Math.max(1, plainLines.length);
            const dummyLines = plainLines.map((text: string, idx: number) => ({
              id: `plain_${idx}`,
              time: idx * step,
              text: text.trim(),
            }));
            setLyricsData({ mode: 'line', lines: dummyLines });
            setFetchState('found');
            return;
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }

      setFetchState('not_found');
      setLyricsData(null);
    };

    fetchLyrics();

    return () => {
      controller.abort();
    };
  }, [currentTrack, rawLrcData]);

  // Animation Loop for Syncing
  const requestRef = useRef<number>();
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  
  useEffect(() => {
    if (!lyricsData || lyricsData.lines.length === 0) return;

    const updateSync = () => {
      // Get the most accurate time: ignore silent carrier audio elements
      const isSilentCarrier = audioRef?.current?.src?.includes('data:') || audioRef?.current?.src?.includes('blob:');
      const time = (!isSilentCarrier && audioRef?.current && !isNaN(audioRef.current.currentTime) && audioRef.current.currentTime > 0)
        ? audioRef.current.currentTime
        : (currentTimeRef.current ?? currentTime ?? 0);

      // 1. Find active line
      let newActiveIndex = -1;
      for (let i = lyricsData.lines.length - 1; i >= 0; i--) {
        if (time >= lyricsData.lines[i].time) {
          newActiveIndex = i;
          break;
        }
      }
      
      setActiveIndex(prev => {
        if (prev !== newActiveIndex && autoScroll && newActiveIndex >= 0) {
          // Trigger smooth scroll when line changes
          setTimeout(() => {
             if (!containerRef.current) return;
             const lineEl = containerRef.current.querySelector(
               `[data-lyric-index="${newActiveIndex}"]`
             ) as HTMLElement;
             if (lineEl) {
               lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
             }
          }, 0);
        }
        return newActiveIndex;
      });

      // 2. If WORD-SYNC mode, update word highlights via direct DOM manipulation for max performance
      if (lyricsData.mode === 'word' && containerRef.current) {
        const activeLineEl = containerRef.current.querySelector(`[data-lyric-index="${newActiveIndex}"]`);
        if (activeLineEl) {
          const wordSpans = activeLineEl.querySelectorAll<HTMLSpanElement>('.lyric-word');
          const lineWords = lyricsData.lines[newActiveIndex]?.words || [];
          
          wordSpans.forEach((span, idx) => {
            const wordTime = lineWords[idx]?.time || 0;
            const wordDuration = lineWords[idx]?.duration || 0.3; // fallback duration
            
            if (time >= wordTime && time <= wordTime + wordDuration) {
               // Currently singing this word
               span.style.opacity = '1';
               span.style.color = '#FF3366'; // Active highlight color
               span.style.transform = 'scale(1.05)';
            } else if (time > wordTime + wordDuration) {
               // Already sung
               span.style.opacity = '1';
               span.style.color = '#ffffff';
               span.style.transform = 'scale(1)';
            } else {
               // Not yet sung
               span.style.opacity = '0.3';
               span.style.color = '#ffffff';
               span.style.transform = 'scale(1)';
            }
          });
        }
        
        // Ensure previous lines are fully lit and next lines are dimmed (handled by React render mostly, but can do it here if needed)
      }

      // Schedule next frame
      requestRef.current = requestAnimationFrame(updateSync);
    };

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(updateSync);
    } else {
      // Run once to update if paused/seeking
      updateSync();
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [lyricsData, isPlaying, currentTime, autoScroll, audioRef]);

  useEffect(() => {
    if (autoScroll && activeIndex >= 0 && containerRef.current) {
      const lineEl = containerRef.current.querySelector(
        `[data-lyric-index="${activeIndex}"]`
      ) as HTMLElement;
      if (lineEl) {
        lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [autoScroll, activeIndex]);


  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-20 gap-4">
        <div className="relative">
          <Music className="w-16 h-16 text-zinc-700" />
          <div className="absolute inset-0 w-16 h-16 rounded-full bg-zinc-800/30 animate-ping" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-zinc-400">No song selected</p>
          <p className="text-xs text-zinc-600 mt-1">Play a track to view synced lyrics</p>
        </div>
      </div>
    );
  }

  const fallbackSvg = generateCoverArt(currentTrack.title, currentTrack.artist, currentTrack.gradientColors);
  const coverArt =
    getHighResCoverUrl(currentTrack.coverArtUrl, currentTrack.path) || fallbackSvg;

  const accentColor = currentTrack.gradientColors[0] || '#FF3366';
  const isLoading = fetchState === 'loading' && !rawLrc;
  const noLyricsAvailable = fetchState === 'not_found' && !rawLrc;

  return (
    <div
      className="relative flex flex-col h-full w-full rounded-3xl overflow-hidden shadow-2xl select-none bg-black"
    >
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 55% at 50% 0%, ${accentColor}55, transparent 70%)`,
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-48 opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 100% at 50% 100%, ${accentColor}44, transparent 70%)`,
        }}
      />

      {/* HEADER */}
      <div
        className="relative z-10 flex items-center justify-between px-5 py-3.5 shrink-0"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(10,10,10,0.70)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              src={coverArt}
              alt={currentTrack.title}
              onError={(e) => {
                const currentSrc = e.currentTarget.src;
                if (currentSrc.includes('maxresdefault.jpg')) {
                  e.currentTarget.src = currentSrc.replace('maxresdefault.jpg', 'hqdefault.jpg');
                } else {
                  e.currentTarget.src = fallbackSvg;
                }
              }}
              className="w-10 h-10 rounded-xl object-cover shadow-lg"
              style={{ border: '1.5px solid rgba(255,255,255,0.12)' }}
            />
            {isPlaying && (
              <span
                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Mic2 className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: accentColor }}>
                Lyrics
              </span>
            </div>
            <p className="text-[13px] font-bold text-white truncate leading-tight">{currentTrack.title}</p>
            <p className="text-[11px] text-zinc-500 truncate">{currentTrack.artist}</p>
          </div>
        </div>

        <button
          onClick={() => setAutoScroll(prev => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0"
          style={
            autoScroll
              ? { background: `${accentColor}22`, border: `1px solid ${accentColor}55`, color: accentColor }
              : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#71717a' }
          }
          title={autoScroll ? 'Auto-scroll On' : 'Auto-scroll Off'}
        >
          <AlignCenter className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{autoScroll ? 'Auto Scroll' : 'Manual'}</span>
        </button>
      </div>

      {/* BODY */}
      <div
        ref={containerRef}
        onWheel={handleUserScroll}
        onTouchMove={handleUserScroll}
        className="relative z-10 flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: accentColor }} />
            <p className="text-sm font-semibold text-zinc-500">Loading lyrics…</p>
          </div>
        )}

        {noLyricsAvailable && (
          <div className="flex flex-col items-center justify-center h-full gap-5 py-20 px-8 text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Music className="w-9 h-9 text-zinc-600" />
            </div>
            <div>
              <p className="text-base font-bold text-zinc-300 mb-1">No lyrics available</p>
              <p className="text-xs text-zinc-600 leading-relaxed max-w-xs mx-auto">
                Synchronized lyrics aren't available for this track yet
              </p>
            </div>
          </div>
        )}

        {!isLoading && !noLyricsAvailable && lyricsData && lyricsData.lines.length > 0 && (
          <div className="px-6 py-20 space-y-4">
            {activeIndex === -1 && (
              <div
                className="text-white font-bold text-3xl leading-snug transition-all duration-300 opacity-100 origin-left scale-105"
              >
                ...
              </div>
            )}
            {lyricsData.lines.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;

              return (
                <div
                  key={line.id}
                  data-lyric-index={idx}
                  onClick={() => { onSeek(line.time); setAutoScroll(true); }}
                  className="cursor-pointer group relative py-1"
                >
                  <p
                    className="transition-all duration-300 origin-left"
                    style={{
                      fontSize: '32px',
                      fontWeight: 800,
                      lineHeight: '1.2',
                      letterSpacing: '-0.04em',
                      color: '#ffffff',
                      // For line-sync, we just fade inactive lines. For word-sync, we render words inside.
                      opacity: lyricsData.mode === 'line' ? (isActive ? 1 : 0.3) : 1,
                      transform: lyricsData.mode === 'line' ? (isActive ? 'scale(1.02)' : 'scale(1)') : 'none',
                    }}
                    onMouseEnter={(e) => { 
                      if (lyricsData.mode === 'line' && !isActive) e.currentTarget.style.opacity = '1'; 
                    }}
                    onMouseLeave={(e) => { 
                      if (lyricsData.mode === 'line' && !isActive) e.currentTarget.style.opacity = '0.3'; 
                    }}
                  >
                    {lyricsData.mode === 'word' && line.words && line.words.length > 0 ? (
                      line.words.map((w, wIdx) => {
                         // Initial render state for word-sync
                         const wordOpacity = isPast ? '1' : (isActive ? '0.3' : '0.3');
                         return (
                           <span
                             key={wIdx}
                             className="lyric-word transition-all inline-block mr-[0.25em]"
                             style={{
                               opacity: wordOpacity,
                               color: '#ffffff',
                               transform: 'scale(1)',
                               transformOrigin: 'left bottom',
                               transitionDuration: '150ms'
                             }}
                           >
                             {w.text}
                           </span>
                         )
                      })
                    ) : (
                      <>{line.text}</>
                    )}
                  </p>
                </div>
              );
            })}
            <div className="h-24" />
          </div>
        )}
      </div>

      {/* FOOTER BAR */}
      <div
        className="relative z-10 px-5 py-3 shrink-0 flex items-center justify-between"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(10,10,10,0.80)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3">
          {onPlayPause && (
            <button
              onClick={onPlayPause}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
              style={{ background: accentColor }}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-black text-black" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-black text-black translate-x-0.5" />
              )}
            </button>
          )}
          <span className="text-[11px] font-mono font-semibold text-zinc-500">
            {lyricsData && lyricsData.lines.length > 0
              ? `Line ${Math.max(activeIndex + 1, 1)} / ${lyricsData.lines.length}`
              : isLoading
              ? 'Loading…'
              : 'No lyrics'}
          </span>
        </div>

        {!autoScroll && lyricsData && lyricsData.lines.length > 0 && (
          <button
            onClick={() => setAutoScroll(true)}
            className="flex items-center gap-1.5 text-[11px] font-bold transition-all hover:opacity-80 px-3 py-1.5 rounded-full"
            style={{
              color: accentColor,
              background: `${accentColor}15`,
              border: `1px solid ${accentColor}30`,
            }}
          >
            <Sparkles className="w-3 h-3" />
            Re-sync
          </button>
        )}
      </div>
    </div>
  );
};
