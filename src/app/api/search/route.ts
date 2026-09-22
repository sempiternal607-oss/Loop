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

    const calculateScore = (song: Song): number => {
      if (queryTokens.length === 0) return 0;
      const titleLower = song.title.toLowerCase();
      const artistLower = song.artist.toLowerCase();
      const combined = `${titleLower} ${artistLower}`;

      let matchedTokens = 0;
      for (const token of queryTokens) {
        if (combined.includes(token)) matchedTokens++;
      }
      const tokenMatchRatio = matchedTokens / queryTokens.length;

      // Full query match bonus: massive boost when ALL query tokens match (e.g. both artist AND title match)
      const fullMatchBonus = tokenMatchRatio === 1.0 ? 0.5 : 0;

      // Official release bonus: official audio releases win first place when query matches both
      const officialBonus = !song.isVideo ? 0.25 : 0;

      // Exact title bonus
      const exactTitleBonus = titleLower === trimmed.toLowerCase() ? 0.2 : 0;

      return tokenMatchRatio + fullMatchBonus + officialBonus + exactTitleBonus;
    };

    const candidateMap = new Map<string, Song>();

    if (filter === 'videos') {
      // Videos & covers filter: collect general and video items
      for (const s of parsedGeneral) candidateMap.set(s.videoId, s);
      for (const s of parsedSongs) {
        if (s.isVideo && !candidateMap.has(s.videoId)) candidateMap.set(s.videoId, s);
      }
    } else if (filter === 'songs') {
      // Songs only: prioritize official releases
      for (const s of parsedSongs) candidateMap.set(s.videoId, s);
      // If official songs have no high match or few items, supplement matching community uploads
      const hasHighMatch = Array.from(candidateMap.values()).some((s) => calculateScore(s) >= 1.0);
      if (!hasHighMatch || candidateMap.size < 5) {
        for (const s of parsedGeneral) {
          if (!candidateMap.has(s.videoId)) candidateMap.set(s.videoId, s);
        }
      }
    } else {
      // Default ('all'): merge both sources for comprehensive results
      for (const s of parsedSongs) candidateMap.set(s.videoId, s);
      for (const s of parsedGeneral) {
        if (!candidateMap.has(s.videoId)) candidateMap.set(s.videoId, s);
      }
    }

    // Sort candidates using unified scoring:
    // 1. Exact & full matches with user's artist + title rank highest
    // 2. Official audio releases get priority bonus over unofficial uploads whenever both exist
    // 3. Community uploads step in when no official audio release matches the query
    const songs = Array.from(candidateMap.values()).sort((a, b) => calculateScore(b) - calculateScore(a));

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
