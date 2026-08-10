import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as db from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

router.get('/', (req, res) => {
  res.json(db.getSongs(req.query.search));
});

router.get('/:id', (req, res) => {
  const song = db.getSong(Number(req.params.id));
  if (!song) return res.status(404).json({ error: 'Canción no encontrada' });
  res.json(song);
});

router.post('/upload', upload.array('files', 50), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No se enviaron archivos' });
  }
  const inserted = req.files.map(file => {
    const name = path.parse(file.originalname).name;
    return db.addSong(name, file.filename);
  });
  res.json({ uploaded: inserted.length, songs: inserted });
});

router.put('/:id', (req, res) => {
  const { title, artist, album } = req.body;
  const song = db.getSong(Number(req.params.id));
  if (!song) return res.status(404).json({ error: 'Canción no encontrada' });
  const updated = db.updateSong(Number(req.params.id), {
    title: title || song.title,
    artist: artist || song.artist,
    album: album || song.album
  });
  res.json(updated);
});

router.post('/youtube', (req, res) => {
  const { videoId, title, channel, thumbnail, duration } = req.body;
  if (!videoId) return res.status(400).json({ error: 'videoId requerido' });
  const song = db.addYoutubeTrack(videoId, title || 'Sin título', channel, thumbnail, duration);
  res.json(song);
});

router.delete('/:id', (req, res) => {
  const song = db.deleteSong(Number(req.params.id));
  if (!song) return res.status(404).json({ error: 'Canción no encontrada' });
  if (song.filename) {
    const filePath = path.join(__dirname, '..', '..', 'uploads', song.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  res.json({ deleted: true });
});

export default router;
