import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, pool } from './src/mysql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

await initDb();

if (!fs.existsSync(USERS_FILE)) {
  console.log('No existe users.json: ' + USERS_FILE);
  process.exit(0);
}

const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
if (!Array.isArray(users) || users.length === 0) {
  console.log('No hay usuarios para migrar.');
  process.exit(0);
}

let migrated = 0;
let skipped = 0;
for (const u of users) {
  const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [u.username]);
  if (rows.length) { skipped++; continue; }
  await pool.query(
    'INSERT INTO users (id, username, email, password, createdAt) VALUES (?, ?, ?, ?, ?)',
    [u.id, u.username, u.email || null, u.password, u.createdAt]
  );
  migrated++;
}

console.log(`Usuarios migrados: ${migrated}, ya existían: ${skipped}`);
await pool.end();
