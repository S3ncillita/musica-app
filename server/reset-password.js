import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.log('Uso: node reset-password.js <usuario> <nueva-contrasena>');
  process.exit(1);
}
if (!fs.existsSync(USERS_FILE)) {
  console.log('No existe ' + USERS_FILE);
  process.exit(1);
}

const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
if (!user) {
  console.log('Usuario no encontrado: ' + username);
  process.exit(1);
}

user.password = await bcrypt.hash(password, 10);
fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
console.log('Contraseña actualizada para ' + user.username);
