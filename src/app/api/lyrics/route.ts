import { NextRequest, NextResponse } from 'next/server';
import { LyricLine, LyricsData } from '@/types/music';

function cleanTitle(title: string): string {
  return title
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\s*(?:official\s*video|official\s*audio|lyrics?|audio|video|clip|mv|remastered)\s*/gi, '')
    .replace(/\s*[-–—]\s*$/g, '')
    .trim();
}

function cleanArtist(artist: string): string {
  return artist
    .split(/\s*[,&•·]\s*|\s+(?:feat\.?|ft\.?|with|x|vs\.?)\s+/i)[0]
    .replace(/\s*-\s*topic$/i, '')
    .trim();
}

function parseLrc(lrcText: string): LyricLine[] {
  const lines = lrcText.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{1,2}):(\d{1,2}(?:\.\d{1,3})?)\](.*)/;

  for (const line of lines) {
    const match = timeRegex.exec(line.trim());
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const time = minutes * 60 + seconds;
      const text = match[3].trim();
      result.push({ time, text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const artist = searchParams.get('artist');
  const duration = parseInt(searchParams.get('duration') || '0', 10);

  if (!title) {
    return NextResponse.json({ synced: false, lines: [] });
  }

  const cTitle = cleanTitle(title);
  const cArtist = artist ? cleanArtist(artist) : '';

  try {
    // 1. Try exact match from LRCLIB
    const getParams = new URLSearchParams({
      track_name: cTitle || title,
      artist_name: cArtist || artist || '',
    });
    if (duration > 0) {
      getParams.append('duration', duration.toString());
    }

    const exactRes = await fetch(`https://lrclib.net/api/get?${getParams.toString()}`, {
      headers: { 'User-Agent': 'LoopMusic/1.0 (Next.js)' },
      next: { revalidate: 86400 }, // cache for 24 hours
    });

    if (exactRes.ok) {
      const data = await exactRes.json();
      if (data.syncedLyrics) {
        const lines = parseLrc(data.syncedLyrics);
        return NextResponse.json({
          synced: true,
          lines,
          plainText: data.plainLyrics || undefined,
          source: 'LRCLIB',
        } satisfies LyricsData);
      } else if (data.plainLyrics) {
        return NextResponse.json({
          synced: false,
          lines: data.plainLyrics.split('\n').map((text: string) => ({ time: 0, text })),
          plainText: data.plainLyrics,
          source: 'LRCLIB',
        } satisfies LyricsData);
      }
    }

    // 2. Try search on LRCLIB
    const searchRes = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(`${cTitle} ${cArtist}`.trim())}`,
      {
        headers: { 'User-Agent': 'LoopMusic/1.0 (Next.js)' },
        next: { revalidate: 86400 },
      }
    );

    if (searchRes.ok) {
      const results = await searchRes.json();
      if (Array.isArray(results) && results.length > 0) {
        const first = results.find((r) => r.syncedLyrics) || results[0];
        if (first.syncedLyrics) {
          return NextResponse.json({
            synced: true,
            lines: parseLrc(first.syncedLyrics),
            plainText: first.plainLyrics,
            source: 'LRCLIB',
          } satisfies LyricsData);
        } else if (first.plainLyrics) {
          return NextResponse.json({
            synced: false,
            lines: first.plainLyrics.split('\n').map((text: string) => ({ time: 0, text })),
            plainText: first.plainLyrics,
            source: 'LRCLIB',
          } satisfies LyricsData);
        }
      }
    }

    return NextResponse.json({ synced: false, lines: [], source: 'None' });
  } catch (error) {
    console.error('Lyrics API error:', error);
    return NextResponse.json({ synced: false, lines: [] });
  }
}
