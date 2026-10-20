import React, { useState } from 'react';
import { Play, Clock, Heart, Music, Plus, Trash2, ListPlus } from 'lucide-react';
import { Track } from '../types';
import { formatTime, generateCoverArt, getHighResCoverUrl } from '../utils/audioUtils';
import { useLongPress } from '../utils/useLongPress';
import { TrackContextMenu } from './TrackContextMenu';

interface TrackTableProps {
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  likedTrackIds: string[];
  onPlayTrack: (track: Track) => void;
  onToggleLike: (trackId: string, e: React.MouseEvent) => void;
  onAddToPlaylist?: (track: Track) => void;
  onRemoveFromPlaylist?: (trackId: string) => void;
  onAddToQueue?: (track: Track) => void;
}

export const TrackTable: React.FC<TrackTableProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  likedTrackIds,
  onPlayTrack,
  onToggleLike,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onAddToQueue,
}) => {
  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-[#B3B3B3]">
        <Music className="w-12 h-12 mb-3 text-[#535353] animate-pulse" />
        <p className="text-base font-semibold text-white">No tracks found</p>
        <p className="text-xs text-[#B3B3B3] max-w-sm mt-1">
          Try searching for a different song or artist.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto select-none">
      <table className="w-full text-left border-collapse">
        {/* Table Header */}
        <thead>
          <tr className="border-b border-[#1f1f23] text-[#B3B3B3] text-[11px] font-medium uppercase tracking-wider">
            <th className="py-2 px-4 w-[48px] text-center">#</th>
            <th className="py-2 px-4">Title</th>
            <th className="py-2 px-4 hidden md:table-cell">Album</th>
            <th className="py-2 px-4 hidden lg:table-cell">Date Added</th>
            <th className="py-2 px-4 text-center w-[80px]">
              <Clock className="w-4 h-4 inline" />
            </th>
            <th className="py-2 px-2 w-[48px]"></th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="text-sm">
          {tracks.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index}
              isCurrent={currentTrackId === track.id}
              isPlaying={isPlaying}
              isLiked={likedTrackIds.includes(track.id)}
              onPlayTrack={onPlayTrack}
              onToggleLike={onToggleLike}
              onAddToPlaylist={onAddToPlaylist}
              onRemoveFromPlaylist={onRemoveFromPlaylist}
              onAddToQueue={onAddToQueue}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface TrackRowProps {
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  isLiked: boolean;
  onPlayTrack: (track: Track) => void;
  onToggleLike: (trackId: string, e: React.MouseEvent) => void;
  onAddToPlaylist?: (track: Track) => void;
  onRemoveFromPlaylist?: (trackId: string) => void;
  onAddToQueue?: (track: Track) => void;
}

const TrackRow: React.FC<TrackRowProps> = React.memo(({
  track,
  index,
  isCurrent,
  isPlaying,
  isLiked,
  onPlayTrack,
  onToggleLike,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onAddToQueue,
}) => {
  const fallbackSvg = generateCoverArt(track.title, track.artist, track.gradientColors);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const longPress = useLongPress((pos) => setMenuPos(pos));

  return (
    <>
      <tr
        onClick={() => onPlayTrack(track)}
        {...longPress}
        className={`h-14 group cursor-pointer rounded-md transition-colors hover:bg-white/[0.08] ${
          isCurrent ? 'bg-white/[0.04]' : 'bg-transparent'
        }`}
      >
        {/* Index / Play Button / Equalizer */}
        <td className="w-[48px] text-center">
          {isCurrent ? (
            isPlaying ? (
              <div className="flex items-end justify-center gap-[2px] h-4">
                <span className="w-[3px] h-4 bg-[#FF3366] rounded-full eq-bar eq-bar-1" />
                <span className="w-[3px] h-4 bg-[#FF3366] rounded-full eq-bar eq-bar-2" />
                <span className="w-[3px] h-4 bg-[#FF3366] rounded-full eq-bar eq-bar-3" />
              </div>
            ) : (
              <span className="text-[#FF3366] font-bold">●</span>
            )
          ) : (
            <>
              <span className="text-sm text-[#B3B3B3] tabular-nums group-hover:hidden">
                {index + 1}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayTrack(track);
                }}
                className="hidden group-hover:inline-block text-white"
                aria-label="Play Track"
              >
                <Play className="w-4 h-4 fill-current inline" />
              </button>
            </>
          )}
        </td>

        {/* Title & Cover Thumbnail */}
        <td className="py-2 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#1f1f23] overflow-hidden shrink-0 shadow-sm">
              <img
                src={getHighResCoverUrl(track.coverArtUrl, track.path) || fallbackSvg}
                alt={track.title}
                onError={(e) => {
                  const currentSrc = e.currentTarget.src;
                  if (currentSrc.includes('maxresdefault.jpg')) {
                    e.currentTarget.src = currentSrc.replace('maxresdefault.jpg', 'hqdefault.jpg');
                  } else {
                    e.currentTarget.src = fallbackSvg;
                  }
                }}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span
                className={`text-sm font-medium truncate ${
                  isCurrent ? 'text-[#FF3366]' : 'text-white'
                }`}
              >
                {track.title}
              </span>
              <span className="text-xs text-[#B3B3B3] hover:underline truncate">
                {track.artist || 'Unknown Artist'}
              </span>
            </div>
          </div>
        </td>

        {/* Album */}
        <td className="py-2 px-4 hidden md:table-cell text-xs text-[#B3B3B3] truncate max-w-[180px] hover:underline hover:text-white transition-colors">
          {track.album || 'Single'}
        </td>

        {/* Date Added */}
        <td className="py-2 px-4 hidden lg:table-cell text-xs text-[#B3B3B3]">
          {track.dateAdded || 'Recently'}
        </td>

        {/* Duration */}
        <td className="py-2 px-4 text-xs text-[#B3B3B3] tabular-nums text-center w-[80px]">
          {formatTime(track.duration)}
        </td>

        {/* Heart Toggle & Actions */}
        <td className="py-2 px-2 w-[48px] text-right">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={(e) => onToggleLike(track.id, e)}
              className={`p-1.5 rounded-full transition-colors ${
                isLiked
                  ? 'text-[#FF3366] opacity-100'
                  : 'text-[#B3B3B3] opacity-0 group-hover:opacity-100 hover:text-white'
              }`}
              title={isLiked ? 'Remove from Liked' : 'Save to Liked'}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#FF3366]' : ''}`} />
            </button>

            {onAddToQueue && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToQueue(track);
                }}
                className="p-1.5 text-[#B3B3B3] opacity-0 group-hover:opacity-100 hover:text-white rounded-full transition-colors"
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
                className="p-1.5 text-[#B3B3B3] opacity-0 group-hover:opacity-100 hover:text-white rounded-full transition-colors"
                title="Add to Playlist"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}

            {onRemoveFromPlaylist && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFromPlaylist(track.id);
                }}
                className="p-1.5 text-[#B3B3B3] opacity-0 group-hover:opacity-100 hover:text-white rounded-full transition-colors"
                title="Remove from Playlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {menuPos && (
        <tr>
          <td colSpan={6} className="p-0 border-none">
            <TrackContextMenu
              track={track}
              position={menuPos}
              isLiked={isLiked}
              onClose={() => setMenuPos(null)}
              onPlay={onPlayTrack}
              onAddToQueue={onAddToQueue}
              onAddToPlaylist={onAddToPlaylist}
              onToggleLike={onToggleLike}
            />
          </td>
        </tr>
      )}
    </>
  );
});
