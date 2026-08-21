import { Router } from 'express';
import * as db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.getFolders(req.user.id));
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  res.json(db.createFolder(req.user.id, name));
});

router.put('/:id', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  const folder = db.updateFolder(req.user.id, Number(req.params.id), name);
  if (!folder) return res.status(404).json({ error: 'Carpeta no encontrada' });
  res.json(folder);
});

router.delete('/:id', (req, res) => {
  const deleted = db.deleteFolder(req.user.id, Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Carpeta no encontrada' });
  res.json({ deleted: true });
});

export default router;
