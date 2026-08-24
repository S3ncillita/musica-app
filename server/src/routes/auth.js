import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../mysql.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cambia-este-secreto-en-tu-env';

const router = Router();

const SECURITY_QUESTIONS = [
  '¿Cuál es el nombre de tu primera mascota?',
  '¿Cuál es tu color favorito?',
  '¿En qué ciudad naciste?',
  '¿Cuál es tu comida favorita?',
  '¿Cuál es el nombre de tu mejor amigo/a de la infancia?',
];

function normalizeAnswer(answer) {
  return String(answer || '').trim().toLowerCase();
}

router.get('/security-questions', (req, res) => {
  res.json({ questions: SECURITY_QUESTIONS });
});

router.post('/register', async (req, res) => {
  const { username, email, password, securityQuestion, securityAnswer, appVersion } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  if (username.length < 3 || password.length < 4) {
    return res.status(400).json({ error: 'Usuario mínimo 3 caracteres, contraseña mínimo 4' });
  }
  if (!securityQuestion || !securityAnswer || !SECURITY_QUESTIONS.includes(securityQuestion)) {
    return res.status(400).json({ error: 'Elegí una pregunta de seguridad y respondela' });
  }
  try {
    const [dups] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (dups.length) return res.status(409).json({ error: 'El usuario ya existe' });
    if (email) {
      const [emailDups] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (emailDups.length) return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    const hash = await bcrypt.hash(password, 10);
    const answerHash = await bcrypt.hash(normalizeAnswer(securityAnswer), 10);
    const user = {
      id: Date.now(),
      username,
      email: email || null,
      password: hash,
      securityQuestion,
      securityAnswer: answerHash,
      createdAt: new Date().toISOString()
    };
    await pool.query(
      'INSERT INTO users (id, username, email, password, securityQuestion, securityAnswer, createdAt, appVersion, lastSeen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [user.id, user.username, user.email, user.password, user.securityQuestion, user.securityAnswer, user.createdAt, appVersion || null]
    );
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('register error:', err.message);
    res.status(500).json({ error: 'Error al registrar' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password, appVersion } = req.body;
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
    if (appVersion) {
      pool.query('UPDATE users SET appVersion = ?, lastSeen = NOW() WHERE id = ?', [appVersion, user.id]).catch(() => {});
    }
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('login error:', err.message);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.post('/recovery/question', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Usuario requerido' });
  try {
    const [rows] = await pool.query('SELECT securityQuestion FROM users WHERE username = ?', [username]);
    const user = rows[0];
    if (!user || !user.securityQuestion) {
      return res.status(404).json({ error: 'No hay una pregunta de seguridad configurada para ese usuario' });
    }
    res.json({ question: user.securityQuestion });
  } catch (err) {
    console.error('recovery/question error:', err.message);
    res.status(500).json({ error: 'Error buscando la pregunta de seguridad' });
  }
});

router.post('/recovery/reset', async (req, res) => {
  const { username, answer, newPassword } = req.body;
  if (!username || !answer || !newPassword) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'Contraseña mínimo 4 caracteres' });
  }
  try {
    const [rows] = await pool.query('SELECT id, securityAnswer FROM users WHERE username = ?', [username]);
    const user = rows[0];
    if (!user || !user.securityAnswer) {
      return res.status(404).json({ error: 'No hay una pregunta de seguridad configurada para ese usuario' });
    }
    const valid = await bcrypt.compare(normalizeAnswer(answer), user.securityAnswer);
    if (!valid) {
      return res.status(401).json({ error: 'Respuesta incorrecta' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('recovery/reset error:', err.message);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});

router.get('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    const appVersion = req.headers['x-app-version'];
    if (appVersion) {
      pool.query('UPDATE users SET appVersion = ?, lastSeen = NOW() WHERE id = ?', [appVersion, decoded.id]).catch(() => {});
    } else {
      pool.query('UPDATE users SET lastSeen = NOW() WHERE id = ?', [decoded.id]).catch(() => {});
    }
    res.json({ user: { id: decoded.id, username: decoded.username, email: decoded.email } });
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

router.get('/users', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    const adminUsername = process.env.ADMIN_USERNAME;
    if (!adminUsername || decoded.username !== adminUsername) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const [rows] = await pool.query(
      'SELECT id, username, email, appVersion, lastSeen, createdAt FROM users ORDER BY lastSeen DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('users list error:', err.message);
    res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;
