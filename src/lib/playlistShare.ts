import { Playlist, Song } from '@/types/music';

// Browser-safe base64url encoder
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Browser-safe base64url decoder
function base64UrlToUint8Array(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface SharedPlaylistData {
  title: string;
  description?: string;
  songs: Song[];
}

/**
 * Compactly compresses and encodes playlist metadata into a URL-safe Base64 string
 */
export async function encodePlaylist(playlist: Playlist): Promise<string> {
  const compact = {
    t: playlist.title,
    d: playlist.description || '',
    s: playlist.songs.map((s) => [s.videoId, s.title, s.artist, s.duration || 0]),
  };

  const json = JSON.stringify(compact);

  // Modern browser compression with fallback
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const buffer = await new Response(stream).arrayBuffer();
    return arrayBufferToBase64Url(buffer);
  }

  // Fallback: standard URL-safe base64
  return encodeURIComponent(json);
}

/**
 * Decodes and decompresses a shared playlist string back into playlist data
 */
export async function decodePlaylist(encoded: string): Promise<SharedPlaylistData | null> {
  try {
    let json = '';

    if (typeof DecompressionStream !== 'undefined' && !encoded.startsWith('%7B')) {
      try {
        const bytes = base64UrlToUint8Array(encoded);
        const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        json = await new Response(stream).text();
      } catch {
        // Try fallback decoding if decompression fails
        json = decodeURIComponent(encoded);
      }
    } else {
      json = decodeURIComponent(encoded);
    }

    const parsed = JSON.parse(json);
    if (!parsed || !parsed.t || !Array.isArray(parsed.s)) {
      return null;
    }

    const songs: Song[] = parsed.s.map((item: [string, string, string, number]) => ({
      videoId: item[0],
      title: item[1],
      artist: item[2],
      duration: item[3] || 0,
      thumbnail: `https://i.ytimg.com/vi/${item[0]}/hqdefault.jpg`,
    }));

    return {
      title: parsed.t,
      description: parsed.d || '',
      songs,
    };
  } catch (error) {
    console.error('[PlaylistShare] Failed to decode playlist:', error);
    return null;
  }
}

/**
 * Builds the full shareable URL with hash-based routing (#data=...)
 * Hash ensures the payload is 100% client-side, never logged by web proxies, and has no URL length limit issues.
 */
export async function generateShareUrl(playlist: Playlist): Promise<string> {
  const encoded = await encodePlaylist(playlist);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/playlists/share#data=${encoded}`;
}

/**
 * Exports playlist to a downloadable JSON file
 */
export function exportPlaylistJson(playlist: Playlist) {
  const exportData = {
    loopPlaylistVersion: 1,
    exportedAt: new Date().toISOString(),
    playlist: {
      title: playlist.title,
      description: playlist.description,
      songs: playlist.songs,
    },
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeTitle = playlist.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  a.href = url;
  a.download = `${safeTitle || 'playlist'}.loop.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
