import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../mysql.js';
import { authRequired, adminRequired, isAdmin } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cambia-este-secreto-en-tu-env';

const router = Router();

// Días de prueba gratis al registrarse (0 = la cuenta nace vencida).
const TRIAL_DAYS = Math.max(0, Number.parseInt(process.env.TRIAL_DAYS ?? '7', 10) || 0);

const SECURITY_QUESTIONS = [
  '¿Cuál es el nombre de tu primera mascota?',
  '¿Cuál es tu color favorito?',
  '¿En qué ciudad naciste?',
  '¿Cuál es tu comida favorita?',
  '¿Cuál es el nombre de tu mejor amigo/a de la infancia?',
];

// Datos públicos del usuario + estado del plan. La comparación del vencimiento
// se hace en SQL (ver planRequired) para no depender de la zona horaria.
async function publicUser(id, username, email) {
  const admin = isAdmin(username);
  let expiresAt = null;
  let expired = false;
  if (!admin) {
    const [rows] = await pool.query(
      'SELECT expiresAt, (expiresAt IS NOT NULL AND expiresAt <= NOW()) AS expired FROM users WHERE id = ?',
      [id]
    );
    expiresAt = rows[0]?.expiresAt || null;
    expired = !!rows[0]?.expired;
  }
  return { id, username, email, isAdmin: admin, expiresAt, expired };
}

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
      'INSERT INTO users (id, username, email, password, securityQuestion, securityAnswer, createdAt, appVersion, lastSeen, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY))',
      [user.id, user.username, user.email, user.password, user.securityQuestion, user.securityAnswer, user.createdAt, appVersion || null, TRIAL_DAYS]
    );
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: await publicUser(user.id, user.username, user.email) });
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
    res.json({ token, user: await publicUser(user.id, user.username, user.email) });
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

router.get('/me', authRequired, async (req, res) => {
  try {
    const appVersion = req.headers['x-app-version'];
    if (appVersion) {
      pool.query('UPDATE users SET appVersion = ?, lastSeen = NOW() WHERE id = ?', [appVersion, req.user.id]).catch(() => {});
    } else {
      pool.query('UPDATE users SET lastSeen = NOW() WHERE id = ?', [req.user.id]).catch(() => {});
    }
    const [rows] = await pool.query('SELECT email FROM users WHERE id = ?', [req.user.id]);
    if (!rows[0]) return res.status(401).json({ error: 'Usuario no encontrado' });
    res.json({ user: await publicUser(req.user.id, req.user.username, rows[0].email) });
  } catch (err) {
    console.error('me error:', err.message);
    res.status(500).json({ error: 'Error al consultar el usuario' });
  }
});

// Datos para que el usuario con el plan vencido sepa cómo pagar. Se leen del
// .env (PAYMENT_INSTRUCTIONS, con \n para los saltos de línea).
router.get('/payment-info', (req, res) => {
  res.json({
    instructions: (process.env.PAYMENT_INSTRUCTIONS || '').replace(/\\n/g, '\n'),
  });
});

router.get('/users', authRequired, adminRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, email, appVersion, lastSeen, createdAt, expiresAt,
              (expiresAt IS NOT NULL AND expiresAt <= NOW()) AS expired
       FROM users ORDER BY lastSeen DESC`
    );
    res.json(rows.map(r => ({ ...r, expired: !!r.expired, infinite: r.expiresAt === null })));
  } catch (err) {
    console.error('users list error:', err.message);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

// Suma días al plan, contando desde hoy si ya venció o desde el vencimiento
// actual si todavía está vigente. Una cuenta sin vencimiento no cambia.
router.post('/users/:id/extend', authRequired, adminRequired, async (req, res) => {
  const days = Number(req.body.days ?? 30);
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    return res.status(400).json({ error: 'Cantidad de días inválida' });
  }
  const amount = req.body.amount ? String(req.body.amount).slice(0, 40) : null;
  const note = req.body.note ? String(req.body.note).slice(0, 255) : null;
  try {
    const [result] = await pool.query(
      'UPDATE users SET expiresAt = DATE_ADD(GREATEST(NOW(), expiresAt), INTERVAL ? DAY) WHERE id = ? AND expiresAt IS NOT NULL',
      [days, req.params.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Usuario no encontrado o con plan sin vencimiento' });
    }
    await pool.query('INSERT INTO payments (userId, days, amount, note) VALUES (?, ?, ?, ?)', [req.params.id, days, amount, note]);
    const [rows] = await pool.query('SELECT expiresAt FROM users WHERE id = ?', [req.params.id]);
    res.json({ ok: true, expiresAt: rows[0].expiresAt });
  } catch (err) {
    console.error('extend error:', err.message);
    res.status(500).json({ error: 'Error al extender el plan' });
  }
});

// Plan infinito (sin pagar) para quienes vos elijas. Quitarlo deja la cuenta
// vencida desde ahora; hay que sumarle días para reactivarla.
router.post('/users/:id/infinite', authRequired, adminRequired, async (req, res) => {
  const infinite = !!req.body.infinite;
  try {
    const [result] = await pool.query(
      infinite ? 'UPDATE users SET expiresAt = NULL WHERE id = ?' : 'UPDATE users SET expiresAt = NOW() WHERE id = ?',
      [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ok: true, infinite });
  } catch (err) {
    console.error('infinite error:', err.message);
    res.status(500).json({ error: 'Error al cambiar el plan' });
  }
});

router.get('/payments', authRequired, adminRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT p.id, p.userId, u.username, p.days, p.amount, p.note, p.createdAt FROM payments p LEFT JOIN users u ON u.id = p.userId ORDER BY p.id DESC LIMIT 200'
    );
    res.json(rows);
  } catch (err) {
    console.error('payments list error:', err.message);
    res.status(500).json({ error: 'Error al listar pagos' });
  }
});

export default router;
