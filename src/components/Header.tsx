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
    <header className="sticky top-0 z-30 pt-[env(safe-area-inset-top,0px)] px-2.5 sm:px-4 md:px-8 select-none bg-black/90 backdrop-blur-2xl border-b border-white/5 transition-all">
      <div className="h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4 max-w-full">
        {/* Left Section: Brand Logo */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <a
            href="/"
            title="AyushMuzic Website & Downloads"
            className="flex items-center hover:opacity-90 active:scale-95 transition-all"
          >
            <AyushLogo size={32} showText={false} brandName="AyushMuzic" />
          </a>

          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`hidden md:flex p-2 rounded-full transition-all ${
                !isSidebarOpen
                  ? 'bg-white/10 text-[#ec4899]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title={isSidebarOpen ? 'Collapse Your Library' : 'Expand Your Library'}
            >
              <Library className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Center Section: Responsive Segmented Tabs (Home & Search) */}
        <div className="flex items-center justify-center flex-1 min-w-0 px-1 sm:px-2">
          {/* Desktop Greeting Pill (Visible on large screens) */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 mr-3 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-white shrink-0 select-none">
            <span className="text-[#ec4899]">✦</span>
            <span>{greeting}</span>
          </div>

          {/* Unified Home & Search Segmented Pill Bar */}
          <nav
            aria-label="Primary Navigation"
            className="flex items-center bg-[#141418]/90 border border-white/10 rounded-full p-1 shadow-lg shadow-black/40 backdrop-blur-md shrink-0"
          >
            {/* Home Tab */}
            <button
              onClick={() => setActiveTab && setActiveTab('home')}
              className={`flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-extrabold transition-all min-h-[34px] cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95'
              }`}
              title="Home"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span className="tracking-tight">Home</span>
            </button>

            {/* Search Tab */}
            <button
              onClick={() => setActiveTab && setActiveTab('search')}
              className={`flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-extrabold transition-all min-h-[34px] cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95'
              }`}
              title="Search"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="tracking-tight">Search</span>
            </button>
          </nav>
        </div>

        {/* Right Section: Install App Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onOpenInstallModal}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white font-extrabold text-xs sm:text-sm hover:scale-105 active:scale-95 transition-all shadow-md shadow-purple-500/25 cursor-pointer shrink-0"
            title="Install AyushMuzic App"
          >
            <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="sm:hidden">App</span>
            <span className="hidden sm:inline">Install App</span>
          </button>
        </div>
      </div>
    </header>
  );
};
