import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'cambia-este-secreto-en-tu-env';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

const router = Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  if (username.length < 3 || password.length < 4) {
    return res.status(400).json({ error: 'Usuario mínimo 3 caracteres, contraseña mínimo 4' });
  }
  const users = loadUsers();
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: 'El usuario ya existe' });
  }
  if (email && users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'El correo ya está registrado' });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = {
    id: Date.now(),
    username,
    email: email || null,
    password: hash,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveUsers(users);
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, username: user.username } });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  const users = loadUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, username: user.username } });
});

router.get('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    res.json({ user: { id: decoded.id, username: decoded.username } });
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;
