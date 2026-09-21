import { NextRequest, NextResponse } from 'next/server';
import { requestYTM, findAll, parseRendererToSong, extractText, extractThumbnail } from '@/lib/ytmusic';
import { Song } from '@/types/music';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    const data = await requestYTM('browse', { browseId: id });

    // Extract header info (title, thumbnail, description)
    const header = (
      findAll(data, 'musicResponsiveHeaderRenderer')[0] ||
      findAll(data, 'musicDetailHeaderRenderer')[0] ||
      findAll(data, 'musicImmersiveHeaderRenderer')[0]
    ) as Record<string, unknown> | undefined;

    const title = header ? extractText(header.title) : '';
    const description = header ? extractText(header.description) : '';
    const thumbnail = header ? extractThumbnail(header.thumbnail) : '';

    const listItems = findAll(data, 'musicResponsiveListItemRenderer');
    const songs: Song[] = [];
    const seenIds = new Set<string>();

    for (const item of listItems) {
      const song = parseRendererToSong(item);
      if (song && !seenIds.has(song.videoId)) {
        seenIds.add(song.videoId);
        songs.push(song);
      }
    }

    return NextResponse.json({
      id,
      title: title || 'Playlist',
      description,
      thumbnail,
      songs,
    });
  } catch (error) {
    console.error('Browse API error:', error);
    return NextResponse.json({ error: 'Failed to browse', songs: [] }, { status: 500 });
  }
}
