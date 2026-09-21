import { NextRequest, NextResponse } from 'next/server';
import { fetchAlbumDetails } from '@/lib/ytmusic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id || !id.trim()) {
    return NextResponse.json({ error: 'Album browseId is required' }, { status: 400 });
  }

  try {
    const album = await fetchAlbumDetails(id.trim());

    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    return NextResponse.json({ album });
  } catch (error) {
    console.error('Album API error:', error);
    return NextResponse.json({ error: 'Failed to load album' }, { status: 500 });
  }
}
