import { NextRequest, NextResponse } from 'next/server';
import { requestYTM, findAll, parseRendererToSong, extractArtistFromSearch } from '@/lib/ytmusic';
import { Song, ArtistSummary } from '@/types/music';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const filter = searchParams.get('filter');

  if (!query || !query.trim()) {
    return NextResponse.json({ songs: [], artist: null });
  }

  try {
    const trimmed = query.trim();

    // Fetch songs filter and general search in parallel to retrieve both songs and artist card shelf
    const [songsData, generalData] = await Promise.all([
      filter === 'all'
        ? null
        : requestYTM('search', { query: trimmed, params: 'EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D' }).catch(() => null),
      requestYTM('search', { query: trimmed }).catch(() => null),
    ]);

    const songs: Song[] = [];
    const seenIds = new Set<string>();

    // 1. Parse primary song items
    const primaryItems = findAll(songsData || generalData, 'musicResponsiveListItemRenderer');
    for (const item of primaryItems) {
      const parsed = parseRendererToSong(item);
      if (parsed && !seenIds.has(parsed.videoId)) {
        seenIds.add(parsed.videoId);
        songs.push(parsed);
      }
    }

    // 2. If songsData was used and returned few items, supplement from generalData
    if (songsData && songs.length < 5 && generalData) {
      const fallbackItems = findAll(generalData, 'musicResponsiveListItemRenderer');
      for (const item of fallbackItems) {
        const parsed = parseRendererToSong(item);
        if (parsed && !seenIds.has(parsed.videoId)) {
          seenIds.add(parsed.videoId);
          songs.push(parsed);
        }
      }
    }

    // 3. Extract artist spotlight if matched
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
