'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Song, Playlist } from '@/types/music';
import { useToast } from '@/components/ui/Toast';

interface PlaylistContextType {
  playlists: Playlist[];
  createPlaylist: (title: string, description?: string) => Playlist;
  deletePlaylist: (id: string) => void;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void;
  addSongToPlaylist: (playlistId: string, song: Song) => boolean;
  removeSongFromPlaylist: (playlistId: string, videoId: string) => void;
  isSongInPlaylist: (playlistId: string, videoId: string) => boolean;
  getPlaylist: (id: string) => Playlist | undefined;

  // Add to Playlist modal state
  isAddToPlaylistOpen: boolean;
  songToAddToPlaylist: Song | null;
  openAddToPlaylistModal: (song: Song) => void;
  closeAddToPlaylistModal: () => void;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

const STORAGE_KEY = 'loop_playlists';

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Modal State
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);

  // Load playlists from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPlaylists(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load playlists from storage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever playlists change
  const savePlaylists = useCallback((newPlaylists: Playlist[]) => {
    setPlaylists(newPlaylists);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPlaylists));
    } catch (e) {
      console.error('Failed to save playlists to storage', e);
    }
  }, []);

  const createPlaylist = useCallback(
    (title: string, description?: string): Playlist => {
      const trimmedTitle = title.trim() || 'My Playlist';
      const newPlaylist: Playlist = {
        id: `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: trimmedTitle,
        description: description?.trim() || '',
        songs: [],
        trackCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const updated = [newPlaylist, ...playlists];
      savePlaylists(updated);
      showToast(`Created playlist "${trimmedTitle}"`);
      return newPlaylist;
    },
    [playlists, savePlaylists, showToast]
  );

  const deletePlaylist = useCallback(
    (id: string) => {
      const target = playlists.find((p) => p.id === id);
      const updated = playlists.filter((p) => p.id !== id);
      savePlaylists(updated);
      if (target) {
        showToast(`Deleted playlist "${target.title}"`);
      }
    },
    [playlists, savePlaylists, showToast]
  );

  const updatePlaylist = useCallback(
    (id: string, updates: Partial<Playlist>) => {
      const updated = playlists.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            ...updates,
            updatedAt: Date.now(),
          };
        }
        return p;
      });
      savePlaylists(updated);
    },
    [playlists, savePlaylists]
  );

  const addSongToPlaylist = useCallback(
    (playlistId: string, song: Song): boolean => {
      const target = playlists.find((p) => p.id === playlistId);
      if (!target) return false;

      // Check if song already exists in playlist
      const alreadyExists = target.songs.some((s) => s.videoId === song.videoId);
      if (alreadyExists) {
        showToast(`"${song.title}" is already in "${target.title}"`);
        return false;
      }

      const updatedSongs = [...target.songs, song];
      const updated = playlists.map((p) => {
        if (p.id === playlistId) {
          return {
            ...p,
            songs: updatedSongs,
            trackCount: updatedSongs.length,
            thumbnail: p.thumbnail || song.thumbnail,
            updatedAt: Date.now(),
          };
        }
        return p;
      });

      savePlaylists(updated);
      showToast(`Added to "${target.title}"`);
      return true;
    },
    [playlists, savePlaylists, showToast]
  );

  const removeSongFromPlaylist = useCallback(
    (playlistId: string, videoId: string) => {
      const target = playlists.find((p) => p.id === playlistId);
      if (!target) return;

      const updatedSongs = target.songs.filter((s) => s.videoId !== videoId);
      const updated = playlists.map((p) => {
        if (p.id === playlistId) {
          return {
            ...p,
            songs: updatedSongs,
            trackCount: updatedSongs.length,
            thumbnail: updatedSongs.length > 0 ? updatedSongs[0].thumbnail : undefined,
            updatedAt: Date.now(),
          };
        }
        return p;
      });

      savePlaylists(updated);
      showToast(`Removed song from "${target.title}"`);
    },
    [playlists, savePlaylists, showToast]
  );

  const isSongInPlaylist = useCallback(
    (playlistId: string, videoId: string): boolean => {
      const target = playlists.find((p) => p.id === playlistId);
      if (!target) return false;
      return target.songs.some((s) => s.videoId === videoId);
    },
    [playlists]
  );

  const getPlaylist = useCallback(
    (id: string): Playlist | undefined => {
      return playlists.find((p) => p.id === id);
    },
    [playlists]
  );

  const openAddToPlaylistModal = useCallback((song: Song) => {
    setSongToAddToPlaylist(song);
    setIsAddToPlaylistOpen(true);
  }, []);

  const closeAddToPlaylistModal = useCallback(() => {
    setIsAddToPlaylistOpen(false);
    setSongToAddToPlaylist(null);
  }, []);

  return (
    <PlaylistContext.Provider
      value={{
        playlists,
        createPlaylist,
        deletePlaylist,
        updatePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        isSongInPlaylist,
        getPlaylist,
        isAddToPlaylistOpen,
        songToAddToPlaylist,
        openAddToPlaylistModal,
        closeAddToPlaylistModal,
      }}
    >
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylist() {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  return context;
}
