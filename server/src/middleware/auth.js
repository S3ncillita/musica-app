import jwt from 'jsonwebtoken';
import { pool } from '../mysql.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cambia-este-secreto-en-tu-env';

export function isAdmin(username) {
  const admin = process.env.ADMIN_USERNAME;
  return !!admin && username === admin;
}

function verify(token, req, res, next) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id, username: decoded.username };
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

export function authRequired(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  verify(auth.split(' ')[1], req, res, next);
}

// Para el audio: el <audio> del navegador no puede mandar el header
// Authorization, así que además se acepta el token en ?t=.
export function mediaAuthRequired(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return verify(auth.split(' ')[1], req, res, next);
  }
  if (typeof req.query.t === 'string' && req.query.t) {
    return verify(req.query.t, req, res, next);
  }
  res.status(401).json({ error: 'No autenticado' });
}

// Corta el acceso si el plan venció. Va después de authRequired. La
// comparación se hace en SQL para no depender de la zona horaria de Node.
export async function planRequired(req, res, next) {
  if (isAdmin(req.user.username)) return next();
  try {
    const [rows] = await pool.query(
      'SELECT expiresAt, (expiresAt IS NOT NULL AND expiresAt <= NOW()) AS expired FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Usuario no encontrado' });
    if (rows[0].expired) {
      return res.status(402).json({ error: 'Tu plan venció', code: 'PLAN_EXPIRED', expiresAt: rows[0].expiresAt });
    }
    next();
  } catch (err) {
    console.error('planRequired error:', err.message);
    res.status(503).json({ error: 'No se pudo verificar el plan' });
  }
}

export function adminRequired(req, res, next) {
  if (!isAdmin(req.user.username)) return res.status(403).json({ error: 'No autorizado' });
  next();
}
