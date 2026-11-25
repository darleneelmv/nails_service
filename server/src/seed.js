import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { one, insert, run, UPLOAD_DIR } from './db.js';
import { nowLocal, addMinutes } from './time.js';

/** Generates soft "nail art" placeholder artwork so the demo never looks empty. */
function art(name, c1, c2, c3, variant) {
  const stars = Array.from({ length: 7 }, (_, i) => {
    const x = (i * 137 + variant * 53) % 560 + 20;
    const y = (i * 89 + variant * 71) % 560 + 20;
    const r = 6 + ((i + variant) % 4) * 4;
    return `<path transform="translate(${x} ${y})" d="M0 -${r} L${r * 0.3} -${r * 0.3} L${r} 0 L${r * 0.3} ${r * 0.3} L0 ${r} L-${r * 0.3} ${r * 0.3} L-${r} 0 L-${r * 0.3} -${r * 0.3}Z" fill="#fff" opacity=".75"/>`;
  }).join('');
  const nails = [0, 1, 2, 3, 4].map((i) => {
    const x = 120 + i * 92;
    const h = 210 + Math.sin(i + variant) * 40;
    return `<rect x="${x}" y="${300 - h / 2 + i * 6}" width="62" height="${h}" rx="31" fill="url(#n${variant})" stroke="#ffffff55" stroke-width="2"/>
      <ellipse cx="${x + 20}" cy="${300 - h / 2 + 40 + i * 6}" rx="8" ry="26" fill="#fff" opacity=".35"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
  <defs>
    <radialGradient id="bg${variant}" cx="30%" cy="20%" r="90%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>
    <linearGradient id="n${variant}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c3}"/><stop offset="1" stop-color="${c1}"/></linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg${variant})"/>${stars}${nails}</svg>`;
  const file = `${name}.svg`;
  fs.writeFileSync(path.join(UPLOAD_DIR, file), svg);
  return '/uploads/' + file;
}

export function seedIfEmpty() {
  if (one('SELECT id FROM users LIMIT 1')) return;

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@brillo.app').toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || 'brillo-admin-2026';
  insert('users', { name: 'Bernie', email: adminEmail, password_hash: bcrypt.hashSync(adminPass, 10), role: 'superadmin' });
  console.log(`👑 Superadmin: ${adminEmail} / ${adminPass}  (cámbialo con ADMIN_EMAIL / ADMIN_PASSWORD)`);

  if (process.env.SEED_DEMO === '0') return;

  // ---- Demo studio (Starlight Studio) ----
  const palette = [
    ['#f9a8d4', '#581c87', '#fdf2f8'], ['#1f1b2e', '#0b0a10', '#f472b6'], ['#c4b5fd', '#4c1d95', '#ede9fe'],
    ['#fbcfe8', '#831843', '#fce7f3'], ['#27272a', '#09090b', '#e879f9'], ['#f0abfc', '#3b0764', '#fae8ff'],
    ['#fda4af', '#4a044e', '#fff1f2'], ['#3f3f46', '#18181b', '#c084fc'], ['#e9d5ff', '#6b21a8', '#faf5ff'],
  ];
  const img = palette.map((p, i) => art(`demo-${i}`, ...p, i));

  const sid = insert('studios', {
    slug: 'starlight-studio', name: 'Starlight Studio',
    tagline: 'Uñas bonitas, para niñas bonitas 🪻',
    bio: 'Desde los diseños más pinky hasta lo más dark 🌸🖤. Soft gel, acrílicas, rubber y dipping en Puruándiro, Mich. También vamos a domicilio.',
    phone: '', whatsapp: '', instagram: 'starlight_studiojl', facebook: '',
    address: 'Puruándiro, Michoacán', maps_url: 'https://maps.app.goo.gl/m1iZk6NGvYbsZXR87',
    cover: img[1], color_primary: '#e879f9', color_accent: '#f472b6', theme: 'dark',
    home_service: 1, plan: 'beta', ical_token: crypto.randomBytes(16).toString('hex'),
  });
  for (let d = 0; d < 7; d++)
    insert('hours', { studio_id: sid, weekday: d, enabled: d === 0 ? 0 : 1, open: '10:00', close: d === 6 ? '16:00' : '19:00' });

  insert('users', { studio_id: sid, name: 'Starlight Studio', email: 'demo@starlight.studio',
    password_hash: bcrypt.hashSync('demo1234', 10), role: 'owner' });

  const services = [
    ['Soft Gel', 'Ideal si tienes alergia a los químicos del monómero o estás embarazada. Más duradero, cero olores.', 'Extensiones', 120, img[0]],
    ['Acrílicas', 'Extensiones en tip con aplicación bastante duradera. Del largo y forma que quieras.', 'Extensiones', 150, img[2]],
    ['Rubber', 'Sobre tu uña natural. Perfecto si quieres dejar crecer tu largo natural o tienes uñas delgadas.', 'Uña natural', 90, img[3]],
    ['Dipping', 'Sobre tu uña natural, ideal para uñas cortas o largas. Sistema súper resistente.', 'Uña natural', 90, img[5]],
    ['Retiro', 'Retiro seguro de producto sin dañar tu uña natural.', 'Extras', 30, img[8]],
  ];
  const svcIds = services.map(([name, description, category, duration_min, image], i) =>
    insert('services', { studio_id: sid, name, description, category, price: null, duration_min, image, sort: i }));

  const captions = ['Dark chrome con estrellitas ✨', 'Pinky french 🌸', 'Lila soñado 🪻', 'Baby boomer con brillos',
    'Gótico elegante 🖤', 'Aurora holográfica', 'Rosa coquette 🎀', 'Negro mate + plata', 'Lavanda glaseada'];
  captions.forEach((caption, i) =>
    insert('gallery', { studio_id: sid, image: img[i], caption, service_id: svcIds[i % 4], featured: i < 3 ? 1 : 0 }));

  // A few demo clients and appointments so the dashboard looks alive
  const names = ['Valeria Gómez', 'Fernanda Ruiz', 'Ximena López', 'Camila Torres', 'Andrea Medina', 'Regina Pérez'];
  const clientIds = names.map((name, i) => insert('clients', { studio_id: sid, name, phone: '43811100' + (10 + i) }));
  const today = nowLocal().slice(0, 10);
  const plan = [[-6, '11:00', 'done', 350], [-5, '12:30', 'done', 280], [-3, '16:00', 'done', 400], [-2, '10:00', 'done', 250],
    [-1, '13:00', 'done', 320], [0, '11:00', 'confirmed', null], [0, '15:00', 'pending', null], [1, '12:00', 'confirmed', null],
    [2, '17:00', 'pending', null]];
  plan.forEach(([dayOff, time, status, price], i) => {
    const start = addMinutes(`${today}T${time}`, dayOff * 1440);
    const sv = services[i % 4];
    insert('appointments', { studio_id: sid, client_id: clientIds[i % clientIds.length], service_id: svcIds[i % 4],
      start_at: start, end_at: addMinutes(start, sv[3]), status, price, source: i % 2 ? 'web' : 'admin' });
  });
  run('UPDATE clients SET notes=? WHERE id=?', 'Le gustan los diseños dark, forma almendra.', clientIds[0]);
  console.log('🌟 Demo: /starlight-studio  ·  dueña: demo@starlight.studio / demo1234');
}
