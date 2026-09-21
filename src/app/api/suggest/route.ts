import { NextRequest, NextResponse } from 'next/server';
import { requestYTM, findAll, extractText } from '@/lib/ytmusic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || !q.trim()) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const data = await requestYTM('music/get_search_suggestions', { input: q.trim() });
    const renderers = findAll(data, 'searchSuggestionRenderer');
    const suggestions: string[] = [];

    for (const r of renderers) {
      const text = extractText((r as { suggestion?: unknown })?.suggestion);
      if (text && !suggestions.includes(text)) {
        suggestions.push(text);
      }
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 8) });
  } catch (error) {
    console.error('Suggest API error:', error);
    return NextResponse.json({ suggestions: [] });
  }
}
