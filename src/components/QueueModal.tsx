import React from 'react';
import { X, Play, Music, ListMusic, Radio, Trash2, Shuffle, Loader2 } from 'lucide-react';
import { Track } from '../types';
import { generateCoverArt, getHighResCoverUrl } from '../utils/audioUtils';

interface QueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Track[];
  userQueue?: Track[];
  currentTrack: Track | null;
  onPlayTrack: (track: Track) => void;
  isAutoplay?: boolean;
  onToggleAutoplay?: () => void;
  onRemoveFromQueue?: (index: number) => void;
  isShuffle?: boolean;
  onLoadMoreQueue?: () => void;
  isLoadingMore?: boolean;
}

export const QueueModal: React.FC<QueueModalProps> = ({
  isOpen,
  onClose,
  queue,
  userQueue = [],
  currentTrack,
  onPlayTrack,
  isAutoplay = false,
  onToggleAutoplay,
  onRemoveFromQueue,
  isShuffle = false,
  onLoadMoreQueue,
  isLoadingMore = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-950 border-l border-zinc-800 w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <ListMusic className="w-5 h-5 text-[#FF3366]" />
            <span>Play Queue</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
              onLoadMoreQueue?.();
            }
          }}
          className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar"
        >
          
          {/* Autoplay Toggle */}
          {onToggleAutoplay && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isAutoplay ? 'bg-[#FF3366]/20 text-[#FF3366]' : 'bg-zinc-800 text-zinc-400'}`}>
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Autoplay</h3>
                  <p className="text-[11px] text-zinc-400">Play similar songs when queue ends</p>
                </div>
              </div>
              <button
                onClick={onToggleAutoplay}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAutoplay ? 'bg-[#FF3366]' : 'bg-zinc-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAutoplay ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Now Playing Section */}
          {currentTrack && (
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 px-2">
                Now Playing
              </h4>
              <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                <img
                  src={getHighResCoverUrl(currentTrack.coverArtUrl, currentTrack.path) || generateCoverArt(currentTrack.title, currentTrack.artist, currentTrack.gradientColors)}
                  alt={currentTrack.title}
                  onError={(e) => {
                    const currentSrc = e.currentTarget.src;
                    if (currentSrc.includes('maxresdefault.jpg')) {
                      e.currentTarget.src = currentSrc.replace('maxresdefault.jpg', 'hqdefault.jpg');
                    }
                  }}
                  className="w-12 h-12 rounded shadow-md object-cover"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-bold text-[#FF3366] truncate">
                    {currentTrack.title}
                  </span>
                  <span className="text-xs font-medium text-zinc-400 truncate">
                    {currentTrack.artist}
                  </span>
                </div>
                <div className="w-4 h-4 rounded-full bg-[#FF3366] animate-pulse shadow-[0_0_10px_#FF3366]" />
              </div>
            </div>
          )}

          {/* User Queue */}
          {userQueue.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 px-2">
                Next in Queue
              </h4>
              <div className="space-y-1 bg-zinc-900/50 rounded-xl p-2 border border-zinc-800/50">
                {userQueue.map((track, idx) => (
                  <div
                    key={`userqueue-${track.id}-${idx}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 group transition-colors"
                  >
                    <div 
                      className="relative w-10 h-10 rounded overflow-hidden cursor-pointer shrink-0"
                      onClick={() => {
                        onPlayTrack(track);
                        onRemoveFromQueue?.(idx);
                        onClose();
                      }}
                    >
                      <img
                        src={getHighResCoverUrl(track.coverArtUrl, track.path) || generateCoverArt(track.title, track.artist, track.gradientColors)}
                        alt={track.title}
                        onError={(e) => {
                          const currentSrc = e.currentTarget.src;
                          if (currentSrc.includes('maxresdefault.jpg')) {
                            e.currentTarget.src = currentSrc.replace('maxresdefault.jpg', 'hqdefault.jpg');
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                      </div>
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-semibold text-white truncate">{track.title}</span>
                      <span className="text-xs text-zinc-400 truncate">{track.artist}</span>
                    </div>
                    {onRemoveFromQueue && (
                      <button
                        onClick={() => onRemoveFromQueue(idx)}
                        className="p-2 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove from Queue"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Up Next (Dynamic Song Queue or Playlist) */}
          {queue.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 px-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider truncate pr-2">
                  {isShuffle
                    ? 'Up Next (Shuffled Queue)'
                    : (currentTrack ? `Up Next · Similar to ${currentTrack.title}` : 'Up Next From List')}
                </h4>
                {isShuffle ? (
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/30 shrink-0">
                    <Shuffle className="w-3 h-3" />
                    Shuffled
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                    <Radio className="w-3 h-3" />
                    Song Radio
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {queue.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => {
                      onPlayTrack(track);
                      onClose();
                    }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-900 group cursor-pointer transition-colors"
                  >
                    <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
                      <img
                        src={getHighResCoverUrl(track.coverArtUrl, track.path) || generateCoverArt(track.title, track.artist, track.gradientColors)}
                        alt={track.title}
                        onError={(e) => {
                          const currentSrc = e.currentTarget.src;
                          if (currentSrc.includes('maxresdefault.jpg')) {
                            e.currentTarget.src = currentSrc.replace('maxresdefault.jpg', 'hqdefault.jpg');
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                      </div>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">
                        {track.title}
                      </span>
                      <span className="text-xs text-zinc-500 group-hover:text-zinc-400 truncate">
                        {track.artist}
                      </span>
                    </div>
                  </div>
                ))}

                {isLoadingMore && (
                  <div className="flex items-center justify-center py-4 text-xs text-zinc-400 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#FF3366]" />
                    <span>Loading more recommendations...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {queue.length === 0 && userQueue.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Music className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-zinc-400 font-medium">Queue is empty</p>
              <p className="text-zinc-500 text-sm mt-1">Add songs from your playlist or search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
