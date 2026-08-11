import { Router } from 'express';

const router = Router();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const YT_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

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
    headers: { 'User-Agent': UA, 'Accept-Language': 'es-419,es;q=0.9' },
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
    const result = token ? await ytSearchContinuation(token) : await ytSearch(q);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error buscando en YouTube' });
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

const TRENDING_QUERIES = [
  'top hits 2026',
  'éxitos latinos 2026',
  'reggaetón top',
  'pop hits 2026',
  'música electrónica popular',
  'rap top hits',
  'bachata romántica',
  'cumbia popular',
];

router.get('/trending', async (req, res) => {
  try {
    const playlists = await Promise.all(
      TRENDING_QUERIES.map(async (query) => {
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
