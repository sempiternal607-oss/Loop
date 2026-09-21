import { NextRequest, NextResponse } from 'next/server';
import { fetchArtistDetails } from '@/lib/ytmusic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const name = searchParams.get('name');
  const query = searchParams.get('q');

  const target = (id || name || query || '').trim();

  if (!target) {
    return NextResponse.json({ error: 'Artist identifier is required' }, { status: 400 });
  }

  try {
    const artist = await fetchArtistDetails(target);

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    return NextResponse.json({ artist });
  } catch (error) {
    console.error('Artist API error:', error);
    return NextResponse.json({ error: 'Failed to load artist' }, { status: 500 });
  }
}
