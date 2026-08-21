import { Router } from 'express';
import * as db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.getPlaylists(req.user.id));
});

router.get('/:id', (req, res) => {
  const playlist = db.getPlaylist(req.user.id, Number(req.params.id));
  if (!playlist) return res.status(404).json({ error: 'Playlist no encontrada' });
  res.json(playlist);
});

router.post('/', (req, res) => {
  const { name, folderId } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  res.json(db.createPlaylist(req.user.id, name, folderId === null || folderId === undefined ? null : Number(folderId)));
});

router.put('/:id', (req, res) => {
  const { name } = req.body;
  const playlist = db.updatePlaylist(req.user.id, Number(req.params.id), name);
  if (!playlist) return res.status(404).json({ error: 'Playlist no encontrada' });
  res.json(playlist);
});

router.delete('/:id', (req, res) => {
  const deleted = db.deletePlaylist(req.user.id, Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Playlist no encontrada' });
  res.json({ deleted: true });
});

router.post('/:id/songs', (req, res) => {
  const { songId } = req.body;
  const result = db.addSongToPlaylist(req.user.id, Number(req.params.id), Number(songId));
  if (result === null) return res.status(404).json({ error: 'Playlist no encontrada' });
  if (result === false) return res.json({ added: false, message: 'Ya está en la playlist' });
  res.json({ added: true });
});

router.delete('/:id/songs/:songId', (req, res) => {
  const removed = db.removeSongFromPlaylist(req.user.id, Number(req.params.id), Number(req.params.songId));
  res.json({ removed });
});

router.put('/:id/folder', (req, res) => {
  const { folderId } = req.body;
  const playlist = db.setPlaylistFolder(req.user.id, Number(req.params.id), folderId === null || folderId === undefined ? null : Number(folderId));
  if (!playlist) return res.status(404).json({ error: 'Playlist o carpeta no encontrada' });
  res.json(playlist);
});

export default router;
