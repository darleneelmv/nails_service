import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { db, one, all, run, insert, update, pick, UPLOAD_DIR } from './db.js';
import { sign, requireAuth, requireRole, requireStudio, requireSuper } from './auth.js';
import { toMin, fromMin, addMinutes, nowLocal, weekday, TZ } from './time.js';
import { seedIfEmpty } from './seed.js';

seedIfEmpty();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d' }));

const wrap = (fn) => (req, res, next) => {
  try {
    const r = fn(req, res, next);
    if (r && r.catch) r.catch(next);
  } catch (e) { next(e); }
};
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

const STUDIO_FIELDS = ['name', 'tagline', 'bio', 'phone', 'whatsapp', 'instagram', 'facebook', 'address',
  'maps_url', 'logo', 'cover', 'color_primary', 'color_accent', 'theme', 'slot_minutes',
  'booking_notice_hours', 'home_service'];
const SERVICE_FIELDS = ['name', 'description', 'category', 'price', 'duration_min', 'image', 'active', 'sort'];
const CLIENT_FIELDS = ['name', 'phone', 'email', 'birthday', 'notes'];
const APPT_FIELDS = ['client_id', 'service_id', 'staff_id', 'start_at', 'end_at', 'status', 'price', 'notes', 'at_home'];

const slugify = (s) => s.toString().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function ensureHours(studioId) {
  for (let d = 0; d < 7; d++)
    run(`INSERT OR IGNORE INTO hours (studio_id, weekday, enabled, open, close) VALUES (?,?,?,?,?)`,
      studioId, d, d === 0 ? 0 : 1, '10:00', '19:00');
}

/* ---------------- Uploads ---------------- */
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) =>
      cb(null, crypto.randomUUID() + (path.extname(file.originalname).toLowerCase() || '.jpg')),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

/* ---------------- Availability ---------------- */
function availableSlots(studio, date, duration) {
  const h = one('SELECT * FROM hours WHERE studio_id=? AND weekday=?', studio.id, weekday(date));
  if (!h || !h.enabled) return [];
  const step = studio.slot_minutes || 30;
  const busy = all(
    `SELECT start_at, end_at FROM appointments WHERE studio_id=? AND status NOT IN ('cancelled','no_show')
     AND substr(start_at,1,10)=?`, studio.id, date
  ).concat(all(`SELECT start_at, end_at FROM blocks WHERE studio_id=? AND start_at < ? AND end_at > ?`,
    studio.id, date + 'T23:59', date + 'T00:00'));
  const minStart = addMinutes(nowLocal(), (studio.booking_notice_hours || 0) * 60);
  const slots = [];
  for (let m = toMin(h.open); m + duration <= toMin(h.close); m += step) {
    const s = `${date}T${fromMin(m)}`;
    const e = addMinutes(s, duration);
    if (s < minStart) continue;
    if (busy.some((b) => s < b.end_at && e > b.start_at)) continue;
    if (h.break_start && h.break_end && m < toMin(h.break_end) && m + duration > toMin(h.break_start)) continue;
    slots.push(fromMin(m));
  }
  return slots;
}

/* ---------------- Public ---------------- */
const publicStudio = (slug) => one('SELECT * FROM studios WHERE slug=? AND active=1', slug);

app.get('/api/public/:slug', wrap((req, res) => {
  const s = publicStudio(req.params.slug);
  if (!s) return bad(res, 'Estudio no encontrado', 404);
  const { ical_token, plan, paid_until, ...studio } = s;
  res.json({
    studio,
    services: all('SELECT * FROM services WHERE studio_id=? AND active=1 ORDER BY sort, id', s.id),
    gallery: all(`SELECT g.*, sv.name AS service_name FROM gallery g LEFT JOIN services sv ON sv.id=g.service_id
                  WHERE g.studio_id=? ORDER BY g.featured DESC, g.id DESC LIMIT 60`, s.id),
    hours: all('SELECT weekday, enabled, open, close FROM hours WHERE studio_id=? ORDER BY weekday', s.id),
  });
}));

app.get('/api/public/:slug/slots', wrap((req, res) => {
  const s = publicStudio(req.params.slug);
  if (!s) return bad(res, 'Estudio no encontrado', 404);
  const svc = one('SELECT * FROM services WHERE id=? AND studio_id=? AND active=1', req.query.service_id, s.id);
  if (!svc) return bad(res, 'Servicio no válido');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '')) return bad(res, 'Fecha no válida');
  res.json({ slots: availableSlots(s, req.query.date, svc.duration_min) });
}));

// Per-day availability so the booking calendar can mark days as free / full / closed.
app.get('/api/public/:slug/availability', wrap((req, res) => {
  const s = publicStudio(req.params.slug);
  if (!s) return bad(res, 'Estudio no encontrado', 404);
  const svc = one('SELECT * FROM services WHERE id=? AND studio_id=? AND active=1', req.query.service_id, s.id);
  if (!svc) return bad(res, 'Servicio no válido');
  const days = Math.min(Number(req.query.days) || 30, 60);
  const start = nowLocal().slice(0, 10);
  const out = [];
  for (let i = 0; i < days; i++) {
    const date = addMinutes(`${start}T00:00`, i * 1440).slice(0, 10);
    const h = one('SELECT enabled FROM hours WHERE studio_id=? AND weekday=?', s.id, weekday(date));
    const free = availableSlots(s, date, svc.duration_min).length;
    out.push({ date, free, status: !h?.enabled ? 'closed' : free === 0 ? 'full' : free <= 2 ? 'few' : 'open' });
  }
  res.json({ days: out });
}));

app.post('/api/public/:slug/book', wrap((req, res) => {
  const s = publicStudio(req.params.slug);
  if (!s) return bad(res, 'Estudio no encontrado', 404);
  const { service_id, date, time, name, phone, email = '', notes = '', at_home = 0 } = req.body || {};
  if (!name?.trim() || !phone?.trim()) return bad(res, 'Nombre y teléfono son obligatorios');
  const svc = one('SELECT * FROM services WHERE id=? AND studio_id=? AND active=1', service_id, s.id);
  if (!svc) return bad(res, 'Servicio no válido');
  if (!availableSlots(s, date, svc.duration_min).includes(time))
    return bad(res, 'Ese horario ya no está disponible, elige otro 💅', 409);
  const cleanPhone = phone.replace(/\D/g, '');
  let client = one('SELECT * FROM clients WHERE studio_id=? AND phone=?', s.id, cleanPhone);
  const clientId = client ? client.id : insert('clients', { studio_id: s.id, name: name.trim(), phone: cleanPhone, email });
  const start_at = `${date}T${time}`;
  const id = insert('appointments', {
    studio_id: s.id, client_id: clientId, service_id: svc.id, start_at,
    end_at: addMinutes(start_at, svc.duration_min), price: svc.price, notes,
    at_home: s.home_service && at_home ? 1 : 0, status: 'pending', source: 'web',
  });
  res.json({ id, start_at, end_at: addMinutes(start_at, svc.duration_min), service: svc.name, studio: s.name });
}));

/* ---------------- iCal feed (subscribe from Google Calendar / iPhone) ---------------- */
const icsEsc = (t = '') => String(t).replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
const icsDate = (local) => local.replace(/[-:]/g, '') + '00';

app.get('/api/ical/:token.ics', wrap((req, res) => {
  const s = one('SELECT * FROM studios WHERE ical_token=?', req.params.token);
  if (!s) return res.status(404).end();
  const rows = all(`SELECT a.*, c.name AS client_name, c.phone AS client_phone, sv.name AS service_name
    FROM appointments a LEFT JOIN clients c ON c.id=a.client_id LEFT JOIN services sv ON sv.id=a.service_id
    WHERE a.studio_id=? AND a.status IN ('pending','confirmed') AND a.start_at >= date('now','-30 day')`, s.id);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Brillo//Citas//ES', 'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${icsEsc(s.name)} · Citas`, `X-WR-TIMEZONE:${TZ}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'BEGIN:VTIMEZONE', `TZID:${TZ}`, 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:-0600',
    'TZOFFSETTO:-0600', 'TZNAME:CST', 'END:STANDARD', 'END:VTIMEZONE'];
  for (const a of rows) {
    lines.push('BEGIN:VEVENT', `UID:brillo-${a.id}@${s.slug}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTSTART;TZID=${TZ}:${icsDate(a.start_at)}`, `DTEND;TZID=${TZ}:${icsDate(a.end_at)}`,
      `SUMMARY:${icsEsc(`💅 ${a.service_name || 'Cita'} · ${a.client_name || ''}`)}`,
      `DESCRIPTION:${icsEsc(`Cliente: ${a.client_name || ''}\nTel: ${a.client_phone || ''}\nEstado: ${a.status}${a.notes ? '\nNotas: ' + a.notes : ''}`)}`,
      `STATUS:${a.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Cita en 1 hora', 'TRIGGER:-PT1H', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Cita mañana', 'TRIGGER:-PT24H', 'END:VALARM',
      'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.send(lines.join('\r\n'));
}));

/* ---------------- Auth ---------------- */
app.post('/api/auth/login', wrap((req, res) => {
  const { email = '', password = '' } = req.body || {};
  const u = one('SELECT * FROM users WHERE email=?', email.trim().toLowerCase());
  if (!u || !bcrypt.compareSync(password, u.password_hash)) return bad(res, 'Correo o contraseña incorrectos', 401);
  if (!u.active) return bad(res, 'Usuario desactivado', 403);
  res.json({ token: sign(u) });
}));

app.use('/api/me', requireAuth);
app.get('/api/me', wrap((req, res) => {
  const studio = req.studioId ? one('SELECT * FROM studios WHERE id=?', req.studioId) : null;
  res.json({ user: req.user, studio });
}));
app.post('/api/me/password', wrap((req, res) => {
  const { current, next: nw } = req.body || {};
  const u = one('SELECT * FROM users WHERE id=?', req.user.id);
  if (!bcrypt.compareSync(current || '', u.password_hash)) return bad(res, 'La contraseña actual no coincide');
  if (!nw || nw.length < 6) return bad(res, 'Mínimo 6 caracteres');
  run('UPDATE users SET password_hash=? WHERE id=?', bcrypt.hashSync(nw, 10), u.id);
  res.json({ ok: true });
}));

/* ---------------- Studio-scoped API ---------------- */
const api = express.Router();
api.use(requireAuth, requireStudio);

api.post('/upload', upload.single('file'), (req, res) =>
  req.file ? res.json({ url: '/uploads/' + req.file.filename }) : bad(res, 'Sube una imagen (máx 8 MB)'));

api.get('/studio', wrap((req, res) => {
  const s = one('SELECT * FROM studios WHERE id=?', req.studioId);
  if (!s.ical_token) {
    s.ical_token = crypto.randomBytes(16).toString('hex');
    run('UPDATE studios SET ical_token=? WHERE id=?', s.ical_token, s.id);
  }
  res.json({ studio: s, hours: all('SELECT * FROM hours WHERE studio_id=? ORDER BY weekday', req.studioId) });
}));
api.put('/studio', requireRole('owner'), wrap((req, res) => {
  update('studios', req.studioId, pick(req.body, STUDIO_FIELDS));
  if (Array.isArray(req.body.hours))
    for (const h of req.body.hours)
      run('UPDATE hours SET enabled=?, open=?, close=?, break_start=?, break_end=? WHERE studio_id=? AND weekday=?',
        h.enabled ? 1 : 0, h.open, h.close, h.break_start || '', h.break_end || '', req.studioId, h.weekday);
  res.json({ ok: true });
}));
api.post('/studio/ical-reset', requireRole('owner'), wrap((req, res) => {
  run('UPDATE studios SET ical_token=? WHERE id=?', crypto.randomBytes(16).toString('hex'), req.studioId);
  res.json({ ok: true });
}));

// Services
api.get('/services', wrap((req, res) =>
  res.json(all('SELECT * FROM services WHERE studio_id=? ORDER BY sort, id', req.studioId))));
api.post('/services', requireRole('owner'), wrap((req, res) => {
  const d = pick(req.body, SERVICE_FIELDS);
  if (!d.name) return bad(res, 'El servicio necesita nombre');
  res.json({ id: insert('services', { ...d, studio_id: req.studioId }) });
}));
api.put('/services/:id', requireRole('owner'), wrap((req, res) => {
  update('services', req.params.id, pick(req.body, SERVICE_FIELDS), 'AND studio_id=?', req.studioId);
  res.json({ ok: true });
}));
api.delete('/services/:id', requireRole('owner'), wrap((req, res) => {
  run('DELETE FROM services WHERE id=? AND studio_id=?', req.params.id, req.studioId);
  res.json({ ok: true });
}));

// Gallery
api.get('/gallery', wrap((req, res) =>
  res.json(all('SELECT * FROM gallery WHERE studio_id=? ORDER BY featured DESC, id DESC', req.studioId))));
api.post('/gallery', wrap((req, res) => {
  const d = pick(req.body, ['image', 'caption', 'service_id', 'featured']);
  if (!d.image) return bad(res, 'Falta la imagen');
  res.json({ id: insert('gallery', { ...d, studio_id: req.studioId }) });
}));
api.put('/gallery/:id', wrap((req, res) => {
  update('gallery', req.params.id, pick(req.body, ['caption', 'service_id', 'featured']), 'AND studio_id=?', req.studioId);
  res.json({ ok: true });
}));
api.delete('/gallery/:id', wrap((req, res) => {
  run('DELETE FROM gallery WHERE id=? AND studio_id=?', req.params.id, req.studioId);
  res.json({ ok: true });
}));

// Clients
api.get('/clients', wrap((req, res) => {
  const q = `%${req.query.q || ''}%`;
  res.json(all(`SELECT c.*, COUNT(a.id) AS visits, MAX(a.start_at) AS last_visit,
      COALESCE(SUM(CASE WHEN a.status='done' THEN a.price END),0) AS spent
    FROM clients c LEFT JOIN appointments a ON a.client_id=c.id
    WHERE c.studio_id=? AND (c.name LIKE ? OR c.phone LIKE ?) GROUP BY c.id ORDER BY c.name`, req.studioId, q, q));
}));
api.get('/clients/:id', wrap((req, res) => {
  const c = one('SELECT * FROM clients WHERE id=? AND studio_id=?', req.params.id, req.studioId);
  if (!c) return bad(res, 'No encontrada', 404);
  c.history = all(`SELECT a.*, sv.name AS service_name FROM appointments a LEFT JOIN services sv ON sv.id=a.service_id
    WHERE a.client_id=? ORDER BY a.start_at DESC`, c.id);
  res.json(c);
}));
api.post('/clients', wrap((req, res) => {
  const d = pick(req.body, CLIENT_FIELDS);
  if (!d.name) return bad(res, 'Falta el nombre');
  if (d.phone) d.phone = d.phone.replace(/\D/g, '');
  res.json({ id: insert('clients', { ...d, studio_id: req.studioId }) });
}));
api.put('/clients/:id', wrap((req, res) => {
  const d = pick(req.body, CLIENT_FIELDS);
  if (d.phone) d.phone = d.phone.replace(/\D/g, '');
  update('clients', req.params.id, d, 'AND studio_id=?', req.studioId);
  res.json({ ok: true });
}));
api.delete('/clients/:id', requireRole('owner'), wrap((req, res) => {
  run('DELETE FROM clients WHERE id=? AND studio_id=?', req.params.id, req.studioId);
  res.json({ ok: true });
}));

// Appointments
api.get('/appointments', wrap((req, res) => {
  const from = req.query.from || '0000';
  const to = req.query.to || '9999';
  res.json(all(`SELECT a.*, c.name AS client_name, c.phone AS client_phone, sv.name AS service_name,
      u.name AS staff_name FROM appointments a
    LEFT JOIN clients c ON c.id=a.client_id LEFT JOIN services sv ON sv.id=a.service_id
    LEFT JOIN users u ON u.id=a.staff_id
    WHERE a.studio_id=? AND a.start_at >= ? AND a.start_at < ? ORDER BY a.start_at`, req.studioId, from, to));
}));
function checkOverlap(studioId, start, end, ignoreId = 0) {
  return one(`SELECT id FROM appointments WHERE studio_id=? AND id<>? AND status NOT IN ('cancelled','no_show')
    AND start_at < ? AND end_at > ?`, studioId, ignoreId, end, start);
}
api.post('/appointments', wrap((req, res) => {
  const d = pick(req.body, APPT_FIELDS);
  if (!d.start_at) return bad(res, 'Falta fecha y hora');
  const svc = d.service_id ? one('SELECT * FROM services WHERE id=? AND studio_id=?', d.service_id, req.studioId) : null;
  if (!d.end_at) d.end_at = addMinutes(d.start_at, svc?.duration_min || 60);
  if (d.price == null && svc) d.price = svc.price;
  if (!req.body.force && checkOverlap(req.studioId, d.start_at, d.end_at))
    return bad(res, 'Ya hay una cita en ese horario', 409);
  if (!d.status) d.status = 'confirmed';
  res.json({ id: insert('appointments', { ...d, studio_id: req.studioId, source: 'admin' }) });
}));
api.put('/appointments/:id', wrap((req, res) => {
  const d = pick(req.body, APPT_FIELDS);
  if (d.start_at && !d.end_at) {
    const cur = one('SELECT * FROM appointments WHERE id=?', req.params.id);
    const svc = one('SELECT duration_min FROM services WHERE id=?', d.service_id || cur?.service_id);
    d.end_at = addMinutes(d.start_at, svc?.duration_min || 60);
  }
  if (d.start_at && !req.body.force && checkOverlap(req.studioId, d.start_at, d.end_at, Number(req.params.id)))
    return bad(res, 'Ya hay una cita en ese horario', 409);
  update('appointments', req.params.id, d, 'AND studio_id=?', req.studioId);
  res.json({ ok: true });
}));
api.delete('/appointments/:id', wrap((req, res) => {
  run('DELETE FROM appointments WHERE id=? AND studio_id=?', req.params.id, req.studioId);
  res.json({ ok: true });
}));

// Blocks (días libres, comida, etc.)
api.get('/blocks', wrap((req, res) =>
  res.json(all('SELECT * FROM blocks WHERE studio_id=? AND end_at >= ? ORDER BY start_at', req.studioId, nowLocal().slice(0, 10)))));
api.post('/blocks', wrap((req, res) => {
  const d = pick(req.body, ['start_at', 'end_at', 'reason']);
  if (!d.start_at || !d.end_at) return bad(res, 'Faltan fechas');
  res.json({ id: insert('blocks', { ...d, studio_id: req.studioId }) });
}));
api.delete('/blocks/:id', wrap((req, res) => {
  run('DELETE FROM blocks WHERE id=? AND studio_id=?', req.params.id, req.studioId);
  res.json({ ok: true });
}));

// Dashboard stats
api.get('/stats', wrap((req, res) => {
  const now = nowLocal();
  const today = now.slice(0, 10);
  const month = now.slice(0, 7);
  const sid = req.studioId;
  const prevMonthDate = new Date(month + '-01T12:00:00Z');
  prevMonthDate.setUTCMonth(prevMonthDate.getUTCMonth() - 1);
  const prevMonth = prevMonthDate.toISOString().slice(0, 7);
  const income = (m) => one(`SELECT COALESCE(SUM(price),0) AS v, COUNT(*) AS n FROM appointments
    WHERE studio_id=? AND status='done' AND substr(start_at,1,7)=?`, sid, m);
  res.json({
    today: all(`SELECT a.*, c.name AS client_name, c.phone AS client_phone, sv.name AS service_name FROM appointments a
      LEFT JOIN clients c ON c.id=a.client_id LEFT JOIN services sv ON sv.id=a.service_id
      WHERE a.studio_id=? AND substr(a.start_at,1,10)=? AND a.status NOT IN ('cancelled') ORDER BY a.start_at`, sid, today),
    pending: one(`SELECT COUNT(*) AS n FROM appointments WHERE studio_id=? AND status='pending' AND start_at >= ?`, sid, today).n,
    upcoming: one(`SELECT COUNT(*) AS n FROM appointments WHERE studio_id=? AND status IN ('pending','confirmed') AND start_at >= ?`, sid, now).n,
    month: income(month),
    prevMonth: income(prevMonth),
    clients: one('SELECT COUNT(*) AS n FROM clients WHERE studio_id=?', sid).n,
    newClients: one(`SELECT COUNT(*) AS n FROM clients WHERE studio_id=? AND substr(created_at,1,7)=?`, sid, month).n,
    topServices: all(`SELECT sv.name, COUNT(*) AS n, COALESCE(SUM(a.price),0) AS total FROM appointments a
      JOIN services sv ON sv.id=a.service_id WHERE a.studio_id=? AND a.status='done' AND substr(a.start_at,1,7)=?
      GROUP BY sv.id ORDER BY n DESC LIMIT 5`, sid, month),
    last7: all(`SELECT substr(start_at,1,10) AS day, COALESCE(SUM(price),0) AS total, COUNT(*) AS n FROM appointments
      WHERE studio_id=? AND status='done' AND start_at >= date(?, '-6 day') AND start_at < date(?, '+1 day')
      GROUP BY day ORDER BY day`, sid, today, today),
  });
}));

// Team (owner manages staff of their studio)
api.get('/team', requireRole('owner'), wrap((req, res) =>
  res.json(all('SELECT id,name,email,role,active,created_at FROM users WHERE studio_id=? ORDER BY role, name', req.studioId))));
api.post('/team', requireRole('owner'), wrap((req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 6) return bad(res, 'Nombre, correo y contraseña (mín. 6)');
  if (one('SELECT id FROM users WHERE email=?', email.toLowerCase())) return bad(res, 'Ese correo ya existe');
  res.json({ id: insert('users', { studio_id: req.studioId, name, email: email.toLowerCase(), password_hash: bcrypt.hashSync(password, 10), role: 'staff' }) });
}));
api.put('/team/:id', requireRole('owner'), wrap((req, res) => {
  const u = one('SELECT * FROM users WHERE id=? AND studio_id=?', req.params.id, req.studioId);
  if (!u || u.role !== 'staff') return bad(res, 'Solo puedes editar a tu equipo');
  const d = pick(req.body, ['name', 'active']);
  if (req.body.password) d.password_hash = bcrypt.hashSync(req.body.password, 10);
  update('users', u.id, d);
  res.json({ ok: true });
}));
api.delete('/team/:id', requireRole('owner'), wrap((req, res) => {
  run(`DELETE FROM users WHERE id=? AND studio_id=? AND role='staff'`, req.params.id, req.studioId);
  res.json({ ok: true });
}));


/* ---------------- Super admin (Darlene) ---------------- */
const sup = express.Router();
sup.use(requireAuth, requireSuper);
sup.get('/studios', wrap((_req, res) => res.json(all(`SELECT s.*,
    (SELECT COUNT(*) FROM appointments a WHERE a.studio_id=s.id) AS appointments,
    (SELECT COUNT(*) FROM clients c WHERE c.studio_id=s.id) AS clients,
    (SELECT COUNT(*) FROM users u WHERE u.studio_id=s.id) AS users,
    (SELECT email FROM users u WHERE u.studio_id=s.id AND u.role='owner' LIMIT 1) AS owner_email
  FROM studios s ORDER BY s.created_at DESC`))));
sup.post('/studios', wrap((req, res) => {
  const { name, owner_name, owner_email, owner_password, plan = 'beta', paid_until = null } = req.body || {};
  if (!name || !owner_email || !owner_password) return bad(res, 'Nombre del estudio, correo y contraseña de la dueña');
  if (one('SELECT id FROM users WHERE email=?', owner_email.toLowerCase())) return bad(res, 'Ese correo ya está registrado');
  let slug = slugify(req.body.slug || name) || 'estudio';
  while (one('SELECT id FROM studios WHERE slug=?', slug)) slug += '-' + Math.floor(Math.random() * 90 + 10);
  db.exec('BEGIN');
  try {
    const sid = insert('studios', { name, slug, plan, paid_until, ical_token: crypto.randomBytes(16).toString('hex') });
    ensureHours(sid);
    insert('users', { studio_id: sid, name: owner_name || name, email: owner_email.toLowerCase(),
      password_hash: bcrypt.hashSync(owner_password, 10), role: 'owner' });
    db.exec('COMMIT');
    res.json({ id: sid, slug });
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}));
sup.put('/studios/:id', wrap((req, res) => {
  const d = pick(req.body, ['name', 'slug', 'plan', 'active', 'paid_until']);
  if (d.slug) {
    d.slug = slugify(d.slug);
    if (one('SELECT id FROM studios WHERE slug=? AND id<>?', d.slug, req.params.id)) return bad(res, 'Ese link ya está en uso');
  }
  update('studios', req.params.id, d);
  res.json({ ok: true });
}));
sup.delete('/studios/:id', wrap((req, res) => {
  run('DELETE FROM studios WHERE id=?', req.params.id);
  res.json({ ok: true });
}));
sup.get('/users', wrap((_req, res) => res.json(all(`SELECT u.id,u.name,u.email,u.role,u.active,u.studio_id,s.name AS studio_name
  FROM users u LEFT JOIN studios s ON s.id=u.studio_id ORDER BY s.name, u.role`))));
sup.post('/users', wrap((req, res) => {
  const { studio_id, name, email, password, role = 'staff' } = req.body || {};
  if (!['owner', 'staff'].includes(role)) return bad(res, 'Rol no válido');
  if (!studio_id || !name || !email || !password) return bad(res, 'Faltan datos');
  if (one('SELECT id FROM users WHERE email=?', email.toLowerCase())) return bad(res, 'Ese correo ya existe');
  res.json({ id: insert('users', { studio_id, name, email: email.toLowerCase(), password_hash: bcrypt.hashSync(password, 10), role }) });
}));
sup.put('/users/:id', wrap((req, res) => {
  const d = pick(req.body, ['name', 'active', 'role']);
  if (d.role && !['owner', 'staff'].includes(d.role)) return bad(res, 'Rol no válido');
  if (req.body.password) d.password_hash = bcrypt.hashSync(req.body.password, 10);
  update('users', req.params.id, d, `AND role<>'superadmin'`);
  res.json({ ok: true });
}));
sup.delete('/users/:id', wrap((req, res) => {
  run(`DELETE FROM users WHERE id=? AND role<>'superadmin'`, req.params.id);
  res.json({ ok: true });
}));
app.use('/api/super', sup);
app.use('/api', api);

/* ---------------- Frontend ---------------- */
const dist = process.env.CLIENT_DIST || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api|uploads).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Algo salió mal. Intenta de nuevo.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✨ Brillo listo en http://localhost:${PORT}`));
