import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const defaultData = { songs: [], playlists: [], nextSongId: 1, nextPlaylistId: 1 };

function load() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export function getSongs(search) {
  const db = load();
  let songs = db.songs;
  if (search) {
    const q = search.toLowerCase();
    songs = songs.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.album.toLowerCase().includes(q)
    );
  }
  return songs;
}

export function getSong(id) {
  const db = load();
  return db.songs.find(s => s.id === id) || null;
}

export function addSong(title, filename) {
  const db = load();
  const song = {
    id: db.nextSongId++,
    type: 'local',
    title,
    artist: 'Desconocido',
    album: 'Desconocido',
    duration: 0,
    filename,
    createdAt: new Date().toISOString()
  };
  db.songs.unshift(song);
  save(db);
  return song;
}

export function addYoutubeTrack(videoId, title, channel, thumbnail, duration, album) {
  const db = load();
  const existing = db.songs.find(s => s.videoId === videoId);
  if (existing) return existing;
  const song = {
    id: db.nextSongId++,
    type: 'youtube',
    title,
    artist: channel || 'Desconocido',
    album: album || '',
    duration: duration || 0,
    videoId,
    thumbnail,
    filename: null,
    createdAt: new Date().toISOString()
  };
  db.songs.unshift(song);
  save(db);
  return song;
}

export function updateSong(id, updates) {
  const db = load();
  const idx = db.songs.findIndex(s => s.id === id);
  if (idx === -1) return null;
  db.songs[idx] = { ...db.songs[idx], ...updates };
  save(db);
  return db.songs[idx];
}

export function deleteSong(id) {
  const db = load();
  const idx = db.songs.findIndex(s => s.id === id);
  if (idx === -1) return null;
  const song = db.songs[idx];
  db.songs.splice(idx, 1);
  for (const pl of db.playlists) {
    pl.songs = pl.songs.filter(s => s.songId !== id);
  }
  save(db);
  return song;
}

export function getPlaylists() {
  const db = load();
  return db.playlists.map(({ songs, ...rest }) => ({ ...rest, songCount: songs.length }));
}

export function getPlaylist(id) {
  const db = load();
  const pl = db.playlists.find(p => p.id === id);
  if (!pl) return null;
  const songs = pl.songs
    .map(ps => {
      const song = db.songs.find(s => s.id === ps.songId);
      return song ? { ...song, position: ps.position } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.position - b.position);
  return { ...pl, songs };
}

export function createPlaylist(name) {
  const db = load();
  const pl = {
    id: db.nextPlaylistId++,
    name,
    songs: [],
    createdAt: new Date().toISOString()
  };
  db.playlists.unshift(pl);
  save(db);
  return pl;
}

export function updatePlaylist(id, name) {
  const db = load();
  const pl = db.playlists.find(p => p.id === id);
  if (!pl) return null;
  pl.name = name;
  save(db);
  return pl;
}

export function deletePlaylist(id) {
  const db = load();
  const idx = db.playlists.findIndex(p => p.id === id);
  if (idx === -1) return null;
  const pl = db.playlists[idx];
  db.playlists.splice(idx, 1);
  save(db);
  return pl;
}

export function addSongToPlaylist(playlistId, songId) {
  const db = load();
  const pl = db.playlists.find(p => p.id === playlistId);
  if (!pl) return null;
  if (pl.songs.some(s => s.songId === songId)) return false;
  const maxPos = pl.songs.reduce((max, s) => Math.max(max, s.position), 0);
  pl.songs.push({ songId, position: maxPos + 1 });
  save(db);
  return true;
}

export function removeSongFromPlaylist(playlistId, songId) {
  const db = load();
  const pl = db.playlists.find(p => p.id === playlistId);
  if (!pl) return false;
  const before = pl.songs.length;
  pl.songs = pl.songs.filter(s => s.songId !== songId);
  save(db);
  return pl.songs.length < before;
}
