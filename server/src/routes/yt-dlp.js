import { Router } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { Readable } from 'stream';

const router = Router();
const execFileAsync = promisify(execFile);


function findInPath(cmd) {
  try {
    const which = process.platform === 'win32' ? 'where' : 'which';
    return execSync(`${which} ${cmd}`, { encoding: 'utf8' }).trim().split('\n')[0];
  } catch { return null; }
}

function findYtDlp() {
  const fromPath = findInPath('yt-dlp');
  if (fromPath) return fromPath;
  const searchDirs = [
    path.join(process.env.APPDATA || '', 'Python'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python'),
    path.join(process.env.LOCALAPPDATA || '', 'pip'),
    path.join(process.env.LOCALAPPDATA || '', 'Packages'),
  ];
  for (const base of searchDirs) {
    try {
      if (!fs.existsSync(base)) continue;
      const walk = (dir, depth) => {
        if (depth > 8) return null;
        let entries;
        try { entries = fs.readdirSync(dir); } catch { return null; }
        for (const entry of entries) {
          const full = path.join(dir, entry);
          try {
            if (fs.statSync(full).isDirectory()) {
              const found = walk(full, depth + 1);
              if (found) return found;
            } else if (entry === 'yt-dlp.exe') {
              return full;
            }
          } catch {}
        }
        return null;
      };
      const found = walk(base, 0);
      if (found) return found;
    } catch {}
  }
  return null;
}

const _foundYtDlp = findYtDlp();
const YTDLP_FULL = _foundYtDlp || 'yt-dlp';
const YTDLP_USE_MODULE = !_foundYtDlp;

function runYtDlp(args, opts, cb) {
  if (YTDLP_USE_MODULE) {
    const py = process.platform === 'win32' ? 'python' : 'python3';
    execFile(py, ['-m', 'yt_dlp', ...args], opts, cb);
  } else {
    execFile(YTDLP_FULL, args, opts, cb);
  }
}

function runYtDlpAsync(args, opts) {
  return new Promise((resolve, reject) => {
    runYtDlp(args, opts, (err, stdout, stderr) => {
      if (err) {
        err.stderr = stderr;
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}
console.log('yt-dlp:', _foundYtDlp || 'no encontrado, usando py -m yt_dlp');

// yt-dlp necesita un runtime de JS (Deno) para resolver el cliente "web" de
// YouTube correctamente; sin esto cae a clientes alternativos (Android VR,
// VisionOS, etc.) cuyas URLs firmadas a veces son rechazadas por el CDN.
const DENO_PATH = process.env.DENO_PATH || null;
const JS_RUNTIME_ARGS = ['--js-runtimes', DENO_PATH ? `deno:${DENO_PATH}` : 'deno'];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const urlCache = new Map();

const AUDIO_FORMATS = ['bestaudio[ext=m4a]/bestaudio', 'bestaudio/best', 'best'];

async function getDirectUrl(videoId) {
  const cached = urlCache.get(videoId);
  if (cached && Date.now() - cached.at < 4 * 60 * 60 * 1000) {
    return cached.url;
  }
  let lastErr;
  for (const format of AUDIO_FORMATS) {
    try {
      const { stdout } = await runYtDlpAsync([
        '-f', format,
        '--no-playlist',
        '--get-url',
        ...JS_RUNTIME_ARGS,
        `https://www.youtube.com/watch?v=${videoId}`
      ], { timeout: 30000 });
      const url = stdout.trim().split('\n')[0];
      if (url) {
        urlCache.set(videoId, { url, at: Date.now() });
        return url;
      }
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('No se obtuvo URL de audio');
}

router.get('/stream/:videoId', async (req, res) => {
  const { videoId } = req.params;
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'videoId inválido' });
  }

  try {
    const directUrl = await getDirectUrl(videoId);
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Referer': `https://www.youtube.com/watch?v=${videoId}`,
      'Accept': '*/*',
    };
    const range = req.headers.range;
    if (range) headers['Range'] = range;

    const upstream = await fetch(directUrl, { headers, redirect: 'follow' });
    if (!upstream.ok) throw new Error('Error upstream: ' + upstream.status);

    const out = {
      'Content-Type': upstream.headers.get('content-type') || 'audio/mp4',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    };
    const cl = upstream.headers.get('content-length');
    if (cl) out['Content-Length'] = cl;
    const cr = upstream.headers.get('content-range');
    if (cr) out['Content-Range'] = cr;

    res.writeHead(upstream.status, out);
    if (upstream.body) {
      Readable.fromWeb(upstream.body).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    console.error('yt stream error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'No se pudo reproducir en línea', detail: err.message });
    } else {
      res.end();
    }
  }
});

router.get('/info/:videoId', async (req, res) => {
  const { videoId } = req.params;
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'videoId inválido' });
  }

  try {
    const { stdout } = await runYtDlpAsync([
      '--dump-json',
      '--no-playlist',
      ...JS_RUNTIME_ARGS,
      `https://www.youtube.com/watch?v=${videoId}`
    ], { timeout: 15000 });

    const info = JSON.parse(stdout.trim());
    res.json({
      videoId: info.id,
      title: info.title,
      channel: info.uploader,
      duration: info.duration,
      thumbnail: info.thumbnail,
      album: info.album || null,
      track: info.track || null,
      artist: info.artist || info.artists?.[0] || null,
    });
  } catch (err) {
    console.error('yt-dlp info error:', err.message);
    res.status(500).json({ error: 'No se pudo obtener info', detail: err.message });
  }
});

export default router;
