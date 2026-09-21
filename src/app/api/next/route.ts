import { NextRequest, NextResponse } from 'next/server';
import { requestYTM, findAll, parseRendererToSong } from '@/lib/ytmusic';
import { Song } from '@/types/music';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  const playlistId = searchParams.get('playlistId');

  if (!videoId || !/^[\w-]{6,20}$/.test(videoId)) {
    return NextResponse.json({ error: 'Invalid videoId' }, { status: 400 });
  }

  try {
    const body: Record<string, unknown> = {
      videoId,
      enablePersistentPlaylistPanel: true,
      isAudioOnly: true,
      playlistId: playlistId || `RDAMVM${videoId}`,
    };

    const data = await requestYTM('next', body);

    // Extract playlistPanelVideoRenderer items (the upcoming queue)
    const panelVideos = findAll(data, 'playlistPanelVideoRenderer');
    const queue: Song[] = [];
    const seenIds = new Set<string>();

    for (const item of panelVideos) {
      const song = parseRendererToSong(item);
      // Don't include the seed song itself in the upcoming queue, only similar songs
      if (song && song.videoId !== videoId && !seenIds.has(song.videoId)) {
        seenIds.add(song.videoId);
        queue.push(song);
      }
    }

    return NextResponse.json({ queue });
  } catch (error) {
    console.error('Next API error:', error);
    return NextResponse.json({ queue: [] }, { status: 500 });
  }
}
