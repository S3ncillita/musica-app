import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import songsRouter from './routes/songs.js';
import playlistsRouter from './routes/playlists.js';
import streamRouter from './routes/stream.js';
import youtubeRouter from './routes/youtube.js';
import authRouter from './routes/auth.js';
import ytDlpRouter from './routes/yt-dlp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 48291;

app.use(cors());
app.use(express.json());

app.use('/api/songs', songsRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/stream', streamRouter);
app.use('/api/youtube', youtubeRouter);
app.use('/api/auth', authRouter);
app.use('/api/ytdlp', ytDlpRouter);

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const clientBuild = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientBuild, { setHeaders: (res, path) => {
  if (path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}}));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

const certPath = path.join(__dirname, '..', 'cert.pfx');
const certPassphrase = process.env.CERT_PASSPHRASE;
if (fs.existsSync(certPath) && certPassphrase) {
  const pfx = fs.readFileSync(certPath);
  const creds = { pfx, passphrase: certPassphrase };
  https.createServer(creds, app).listen(PORT, '0.0.0.0', () => {
    console.log(`HTTPS corriendo en https://0.0.0.0:${PORT}`);
  });
  http.createServer(app).listen(PORT + 1, '0.0.0.0', () => {
    console.log(`HTTP corriendo en http://0.0.0.0:${PORT + 1}`);
  });
} else {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP corriendo en http://localhost:${PORT}`);
  });
}
