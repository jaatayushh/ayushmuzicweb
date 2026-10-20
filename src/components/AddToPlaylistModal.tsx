import React, { useState } from 'react';
import { X, Check, Plus, Music, Search, FolderPlus } from 'lucide-react';
import { Playlist, Track } from '../types';
import { generateCoverArt } from '../utils/audioUtils';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  playlists: Playlist[];
  onToggleTrackInPlaylist: (trackId: string, playlistId: string) => void;
  onCreateNewPlaylist: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  onClose,
  track,
  playlists,
  onToggleTrackInPlaylist,
  onCreateNewPlaylist,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen || !track) return null;

  const fallbackSvg = generateCoverArt(track.title, track.artist, track.gradientColors);

  const filteredPlaylists = playlists.filter((pl) =>
    pl.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">Add to Playlist</h3>
            <p className="text-xs text-zinc-400">Save song to your custom collections</p>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Track Preview Header */}
        <div className="flex items-center gap-3 my-4 p-3 rounded-xl bg-zinc-800/60 border border-zinc-800 shrink-0">
          <img
            src={track.coverArtUrl || fallbackSvg}
            alt={track.title}
            onError={(e) => {
              e.currentTarget.src = fallbackSvg;
            }}
            className="w-12 h-12 rounded-lg object-cover shrink-0 shadow"
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-bold text-white text-sm truncate">{track.title}</span>
            <span className="text-xs text-zinc-400 truncate">{track.artist || 'CoolJaat'}</span>
          </div>
        </div>

        {/* Quick Action: Create New Playlist */}
        <button
          onClick={() => {
            onClose();
            onCreateNewPlaylist();
          }}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-zinc-800/90 hover:bg-zinc-800 border border-zinc-700/80 text-[#FF3366] hover:text-[#FF4D79] font-bold text-xs transition-all mb-3 shrink-0 active:scale-98"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Create New Playlist</span>
        </button>

        {/* Playlist Search Filter */}
        {playlists.length > 3 && (
          <div className="relative mb-3 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search playlists..."
              className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3366]"
            />
          </div>
        )}

        {/* Playlist List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar min-h-[160px]">
          {filteredPlaylists.length === 0 ? (
            <div className="py-8 text-center text-zinc-400">
              <Music className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
              <p className="text-xs font-semibold text-zinc-300">
                {playlists.length === 0 ? 'No custom playlists created yet' : 'No playlists match search'}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Click "Create New Playlist" above to start your first playlist!
              </p>
            </div>
          ) : (
            filteredPlaylists.map((pl) => {
              const inPlaylist = pl.trackIds.includes(track.id);

              return (
                <button
                  key={pl.id}
                  onClick={() => onToggleTrackInPlaylist(track.id, pl.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                    inPlaylist
                      ? 'bg-[#FF3366]/10 border-[#FF3366]/50 text-white'
                      : 'bg-zinc-800/40 border-zinc-800 hover:bg-zinc-800/80 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold ${
                        inPlaylist
                          ? 'bg-[#FF3366] text-black'
                          : 'bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      <Music className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold truncate text-white">{pl.name}</span>
                      <span className="text-[11px] text-zinc-400">
                        {pl.trackIds.length} tracks
                      </span>
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                      inPlaylist
                        ? 'bg-[#FF3366] text-black'
                        : 'border border-zinc-600 text-transparent hover:border-zinc-400'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-zinc-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
