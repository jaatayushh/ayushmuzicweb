import React, { useState } from 'react';
import { Play, Pause, Heart, Music, Disc, Plus, ListPlus } from 'lucide-react';
import { Track } from '../types';
import { generateCoverArt, getHighResCoverUrl } from '../utils/audioUtils';
import { useLongPress } from '../utils/useLongPress';
import { TrackContextMenu } from './TrackContextMenu';

interface TrackCardProps {
  track: Track;
  isPlaying: boolean;
  isCurrentTrack: boolean;
  isLiked: boolean;
  onPlay: (track: Track) => void;
  onToggleLike: (trackId: string, e: React.MouseEvent) => void;
  onAddToPlaylist?: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
}

export const TrackCard: React.FC<TrackCardProps> = React.memo(({
  track,
  isPlaying,
  isCurrentTrack,
  isLiked,
  onPlay,
  onToggleLike,
  onAddToPlaylist,
  onAddToQueue,
}) => {
  const fallbackSvg = generateCoverArt(track.title, track.artist, track.gradientColors);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const longPress = useLongPress((pos) => setMenuPos(pos));

  return (
    <div
      onClick={() => onPlay(track)}
      {...longPress}
      className="bg-[#131316] hover:bg-[#1f1f23] p-3 sm:p-4 rounded-md cursor-pointer group transition-all duration-300 flex flex-col"
    >
      {/* Cover Art Container */}
      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-[#1f1f23] shadow-[0_8px_24px_rgba(0,0,0,0.5)] mb-3">
        <img
          src={getHighResCoverUrl(track.coverArtUrl, track.path) || fallbackSvg}
          alt={track.title}
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
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
          loading="lazy"
        />

        {/* Playing Overlay / Equalizer */}
        {isCurrentTrack && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            {isPlaying ? (
              <div className="flex items-end gap-[3px] h-4 sm:h-6">
                <span className="w-[2px] sm:w-[3px] h-4 sm:h-6 bg-[#FF3366] rounded-full eq-bar eq-bar-1" />
                <span className="w-[2px] sm:w-[3px] h-4 sm:h-6 bg-[#FF3366] rounded-full eq-bar eq-bar-2" />
                <span className="w-[2px] sm:w-[3px] h-4 sm:h-6 bg-[#FF3366] rounded-full eq-bar eq-bar-3" />
              </div>
            ) : (
              <Disc className="w-6 h-6 sm:w-8 sm:h-8 text-[#FF3366]" />
            )}
          </div>
        )}

        {/* Play Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay(track);
          }}
          className={`absolute bottom-2 right-2 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-tr from-[#8b5cf6] to-[#ec4899] text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ease-out hover:scale-[1.06] active:scale-95 ${
            isCurrentTrack
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
          aria-label={isCurrentTrack && isPlaying ? 'Pause' : 'Play'}
        >
          {isCurrentTrack && isPlaying ? (
            <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
          ) : (
            <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white translate-x-0.5" />
          )}
        </button>

        {/* Top Badges / Actions */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {onAddToQueue && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToQueue(track);
              }}
              className="p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
              title="Add to Queue"
            >
              <ListPlus className="w-4 h-4" />
            </button>
          )}
          {onAddToPlaylist && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToPlaylist(track);
              }}
              className="p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
              title="Add to Playlist"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={(e) => onToggleLike(track.id, e)}
            className={`p-1.5 rounded-full bg-black/60 backdrop-blur-sm transition-all ${
              isLiked
                ? 'text-[#FF3366] opacity-100'
                : 'text-white/80 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100'
            }`}
            title={isLiked ? 'Remove from Liked' : 'Save to Liked'}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#FF3366]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Track Details */}
      <h3 className={`text-sm font-bold truncate mb-1 ${isCurrentTrack ? 'text-[#FF3366]' : 'text-white'}`}>
        {track.title}
      </h3>
      <p className="text-xs text-[#B3B3B3] line-clamp-2 leading-relaxed">
        {track.artist || 'AyushMuzic'}
      </p>

      {menuPos && (
        <TrackContextMenu
          track={track}
          position={menuPos}
          isLiked={isLiked}
          onClose={() => setMenuPos(null)}
          onPlay={onPlay}
          onAddToQueue={onAddToQueue}
          onAddToPlaylist={onAddToPlaylist}
          onToggleLike={onToggleLike}
        />
      )}
    </div>
  );
});
