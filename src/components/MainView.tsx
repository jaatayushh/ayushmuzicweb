import React, { useMemo, useState, useEffect } from 'react';
import {
  Play,
  Heart,
  Grid,
  List,
  Music,
  Search,
  Folder,
  Plus,
  Trash2,
  FolderPlus,
  Sparkles,
  History,
  X,
  Shuffle,
  Clock,
  ListPlus,
  Volume2,
  Loader2,
} from 'lucide-react';
import { ActiveTab, AiPlaylist, Playlist, Track } from '../types';
import { TrackCard } from './TrackCard';
import { TrackTable } from './TrackTable';
import { LyricsView } from './LyricsView';
import { getGreeting, shuffleArray, getGradientColors, formatTime, getHighResCoverUrl, generateCoverArt } from '../utils/audioUtils';

interface MainViewProps {
  activeTab: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
  tracks: Track[];
  homeRelatedTracks?: Track[];
  isLoadingHF?: boolean;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime?: number;
  likedTrackIds: string[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onToggleLike: (trackId: string, e: React.MouseEvent) => void;
  playlists: Playlist[];
  activePlaylistId: string | null;
  onRequestCreatePlaylist: () => void;
  onAddToPlaylist: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onRemoveFromPlaylist: (trackId: string, playlistId: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onSelectPlaylist: (playlistId: string) => void;
  onSeek?: (time: number) => void;
  onPlayPause?: () => void;
  playCounts?: Record<string, number>;
  recentlyPlayedIds?: string[];
  onRefreshLibrary?: () => void;
  addToast?: (message: string, type?: 'info' | 'error' | 'success') => void;
  aiPlaylists?: AiPlaylist[];
}


const TrackCardSkeleton = () => (
  <div className="bg-[#131316] p-3 sm:p-4 rounded-md flex flex-col gap-3 animate-pulse">
    <div className="w-full aspect-square bg-[#1f1f23] rounded-md" />
    <div className="space-y-2">
      <div className="h-4 bg-[#1f1f23] rounded-sm w-3/4" />
      <div className="h-3 bg-[#1f1f23] rounded-sm w-1/2" />
    </div>
  </div>
);

export const MainView: React.FC<MainViewProps> = ({
  activeTab,
  setActiveTab,
  tracks,
  homeRelatedTracks = [],
  isLoadingHF = false,
  currentTrack,
  isPlaying,
  currentTime = 0,
  likedTrackIds,
  searchQuery,
  setSearchQuery,
  onPlayTrack,
  onToggleLike,
  playlists,
  activePlaylistId,
  onRequestCreatePlaylist,
  onAddToPlaylist,
  onAddToQueue,
  onRemoveFromPlaylist,
  onDeletePlaylist,
  onSelectPlaylist,
  onSeek = () => {},
  onPlayPause = () => {},
  playCounts = {},
  recentlyPlayedIds = [],
  onRefreshLibrary = () => {},
  addToast = () => {},
  aiPlaylists = [],
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [viewingAiPlaylistId, setViewingAiPlaylistId] = useState<string | null>(null);
  
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [onlineSearchResults, setOnlineSearchResults] = useState<Track[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(localSearch), 250);
    return () => clearTimeout(t);
  }, [localSearch, setSearchQuery]);

  useEffect(() => {
    if (searchQuery !== localSearch) setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setOnlineSearchResults([]);
      setIsSearchingOnline(false);
      return;
    }

    let isMounted = true;
    setIsSearchingOnline(true);
    const controller = new AbortController();

    fetch(`/api/search?q=${encodeURIComponent(q)}&type=song`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { tracks: [] }))
      .then((data) => {
        if (!isMounted) return;
        const ytTracks: Track[] = Array.isArray(data.tracks)
          ? data.tracks
          : (Array.isArray(data.songs) ? data.songs : []);
        setOnlineSearchResults(ytTracks);
        setIsSearchingOnline(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        if (isMounted) setIsSearchingOnline(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [searchQuery]);

  const [allSongsFilter, setAllSongsFilter] = useState('');
  const greeting = getGreeting();

  // Filter tracks by search query if present
  const filteredTracks = useMemo(() => {
    return searchQuery.trim()
      ? tracks.filter(
          (t) =>
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.album.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : tracks;
  }, [searchQuery, tracks]);

  // Combined local library matches + YouTube Music online search results
  const displaySearchTracks = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const local = tracks.filter((t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.album.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const seen = new Set(local.map((t) => (t.title + t.artist).toLowerCase()));
    const additional = onlineSearchResults.filter(
      (t) => !seen.has((t.title + t.artist).toLowerCase())
    );
    return [...local, ...additional];
  }, [tracks, searchQuery, onlineSearchResults]);

  // Full, unsliced library for the "All Songs" tab — every track Hugging
  // Face reports, with its own local filter box (separate from the global
  // header search).
  const allSongsTracks = useMemo(() => {
    if (!allSongsFilter.trim()) return tracks;
    const q = allSongsFilter.toLowerCase();
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
    );
  }, [tracks, allSongsFilter]);

  // Randomized track order for the home page — reshuffled only when the
  // library size changes (i.e. app startup), never during playback.
  const shuffledTracks = useMemo(() => shuffleArray(tracks), [tracks.length]);

  // Recommended tracks for Home page ("Songs You Might Like" - 20-30 tracks)
  const recommendedTracks = useMemo(() => shuffleArray(tracks).slice(0, 24), [tracks.length]);

  const recentlyPlayedTracks = useMemo(() => {
    return recentlyPlayedIds
      .map((id) => tracks.find((t) => t.id === id) || homeRelatedTracks.find((t) => t.id === id))
      .filter((t): t is Track => !!t)
      .slice(0, 20);
  }, [tracks, homeRelatedTracks, recentlyPlayedIds]);

  const latestPlayedTrack = recentlyPlayedTracks[0] || null;

  // Songs related to recent listening (dynamically supplied by /api/related)
  const basedOnRecentTracks = useMemo(() => {
    if (homeRelatedTracks.length > 0) return homeRelatedTracks;
    if (latestPlayedTrack) {
      const firstArtist = latestPlayedTrack.artist.split(/[,&]/)[0].trim().toLowerCase();
      const artistMatch = tracks.filter(
        (t) => t.id !== latestPlayedTrack.id && t.artist.toLowerCase().includes(firstArtist)
      );
      if (artistMatch.length > 0) return artistMatch;
    }
    return tracks.slice(0, 24);
  }, [homeRelatedTracks, latestPlayedTrack, tracks]);

  // More by latest artist
  const moreByArtistTracks = useMemo(() => {
    if (!latestPlayedTrack?.artist) return [];
    const firstArtist = latestPlayedTrack.artist.split(/[,&]/)[0].trim().toLowerCase();
    return tracks.filter(
      (t) => t.id !== latestPlayedTrack.id && t.artist.toLowerCase().includes(firstArtist)
    ).slice(0, 12);
  }, [latestPlayedTrack, tracks]);

  // Liked tracks list
  const likedTracks = tracks.filter((t) => likedTrackIds.includes(t.id));

  // Active custom playlist
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);
  const playlistTracks = activePlaylist
    ? activePlaylist.trackIds
        .map((id) => tracks.find((t) => t.id === id) || homeRelatedTracks.find((t) => t.id === id))
        .filter((t): t is Track => Boolean(t))
    : [];

  // Tracks not yet in active playlist (for quick recommendation adding)
  const availableTracksToAdd = activePlaylist
    ? tracks.filter((t) => !activePlaylist.trackIds.includes(t.id)).slice(0, 8)
    : [];

  // Currently-open AI-generated playlist, if any
  const viewingAiPlaylist = aiPlaylists.find((p) => p.id === viewingAiPlaylistId) || null;
  const [homeFilter, setHomeFilter] = useState<'all' | 'music' | 'podcasts' | 'recent'>('all');

  const handlePlayFiltered = React.useCallback((track: Track) => onPlayTrack(track, filteredTracks), [onPlayTrack, filteredTracks]);
  const handlePlaySearch = React.useCallback((track: Track) => onPlayTrack(track, displaySearchTracks), [onPlayTrack, displaySearchTracks]);
  const handlePlayAllSongs = React.useCallback((track: Track) => onPlayTrack(track, allSongsTracks), [onPlayTrack, allSongsTracks]);

  const SEARCH_CATEGORIES = useMemo(() => [
    { name: 'Bollywood Hits', color: 'bg-gradient-to-br from-[#E1306C] to-[#F77737]', query: 'Bollywood Hits 2026' },
    { name: 'Punjabi Beats', color: 'bg-gradient-to-br from-[#FF5858] to-[#F09819]', query: 'Punjabi Hits' },
    { name: 'Global Top 50', color: 'bg-gradient-to-br from-[#8E2DE2] to-[#4A00E0]', query: 'Global Top 50' },
    { name: 'Hindi Romance', color: 'bg-gradient-to-br from-[#FA709A] to-[#FEE140]', query: 'Hindi Romantic Songs' },
    { name: 'Hip-Hop & Rap', color: 'bg-gradient-to-br from-[#11998E] to-[#38EF7D]', query: 'Hip Hop Rap' },
    { name: 'Haryanvi Mashup', color: 'bg-gradient-to-br from-[#F857A6] to-[#FF5858]', query: 'Haryanvi Songs' },
    { name: 'Lo-Fi Chill', color: 'bg-gradient-to-br from-[#4facfe] to-[#00f2fe]', query: 'Lofi Chill Beats' },
    { name: 'Workout Energy', color: 'bg-gradient-to-br from-[#ff0844] to-[#ffb199]', query: 'Gym Workout Music' },
    { name: 'Indie & Acoustic', color: 'bg-gradient-to-br from-[#667eea] to-[#764ba2]', query: 'Indian Indie Music' },
    { name: 'Rock Classics', color: 'bg-gradient-to-br from-[#b224ef] to-[#7579ff]', query: 'Rock Classics' },
  ], []);

  return (
    <main className="flex-1 overflow-y-auto pb-[calc(140px+max(0.6rem,env(safe-area-inset-bottom,0px)))] md:pb-28 px-3.5 sm:px-6 pt-3 sm:pt-4 custom-scrollbar select-none bg-black">
      {activeTab === 'home' && !activePlaylistId && !viewingAiPlaylistId && (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">

          {/* ── TOP GREETING HEADER ── */}
          <div className="flex items-center justify-between pt-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              {greeting}
            </h1>
          </div>

          {/* ── TOP CATEGORY FILTER PILLS ── */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setHomeFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                homeFilter === 'all' ? 'bg-white text-black' : 'bg-[#1e1e24] hover:bg-[#2a2a32] text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setHomeFilter('music')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                homeFilter === 'music' ? 'bg-white text-black' : 'bg-[#1e1e24] hover:bg-[#2a2a32] text-white'
              }`}
            >
              Music
            </button>
            <button
              onClick={() => setHomeFilter('recent')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                homeFilter === 'recent' ? 'bg-white text-black' : 'bg-[#1e1e24] hover:bg-[#2a2a32] text-white'
              }`}
            >
              Recently Played
            </button>
          </div>

          {homeFilter === 'recent' ? (
            <div className="animate-in fade-in">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-4">Recently Played</h2>
              {recentlyPlayedTracks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {recentlyPlayedTracks.map((track) => (
                    <div
                      key={track.id}
                      onClick={() => onPlayTrack(track, tracks)}
                      className="bg-[#131316] hover:bg-[#1f1f23] p-3 sm:p-4 rounded-md cursor-pointer group transition-all duration-300 flex flex-col"
                    >
                      <div className="relative mb-3 aspect-square rounded-md overflow-hidden bg-zinc-800 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                        <img
                          src={getHighResCoverUrl(track.coverArtUrl, track.path) || ''}
                          alt={track.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const currentSrc = e.currentTarget.src;
                            if (currentSrc.includes('maxresdefault.jpg')) {
                              e.currentTarget.src = currentSrc.replace('maxresdefault.jpg', 'hqdefault.jpg');
                            } else {
                              e.currentTarget.style.background = '#27272a';
                            }
                          }}
                        />
                        <button
                          className="absolute bottom-2 right-2 w-10 h-10 bg-[#FF3366] text-black rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all duration-300 hover:scale-105 active:scale-95"
                          title="Play"
                        >
                          <Play className="w-5 h-5 fill-black translate-x-0.5" />
                        </button>
                      </div>
                      <h3 className="font-bold text-white text-[13px] sm:text-sm truncate mb-1">{track.title}</h3>
                      <p className="text-[11px] sm:text-xs text-zinc-400 truncate">{track.artist || 'Unknown Artist'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-zinc-500 text-sm font-medium">
                  You haven't played any tracks yet.
                </div>
              )}
            </div>
          ) : (
            <>

          {/* ── QUICK ACCESS GRID (TOP TILES: GROUNDED IN RECENTLY PLAYED) ── */}
          {recentlyPlayedTracks.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#ec4899]" />
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">Recent Listens</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {recentlyPlayedTracks.slice(0, 8).map((track) => (
                  <div
                    key={track.id}
                    onClick={() => onPlayTrack(track, recentlyPlayedTracks)}
                    className="flex items-center justify-between bg-[#1e1e24]/60 hover:bg-[#2a2a32] rounded-xl overflow-hidden cursor-pointer group transition-all duration-200 shadow-sm border border-white/5"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pr-2">
                      <img
                        src={getHighResCoverUrl(track.coverArtUrl, track.path) || generateCoverArt(track.title, track.artist, track.gradientColors)}
                        alt={track.title}
                        className="w-12 h-12 sm:w-14 sm:h-14 object-cover shrink-0 bg-zinc-800 shadow-[2px_0_10px_rgba(0,0,0,0.5)]"
                        onError={(e) => {
                          const currentSrc = e.currentTarget.src;
                          if (currentSrc.includes('=w800')) {
                            e.currentTarget.src = currentSrc.replace('=w800-h800-l90-rj', '=w544-h544-l90-rj');
                          } else if (currentSrc.includes('maxresdefault.jpg')) {
                            e.currentTarget.src = currentSrc.replace('maxresdefault.jpg', 'hqdefault.jpg');
                          } else {
                            e.currentTarget.src = generateCoverArt(track.title, track.artist, track.gradientColors);
                          }
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs sm:text-sm font-bold text-white truncate block">{track.title}</span>
                        <span className="text-[11px] text-zinc-400 truncate block">{track.artist}</span>
                      </div>
                    </div>
                    <button
                      className="mr-2 sm:mr-3 opacity-0 group-hover:opacity-100 transition-all p-2 sm:p-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white rounded-full shadow-lg hover:scale-105 active:scale-95 shrink-0"
                      title="Play"
                    >
                      <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-[#8b5cf6]/20 via-[#ec4899]/15 to-transparent border border-white/10 rounded-2xl p-5 sm:p-6 mb-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">Welcome to AyushMuzic</h2>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-xl">
                Play any track below to transform your Home with endless smart recommendations tailored to your recent music taste!
              </p>
            </div>
          )}

          {/* ── SECTION 1: BASED ON YOUR RECENT LISTENING ── */}
          {basedOnRecentTracks.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#ec4899]" />
                    <span>{latestPlayedTrack ? `Because you listened to "${latestPlayedTrack.title}"` : 'Recommended for You'}</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {latestPlayedTrack ? `Similar songs curated by AyushMuzic smart recommendation engine` : 'Popular trending picks'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {basedOnRecentTracks.slice(0, 12).map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    isPlaying={isPlaying}
                    isCurrentTrack={currentTrack?.id === track.id}
                    isLiked={likedTrackIds.includes(track.id)}
                    onPlay={(t) => onPlayTrack(t, basedOnRecentTracks)}
                    onToggleLike={onToggleLike}
                    onAddToPlaylist={onAddToPlaylist}
                    onAddToQueue={onAddToQueue}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── SECTION 2: JUMP BACK IN • RECENTLY PLAYED ── */}
          {recentlyPlayedTracks.length > 0 && (
            <MixRow
              title="Jump Back In • Recently Played"
              icon={<History className="w-5 h-5 text-[#8b5cf6]" />}
              tracks={recentlyPlayedTracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              likedTrackIds={likedTrackIds}
              onPlayTrack={(t) => onPlayTrack(t, recentlyPlayedTracks)}
              onToggleLike={onToggleLike}
              onAddToPlaylist={onAddToPlaylist}
              onAddToQueue={onAddToQueue}
            />
          )}

          {/* ── SECTION 3: MORE FROM RECENT ARTIST ── */}
          {moreByArtistTracks.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-[#ec4899]" />
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    More by {latestPlayedTrack?.artist}
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {moreByArtistTracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    isPlaying={isPlaying}
                    isCurrentTrack={currentTrack?.id === track.id}
                    isLiked={likedTrackIds.includes(track.id)}
                    onPlay={(t) => onPlayTrack(t, moreByArtistTracks)}
                    onToggleLike={onToggleLike}
                    onAddToPlaylist={onAddToPlaylist}
                    onAddToQueue={onAddToQueue}
                  />
                ))}
              </div>
            </section>
          )}


          {/* ── PLAYLISTS MADE BY AI (Punjabi Mix / Haryanvi Mix / Hindi Mix / Love Mix...) ── */}
          {aiPlaylists.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#FF3366]" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Made by AI
                  </h2>
                </div>
                <span className="text-xs text-zinc-500 font-medium">Refreshes daily</span>
              </div>

              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 custom-scrollbar snap-x -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
                {aiPlaylists.map((pl) => {
                  const [c1, c2] = getGradientColors(pl.name);
                  return (
                    <div
                      key={pl.id}
                      onClick={() => setViewingAiPlaylistId(pl.id)}
                      className="shrink-0 w-36 sm:w-44 md:w-48 snap-start p-3 sm:p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 cursor-pointer group hover:bg-zinc-800/60 transition-all active:scale-[0.98]"
                    >
                      <div
                        className="w-full aspect-square rounded-xl flex items-center justify-center text-3xl sm:text-4xl relative overflow-hidden shadow-lg mb-2.5 sm:mb-3"
                        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                      >
                        <span>{pl.emoji}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (pl.tracks.length > 0) onPlayTrack(pl.tracks[0], pl.tracks);
                          }}
                          className="absolute bottom-2 right-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-105 active:scale-95 transition-all shadow-xl"
                          title={`Play ${pl.name}`}
                        >
                          <Play className="w-4 h-4 fill-white translate-x-0.5" />
                        </button>
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-white truncate">{pl.name}</h3>
                      <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 line-clamp-2">
                        {pl.description || `${pl.tracks.length} AI-picked tracks`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── SONGS YOU MIGHT LIKE (20-30 tracks grid) ── */}
          {recommendedTracks.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-[#FF3366]" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Songs You Might Like
                  </h2>
                </div>
                <span className="text-xs text-zinc-500 font-medium">
                  {recommendedTracks.length} recommendations
                </span>
              </div>

              {isLoadingHF ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {Array.from({ length: 6 }).map((_, i) => <TrackCardSkeleton key={i} />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {recommendedTracks.map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      isPlaying={isPlaying}
                      isCurrentTrack={currentTrack?.id === track.id}
                      isLiked={likedTrackIds.includes(track.id)}
                      onPlay={onPlayTrack}
                      onToggleLike={onToggleLike}
                      onAddToPlaylist={onAddToPlaylist}
                      onAddToQueue={onAddToQueue}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── QUICK ACTION: Create Playlist ── */}
          <div
            onClick={onRequestCreatePlaylist}
            className="group flex items-center gap-4 rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.01]"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(29,185,84,0.30)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(29,185,84,0.06)'; e.currentTarget.style.borderColor = 'rgba(29,185,84,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(29,185,84,0.30)'; }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110"
              style={{ background: 'rgba(29,185,84,0.12)' }}
            >
              <Plus className="w-7 h-7" style={{ color: '#FF3366' }} />
            </div>
            <div>
              <p className="font-bold text-white text-base">Create a Playlist</p>
              <p className="text-xs" style={{ color: '#52525b' }}>Build your own custom mix</p>
            </div>
            <div className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: '#FF3366' }}
              >
                <Plus className="w-4 h-4 text-black" />
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* ----------------- AI PLAYLIST FULL VIEW ----------------- */}
      {viewingAiPlaylist && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <button
            onClick={() => setViewingAiPlaylistId(null)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-2"
          >
            ← Back
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
            {(() => {
              const [c1, c2] = getGradientColors(viewingAiPlaylist.name);
              return (
                <div
                  className="w-40 h-40 sm:w-52 sm:h-52 rounded-2xl flex items-center justify-center text-6xl shadow-2xl shrink-0"
                  style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                >
                  <span>{viewingAiPlaylist.emoji}</span>
                </div>
              );
            })()}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF3366]" />
                <span className="text-xs font-bold text-[#FF3366] uppercase tracking-wide">AI Mix</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                {viewingAiPlaylist.name}
              </h1>
              <p className="text-sm text-zinc-400">
                {viewingAiPlaylist.description || `${viewingAiPlaylist.tracks.length} AI-picked tracks`}
              </p>
              <p className="text-xs text-zinc-500">{viewingAiPlaylist.tracks.length} songs</p>
              <button
                onClick={() => onPlayTrack(viewingAiPlaylist.tracks[0], viewingAiPlaylist.tracks)}
                className="mt-2 flex items-center gap-2 bg-[#FF3366] hover:bg-[#FF4D79] text-black font-bold px-6 py-3 rounded-full transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-black" />
                Play
              </button>
            </div>
          </div>

          <TrackTable
            tracks={viewingAiPlaylist.tracks}
            currentTrackId={currentTrack?.id || null}
            isPlaying={isPlaying}
            likedTrackIds={likedTrackIds}
            onPlayTrack={(track) => onPlayTrack(track, viewingAiPlaylist.tracks)}
            onToggleLike={onToggleLike}
            onAddToPlaylist={onAddToPlaylist}
            onAddToQueue={onAddToQueue}
          />
        </div>
      )}

      {/* ----------------- ALL SONGS TAB ----------------- */}
      {activeTab === 'allSongs' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">All Songs</h2>
              <p className="text-xs text-zinc-400 mt-1">
                {isLoadingHF ? 'Loading library…' : `${allSongsTracks.length} of ${tracks.length} song${tracks.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={allSongsFilter}
                  onChange={(e) => setAllSongsFilter(e.target.value)}
                  placeholder="Filter all songs…"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3366] transition-colors"
                />
              </div>
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'table' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'
                  }`}
                  title="Table List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {isLoadingHF ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {Array.from({ length: 12 }).map((_, i) => <TrackCardSkeleton key={i} />)}
              </div>
            ) : (
              <div className="w-full space-y-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-14 bg-[#131316] rounded-md animate-pulse flex items-center px-4 gap-4">
                     <div className="w-10 h-10 bg-[#1f1f23] rounded-md" />
                     <div className="flex-1 space-y-2">
                        <div className="h-3 bg-[#1f1f23] rounded-sm w-1/3" />
                        <div className="h-2 bg-[#1f1f23] rounded-sm w-1/4" />
                     </div>
                  </div>
                ))}
              </div>
            )
          ) : allSongsTracks.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {allSongsTracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    isPlaying={isPlaying}
                    isCurrentTrack={currentTrack?.id === track.id}
                    isLiked={likedTrackIds.includes(track.id)}
                    onPlay={handlePlayAllSongs}
                    onToggleLike={onToggleLike}
                    onAddToPlaylist={onAddToPlaylist}
                    onAddToQueue={onAddToQueue}
                  />
                ))}
              </div>
            ) : (
              <TrackTable
                tracks={allSongsTracks}
                currentTrackId={currentTrack?.id || null}
                isPlaying={isPlaying}
                likedTrackIds={likedTrackIds}
                onPlayTrack={handlePlayAllSongs}
                onToggleLike={onToggleLike}
                onAddToPlaylist={onAddToPlaylist}
                onAddToQueue={onAddToQueue}
              />
            )
          ) : (
            <div className="py-20 text-center text-zinc-400">
              <Music className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p className="text-lg font-bold text-white">
                {allSongsFilter ? `No songs match "${allSongsFilter}"` : 'No songs found in the library.'}
              </p>
            </div>
          )}
        </div>
      )}



      {/* ----------------- SEARCH TAB ----------------- */}
      {activeTab === 'search' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="relative max-w-3xl">
            <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="What do you want to listen to?"
              autoFocus
              className="w-full rounded-full pl-11 pr-12 py-3 text-sm sm:text-base text-white placeholder-zinc-500 focus:outline-none transition-all shadow-inner"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
              onFocusCapture={(e) => {
                e.currentTarget.style.border = '1px solid #ec4899';
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(236,72,153,0.2)';
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {searchQuery.trim() ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>Search Results</span>
                  <span className="text-zinc-400 text-lg font-normal">"{searchQuery}"</span>
                  {isSearchingOnline && <Loader2 className="w-4 h-4 text-[#FF3366] animate-spin" />}
                </h2>
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'
                    }`}
                    title="Grid View"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'table' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'
                    }`}
                    title="Table List View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {displaySearchTracks.length > 0 ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                    {displaySearchTracks.map((track) => (
                      <TrackCard
                        key={track.id}
                        track={track}
                        isPlaying={isPlaying}
                        isCurrentTrack={currentTrack?.id === track.id}
                        isLiked={likedTrackIds.includes(track.id)}
                        onPlay={handlePlaySearch}
                        onToggleLike={onToggleLike}
                        onAddToPlaylist={onAddToPlaylist}
                        onAddToQueue={onAddToQueue}
                      />
                    ))}
                  </div>
                ) : (
                  <TrackTable
                    tracks={displaySearchTracks}
                    currentTrackId={currentTrack?.id || null}
                    isPlaying={isPlaying}
                    likedTrackIds={likedTrackIds}
                    onPlayTrack={handlePlaySearch}
                    onToggleLike={onToggleLike}
                    onAddToPlaylist={onAddToPlaylist}
                    onAddToQueue={onAddToQueue}
                  />
                )
              ) : isSearchingOnline ? (
                <div className="py-20 text-center text-zinc-400">
                  <Loader2 className="w-10 h-10 mx-auto mb-3 text-[#FF3366] animate-spin" />
                  <p className="text-lg font-bold text-white">Searching for "{searchQuery}"...</p>
                </div>
              ) : (
                <div className="py-20 text-center text-zinc-400">
                  <Search className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                  <p className="text-lg font-bold text-white">No results found for "{searchQuery}"</p>
                  <p className="text-xs text-zinc-500 mt-1">Please check for spelling errors or try searching another term.</p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Browse all</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4">
                {SEARCH_CATEGORIES.map((cat) => (
                  <div
                    key={cat.name}
                    onClick={() => setLocalSearch(cat.query)}
                    className={`${cat.color} min-h-[84px] sm:min-h-[110px] sm:aspect-square p-3 sm:p-4 rounded-xl cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-all shadow-lg flex flex-col justify-between overflow-hidden relative group`}
                  >
                    <span className="font-extrabold text-white text-sm sm:text-base md:text-lg tracking-tight leading-snug z-10 drop-shadow">
                      {cat.name}
                    </span>
                    <div className="absolute right-2 bottom-2 text-white/30 group-hover:text-white/60 transition-colors">
                      <Music className="w-6 h-6 sm:w-10 sm:h-10 rotate-12" />
                    </div>
                  </div>
                ))}
              </div>

              {tracks.length > 0 && (
                <div className="pt-4 space-y-4">
                  <h3 className="text-xl font-bold text-white tracking-tight">Trending Quick Picks</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                    {tracks.slice(0, 12).map((track) => (
                      <TrackCard
                        key={track.id}
                        track={track}
                        isPlaying={isPlaying}
                        isCurrentTrack={currentTrack?.id === track.id}
                        isLiked={likedTrackIds.includes(track.id)}
                        onPlay={(t) => onPlayTrack(t, tracks)}
                        onToggleLike={onToggleLike}
                        onAddToPlaylist={onAddToPlaylist}
                        onAddToQueue={onAddToQueue}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ----------------- YOUR LIBRARY TAB ----------------- */}
      {activeTab === 'library' && !activePlaylistId && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-extrabold text-white">Your Library</h2>
            <button
              onClick={onRequestCreatePlaylist}
              className="flex items-center gap-2 bg-[#FF3366] hover:bg-[#FF4D79] text-black px-4 py-2 rounded-full font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create Playlist</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {/* Create Playlist Prompt Tile */}
            <div
              onClick={onRequestCreatePlaylist}
              className="p-6 rounded-2xl bg-zinc-900/90 border-2 border-dashed border-emerald-500/40 hover:border-[#FF3366] flex flex-col justify-between cursor-pointer group hover:bg-emerald-950/20 hover:scale-[1.02] transition-all shadow-xl min-h-[200px]"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#FF3366]/20 flex items-center justify-center text-[#FF3366]">
                  <Plus className="w-7 h-7 stroke-[2.5]" />
                </div>
                <span className="text-[11px] font-extrabold text-[#FF3366] uppercase tracking-wider bg-[#FF3366]/10 px-2.5 py-1 rounded-full">
                  New
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white group-hover:text-[#FF3366] transition-colors">
                  Create Playlist
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Build custom mix collections of your favorite songs
                </p>
              </div>
            </div>

            {/* Liked Songs Tile */}
            <div
              onClick={() => onPlayTrack(likedTracks[0] || tracks[0], likedTracks.length > 0 ? likedTracks : tracks)}
              className="p-6 rounded-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 flex flex-col justify-between cursor-pointer group hover:scale-[1.02] transition-transform shadow-xl min-h-[200px]"
            >
              <div className="flex items-start justify-between">
                <Heart className="w-10 h-10 fill-white text-white" />
                <button className="w-12 h-12 rounded-full bg-[#FF3366] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all shadow-2xl">
                  <Play className="w-6 h-6 fill-black translate-x-0.5" />
                </button>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white">Liked Songs</h3>
                <p className="text-sm font-semibold text-white/80 mt-1">
                  {likedTracks.length} saved tracks
                </p>
              </div>
            </div>

            {/* Custom Playlists */}
            {playlists.map((pl) => {
              const playlistTracksInOrder = pl.trackIds
                .map((id) => tracks.find((t) => t.id === id))
                .filter((t): t is Track => Boolean(t));
              const firstTrackInPl = playlistTracksInOrder[0];

              return (
                <div
                  key={pl.id}
                  onClick={() => onSelectPlaylist(pl.id)}
                  className="p-6 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex flex-col justify-between cursor-pointer group hover:bg-zinc-800 hover:scale-[1.02] transition-all shadow-xl min-h-[200px] relative"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-700 flex items-center justify-center">
                      <Music className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePlaylist(pl.id);
                        }}
                        className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-700/60 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Playlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (firstTrackInPl) onPlayTrack(firstTrackInPl, playlistTracksInOrder);
                        }}
                        className="w-12 h-12 rounded-full bg-[#FF3366] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all shadow-2xl"
                        title="Play Playlist"
                      >
                        <Play className="w-6 h-6 fill-black translate-x-0.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white truncate">{pl.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      {pl.trackIds.length} tracks
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4">
            <h3 className="text-xl font-bold text-white mb-4">All Library Songs</h3>
            <TrackTable
              tracks={tracks}
              currentTrackId={currentTrack?.id || null}
              isPlaying={isPlaying}
              likedTrackIds={likedTrackIds}
              onPlayTrack={(track) => onPlayTrack(track, tracks)}
              onToggleLike={onToggleLike}
              onAddToPlaylist={onAddToPlaylist}
                onAddToQueue={onAddToQueue}
            />
          </div>
        </div>
      )}

      {/* ----------------- LIKED SONGS VIEW ----------------- */}
      {activeTab === 'liked' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Liked Header Banner */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 bg-gradient-to-b from-indigo-900/80 via-purple-950/40 to-transparent p-6 -mx-4 sm:-mx-6 -mt-4">
            <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-2xl shrink-0">
              <Heart className="w-16 h-16 sm:w-24 sm:h-24 fill-white text-white" />
            </div>

            <div className="flex flex-col gap-2 text-center sm:text-left">
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">
                Playlist
              </span>
              <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tight">
                Liked Songs
              </h1>
              <p className="text-sm text-zinc-300 font-medium">
                Your personal collection of saved favorite tracks.
              </p>
              <span className="text-xs text-zinc-400 font-semibold mt-1">
                {likedTracks.length} tracks
              </span>
            </div>
          </div>

          {/* Action Row */}
          {likedTracks.length > 0 && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => onPlayTrack(likedTracks[0], likedTracks)}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#FF3366] hover:bg-[#FF4D79] hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-2xl transition-all"
                title="Play All Liked Songs"
              >
                <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-black translate-x-0.5" />
              </button>
            </div>
          )}

          <TrackTable
            tracks={likedTracks}
            currentTrackId={currentTrack?.id || null}
            isPlaying={isPlaying}
            likedTrackIds={likedTrackIds}
            onPlayTrack={(track) => onPlayTrack(track, likedTracks)}
            onToggleLike={onToggleLike}
            onAddToPlaylist={onAddToPlaylist}
                onAddToQueue={onAddToQueue}
          />
        </div>
      )}

      {/* ----------------- CUSTOM PLAYLIST VIEW ----------------- */}
      {activePlaylist && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 bg-gradient-to-b from-emerald-900/80 via-zinc-950/40 to-transparent p-6 -mx-4 sm:-mx-6 -mt-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
              <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center shadow-2xl shrink-0">
                <Folder className="w-16 h-16 sm:w-24 sm:h-24 text-white" />
              </div>

              <div className="flex flex-col gap-2 text-center sm:text-left">
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-300">
                  Custom Playlist
                </span>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                  {activePlaylist.name}
                </h1>
                {activePlaylist.description && (
                  <p className="text-sm text-zinc-300 font-medium">
                    {activePlaylist.description}
                  </p>
                )}
                <span className="text-xs text-zinc-400 font-semibold mt-1">
                  {playlistTracks.length} tracks
                </span>
              </div>
            </div>

            <button
              onClick={() => onDeletePlaylist(activePlaylist.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/80 hover:bg-red-900/40 text-zinc-400 hover:text-red-400 border border-zinc-700/60 text-xs font-bold transition-all shrink-0"
              title="Delete Playlist"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Playlist</span>
            </button>
          </div>

          {/* Controls */}
          {playlistTracks.length > 0 && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => onPlayTrack(playlistTracks[0], playlistTracks)}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#FF3366] hover:bg-[#FF4D79] hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-2xl transition-all"
                title="Play Playlist"
              >
                <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-black translate-x-0.5" />
              </button>
            </div>
          )}

          {/* Playlist Track Table */}
          {playlistTracks.length > 0 ? (
            <TrackTable
              tracks={playlistTracks}
              currentTrackId={currentTrack?.id || null}
              isPlaying={isPlaying}
              likedTrackIds={likedTrackIds}
              onPlayTrack={(track) => onPlayTrack(track, playlistTracks)}
              onToggleLike={onToggleLike}
              onRemoveFromPlaylist={(trackId) => onRemoveFromPlaylist(trackId, activePlaylist.id)}
            />
          ) : (
            <div className="py-12 px-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center text-zinc-400">
              <Music className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <h3 className="text-lg font-bold text-white mb-1">Your playlist is empty</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
                Add songs to "{activePlaylist.name}" from your library below or while browsing.
              </p>
            </div>
          )}

          {/* Add More Songs to Playlist Section */}
          {availableTracksToAdd.length > 0 && (
            <div className="pt-6 border-t border-zinc-800/80">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FF3366]" />
                    Add songs to {activePlaylist.name}
                  </h3>
                  <p className="text-xs text-zinc-400">Based on songs in your library</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {availableTracksToAdd.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <div className="w-10 h-10 rounded bg-zinc-900 shrink-0 overflow-hidden">
                        <img
                          src={track.coverArtUrl}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate">{track.title}</span>
                        <span className="text-[11px] text-zinc-400 truncate">{track.artist}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onAddToPlaylist(track)}
                      className="px-3 py-1.5 rounded-full bg-zinc-700 hover:bg-[#FF3366] hover:text-black text-white text-xs font-bold transition-all shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------- SYNCHRONIZED KARAOKE LYRICS VIEW ----------------- */}
      {activeTab === 'lyrics' && (
        <div className="h-[calc(100vh-180px)] md:h-[calc(100vh-160px)] w-full py-2">
          <LyricsView
            currentTrack={currentTrack}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onSeek={onSeek}
            onPlayPause={onPlayPause}
            rawLrc={currentTrack?.lrc}
          />
        </div>
      )}

    </main>
  );
};

/* ----------------- Auto-Generated Mix Row (Top Played / Recently Played) ----------------- */
interface MixRowProps {
  title: string;
  icon: React.ReactNode;
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  likedTrackIds: string[];
  onPlayTrack: (track: Track) => void;
  onToggleLike: (trackId: string, e: React.MouseEvent) => void;
  onAddToPlaylist: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
}

const MixRow: React.FC<MixRowProps> = ({
  title,
  icon,
  tracks,
  currentTrack,
  isPlaying,
  likedTrackIds,
  onPlayTrack,
  onToggleLike,
  onAddToPlaylist,
  onAddToQueue,
}) => {
  

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
      </div>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 custom-scrollbar snap-x">
        {tracks.map((track) => (
          <div key={track.id} className="w-[140px] sm:w-[170px] shrink-0 snap-start">
            <TrackCard
              track={track}
              isPlaying={isPlaying}
              isCurrentTrack={currentTrack?.id === track.id}
              isLiked={likedTrackIds.includes(track.id)}
              onPlay={onPlayTrack}
              onToggleLike={onToggleLike}
              onAddToPlaylist={onAddToPlaylist}
              onAddToQueue={onAddToQueue}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

