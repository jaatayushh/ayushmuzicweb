import React, { useState } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  Mic2,
  Disc,
  ListMusic,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  X,
  Radio,
  Download,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { RepeatMode, Track } from '../types';
import { formatTime, generateCoverArt, getHighResCoverUrl } from '../utils/audioUtils';
import { checkLyricsAvailable, getCachedLyricsAvailable } from '../utils/lyricsUtils';
import { LyricsView } from './LyricsView';

interface ExpandedNowPlayingModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioRef?: React.RefObject<HTMLAudioElement>;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedPercent?: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isLiked: boolean;
  initialTab?: 'art' | 'lyrics';
  onPlayPause: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: (trackId: string, e: React.MouseEvent) => void;
  onOpenQueue: () => void;
  queue?: Track[];
  userQueue?: Track[];
  isAutoplay?: boolean;
  onToggleAutoplay?: () => void;
  onRemoveFromQueue?: (index: number) => void;
  onPlayTrack?: (track: Track) => void;
  onLoadMoreQueue?: () => void;
  isLoadingMore?: boolean;
}

export const ExpandedNowPlayingModal: React.FC<ExpandedNowPlayingModalProps> = ({
  isOpen,
  onClose,
  audioRef,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  bufferedPercent = 0,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  isLiked,
  initialTab = 'art',
  onPlayPause,
  onPrevTrack,
  onNextTrack,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onOpenQueue,
  queue = [],
  userQueue = [],
  isAutoplay = false,
  onToggleAutoplay,
  onRemoveFromQueue,
  onPlayTrack,
  onLoadMoreQueue,
  isLoadingMore = false,
}) => {
  const [activeTab, setActiveTab] = useState<'art' | 'lyrics'>(initialTab);
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number>(0);
  const [showQueueSidebar, setShowQueueSidebar] = useState(false);

  const [hasLyrics, setHasLyrics] = useState<boolean>(() => {
    return Boolean(getCachedLyricsAvailable(currentTrack));
  });

  React.useEffect(() => {
    let isSubscribed = true;
    if (!currentTrack) {
      setHasLyrics(false);
      return;
    }

    const cached = getCachedLyricsAvailable(currentTrack);
    if (cached !== undefined) {
      setHasLyrics(cached);
      if (!cached && activeTab === 'lyrics') {
        setActiveTab('art');
      }
      return;
    }

    checkLyricsAvailable(currentTrack).then((avail) => {
      if (isSubscribed) {
        setHasLyrics(avail);
        if (!avail && activeTab === 'lyrics') {
          setActiveTab('art');
        }
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [currentTrack, activeTab]);

  // Sync initial tab when opened
  React.useEffect(() => {
    if (isOpen && initialTab) {
      if (initialTab === 'lyrics' && !hasLyrics) {
        setActiveTab('art');
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab, hasLyrics]);

  if (!isOpen || !currentTrack) return null;

  const fallbackSvg = generateCoverArt(
    currentTrack.title,
    currentTrack.artist,
    currentTrack.gradientColors
  );
  const coverArt = getHighResCoverUrl(currentTrack.coverArtUrl, currentTrack.path) || fallbackSvg;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const effectiveVolume = isMuted ? 0 : volume;

  const handleMouseMoveProgress = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width > 0 && duration > 0) {
      const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const pct = (offsetX / rect.width) * 100;
      const time = (offsetX / rect.width) * duration;
      setHoverPercent(pct);
      setHoverTime(time);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden animate-in slide-in-from-bottom duration-300 select-none bg-black"
    >
      {/* DYNAMIC BACKGROUND ACCORDING TO SONG COVER IMAGE */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-0">
        {/* Full-screen blurred cover art */}
        <img
          src={coverArt}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-150 blur-3xl opacity-40 sm:opacity-50 brightness-75 saturate-150 transition-all duration-700 transform-gpu"
        />
        {/* Radial color aura from track palette */}
        <div
          className="absolute inset-0 transition-colors duration-700"
          style={{
            background: `radial-gradient(ellipse at 50% 35%, ${currentTrack.gradientColors?.[0] || '#FF3366'}55 0%, rgba(0,0,0,0.7) 65%, #000000 100%)`,
          }}
        />
        {/* Darkening gradient for optimal contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/40 to-black/95" />
      </div>

      {/* TOP HEADER BAR */}
      <div className="relative z-10 flex items-center justify-between px-4 sm:px-8 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-2 bg-transparent shrink-0">
        <button
          onClick={onClose}
          className="p-2 text-zinc-400 hover:text-white rounded-full transition-all active:scale-90"
          title="Minimize Player"
        >
          <ChevronDown className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
        <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-zinc-300">
          Now Playing
        </span>
        <div className="w-10 sm:w-11" /> {/* Spacer for centering */}
      </div>

      {/* ============================================================== */}
      {/* LAPTOP / DESKTOP SCREEN VIEW (lg:flex, Side-by-Side) */}
      {/* ============================================================== */}
      <div className="hidden lg:flex relative z-10 flex-1 overflow-hidden w-full max-w-7xl mx-auto px-8 xl:px-12 py-2 gap-10 xl:gap-14 items-center min-h-0">
        
        {/* LEFT COLUMN: Cover Art + Info + Full Controls */}
        <div className="w-[420px] xl:w-[470px] shrink-0 flex flex-col justify-between h-full max-h-[820px] py-2">
          
          {/* Cover Art Box */}
          <div className="flex flex-col items-center justify-center my-auto">
            <div className="relative group w-[310px] h-[310px] xl:w-[370px] xl:h-[370px] aspect-square rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] border border-white/10 transition-all duration-300">
              <img
                src={coverArt}
                alt={currentTrack.title}
                onError={(e) => {
                  const currentSrc = e.currentTarget.src;
                  if (currentSrc.includes('=w800')) {
                    e.currentTarget.src = currentSrc.replace('=w800-h800-l90-rj', '=w544-h544-l90-rj');
                  } else if (currentSrc.includes('maxresdefault.jpg')) {
                    e.currentTarget.src = currentSrc.replace('maxresdefault.jpg', 'hqdefault.jpg');
                  } else if (currentSrc.includes('hqdefault.jpg')) {
                    e.currentTarget.src = currentSrc.replace('hqdefault.jpg', 'mqdefault.jpg');
                  } else {
                    e.currentTarget.src = fallbackSvg;
                  }
                }}
                className="w-full h-full object-cover select-none"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl pointer-events-none" />
            </div>
          </div>

          {/* Controls & Track Information */}
          <div className="space-y-4 pt-2">
            
            {/* Title, Artist, Like */}
            <div className="w-full flex items-center justify-between gap-3 px-1">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl xl:text-3xl font-extrabold text-white truncate tracking-tight">
                  {currentTrack.title}
                </h2>
                <p className="text-sm xl:text-base font-semibold text-zinc-400 truncate mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={(e) => onToggleLike(currentTrack.id, e)}
                  className={`p-2.5 rounded-full transition-all active:scale-90 ${
                    isLiked ? 'text-[#FF3366]' : 'text-zinc-400 hover:text-white'
                  }`}
                  title={isLiked ? 'Remove from Liked' : 'Save to Liked'}
                >
                  <Heart className={`w-6 h-6 ${isLiked ? 'fill-[#FF3366]' : ''}`} />
                </button>
              </div>
            </div>

            {/* Seek Progress Bar */}
            <div className="space-y-1.5 px-1">
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  onSeek(pos * duration);
                }}
                onMouseEnter={() => setIsHoveringProgress(true)}
                onMouseLeave={() => {
                  setIsHoveringProgress(false);
                  setHoverTime(null);
                }}
                onMouseMove={handleMouseMoveProgress}
                className="relative w-full h-1.5 hover:h-2 rounded-full cursor-pointer transition-all group"
              >
                {isHoveringProgress && hoverTime !== null && (
                  <div
                    className="absolute bottom-full mb-2.5 -translate-x-1/2 bg-zinc-900 border border-zinc-700/80 text-white text-[11px] font-mono font-bold px-2.5 py-1 rounded-md shadow-2xl pointer-events-none z-50 whitespace-nowrap flex flex-col items-center animate-in fade-in zoom-in-95 duration-100"
                    style={{ left: `${hoverPercent}%` }}
                  >
                    <span>{formatTime(hoverTime)}</span>
                    <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-zinc-900 absolute top-full left-1/2 -translate-x-1/2" />
                  </div>
                )}
                <div className="w-full h-full bg-white/20 rounded-full overflow-hidden relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-white/30 transition-all duration-300 rounded-full"
                    style={{ width: `${bufferedPercent}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-white group-hover:bg-[#FF3366] transition-colors rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div
                  className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg pointer-events-none -translate-x-1/2 transition-opacity ${
                    isHoveringProgress ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  style={{ left: `${progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] font-mono font-bold text-zinc-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls (Shuffle, Prev, Play/Pause, Next, Repeat) */}
            <div className="flex items-center justify-between px-2">
              <button
                onClick={onToggleShuffle}
                className={`p-2 rounded-full transition-all active:scale-90 ${
                  isShuffle ? 'text-[#FF3366]' : 'text-zinc-400 hover:text-white'
                }`}
                title={isShuffle ? 'Smart Shuffle: ON' : 'Smart Shuffle: OFF'}
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-6">
                <button
                  onClick={onPrevTrack}
                  className="p-2 text-zinc-300 hover:text-white active:scale-90 transition-transform"
                  title="Previous Track"
                >
                  <SkipBack className="w-7 h-7 fill-current" />
                </button>

                <button
                  onClick={onPlayPause}
                  className="w-16 h-16 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 fill-black text-black" />
                  ) : (
                    <Play className="w-7 h-7 fill-black text-black translate-x-0.5" />
                  )}
                </button>

                <button
                  onClick={onNextTrack}
                  className="p-2 text-zinc-300 hover:text-white active:scale-90 transition-transform"
                  title="Next Track"
                >
                  <SkipForward className="w-7 h-7 fill-current" />
                </button>
              </div>

              <button
                onClick={onToggleRepeat}
                className={`p-2 rounded-full transition-all active:scale-90 relative ${
                  repeatMode !== 'off' ? 'text-[#FF3366]' : 'text-zinc-400 hover:text-white'
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                <Repeat className="w-5 h-5" />
                {repeatMode === 'one' && (
                  <span className="absolute -top-1 -right-1 text-[9px] font-black bg-[#FF3366] text-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    1
                  </span>
                )}
              </button>
            </div>

            {/* Volume & Queue Bar */}
            <div className="flex items-center justify-between pt-2 px-1 border-t border-white/10">
              <div className="flex items-center gap-3 w-full max-w-[200px]">
                <button onClick={onToggleMute} className="text-zinc-400 hover:text-white p-1">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={effectiveVolume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white hover:accent-[#FF3366]"
                />
              </div>

              <button
                onClick={() => setShowQueueSidebar((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  showQueueSidebar ? 'bg-[#FF3366] text-black' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title="Playing Queue"
              >
                <ListMusic className="w-4 h-4" />
                <span>Queue</span>
              </button>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Synced Real-Time Live Lyrics */}
        <div className="flex-1 h-full max-h-[820px] min-w-0 flex flex-col justify-center">
          <LyricsView
            audioRef={audioRef}
            currentTrack={currentTrack}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onSeek={onSeek}
            onPlayPause={onPlayPause}
            rawLrc={currentTrack.lrc}
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE / TABLET SCREEN VIEW (lg:hidden, Single Column) */}
      {/* ============================================================== */}
      <div className="lg:hidden flex-1 overflow-hidden flex flex-col justify-between min-h-0">
        
        {/* CENTER CONTENT: Either Artwork OR Lyrics */}
        <div className="relative z-10 flex-1 overflow-hidden flex items-center justify-center px-4 sm:px-8 py-1 min-h-0">
          {activeTab === 'art' ? (
            /* Album Cover Art */
            <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-200">
              <div className="relative group w-[75vw] max-w-[310px] sm:max-w-[380px] aspect-square rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/10 transition-all duration-300">
                <img
                  src={coverArt}
                  alt={currentTrack.title}
                  onError={(e) => {
                    const currentSrc = e.currentTarget.src;
                    if (currentSrc.includes('=w800')) {
                      e.currentTarget.src = currentSrc.replace('=w800-h800-l90-rj', '=w544-h544-l90-rj');
                    } else if (currentSrc.includes('maxresdefault.jpg')) {
                      e.currentTarget.src = currentSrc.replace('maxresdefault.jpg', 'hqdefault.jpg');
                    } else if (currentSrc.includes('hqdefault.jpg')) {
                      e.currentTarget.src = currentSrc.replace('hqdefault.jpg', 'mqdefault.jpg');
                    } else {
                      e.currentTarget.src = fallbackSvg;
                    }
                  }}
                  className="w-full h-full object-cover select-none"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl sm:rounded-3xl pointer-events-none" />
              </div>
            </div>
          ) : (
            /* Lyrics View */
            <div className="w-full h-full max-w-2xl mx-auto">
              <LyricsView
                audioRef={audioRef}
                currentTrack={currentTrack}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onSeek={onSeek}
                onPlayPause={onPlayPause}
                rawLrc={currentTrack.lrc}
              />
            </div>
          )}
        </div>

        {/* BOTTOM CONTROLS PANEL */}
        <div className="relative z-10 px-5 sm:px-12 pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] pt-1 bg-transparent max-w-3xl mx-auto w-full space-y-4 shrink-0">
          
          {/* Song Info & Buttons */}
          {activeTab === 'art' && (
            <div className="w-full flex items-center justify-between gap-3 mb-1">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white truncate tracking-tight">
                  {currentTrack.title}
                </h2>
                <p className="text-sm font-semibold text-zinc-400 truncate mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => onToggleLike(currentTrack.id, e)}
                  className={`p-2.5 rounded-full transition-all active:scale-90 ${
                    isLiked ? 'text-[#FF3366]' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Heart className={`w-6 h-6 ${isLiked ? 'fill-[#FF3366]' : ''}`} />
                </button>
              </div>
            </div>
          )}

          {/* Seek Progress Bar */}
          <div className="space-y-1.5">
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                onSeek(pos * duration);
              }}
              className="relative w-full h-1 hover:h-1.5 rounded-full cursor-pointer transition-all group"
            >
              <div className="w-full h-full bg-white/20 rounded-full overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 bg-white/30 transition-all duration-300 rounded-full"
                  style={{ width: `${bufferedPercent}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 left-0 bg-white group-hover:bg-[#FF3366] transition-colors rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between text-[11px] font-mono font-bold text-zinc-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={onToggleShuffle}
              className={`p-2 rounded-full transition-colors ${
                isShuffle ? 'text-[#FF3366]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-6">
              <button onClick={onPrevTrack} className="p-2 text-zinc-300 hover:text-white active:scale-90 transition-transform">
                <SkipBack className="w-8 h-8 fill-current" />
              </button>

              <button
                onClick={onPlayPause}
                className="w-16 h-16 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-black text-black" />
                ) : (
                  <Play className="w-7 h-7 fill-black text-black translate-x-0.5" />
                )}
              </button>

              <button onClick={onNextTrack} className="p-2 text-zinc-300 hover:text-white active:scale-90 transition-transform">
                <SkipForward className="w-8 h-8 fill-current" />
              </button>
            </div>

            <button
              onClick={onToggleRepeat}
              className={`p-2 rounded-full transition-colors relative ${
                repeatMode !== 'off' ? 'text-[#FF3366]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Repeat className="w-5 h-5" />
              {repeatMode === 'one' && (
                <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-[#FF3366] text-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Lyrics and Queue Buttons */}
          <div className="flex items-center justify-between pt-1">
            {hasLyrics ? (
              <button
                onClick={() => setActiveTab(activeTab === 'lyrics' ? 'art' : 'lyrics')}
                className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 ${
                  activeTab === 'lyrics' ? 'bg-[#FF3366] text-black' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title="Toggle Lyrics"
              >
                <Mic2 className="w-3.5 h-3.5" />
                <span>Lyrics</span>
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={onOpenQueue}
              className="p-2 rounded-full transition-all active:scale-90 text-zinc-400 hover:text-white"
              title="Playing Queue"
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>

      {/* RIGHT SIDE: Queue Sidebar (Desktop only) */}
      {showQueueSidebar && (
        <div className="hidden lg:flex w-96 bg-zinc-900/90 backdrop-blur-3xl border-l border-zinc-800 flex-col h-full animate-in slide-in-from-right-10 z-20 absolute right-0 top-0 bottom-0 shadow-2xl">
          <div className="p-6 border-b border-zinc-800 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Play Queue</h2>
              <button onClick={() => setShowQueueSidebar(false)} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-zinc-800/50 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isAutoplay ? 'bg-[#FF3366]/20 text-[#FF3366]' : 'bg-zinc-700 text-zinc-400'}`}>
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Autoplay</h3>
                  <p className="text-[11px] text-zinc-400">Play similar songs</p>
                </div>
              </div>
              <button
                onClick={onToggleAutoplay}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAutoplay ? 'bg-[#FF3366]' : 'bg-zinc-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAutoplay ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          <div
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
                onLoadMoreQueue?.();
              }
            }}
            className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
          >
            {/* User-added queue */}
            {userQueue && userQueue.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">Next in Queue</p>
                {userQueue.map((track, idx) => {
                  const art = getHighResCoverUrl(track.coverArtUrl, track.path) || generateCoverArt(track.title, track.artist, track.gradientColors);
                  return (
                    <div key={`userq-${track.id}-${idx}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/60 group transition-colors">
                      <div 
                        className="relative w-12 h-12 shrink-0 rounded-md cursor-pointer overflow-hidden shadow-sm"
                        onClick={() => {
                          onPlayTrack?.(track);
                          onRemoveFromQueue?.(idx);
                        }}
                      >
                        <img src={art} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{track.artist}</p>
                      </div>
                      <button
                        onClick={() => onRemoveFromQueue?.(idx)}
                        className="p-2 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity shrink-0 rounded-full hover:bg-zinc-700"
                        title="Remove from queue"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Up Next according to the played song (Endless Song Radio) */}
            {queue && queue.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
                  Up Next · Similar to {currentTrack.title}
                </p>
                {queue.map((track) => {
                  const art = getHighResCoverUrl(track.coverArtUrl, track.path) || generateCoverArt(track.title, track.artist, track.gradientColors);
                  return (
                    <div
                      key={track.id}
                      onClick={() => onPlayTrack?.(track)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/60 group cursor-pointer transition-colors"
                    >
                      <div className="relative w-12 h-12 shrink-0 rounded-md overflow-hidden shadow-sm">
                        <img src={art} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-200 group-hover:text-white truncate">{track.title}</p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{track.artist}</p>
                      </div>
                    </div>
                  );
                })}

                {isLoadingMore && (
                  <div className="flex items-center justify-center py-4 text-xs text-zinc-400 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#FF3366]" />
                    <span>Loading more recommendations...</span>
                  </div>
                )}
              </div>
            ) : (!userQueue || userQueue.length === 0) ? (
              <div className="text-center text-zinc-500 py-10">
                <p className="text-sm font-bold text-zinc-400">Loading recommendations...</p>
                <p className="text-xs mt-1">Finding songs matching {currentTrack.title}</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
