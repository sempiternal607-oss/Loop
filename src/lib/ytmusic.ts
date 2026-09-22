import { Song, Artist, ArtistSummary, ArtistProfile, ArtistRelease } from '@/types/music';

const YTM_BASE = 'https://music.youtube.com/youtubei/v1';

const CONTEXT = {
  client: {
    clientName: 'WEB_REMIX',
    clientVersion: '1.20240101.00.00',
    hl: 'id',
    gl: 'ID',
  },
};

const HEADERS = {
  'Content-Type': 'application/json',
  Origin: 'https://music.youtube.com',
  Referer: 'https://music.youtube.com/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

export async function requestYTM(endpoint: string, body: Record<string, unknown> = {}, query = '') {
  const url = `${YTM_BASE}/${endpoint}?prettyPrint=false${query}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ context: CONTEXT, ...body }),
    next: { revalidate: 180 }, // cache for 3 minutes
  });

  if (!res.ok) {
    throw new Error(`YTM ${endpoint} failed with status: ${res.status}`);
  }
  return res.json();
}

// Deep traversal helper
export function findAll<T = unknown>(obj: unknown, key: string, out: T[] = []): T[] {
  if (!obj || typeof obj !== 'object') return out;
  if (Array.isArray(obj)) {
    for (const item of obj) findAll(item, key, out);
    return out;
  }
  const record = obj as Record<string, unknown>;
  for (const k of Object.keys(record)) {
    if (k === key) out.push(record[k] as T);
    findAll(record[k], key, out);
  }
  return out;
}

export function findFirst<T = unknown>(obj: unknown, key: string): T | undefined {
  return findAll<T>(obj, key)[0];
}

export function extractText(o: unknown): string {
  if (!o || typeof o !== 'object') return '';
  const obj = o as Record<string, unknown>;
  if (Array.isArray(obj.runs)) {
    return obj.runs.map((r: { text?: string }) => r.text || '').join('');
  }
  if (typeof obj.simpleText === 'string') {
    return obj.simpleText;
  }
  return '';
}

export function runsInfo(o: unknown): Array<{ name: string; browseId?: string }> {
  const out: Array<{ name: string; browseId?: string }> = [];
  if (!o || typeof o !== 'object') return out;
  const obj = o as { runs?: Array<{ text?: string; navigationEndpoint?: { browseEndpoint?: { browseId?: string } } }> };
  if (Array.isArray(obj.runs)) {
    for (const r of obj.runs) {
      const browseId = r.navigationEndpoint?.browseEndpoint?.browseId;
      if (r.text && r.text.trim() && !['•', '&', ',', '|'].includes(r.text.trim())) {
        out.push({ name: r.text.trim(), browseId });
      }
    }
  }
  return out;
}

export function parseDuration(durationStr: string): number {
  if (!durationStr) return 0;
  const clean = durationStr.replace(/\./g, ':').trim();
  const parts = clean.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function extractThumbnail(o: unknown): string {
  const thumbs = findAll<{ url: string; width?: number }>(o, 'thumbnails')
    .flat()
    .filter((t) => t && t.url);
  if (!thumbs.length) return '';
  const best = thumbs.reduce((a, b) => ((b.width || 0) >= (a.width || 0) ? b : a));
  let url = best.url;
  if (url.startsWith('//')) url = 'https:' + url;
  if (url.includes('googleusercontent.com')) {
    return url.replace(/=w\d+-h\d+.*$/, '=w544-h544-l90-rj');
  }
  return url;
}

// Helper to detect non-music content like stories, podcasts, CEO drama audiobooks, full albums, and playlists
export function isNonMusicContent(title: string, subtitle = '', rawItem?: unknown, duration = 0): boolean {
  const t = (title || '').toLowerCase();
  const s = (subtitle || '').toLowerCase();
  const combined = `${t} ${s}`;

  // 1. YouTube non-song item types (Playlists, Artist profiles, Profiles, Channels, Podcasts)
  if (
    /\b(artis|artist|playlist|profil|profile|saluran|channel|podcast|episode|audiobook|dongeng)\s*•/i.test(s) ||
    /^(artis|artist|playlist|profil|profile|podcast)$/i.test(s.trim())
  ) {
    return true;
  }

  // 2. YouTube podcast/episode metadata indicators
  if (rawItem && typeof rawItem === 'object') {
    const rawStr = JSON.stringify(rawItem);
    if (
      rawStr.includes('PODCAST') ||
      rawStr.includes('BROADCAST') ||
      rawStr.includes('MUSIC_PAGE_TYPE_PODCAST')
    ) {
      return true;
    }
  }

  // 3. Audio drama / story / novel / CEO story patterns
  const storyPatterns = [
    /\bceo\b/i,
    /menyamar/i,
    /alur cerita/i,
    /alur film/i,
    /rekap alur/i,
    /cerita film/i,
    /drama suara/i,
    /sandiwara radio/i,
    /audio\s*book/i,
    /novel\s*(audio|suara)/i,
    /audio\s*novel/i,
    /komik\s*(audio|suara)/i,
    /drama\s*china/i,
    /drama\s*korea/i,
    /kisah nyata/i,
    /\b(bab|eps|episode)\s*\d+/i,
    /full episode/i,
    /tuan muda/i,
    /presiden direktur/i,
    /pewaris (kaya|tersembunyi)/i,
    /nikah kontrak/i,
    /istri rahasia/i,
    /suami rahasia/i,
    /menantu (sampah|hebat|terbuang)/i,
    /mertua/i,
    /pura-pura miskin/i,
    /dikhianati/i,
    /gadis miskin/i,
  ];

  for (const pat of storyPatterns) {
    if (pat.test(combined)) return true;
  }

  // 4. Full Album / Compilation / Long Medley detection
  const fullAlbumPatterns = [
    /full\s*album/i,
    /kumpulan\s*lagu/i,
    /album\s*kompilasi/i,
    /album\s*terbaik/i,
    /greatest\s*hits/i,
    /top\s*\d+\s*(lagu|songs)/i,
    /tembang\s*kenangan/i,
    /nonstop/i,
    /semua\s*lagu/i,
    /all\s*songs/i,
  ];

  for (const pat of fullAlbumPatterns) {
    if (pat.test(combined)) return true;
  }

  // Excessive duration: single tracks rarely exceed 15 mins (900s), and almost never exceed 20 mins (1200s)
  if (duration > 900 && fullAlbumPatterns.some((p) => p.test(combined))) {
    return true;
  }
  if (duration > 1200) {
    return true;
  }

  return false;
}

// Clean up video title and extract real artist from title delimiters (e.g. "Artist - Title", "Show - Artist - Title")
export function cleanVideoTitleAndArtist(rawTitle: string, fallbackArtist?: string): { title: string; artist: string } {
  let cleanedTitle = rawTitle.trim();
  let extractedArtist = '';

  const cleanSuffix = (t: string) =>
    t
      .replace(/\s*[\(\[](?:official\s*(?:music\s*)?(?:video|audio|lyric\s*video|lyric|clip)?|video\s*klip|video\s*lirik|lirik\s*(?:video)?|official\s*lyric\s*video|audio|lyrics?|mv)[\)\]]/gi, '')
      .replace(/\s*\*+\s*$/g, '')
      .replace(/\s*[-–—]\s*$/g, '')
      .trim();

  if (cleanedTitle.includes(' - ') || cleanedTitle.includes(' – ') || cleanedTitle.includes(' — ')) {
    const parts = cleanedTitle.split(/\s+[-–—]\s+/);
    if (parts.length === 2) {
      extractedArtist = parts[0].trim();
      cleanedTitle = cleanSuffix(parts[1].trim());
    } else if (parts.length >= 3) {
      extractedArtist = parts[1].trim();
      cleanedTitle = cleanSuffix(parts.slice(2).join(' - '));
    }
  } else if (cleanedTitle.includes(' | ')) {
    const parts = cleanedTitle.split(/\s+\|\s+/);
    if (parts.length === 2) {
      extractedArtist = parts[1].trim();
      cleanedTitle = cleanSuffix(parts[0].trim());
    }
  }

  if (!extractedArtist && fallbackArtist) {
    extractedArtist = fallbackArtist.replace(/\s*-\s*topic$/i, '').trim();
  }

  return {
    title: cleanedTitle || rawTitle,
    artist: extractedArtist || fallbackArtist || 'Unknown Artist',
  };
}

// Convert InnerTube item renderer into our standardized Song interface
export function parseRendererToSong(item: unknown): Song | null {
  if (!item || typeof item !== 'object') return null;

  const renderer = (
    (item as { musicResponsiveListItemRenderer?: unknown }).musicResponsiveListItemRenderer ||
    (item as { playlistPanelVideoRenderer?: unknown }).playlistPanelVideoRenderer ||
    (item as { musicTwoRowItemRenderer?: unknown }).musicTwoRowItemRenderer ||
    item
  ) as Record<string, unknown>;

  // 1. Extract videoId
  const videoId =
    (renderer.videoId as string) ||
    (renderer.playlistItemData as { videoId?: string })?.videoId ||
    (renderer.navigationEndpoint as { watchEndpoint?: { videoId?: string } })?.watchEndpoint?.videoId ||
    findFirst<{ videoId?: string }>(renderer.overlay || {}, 'watchEndpoint')?.videoId;

  if (!videoId) return null;

  // 2. Extract title
  const flexCols = (renderer.flexColumns || []) as Array<{
    musicResponsiveListItemFlexColumnRenderer?: { text?: unknown };
  }>;

  let title = '';
  if (flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text) {
    title = extractText(flexCols[0].musicResponsiveListItemFlexColumnRenderer.text);
  }
  if (!title) {
    title = extractText(renderer.title);
  }

  // 3. Extract artists, album, duration from subtitle runs or flex columns
  const artists: Artist[] = [];
  let album = '';
  let durationText = '';

  const columnsToCheck = flexCols.slice(1);
  for (const col of columnsToCheck) {
    const textObj = col?.musicResponsiveListItemFlexColumnRenderer?.text;
    const runs = runsInfo(textObj);
    for (const e of runs) {
      if (e.browseId?.startsWith('MPRE')) {
        album = e.name;
      } else if (e.browseId?.startsWith('UC') || e.browseId?.startsWith('FEmusic')) {
        artists.push(e);
      }
    }
  }

  // Check subtitle / byline runs fallback
  const bylineOrSub = renderer.subtitle || renderer.longBylineText || renderer.shortBylineText;
  if (artists.length === 0 && bylineOrSub) {
    const subRuns = runsInfo(bylineOrSub);
    for (const e of subRuns) {
      if (e.browseId?.startsWith('MPRE')) {
        album = e.name;
      } else if (e.browseId?.startsWith('UC') || e.browseId?.startsWith('FEmusic')) {
        artists.push(e);
      }
    }
  }

  // If still no artists with browseId, extract names from plain runs excluding type keywords
  if (artists.length === 0) {
    const rawSubtitle = extractText(
      flexCols[1]?.musicResponsiveListItemFlexColumnRenderer?.text || bylineOrSub
    );
    const parts = rawSubtitle.split(/\s*•\s*/);
    for (const part of parts) {
      const p = part.trim();
      if (!p) continue;
      if (/^(\d{1,2}:|\d{1,2}\.)\d{2}$/.test(p)) {
        durationText = p.replace(/\./g, ':');
      } else if (['Lagu', 'Song', 'Video', 'Episode', 'Track'].includes(p)) {
        continue;
      } else if (artists.length === 0) {
        artists.push({ name: p });
      } else if (!album) {
        album = p;
      }
    }
  }

  // 4. Extract duration
  const fixedCol = findFirst<{ text?: unknown }>(renderer, 'musicResponsiveListItemFixedColumnRenderer');
  if (fixedCol?.text) {
    durationText = extractText(fixedCol.text);
  } else if (!durationText) {
    durationText = extractText(renderer.lengthText);
  }

  const duration = parseDuration(durationText);
  const rawSub = extractText(
    flexCols[1]?.musicResponsiveListItemFlexColumnRenderer?.text || bylineOrSub
  );

  // Filter out non-music stories, podcasts, audiobooks, CEO drama episodes, etc.
  if (isNonMusicContent(title, rawSub, item, duration)) {
    return null;
  }

  const thumbnail = extractThumbnail(renderer.thumbnail || renderer.thumbnailRenderer || renderer);

  // 5. Check play button accessibility label fallback if still no artist
  if (artists.length === 0) {
    const playBtn = (renderer.overlay as Record<string, unknown> | undefined)?.musicItemThumbnailOverlayRenderer as Record<string, unknown> | undefined;
    const playContent = (playBtn?.content as Record<string, unknown> | undefined)?.musicPlayButtonRenderer as Record<string, unknown> | undefined;
    const a11yPlay = playContent?.accessibilityPlayData as { accessibilityData?: { label?: string } } | undefined;
    const a11yPause = playContent?.accessibilityPauseData as { accessibilityData?: { label?: string } } | undefined;
    const a11yLabel = a11yPlay?.accessibilityData?.label || a11yPause?.accessibilityData?.label || '';

    if (a11yLabel) {
      const match = a11yLabel.match(/^(?:putar|play|jeda|pause)\s+(.+?)\s*[-•]\s*(.+)$/i);
      if (match && match[2]) {
        const found = match[2].trim();
        if (found && !['lagu', 'song', 'video', 'track', 'album'].includes(found.toLowerCase())) {
          artists.push({ name: found });
        }
      }
    }
  }

  const isVideo = rawSub.toLowerCase().includes('video');
  let finalTitle = title;
  let finalArtist = artists.map((a) => a.name).join(', ');

  // 6. Clean title and extract real artist for music videos, community uploads, or delimited titles
  if (isVideo || title.includes(' - ') || title.includes(' – ') || title.includes(' — ') || title.includes(' | ')) {
    const cleaned = cleanVideoTitleAndArtist(title, finalArtist);
    if (cleaned.artist && cleaned.artist !== 'Unknown Artist') {
      finalArtist = cleaned.artist;
      artists.splice(0, artists.length, { name: cleaned.artist });
    }
    if (cleaned.title) {
      finalTitle = cleaned.title;
    }
  }

  finalArtist = finalArtist || 'Unknown Artist';

  return {
    videoId,
    title: finalTitle || 'Unknown Title',
    artist: finalArtist,
    artists,
    album: album || undefined,
    thumbnail: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration,
    durationText: durationText || formatDuration(duration),
    isVideo,
  };
}

// Extract artist spotlight from YouTube Music search results
export function extractArtistFromSearch(data: unknown): ArtistSummary | null {
  const cardShelves = findAll<Record<string, unknown>>(data, 'musicCardShelfRenderer');
  if (cardShelves.length > 0) {
    const shelf = cardShelves[0];
    const name = extractText(shelf.title || shelf.header);
    const browseId = (shelf.title as { runs?: Array<{ navigationEndpoint?: { browseEndpoint?: { browseId?: string } } }> })?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;
    const subtitle = extractText(shelf.subtitle);
    const thumbnail = extractThumbnail(shelf);
    if (name && (subtitle.toLowerCase().includes('artis') || subtitle.toLowerCase().includes('artist') || browseId?.startsWith('UC'))) {
      return {
        id: browseId || name,
        name,
        subtitle: subtitle || 'Artis',
        thumbnail: thumbnail || `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60`,
      };
    }
  }

  const listItems = findAll<Record<string, unknown>>(data, 'musicResponsiveListItemRenderer');
  for (const item of listItems) {
    const flexCols = (item.flexColumns || []) as Array<{
      musicResponsiveListItemFlexColumnRenderer?: { text?: unknown };
    }>;
    const t = extractText(flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text);
    const s = extractText(flexCols[1]?.musicResponsiveListItemFlexColumnRenderer?.text);
    const nav = (item.navigationEndpoint as { browseEndpoint?: { browseId?: string } } | undefined)?.browseEndpoint;
    if (s && (s.toLowerCase().includes('artis') || s.toLowerCase().includes('artist')) && nav?.browseId?.startsWith('UC')) {
      return {
        id: nav.browseId,
        name: t,
        subtitle: s,
        thumbnail: extractThumbnail(item) || `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60`,
      };
    }
  }
  return null;
}

// Fetch comprehensive artist profile, top tracks, releases, and related artists
export async function fetchArtistDetails(browseIdOrName: string): Promise<ArtistProfile | null> {
  try {
    let browseId = browseIdOrName.trim();

    // If query is artist name instead of browseId, find browseId via search
    if (!browseId.startsWith('UC') && !browseId.startsWith('FEmusic')) {
      const searchData = await requestYTM('search', { query: browseId });
      const found = extractArtistFromSearch(searchData);
      if (found && found.id && (found.id.startsWith('UC') || found.id.startsWith('FEmusic'))) {
        browseId = found.id;
      } else {
        // Fallback: search songs for this artist name and synthesize profile
        const listItems = findAll(searchData, 'musicResponsiveListItemRenderer');
        const fallbackSongs: Song[] = [];
        for (const item of listItems) {
          const parsed = parseRendererToSong(item);
          if (parsed) fallbackSongs.push(parsed);
        }
        return {
          id: browseIdOrName,
          name: browseIdOrName,
          subtitle: 'Artis',
          description: `Koleksi musik dan lagu-lagu pilihan dari ${browseIdOrName}.`,
          thumbnail: fallbackSongs[0]?.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60',
          topSongs: fallbackSongs.slice(0, 20),
          albums: [],
          singles: [],
          relatedArtists: [],
        };
      }
    }

    const data = await requestYTM('browse', { browseId });
    const header = (data.header?.musicImmersiveHeaderRenderer ||
      data.header?.musicVisualHeaderRenderer ||
      findFirst(data, 'musicResponsiveHeaderRenderer')) as Record<string, unknown> | undefined;

    const name = extractText(header?.title) || browseIdOrName;
    const description = extractText(header?.description);
    const subText = (header?.subscriptionButton as { subscribeButtonRenderer?: { subscriberCountText?: unknown } })?.subscribeButtonRenderer?.subscriberCountText;
    const subscribers = extractText(subText);
    const thumbnail = extractThumbnail(header?.thumbnail || header) || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60';
    const banner = extractThumbnail(header?.foregroundThumbnail || header?.thumbnail || header) || thumbnail;

    // 1. Extract Top Songs
    let topSongs: Song[] = [];
    const shelves = findAll<Record<string, unknown>>(data, 'musicShelfRenderer');
    const topShelf = shelves[0];

    if (topShelf) {
      // Check if there is a full top songs playlist
      const bottomEndpoint = (topShelf.bottomEndpoint ||
        (topShelf.title as { runs?: Array<{ navigationEndpoint?: { browseEndpoint?: { browseId?: string } } }> })?.runs?.[0]?.navigationEndpoint) as { browseEndpoint?: { browseId?: string } } | undefined;

      if (bottomEndpoint?.browseEndpoint?.browseId) {
        try {
          const plData = await requestYTM('browse', { browseId: bottomEndpoint.browseEndpoint.browseId });
          const plItems = findAll(plData, 'musicResponsiveListItemRenderer');
          for (const item of plItems) {
            const parsed = parseRendererToSong(item);
            if (parsed && !topSongs.some((s) => s.videoId === parsed.videoId)) {
              topSongs.push(parsed);
            }
          }
        } catch {
          // fallback to shelf contents
        }
      }

      if (topSongs.length === 0 && Array.isArray(topShelf.contents)) {
        for (const item of topShelf.contents) {
          const parsed = parseRendererToSong(item);
          if (parsed && !topSongs.some((s) => s.videoId === parsed.videoId)) {
            topSongs.push(parsed);
          }
        }
      }
    }

    // 2. Extract Albums, Singles & EPs, and Related Artists from Carousels
    const albums: ArtistRelease[] = [];
    const singles: ArtistRelease[] = [];
    const relatedArtists: ArtistSummary[] = [];

    const carousels = findAll<Record<string, unknown>>(data, 'musicCarouselShelfRenderer');
    for (const carousel of carousels) {
      const headerTitle = extractText((carousel.header as { musicCarouselShelfBasicHeaderRenderer?: { title?: unknown } })?.musicCarouselShelfBasicHeaderRenderer?.title).toLowerCase();
      const contents = (carousel.contents || []) as Array<{ musicTwoRowItemRenderer?: Record<string, unknown> }>;

      if (headerTitle.includes('album')) {
        for (const item of contents) {
          const twoRow = item.musicTwoRowItemRenderer;
          if (!twoRow) continue;
          const albumId = (twoRow.navigationEndpoint as { browseEndpoint?: { browseId?: string } })?.browseEndpoint?.browseId;
          if (!albumId) continue;
          albums.push({
            id: albumId,
            title: extractText(twoRow.title) || 'Unknown Album',
            year: extractText(twoRow.subtitle),
            thumbnail: extractThumbnail(twoRow.thumbnailRenderer || twoRow),
            type: 'Album',
          });
        }
      } else if (headerTitle.includes('single') || headerTitle.includes('ep')) {
        for (const item of contents) {
          const twoRow = item.musicTwoRowItemRenderer;
          if (!twoRow) continue;
          const singleId = (twoRow.navigationEndpoint as { browseEndpoint?: { browseId?: string } })?.browseEndpoint?.browseId;
          if (!singleId) continue;
          singles.push({
            id: singleId,
            title: extractText(twoRow.title) || 'Unknown Track',
            year: extractText(twoRow.subtitle),
            thumbnail: extractThumbnail(twoRow.thumbnailRenderer || twoRow),
            type: 'Single',
          });
        }
      } else if (headerTitle.includes('penggemar') || headerTitle.includes('fans') || headerTitle.includes('similar')) {
        for (const item of contents) {
          const twoRow = item.musicTwoRowItemRenderer;
          if (!twoRow) continue;
          const relId = (twoRow.navigationEndpoint as { browseEndpoint?: { browseId?: string } })?.browseEndpoint?.browseId;
          if (!relId) continue;
          relatedArtists.push({
            id: relId,
            name: extractText(twoRow.title) || 'Artist',
            subscribers: extractText(twoRow.subtitle),
            thumbnail: extractThumbnail(twoRow.thumbnailRenderer || twoRow),
          });
        }
      }
    }

    return {
      id: browseId,
      name,
      subtitle: subscribers ? `Artis • ${subscribers} audiens` : 'Artis',
      description,
      thumbnail,
      banner,
      subscribers,
      topSongs,
      albums,
      singles,
      relatedArtists,
    };
  } catch (err) {
    console.error('fetchArtistDetails error:', err);
    return null;
  }
}

// Fetch tracks and metadata for an Album or Single
export async function fetchAlbumDetails(browseId: string): Promise<{
  id: string;
  title: string;
  artist: string;
  year?: string;
  thumbnail: string;
  songs: Song[];
} | null> {
  try {
    const data = await requestYTM('browse', { browseId });
    const header = (findFirst(data, 'musicResponsiveHeaderRenderer') ||
      findFirst(data, 'musicDetailHeaderRenderer')) as Record<string, unknown> | undefined;

    const title = extractText(header?.title) || 'Unknown Album';
    const artist =
      extractText(header?.straplineTextOne) ||
      extractText(header?.subtitle) ||
      'Unknown Artist';
    const subStr = extractText(header?.subtitle);
    const yearMatch = subStr.match(/\b(19\d\d|20\d\d)\b/);
    const year = yearMatch ? yearMatch[0] : undefined;
    const thumbnail = extractThumbnail(header) || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60';

    const listItems = findAll(data, 'musicResponsiveListItemRenderer');
    const songs: Song[] = [];

    for (const item of listItems) {
      const parsed = parseRendererToSong(item);
      if (parsed) {
        if (!parsed.artist || parsed.artist === 'Unknown Artist') {
          parsed.artist = artist.replace(/^(Album|Single|EP)\s*•\s*/i, '').trim();
        }
        if (!parsed.thumbnail || parsed.thumbnail.includes('hqdefault.jpg')) {
          parsed.thumbnail = thumbnail;
        }
        if (!parsed.album) {
          parsed.album = title;
        }
        songs.push(parsed);
      }
    }

    return {
      id: browseId,
      title,
      artist: artist.replace(/^(Album|Single|EP)\s*•\s*/i, '').trim(),
      year,
      thumbnail,
      songs,
    };
  } catch (err) {
    console.error('fetchAlbumDetails error:', err);
    return null;
  }
}
