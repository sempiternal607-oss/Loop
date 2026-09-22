import { NextRequest, NextResponse } from 'next/server';
import { requestYTM, findAll, parseRendererToSong, extractArtistFromSearch } from '@/lib/ytmusic';
import { Song, ArtistSummary } from '@/types/music';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const filter = (searchParams.get('filter') || 'all').toLowerCase(); // 'all' | 'songs' | 'videos'

  if (!query || !query.trim()) {
    return NextResponse.json({ query: '', songs: [], artist: null });
  }

  try {
    const trimmed = query.trim();
    const queryTokens = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 1);

    // Fetch songs filter and general search in parallel
    const [songsData, generalData] = await Promise.all([
      filter === 'videos'
        ? null
        : requestYTM('search', { query: trimmed, params: 'EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D' }).catch(() => null),
      requestYTM('search', { query: trimmed }).catch(() => null),
    ]);

    const parsedSongs: Song[] = [];
    const parsedGeneral: Song[] = [];

    if (songsData) {
      const items = findAll(songsData, 'musicResponsiveListItemRenderer');
      for (const it of items) {
        const parsed = parseRendererToSong(it);
        if (parsed) parsedSongs.push(parsed);
      }
    }

    if (generalData) {
      const items = findAll(generalData, 'musicResponsiveListItemRenderer');
      for (const it of items) {
        const parsed = parseRendererToSong(it);
        if (parsed) parsedGeneral.push(parsed);
      }
    }

    const calculateRelevance = (song: Song): number => {
      if (queryTokens.length === 0) return 0;
      const text = `${song.title} ${song.artist}`.toLowerCase();
      let matches = 0;
      for (const token of queryTokens) {
        if (text.includes(token)) matches++;
      }
      return matches / queryTokens.length;
    };

    const songs: Song[] = [];
    const seenIds = new Set<string>();

    const addSong = (s: Song) => {
      if (!seenIds.has(s.videoId)) {
        seenIds.add(s.videoId);
        songs.push(s);
      }
    };

    if (filter === 'videos') {
      // Prioritize video items and general uploads
      for (const s of parsedGeneral) {
        if (s.isVideo) addSong(s);
      }
      for (const s of parsedGeneral) addSong(s);
    } else if (filter === 'songs') {
      // Prioritize official songs first
      for (const s of parsedSongs) addSong(s);
      // If official songs have no high-match or few items, supplement from general uploads
      const hasHighMatch = songs.some((s) => calculateRelevance(s) >= 0.75);
      if (!hasHighMatch || songs.length < 5) {
        for (const s of parsedGeneral) {
          if (calculateRelevance(s) >= 0.6) addSong(s);
        }
      }
      // Fill remaining if list is still small
      if (songs.length < 10) {
        for (const s of parsedGeneral) addSong(s);
      }
    } else {
      // Hybrid default ('all'):
      // 1. If general results contain top exact/high keyword matches (e.g. non-official releases like Naif - Dimana Aku Disini)
      const topGeneralMatches = parsedGeneral.slice(0, 5).filter((s) => calculateRelevance(s) >= 0.75);
      for (const s of topGeneralMatches) addSong(s);

      // 2. Add official songs
      for (const s of parsedSongs) addSong(s);

      // 3. Add remaining general uploads, music videos, and covers
      for (const s of parsedGeneral) addSong(s);
    }

    // Extract artist spotlight card if available in general search
    const artist: ArtistSummary | null = generalData ? extractArtistFromSearch(generalData) : null;

    return NextResponse.json({
      query: trimmed,
      songs,
      artist,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Search failed', songs: [], artist: null }, { status: 500 });
  }
}
