import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { initDb, pool } from './src/mysql.js';

const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.log('Uso: node reset-password.js <usuario> <nueva-contrasena>');
  process.exit(1);
}

await initDb();

const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
const user = rows[0];
if (!user) {
  console.log('Usuario no encontrado: ' + username);
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, user.id]);
console.log('Contraseña actualizada para ' + username);

await pool.end();
