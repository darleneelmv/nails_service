import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || path.resolve('data');
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });

export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
export const db = new DatabaseSync(path.join(DATA_DIR, 'brillo.db'));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS studios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  facebook TEXT DEFAULT '',
  address TEXT DEFAULT '',
  maps_url TEXT DEFAULT '',
  logo TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  color_primary TEXT DEFAULT '#e879f9',
  color_accent TEXT DEFAULT '#f472b6',
  theme TEXT DEFAULT 'dark',
  slot_minutes INTEGER DEFAULT 30,
  booking_notice_hours INTEGER DEFAULT 2,
  home_service INTEGER DEFAULT 0,
  plan TEXT DEFAULT 'beta',
  active INTEGER DEFAULT 1,
  paid_until TEXT,
  ical_token TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  studio_id INTEGER REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin','owner','staff')),
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  studio_id INTEGER NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  price REAL,
  duration_min INTEGER DEFAULT 60,
  image TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  studio_id INTEGER NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  image TEXT NOT NULL,
  caption TEXT DEFAULT '',
  service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
  featured INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  studio_id INTEGER NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  birthday TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  studio_id INTEGER NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
  staff_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','done','cancelled','no_show')),
  price REAL,
  notes TEXT DEFAULT '',
  at_home INTEGER DEFAULT 0,
  source TEXT DEFAULT 'admin',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_appt_studio_start ON appointments(studio_id, start_at);

CREATE TABLE IF NOT EXISTS hours (
  studio_id INTEGER NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL,
  enabled INTEGER DEFAULT 1,
  open TEXT DEFAULT '10:00',
  close TEXT DEFAULT '19:00',
  PRIMARY KEY (studio_id, weekday)
);

CREATE TABLE IF NOT EXISTS blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  studio_id INTEGER NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  reason TEXT DEFAULT ''
);
`);

// Migrations for existing databases
for (const sql of ["ALTER TABLE hours ADD COLUMN break_start TEXT DEFAULT ''", "ALTER TABLE hours ADD COLUMN break_end TEXT DEFAULT ''"]) {
  try { db.exec(sql); } catch { /* column already exists */ }
}

export const one = (sql, ...p) => db.prepare(sql).get(...p);
export const all = (sql, ...p) => db.prepare(sql).all(...p);
export const run = (sql, ...p) => db.prepare(sql).run(...p);

/** Insert/update helper that only touches whitelisted columns. */
export function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}
export function insert(table, data) {
  const cols = Object.keys(data);
  const r = run(
    `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    ...cols.map((c) => data[c])
  );
  return Number(r.lastInsertRowid);
}
export function update(table, id, data, extraWhere = '', ...extra) {
  const cols = Object.keys(data);
  if (!cols.length) return;
  run(
    `UPDATE ${table} SET ${cols.map((c) => `${c}=?`).join(',')} WHERE id=? ${extraWhere}`,
    ...cols.map((c) => data[c]),
    id,
    ...extra
  );
}
