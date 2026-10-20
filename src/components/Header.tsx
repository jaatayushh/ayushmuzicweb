import React from 'react';
import {
  Search,
  Home,
  Download,
  Library,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { AyushLogo } from './AyushLogo';
import { getGreeting } from '../utils/audioUtils';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenInstallModal: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenInstallModal,
  onToggleSidebar,
  isSidebarOpen = true,
}) => {
  const greeting = getGreeting();

  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 px-2.5 sm:px-4 md:px-8 flex items-center justify-between gap-2 sm:gap-3 md:gap-4 select-none bg-black/85 backdrop-blur-xl border-b border-white/5">
      {/* Left Section */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <a href="/" title="AyushMuzic Website & Downloads" className="hover:opacity-90 transition-opacity">
          <AyushLogo size={32} showText={false} brandName="AyushMuzic" />
        </a>

        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`hidden md:flex p-1.5 sm:p-2 rounded-full transition-all ${
              !isSidebarOpen ? 'bg-[#1f1f1f] text-[#ec4899]' : 'text-zinc-400 hover:text-white hover:bg-[#1f1f1f]'
            }`}
            title={isSidebarOpen ? 'Collapse Your Library' : 'Expand Your Library'}
          >
            <Library className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
      </div>

      {/* Center Section - Mobile Navigation & Greeting */}
      <div className="flex sm:hidden items-center justify-center gap-1.5 flex-1 min-w-0 px-1">
        <div className="flex items-center bg-[#1f1f1f] border border-white/10 rounded-full p-0.5 shrink-0">
          <button
            onClick={() => setActiveTab && setActiveTab('home')}
            className={`p-1.5 rounded-full transition-colors ${
              activeTab === 'home' ? 'bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white shadow' : 'text-[#B3B3B3] hover:text-white'
            }`}
            title="Home Tab"
          >
            <Home className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab && setActiveTab('search')}
            className={`p-1.5 rounded-full transition-colors ${
              activeTab === 'search' ? 'bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white shadow' : 'text-[#B3B3B3] hover:text-white'
            }`}
            title="Search Tab"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        <span className="text-white font-extrabold text-xs tracking-tight truncate flex items-center gap-1">
          <span className="text-[#ec4899]">✦</span>
          <span>{greeting}</span>
        </span>
      </div>

      {/* Center Section - Desktop & Tablet Navigation & Search with Greeting */}
      <div className="hidden sm:flex items-center gap-2 lg:gap-3 flex-1 max-w-2xl justify-center min-w-0">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-white shrink-0 select-none">
          <span className="text-[#ec4899]">✦</span>
          <span>{greeting}</span>
        </div>

        {/* Home & Search Tabs Group */}
        <div className="flex items-center gap-1 bg-[#131316] border border-white/10 rounded-full p-1 shrink-0 shadow-inner">
          <button
            onClick={() => setActiveTab && setActiveTab('home')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'home'
                ? 'bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white shadow-md'
                : 'text-[#B3B3B3] hover:text-white hover:bg-white/5'
            }`}
            title="Home Tab"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab && setActiveTab('search')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'search'
                ? 'bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white shadow-md'
                : 'text-[#B3B3B3] hover:text-white hover:bg-white/5'
            }`}
            title="Search Tab"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Right Section - Install App PWA Button */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={onOpenInstallModal}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white font-bold text-xs sm:text-sm hover:scale-105 active:scale-95 transition-all shadow-md shadow-purple-500/20 cursor-pointer"
          title="Install AyushMuzic App"
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      </div>
    </header>
  );
};
