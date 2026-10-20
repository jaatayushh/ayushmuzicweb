import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Heart,
  ListMusic,
  Music,
  Mic2,
  Maximize2
} from 'lucide-react';
import { ActiveTab, RepeatMode, Track } from '../types';
import { formatTime, generateCoverArt, getHighResCoverUrl } from '../utils/audioUtils';
import { checkLyricsAvailable, getCachedLyricsAvailable } from '../utils/lyricsUtils';

interface PlayerBarProps {
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
  activeTab?: ActiveTab;
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
  onToggleLyrics?: () => void;
  onOpenMaximizedPlayer?: (initialTab?: 'art' | 'lyrics') => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = React.memo(({
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
  activeTab,
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
  onToggleLyrics,
  onOpenMaximizedPlayer,
}) => {
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number>(0);
  const [isHoveringVolume, setIsHoveringVolume] = useState(false);

  const [isSeeking, setIsSeeking] = useState(false);
  const [localSeekTime, setLocalSeekTime] = useState(currentTime);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);

  useEffect(() => {
    if (!isSeeking) setLocalSeekTime(currentTime);
  }, [currentTime, isSeeking]);

  useEffect(() => {
    if (!isDraggingVolume) setLocalVolume(volume);
  }, [volume, isDraggingVolume]);

  const [hasLyrics, setHasLyrics] = useState<boolean>(() => {
    return Boolean(getCachedLyricsAvailable(currentTrack));
  });

  useEffect(() => {
    let isSubscribed = true;
    if (!currentTrack) {
      setHasLyrics(false);
      return;
    }

    const cached = getCachedLyricsAvailable(currentTrack);
    if (cached !== undefined) {
      setHasLyrics(cached);
      return;
    }

    checkLyricsAvailable(currentTrack).then((avail) => {
      if (isSubscribed) {
        setHasLyrics(avail);
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [currentTrack]);

  const displayTime = isSeeking ? localSeekTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;
  
  const displayVolume = isDraggingVolume ? localVolume : volume;
  const effectiveVolume = isMuted ? 0 : displayVolume;
  const volumePercent = effectiveVolume * 100;

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

  if (!currentTrack) {
    return (
      <div className="fixed bottom-14 md:bottom-0 left-0 right-0 h-16 md:h-20 bg-[#0c0c0e] border-t border-zinc-800/80 px-4 md:px-6 flex items-center justify-between text-zinc-500 text-xs md:text-sm select-none z-40 pb-safe">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded bg-zinc-800 flex items-center justify-center">
            <Music className="w-5 h-5 text-zinc-600" />
          </div>
          <span>Select a track to start playing</span>
        </div>
      </div>
    );
  }

  const fallbackSvg = generateCoverArt(currentTrack.title, currentTrack.artist, currentTrack.gradientColors);

  return (
    <footer className="fixed bottom-[60px] md:bottom-0 left-0 right-0 h-16 md:h-24 bg-[#131316]/95 md:bg-[#0c0c0e]/95 backdrop-blur-xl border-t border-zinc-800/80 px-3 md:px-6 flex items-center justify-between gap-2 md:gap-4 select-none z-40 text-white shadow-2xl">
      {/* Top thin progress bar for mobile view */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-1 bg-zinc-800">
        {/* Grey chunk-download indicator */}
        <div
          className="absolute inset-y-0 left-0 bg-zinc-500/60 transition-all duration-300"
          style={{ width: `${bufferedPercent}%` }}
        />
        <div
          className="h-full bg-[#FF3366] transition-all duration-150 relative"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* LEFT: Currently Playing Track Info */}
      <div className="flex items-center gap-2.5 md:gap-3 flex-1 md:w-1/4 min-w-0 pr-2">
        <div
          onClick={() => onOpenMaximizedPlayer && onOpenMaximizedPlayer('art')}
          className="relative group shrink-0 cursor-pointer"
          title="Click to expand player"
        >
          <img
            src={getHighResCoverUrl(currentTrack.coverArtUrl, currentTrack.path) || fallbackSvg}
            alt={currentTrack.title}
            onError={(e) => {
              const currentSrc = e.currentTarget.src;
              if (currentSrc.includes('maxresdefault.jpg')) {
                e.currentTarget.src = currentSrc.replace('maxresdefault.jpg', 'hqdefault.jpg');
              } else {
                e.currentTarget.src = fallbackSvg;
              }
            }}
            className={`w-11 h-11 md:w-14 md:h-14 rounded-md object-cover shadow-lg transition-transform ${
              isPlaying ? 'scale-105' : ''
            }`}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-md flex items-center justify-center transition-opacity">
            <Maximize2 className="w-5 h-5 text-white" />
          </div>
          {isPlaying && (
            <div className="absolute top-1 right-1">
              <span className="w-2 h-2 rounded-full bg-[#FF3366] animate-ping block" />
            </div>
          )}
        </div>
        <div
          onClick={() => onOpenMaximizedPlayer && onOpenMaximizedPlayer('art')}
          className="flex flex-col min-w-0 pr-1 cursor-pointer group"
          title="Click to expand player"
        >
          <span className="text-xs sm:text-sm md:text-base font-extrabold text-white truncate group-hover:text-[#FF3366] transition-colors tracking-tight">
            {currentTrack.title}
          </span>
          <span className="text-[11px] md:text-xs text-zinc-400 truncate group-hover:text-zinc-200 font-medium">
            {currentTrack.artist || 'CoolJaat'}
          </span>
        </div>

        <button
          onClick={(e) => onToggleLike(currentTrack.id, e)}
          className={`p-1.5 rounded-full transition-all shrink-0 ${
            isLiked ? 'text-[#FF3366]' : 'text-zinc-400 hover:text-white'
          }`}
          title={isLiked ? 'Liked' : 'Like'}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#FF3366]' : ''}`} />
        </button>

        {/* Maximize Player Button */}
        {onOpenMaximizedPlayer && (
          <button
            onClick={() => onOpenMaximizedPlayer('art')}
            className="hidden sm:flex p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-all shrink-0"
            title="Expand Full Screen Player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mobile Play / Next Controls */}
      <div className="flex md:hidden items-center gap-2 shrink-0">
        <button
          onClick={onPlayPause}
          className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center active:scale-95 shadow-md"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-black" />
          ) : (
            <Play className="w-5 h-5 fill-black translate-x-0.5" />
          )}
        </button>
        <button
          onClick={onNextTrack}
          className="p-2 text-zinc-300 hover:text-white active:scale-95"
        >
          <SkipForward className="w-5 h-5 fill-current" />
        </button>
      </div>

      {/* CENTER: Audio Player Controls & Scrubbable Seek Bar (Desktop) */}
      <div className="hidden md:flex flex-col items-center justify-center gap-2 w-2/4 max-w-2xl">
        {/* Buttons Row */}
        <div className="flex items-center gap-4">
          {/* Shuffle Toggle */}
          <button
            onClick={onToggleShuffle}
            className={`p-1.5 rounded-full transition-colors relative ${
              isShuffle ? 'text-[#FF3366]' : 'text-zinc-400 hover:text-white'
            }`}
            title={isShuffle ? 'Disable Shuffle' : 'Enable Shuffle'}
          >
            <Shuffle className="w-4 h-4" />
            {isShuffle && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF3366] rounded-full" />
            )}
          </button>

          {/* Previous Track */}
          <button
            onClick={onPrevTrack}
            className="text-zinc-300 hover:text-white transition-colors p-1"
            title="Previous Track (Left Arrow)"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Play/Pause Main Button */}
          <button
            onClick={onPlayPause}
            className="w-10 h-10 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all shadow-lg"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-black" />
            ) : (
              <Play className="w-5 h-5 fill-black translate-x-0.5" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={onNextTrack}
            className="text-zinc-300 hover:text-white transition-colors p-1"
            title="Next Track (Right Arrow)"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          {/* Repeat Mode Toggle */}
          <button
            onClick={onToggleRepeat}
            className={`p-1.5 rounded-full transition-colors relative ${
              repeatMode !== 'off' ? 'text-[#FF3366]' : 'text-zinc-400 hover:text-white'
            }`}
            title={`Repeat Mode: ${repeatMode.toUpperCase()}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
            {repeatMode !== 'off' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF3366] rounded-full" />
            )}
          </button>
        </div>

        {/* Scrubbable Progress Bar */}
        <div className="flex items-center gap-3 w-full max-w-lg">
          <span className="text-xs font-mono text-zinc-400 w-10 text-right">
            {formatTime(displayTime)}
          </span>

          <div
            className="relative flex-1 flex items-center h-4 cursor-pointer group"
            onMouseEnter={() => setIsHoveringProgress(true)}
            onMouseLeave={() => {
              setIsHoveringProgress(false);
              setHoverTime(null);
            }}
            onMouseMove={handleMouseMoveProgress}
          >
            {/* Timestamp Preview Tooltip */}
            {isHoveringProgress && hoverTime !== null && (
              <div
                className="absolute bottom-full mb-2.5 -translate-x-1/2 bg-zinc-900 border border-zinc-700/80 text-white text-[11px] font-mono font-bold px-2 py-1 rounded-md shadow-2xl pointer-events-none z-50 whitespace-nowrap flex flex-col items-center animate-in fade-in zoom-in-95 duration-100"
                style={{ left: `${hoverPercent}%` }}
              >
                <span>{formatTime(hoverTime)}</span>
                <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-zinc-900 absolute top-full left-1/2 -translate-x-1/2" />
              </div>
            )}

            {/* Background Track */}
            <div className="w-full h-1 group-hover:h-1.5 bg-zinc-700/80 rounded-full overflow-hidden transition-all relative">
              {/* Grey chunk-download indicator — shows how much audio has streamed in */}
              <div
                className="absolute inset-y-0 left-0 bg-zinc-400/50 transition-all duration-300"
                style={{ width: `${bufferedPercent}%` }}
              />
              {/* Active Progress */}
              <div
                className={`h-full transition-colors ${
                  isHoveringProgress ? 'bg-[#FF3366]' : 'bg-white'
                }`}
                style={{ width: `${progressPercent}%` }}
              />

              {/* Hover Preview Highlight Fill */}
              {isHoveringProgress && hoverPercent > progressPercent && (
                <div
                  className="absolute top-0 bottom-0 bg-white/20 pointer-events-none"
                  style={{
                    left: `${progressPercent}%`,
                    width: `${hoverPercent - progressPercent}%`,
                  }}
                />
              )}
            </div>

            {/* Hover Handle/Thumb Indicator */}
            {isHoveringProgress && (
              <div
                className="absolute w-3 h-3 bg-white rounded-full shadow-lg pointer-events-none -translate-x-1/2 transition-transform scale-100"
                style={{ left: `${hoverPercent}%` }}
              />
            )}

            {/* Slider Input */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={displayTime}
              onMouseDown={() => setIsSeeking(true)}
              onTouchStart={() => setIsSeeking(true)}
              onChange={(e) => setLocalSeekTime(parseFloat(e.target.value))}
              onMouseUp={(e) => {
                setIsSeeking(false);
                onSeek(parseFloat(e.currentTarget.value));
              }}
              onTouchEnd={(e) => {
                setIsSeeking(false);
                onSeek(parseFloat(e.currentTarget.value));
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <span className="text-xs font-mono text-zinc-400 w-10">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* RIGHT: Volume & Secondary Options */}
      <div className="hidden md:flex items-center justify-end gap-3 w-1/4 min-w-[160px]">
        {/* Lyrics View Toggle Button - Only shown if lyrics are actually available */}
        {onToggleLyrics && hasLyrics && (
          <button
            onClick={onToggleLyrics}
            className={`p-1.5 rounded-full transition-all relative ${
              activeTab === 'lyrics'
                ? 'text-[#FF3366] bg-[#FF3366]/10 scale-110'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Lyrics View"
          >
            <Mic2 className="w-5 h-5" />
            {activeTab === 'lyrics' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF3366] rounded-full" />
            )}
          </button>
        )}

        {/* Queue Button */}
        <button
          onClick={onOpenQueue}
          className="text-zinc-400 hover:text-white p-1.5 rounded-full transition-colors"
          title="Open Queue"
        >
          <ListMusic className="w-5 h-5" />
        </button>

        {/* Volume Controls */}
        <div
          className="flex items-center gap-2"
          onMouseEnter={() => setIsHoveringVolume(true)}
          onMouseLeave={() => setIsHoveringVolume(false)}
        >
          <button
            onClick={onToggleMute}
            className="text-zinc-400 hover:text-white transition-colors p-1"
            title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 text-red-400" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>

          <div className="relative w-24 h-4 flex items-center cursor-pointer">
            <div className="w-full h-1 bg-zinc-700/80 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  isHoveringVolume ? 'bg-[#FF3366]' : 'bg-white'
                }`}
                style={{ width: `${volumePercent}%` }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={effectiveVolume}
              onMouseDown={() => setIsDraggingVolume(true)}
              onTouchStart={() => setIsDraggingVolume(true)}
              onChange={(e) => setLocalVolume(parseFloat(e.target.value))}
              onMouseUp={(e) => {
                setIsDraggingVolume(false);
                onVolumeChange(parseFloat(e.currentTarget.value));
              }}
              onTouchEnd={(e) => {
                setIsDraggingVolume(false);
                onVolumeChange(parseFloat(e.currentTarget.value));
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </footer>
  );
});
