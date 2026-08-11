import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cambia-este-secreto-en-tu-env';

export function authRequired(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    req.user = { id: decoded.id, username: decoded.username };
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}
