// Corregir de una sola vez las miniaturas de baja resolución que quedaron
// guardadas de antes del fix (server/src/routes/youtube.js, upscaleThumbnail):
//   - yt3.googleusercontent.com/...=wNNN-hNNN  → se sube a 720x720
//   - img.youtube.com/vi/<id>/mqdefault.jpg    → se sube a hqdefault.jpg
// No hace falta buscar nada de nuevo: son la misma URL, solo con otro tamaño.
//
// Uso (desde server/): node migrate-thumbnails.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'data', 'db.json');

function upgrade(url) {
  if (!url) return url;
  if (url.includes('googleusercontent.com')) {
    return url.replace(/=w\d+-h\d+/, '=w720-h720');
  }
  if (url.includes('/vi/') && url.includes('mqdefault.jpg')) {
    return url.replace('mqdefault.jpg', 'hqdefault.jpg');
  }
  return url;
}

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
let changed = 0;
for (const song of db.songs || []) {
  const upgraded = upgrade(song.thumbnail);
  if (upgraded !== song.thumbnail) {
    song.thumbnail = upgraded;
    changed++;
  }
}

if (changed > 0) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
console.log(`Miniaturas mejoradas: ${changed} de ${(db.songs || []).length} canciones.`);
