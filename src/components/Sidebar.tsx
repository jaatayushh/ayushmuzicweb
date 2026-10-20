import React from 'react';
import {
  Home,
  Search,
  Library,
  Heart,
  Plus,
  Music,
  Disc,
  Folder,
  Mic2,
  Sparkles,
  ListMusic,
  X,
} from 'lucide-react';
import { ActiveTab, Playlist } from '../types';

import { AyushLogo } from './AyushLogo';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  likedCount: number;
  playlists: Playlist[];
  onRequestCreatePlaylist: () => void;
  activePlaylistId: string | null;
  setActivePlaylistId: (id: string | null) => void;
  onOpenQueue?: () => void;
  onCloseSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  likedCount,
  playlists,
  onRequestCreatePlaylist,
  activePlaylistId,
  setActivePlaylistId,
  onOpenQueue,
  onCloseSidebar,
  isSidebarOpen = true,
}) => {

  const navItem = (
    key: ActiveTab,
    label: string,
    Icon: React.ElementType,
    onClick?: () => void
  ) => {
    const isActive = activeTab === key && !activePlaylistId;
    return (
      <button
        onClick={onClick || (() => { setActiveTab(key); setActivePlaylistId(null); })}
        className={`flex items-center gap-4 px-4 py-2.5 rounded-lg transition-all w-full text-left font-bold ${
          isActive ? 'text-white bg-white/10' : 'text-[#B3B3B3] hover:text-white'
        }`}
      >
        <Icon className="w-6 h-6 shrink-0" />
        <span>{label}</span>
      </button>
    );
  };

  if (!isSidebarOpen) return null;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[280px] lg:w-[320px] p-2 gap-2 shrink-0 select-none bg-black h-full">
        {/* Top Navigation Box (Home & Search) */}
        <div className="bg-[#0c0c0e] rounded-lg p-2 flex flex-col gap-0.5">
          <div className="px-4 pt-3 pb-4">
            <a href="/" title="AyushMuzic Website & Downloads" className="inline-block hover:opacity-90 transition-opacity">
              <AyushLogo size={32} showText={true} brandName="AyushMuzic" textSize="text-xl" />
            </a>
          </div>
          {navItem('home', 'Home', Home)}
          {navItem('search', 'Search', Search)}
        </div>

        {/* Library Block */}
        <div className="bg-[#0c0c0e] rounded-lg p-2 flex-1 flex flex-col gap-1 overflow-hidden mt-0">
          {/* Library Header */}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3 text-[#B3B3B3] hover:text-white transition-colors cursor-pointer" onClick={() => setActiveTab('library')}>
              <Library className="w-6 h-6" />
              <span className="font-bold text-sm">Your Library</span>
            </div>
            <button
              onClick={onRequestCreatePlaylist}
              className="w-8 h-8 rounded-full hover:bg-[#1f1f23] flex items-center justify-center text-[#B3B3B3] hover:text-white transition-all cursor-pointer"
              title="Create playlist"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 px-3 py-1">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'library' ? 'bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white shadow' : 'bg-[#242424] hover:bg-[#1e1e24] text-white'
              }`}
            >
              Playlists
            </button>
            <button
              onClick={() => setActiveTab('allSongs')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'allSongs' ? 'bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white shadow' : 'bg-[#242424] hover:bg-[#1e1e24] text-white'
              }`}
            >
              All Songs
            </button>
          </div>

          {/* Search & Recents header */}
          <div className="flex items-center justify-between px-4 py-2 text-xs font-bold text-[#B3B3B3]">
            <Search className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
            <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
              <span>Recents</span>
              <ListMusic className="w-4 h-4" />
            </div>
          </div>

          {/* Playlists List */}
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {/* Liked Songs */}
            <button
              onClick={() => { setActiveTab('liked'); setActivePlaylistId(null); }}
              className={`w-full flex items-center gap-3 p-2 rounded-md transition-all text-left group ${
                activeTab === 'liked' ? 'bg-[#1f1f23]' : 'hover:bg-[#1f1f23]'
              }`}
            >
              <div className="w-12 h-12 rounded bg-gradient-to-br from-[#8b5cf6] via-purple-600 to-[#ec4899] flex items-center justify-center shrink-0 shadow">
                <Heart className="w-5 h-5 fill-white text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold truncate text-white">Liked Songs</span>
                <span className="text-[13px] text-[#B3B3B3] truncate">📌 Playlist • {likedCount} songs</span>
              </div>
            </button>

            {/* Custom Playlists */}
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => { setActivePlaylistId(pl.id); setActiveTab('playlist'); }}
                className={`w-full flex items-center gap-3 p-2 rounded-md transition-all text-left group ${
                  activePlaylistId === pl.id ? 'bg-[#1f1f23]' : 'hover:bg-[#1f1f23]'
                }`}
              >
                <div className="w-12 h-12 rounded bg-[#1f1f23] flex items-center justify-center shrink-0 overflow-hidden">
                  <ListMusic className="w-5 h-5 text-[#B3B3B3]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={`text-sm truncate ${activePlaylistId === pl.id ? 'text-[#ec4899]' : 'text-white'}`}>{pl.name}</span>
                  <span className="text-[13px] text-[#B3B3B3] truncate">Playlist • AyushMuzic</span>
                </div>
              </button>
            ))}

            {playlists.length === 0 && (
              <div className="p-2">
                <div className="bg-[#242424] rounded-lg p-4 flex flex-col gap-2">
                  <p className="text-sm font-bold text-white">Create your first playlist</p>
                  <p className="text-xs text-[#B3B3B3]">It's easy, we'll help you</p>
                  <button
                    onClick={onRequestCreatePlaylist}
                    className="self-start mt-2 bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white hover:scale-105 active:scale-95 font-bold text-xs px-4 py-1.5 rounded-full transition-all cursor-pointer shadow"
                  >
                    Create playlist
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around py-2.5 px-3 z-40"
        style={{
          background: 'rgba(10,10,15,0.96)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {([
          { key: 'home' as ActiveTab, label: 'Home', Icon: Home },
          { key: 'search' as ActiveTab, label: 'Search', Icon: Search },
          { key: 'allSongs' as ActiveTab, label: 'All Songs', Icon: ListMusic },
          { key: 'liked' as ActiveTab, label: 'Liked', Icon: Heart },
          { key: 'library' as ActiveTab, label: 'Library', Icon: Library },
        ]).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setActivePlaylistId(null); }}
            className="flex flex-col items-center gap-1 text-[10px] font-semibold min-w-[48px] min-h-[44px] justify-center transition-colors"
            style={{
              color: activeTab === key ? '#ec4899' : '#71717a',
            }}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
};
