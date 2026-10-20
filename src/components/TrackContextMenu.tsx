import React, { useEffect, useRef } from 'react';
import { ListPlus, Plus, Heart, Play } from 'lucide-react';
import { Track } from '../types';

interface TrackContextMenuProps {
  track: Track;
  position: { x: number; y: number };
  isLiked: boolean;
  onClose: () => void;
  onPlay: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  onAddToPlaylist?: (track: Track) => void;
  onToggleLike: (trackId: string, e: React.MouseEvent) => void;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({
  track,
  position,
  isLiked,
  onClose,
  onPlay,
  onAddToQueue,
  onAddToPlaylist,
  onToggleLike,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [onClose]);

  // Keep menu on-screen
  const menuWidth = 220;
  const menuHeight = 200;
  const left = Math.min(position.x, window.innerWidth - menuWidth - 12);
  const top = Math.min(position.y, window.innerHeight - menuHeight - 12);

  const item = (icon: React.ReactNode, label: string, onClick: () => void) => (
    <button
      onClick={() => {
        onClick();
        onClose();
      }}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors text-left"
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-[90]" />
      <div
        ref={menuRef}
        style={{ left, top }}
        className="fixed z-[91] w-56 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="px-4 pb-2 mb-1 border-b border-zinc-800">
          <p className="text-xs font-bold text-white truncate">{track.title}</p>
          <p className="text-[11px] text-zinc-400 truncate">{track.artist || 'CoolJaat'}</p>
        </div>
        {item(<Play className="w-4 h-4" />, 'Play Now', () => onPlay(track))}
        {onAddToQueue && item(<ListPlus className="w-4 h-4" />, 'Add to Queue', () => onAddToQueue(track))}
        {onAddToPlaylist && item(<Plus className="w-4 h-4" />, 'Add to Playlist', () => onAddToPlaylist(track))}
        {item(
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#FF3366] text-[#FF3366]' : ''}`} />,
          isLiked ? 'Remove from Liked' : 'Save to Liked',
          () => onToggleLike(track.id, { stopPropagation: () => {} } as React.MouseEvent)
        )}
      </div>
    </>
  );
};
