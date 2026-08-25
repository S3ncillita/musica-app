import { Router } from 'express';

const router = Router();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const YT_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

// YouTube Music: solo indexa contenido musical (canciones), evita que búsquedas
// como "terror" devuelvan películas/videos de miedo en vez de música.
const YTM_KEY = 'AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30';
const YTM_CLIENT_VERSION = '1.20260818.08.00';
const YTM_SONGS_FILTER = 'Eg-KAQwIARAAGAAgACgAMABqChAEEAUQAxAKEAk%3D';
const YTM_CONTEXT = { client: { clientName: 'WEB_REMIX', clientVersion: YTM_CLIENT_VERSION, hl: 'es', gl: 'AR' } };

// Canciones normales rara vez pasan los 15 min; por arriba de eso suele ser
// una película/audio largo mal categorizado como canción en YouTube Music.
const MAX_SONG_DURATION = 15 * 60;

function parseYtMusicItems(list) {
  const items = [];
  for (const entry of list || []) {
    const r = entry?.musicResponsiveListItemRenderer;
    if (!r) continue;
    const videoId = r?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
      ?.playNavigationEndpoint?.watchEndpoint?.videoId;
    if (!videoId) continue;
    const flex = r.flexColumns || [];
    const titleRuns = flex[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
    const title = titleRuns.map(x => x.text).join('') || 'Sin título';
    const subRuns = flex[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
    const channel = subRuns[0]?.text || 'Desconocido';
    const durationText = subRuns[subRuns.length - 1]?.text;
    const duration = /^\d+:\d+(:\d+)?$/.test(durationText || '') ? parseDuration(durationText) : 0;
    if (duration > MAX_SONG_DURATION) continue;
    const thumbs = r?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const thumbnail = thumbs[thumbs.length - 1]?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    items.push({ videoId, title, channel, thumbnail, duration });
  }
  return items;
}

async function ytMusicSearch(query, limit = 20) {
  const res = await fetch(`https://music.youtube.com/youtubei/v1/search?key=${YTM_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Cookie': 'CONSENT=YES+1' },
    body: JSON.stringify({ context: YTM_CONTEXT, query, params: YTM_SONGS_FILTER }),
  });
  const data = await res.json();
  const shelf = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
    ?.sectionListRenderer?.contents?.[0]?.musicShelfRenderer;
  const items = parseYtMusicItems(shelf?.contents);
  if (limit > 0) items.splice(limit);
  return { items, nextToken: null };
}

function parseDuration(text) {
  if (!text) return 0;
  const parts = String(text).split(':').map(Number);
  if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
  if (parts.length === 2) return parts[0]*60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

function parseItems(contents) {
  const items = [];
  let nextToken = null;
  for (const entry of contents || []) {
    const cont = entry?.continuationItemRenderer;
    if (cont) {
      nextToken = cont?.continuationEndpoint?.continuationCommand?.token || nextToken;
      continue;
    }
    const section = entry?.itemSectionRenderer?.contents;
    if (section) {
      const parsed = parseItems(section);
      items.push(...parsed.items);
      nextToken = parsed.nextToken || nextToken;
      continue;
    }
    const video = entry?.videoRenderer;
    if (!video || !video.videoId) continue;
    items.push({
      videoId: video.videoId,
      title: video.title?.runs?.[0]?.text || 'Sin título',
      channel: video.ownerText?.runs?.[0]?.text || 'Desconocido',
      thumbnail: video.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`,
      duration: parseDuration(video.lengthText?.simpleText),
    });
  }
  return { items, nextToken };
}

async function ytSearch(query, limit = 20) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'es-419,es;q=0.9', 'Cookie': 'CONSENT=YES+1' },
  });
  const html = await res.text();

  const match = html.match(/var ytInitialData = ({.*?});<\/script>/s);
  if (!match) return { items: [], nextToken: null };

  const data = JSON.parse(match[1]);
  const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
  const itemContents = sections?.[0]?.itemSectionRenderer?.contents || [];

  const { items, nextToken } = parseItems(itemContents);
  const contToken = sections?.[1]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
  if (limit > 0) items.splice(limit);
  return { items, nextToken: contToken || nextToken };
}

async function ytSearchContinuation(token) {
  const res = await fetch(`https://www.youtube.com/youtubei/v1/search?key=${YT_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Cookie': 'CONSENT=YES+1',
    },
    body: JSON.stringify({
      context: { client: { clientName: 'WEB', clientVersion: '2.20250101.00.00', hl: 'es', gl: 'AR' } },
      continuation: token,
    }),
  });
  const data = await res.json();
  const contents = data?.onResponseReceivedCommands?.[0]?.appendContinuationItemsAction?.continuationItems || [];
  return parseItems(contents);
}

router.get('/search', async (req, res) => {
  const { q, token } = req.query;
  if (!q) return res.json({ items: [], nextToken: null });
  try {
    const result = token ? await ytSearchContinuation(token) : await ytMusicSearch(q);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error buscando en YouTube' });
  }
});

router.get('/suggest', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    const data = await r.json();
    res.json(Array.isArray(data?.[1]) ? data[1].slice(0, 8) : []);
  } catch {
    res.json([]);
  }
});

router.post('/artists', async (req, res) => {
  const { names } = req.body;
  if (!Array.isArray(names)) return res.json([]);
  const results = await Promise.all(
    names.map(async (name) => {
      try {
        const { items } = await ytSearch(name + ' official', 5);
        if (items.length === 0) return null;
        return { name, thumbnail: items[0].thumbnail, songCount: items.length };
      } catch {
        return null;
      }
    })
  );
  res.json(results.filter(Boolean));
});

const DISCOVER_QUERIES = [
  'música 2026', 'top hits 2026', 'éxitos latinos', 'reggaetón',
  'pop internacional', 'rap hits', 'bachata', 'música en vivo',
];

const NON_ARTIST_CHANNEL_PATTERN = new RegExp(
  [
    'mix', 'playlist', 'compilation', 'compilaci[oó]n', 'top\\s?\\d', 'ranking',
    'radio', 'party', 'zona', 'lyrics?', 'letras?', 'karaoke', 'instrumental',
    'reaction', 'tiktok', 'shorts', 'meme', '\\bdj\\b', 'oficial\\s?music',
    'record(s|ing)?', 'network', 'channel', 'canal', 'colecci[oó]n', 'grandes\\s?exitos',
  ].join('|'),
  'i'
);

function looksLikeArtist(channelName) {
  if (!channelName || channelName === 'Desconocido') return false;
  return !NON_ARTIST_CHANNEL_PATTERN.test(channelName);
}

router.get('/artists/discover', async (req, res) => {
  const { token, seed } = req.query;
  try {
    const result = token
      ? await ytSearchContinuation(token)
      : await ytSearch(DISCOVER_QUERIES[Number(seed) % DISCOVER_QUERIES.length] || DISCOVER_QUERIES[0], 30);
    const byChannel = new Map();
    for (const item of result.items) {
      if (!looksLikeArtist(item.channel)) continue;
      if (!byChannel.has(item.channel)) {
        byChannel.set(item.channel, { name: item.channel, thumbnail: item.thumbnail, songCount: 1 });
      } else {
        byChannel.get(item.channel).songCount++;
      }
    }
    res.json({ items: Array.from(byChannel.values()), nextToken: result.nextToken });
  } catch (err) {
    res.status(500).json({ error: 'Error buscando artistas' });
  }
});

const TRENDING_QUERIES = [
  'top hits 2026', 'éxitos latinos 2026', 'reggaetón top', 'pop hits 2026',
  'música electrónica popular', 'rap top hits', 'bachata romántica', 'cumbia popular',
  'rock en español', 'trap latino', 'salsa top', 'música urbana 2026',
  'indie pop', 'k-pop hits', 'baladas románticas', 'música regional mexicana',
  'hip hop 2026', 'dance hits', 'merengue popular', 'r&b hits',
];

const TRENDING_COUNT = 8;

function pickRandom(arr, n) {
  const copy = [...arr];
  const picked = [];
  while (picked.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(i, 1)[0]);
  }
  return picked;
}

router.get('/trending', async (req, res) => {
  try {
    const queries = pickRandom(TRENDING_QUERIES, TRENDING_COUNT);
    const playlists = await Promise.all(
      queries.map(async (query) => {
        try {
          const { items: songs } = await ytSearch(query, 10);
          return { name: query, songs };
        } catch {
          return null;
        }
      })
    );
    res.json(playlists.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: 'Error cargando tendencias' });
  }
});

export default router;
