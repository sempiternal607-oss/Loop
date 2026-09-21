import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId || !/^[\w-]{6,20}$/.test(videoId)) {
    return NextResponse.json({ error: 'Invalid videoId' }, { status: 400 });
  }

  try {
    const categories = encodeURIComponent(
      JSON.stringify(['sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'music_offtopic'])
    );
    const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${encodeURIComponent(
      videoId
    )}&categories=${categories}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'LoopMusic/1.0 (Next.js)' },
      next: { revalidate: 3600 }, // cache for 1 hour
    });

    if (res.status === 404) {
      return NextResponse.json({ segments: [] });
    }

    if (!res.ok) {
      return NextResponse.json({ segments: [] });
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ segments: [] });
    }

    const segments = data
      .filter((s: { actionType?: string }) => !s.actionType || s.actionType === 'skip')
      .map((s: { category: string; segment: [number, number] }) => ({
        category: s.category,
        start: s.segment[0],
        end: s.segment[1],
      }));

    return NextResponse.json({ segments });
  } catch (error) {
    console.error('SponsorBlock error:', error);
    return NextResponse.json({ segments: [] });
  }
}
