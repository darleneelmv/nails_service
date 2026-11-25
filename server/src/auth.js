import jwt from 'jsonwebtoken';
import { one } from './db.js';

const SECRET = process.env.JWT_SECRET || 'cambia-esto-en-produccion';

export const sign = (user) =>
  jwt.sign({ uid: user.id }, SECRET, { expiresIn: '30d' });

/** Loads req.user and resolves req.studioId (superadmin can act on any studio via X-Studio-Id). */
export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Inicia sesión' });
  try {
    const { uid } = jwt.verify(token, SECRET);
    const user = one('SELECT id,name,email,role,studio_id,active FROM users WHERE id=?', uid);
    if (!user || !user.active) return res.status(401).json({ error: 'Usuario inactivo' });
    req.user = user;
    if (user.role === 'superadmin') {
      const sid = Number(req.headers['x-studio-id']);
      req.studioId = sid || null;
    } else {
      const studio = one('SELECT active FROM studios WHERE id=?', user.studio_id);
      if (!studio || !studio.active)
        return res.status(403).json({ error: 'Tu cuenta está suspendida. Contacta a soporte.' });
      req.studioId = user.studio_id;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Sesión expirada' });
  }
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) || req.user.role === 'superadmin'
    ? next()
    : res.status(403).json({ error: 'No tienes permiso para esto' });

export function requireStudio(req, res, next) {
  if (!req.studioId) return res.status(400).json({ error: 'Selecciona un estudio' });
  next();
}

export const requireSuper = (req, res, next) =>
  req.user.role === 'superadmin' ? next() : res.status(403).json({ error: 'Solo administrador' });
