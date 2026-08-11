import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../mysql.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cambia-este-secreto-en-tu-env';

const router = Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  if (username.length < 3 || password.length < 4) {
    return res.status(400).json({ error: 'Usuario mínimo 3 caracteres, contraseña mínimo 4' });
  }
  try {
    const [dups] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (dups.length) return res.status(409).json({ error: 'El usuario ya existe' });
    if (email) {
      const [emailDups] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (emailDups.length) return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = {
      id: Date.now(),
      username,
      email: email || null,
      password: hash,
      createdAt: new Date().toISOString()
    };
    await pool.query(
      'INSERT INTO users (id, username, email, password, createdAt) VALUES (?, ?, ?, ?, ?)',
      [user.id, user.username, user.email, user.password, user.createdAt]
    );
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('register error:', err.message);
    res.status(500).json({ error: 'Error al registrar' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('login error:', err.message);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
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
