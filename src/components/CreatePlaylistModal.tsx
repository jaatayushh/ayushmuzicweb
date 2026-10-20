import React, { useState } from 'react';
import { X, Music, Sparkles } from 'lucide-react';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePlaylist: (name: string, description?: string) => void;
}

const PRESET_NAMES = [
  'Chill Lofi Beats',
  'Workout Energy',
  'Focus & Code',
  'Late Night Drive',
  'Acoustic Sunset',
  'Weekend Party',
];

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreatePlaylist,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreatePlaylist(name.trim(), description.trim());
      setName('');
      setDescription('');
      onClose();
    }
  };

  const handleSelectPreset = (preset: string) => {
    setName(preset);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF3366] to-emerald-400 flex items-center justify-center text-black font-bold">
              <Music className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">Create Custom Playlist</h3>
              <p className="text-xs text-zinc-400">Organize your favorite songs</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mb-5">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#FF3366]" />
            Quick Preset Names
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_NAMES.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  name === preset
                    ? 'bg-[#FF3366] text-black font-bold scale-105'
                    : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              Playlist Name <span className="text-[#FF3366]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Favorite Beats"
              autoFocus
              className="w-full bg-zinc-800/90 border border-zinc-700/80 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3366] text-sm font-medium transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              Description <span className="text-zinc-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your playlist a headline or mood description"
              className="w-full bg-zinc-800/90 border border-zinc-700/80 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3366] text-sm font-medium transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-6 py-2.5 rounded-full text-xs font-extrabold bg-[#FF3366] text-black hover:bg-[#FF4D79] hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-[#FF3366]"
            >
              Create Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
