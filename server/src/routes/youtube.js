import { Router } from 'express';

const router = Router();

async function ytSearch(query, limit = 20) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Language': 'es-419,es;q=0.9',
    },
  });
  const html = await res.text();

  const match = html.match(/var ytInitialData = ({.*?});<\/script>/s);
  if (!match) return [];

  const data = JSON.parse(match[1]);
  const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

  const videos = [];
  for (const item of contents) {
    const video = item?.videoRenderer;
    if (!video || !video.videoId) continue;

    let durationSec = 0;
    if (video.lengthText?.simpleText) {
      const parts = video.lengthText.simpleText.split(':').map(Number);
      if (parts.length === 3) durationSec = parts[0]*3600 + parts[1]*60 + parts[2];
      else if (parts.length === 2) durationSec = parts[0]*60 + parts[1];
      else if (parts.length === 1) durationSec = parts[0];
    }

    videos.push({
      videoId: video.videoId,
      title: video.title?.runs?.[0]?.text || 'Sin título',
      channel: video.ownerText?.runs?.[0]?.text || 'Desconocido',
      thumbnail: video.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`,
      duration: durationSec,
    });

    if (videos.length >= limit) break;
  }

  return videos;
}

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  try {
    const items = await ytSearch(q, 20);
    res.json(items);
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
        const items = await ytSearch(name + ' official', 5);
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
          const songs = await ytSearch(query, 10);
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
