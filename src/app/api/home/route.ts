import { NextResponse } from 'next/server';
import { requestYTM, findAll, parseRendererToSong, extractText } from '@/lib/ytmusic';
import { Song } from '@/types/music';

export async function GET() {
  try {
    const [homeData, chartsData] = await Promise.allSettled([
      requestYTM('browse', { browseId: 'FEmusic_home' }),
      requestYTM('browse', { browseId: 'FEmusic_charts' }),
    ]);

    const sections: Array<{ title: string; items: Song[] }> = [];
    const seenSongIds = new Set<string>();

    // 1. Process Charts if available
    if (chartsData.status === 'fulfilled' && chartsData.value) {
      const chartItems = findAll(chartsData.value, 'musicResponsiveListItemRenderer');
      const chartSongs: Song[] = [];
      for (const item of chartItems) {
        const song = parseRendererToSong(item);
        if (song && !seenSongIds.has(song.videoId)) {
          seenSongIds.add(song.videoId);
          chartSongs.push(song);
        }
      }
      if (chartSongs.length > 0) {
        sections.push({
          title: 'Top Charts & Trending',
          items: chartSongs.slice(0, 16),
        });
      }
    }

    // 2. Process Home Data shelves
    if (homeData.status === 'fulfilled' && homeData.value) {
      const carouselShelves = findAll(homeData.value, 'musicCarouselShelfRenderer');
      for (const shelf of carouselShelves) {
        const title = extractText((shelf as { header?: { musicCarouselShelfBasicHeaderRenderer?: { title?: unknown } } })?.header?.musicCarouselShelfBasicHeaderRenderer?.title);
        const shelfItems = findAll(shelf, 'musicResponsiveListItemRenderer').concat(
          findAll(shelf, 'musicTwoRowItemRenderer')
        );

        const songs: Song[] = [];
        for (const item of shelfItems) {
          const song = parseRendererToSong(item);
          if (song && !seenSongIds.has(song.videoId)) {
            seenSongIds.add(song.videoId);
            songs.push(song);
          }
        }

        if (songs.length >= 3 && title) {
          sections.push({
            title,
            items: songs.slice(0, 12),
          });
        }
      }
    }

    // Fallback if home sections empty: query search for popular songs
    if (sections.length === 0) {
      const fallbackData = await requestYTM('search', {
        query: 'Top Hits Indonesia 2025',
        params: 'EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D',
      });
      const items = findAll(fallbackData, 'musicResponsiveListItemRenderer');
      const fallbackSongs: Song[] = [];
      for (const it of items) {
        const song = parseRendererToSong(it);
        if (song) fallbackSongs.push(song);
      }
      sections.push({
        title: 'Popular Songs',
        items: fallbackSongs.slice(0, 16),
      });
    }

    return NextResponse.json({ sections });
  } catch (error) {
    console.error('Home API error:', error);
    return NextResponse.json({ sections: [] }, { status: 500 });
  }
}
