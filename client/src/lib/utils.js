import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

export const cx = (...a) => a.filter(Boolean).join(' ');

export function hexToRgb(hex = '#e879f9') {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export function applyTheme(studio) {
  const r = document.documentElement.style;
  r.setProperty('--brand', hexToRgb(studio?.color_primary || '#e879f9'));
  r.setProperty('--accent', hexToRgb(studio?.color_accent || '#f472b6'));
}

export const money = (v) =>
  v == null || v === '' ? 'Consultar' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

export const parseLocal = (s) => parse(s, "yyyy-MM-dd'T'HH:mm", new Date());
export const fmt = (s, f) => format(typeof s === 'string' ? parseLocal(s) : s, f, { locale: es });
export const ymd = (d) => format(d, 'yyyy-MM-dd');
export const hhmm = (s) => s.slice(11, 16);
export const time12 = (hm) => {
  const [h, m] = hm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};

export const duration = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

export const STATUS = {
  pending: { label: 'Por confirmar', cls: 'bg-amber-400/15 text-amber-300', dot: 'bg-amber-400' },
  confirmed: { label: 'Confirmada', cls: 'bg-sky-400/15 text-sky-300', dot: 'bg-sky-400' },
  done: { label: 'Completada', cls: 'bg-emerald-400/15 text-emerald-300', dot: 'bg-emerald-400' },
  cancelled: { label: 'Cancelada', cls: 'bg-zinc-400/15 text-zinc-400', dot: 'bg-zinc-500' },
  no_show: { label: 'No vino', cls: 'bg-rose-400/15 text-rose-300', dot: 'bg-rose-400' },
};

export const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const waLink = (phone, text) => {
  let p = String(phone || '').replace(/\D/g, '');
  if (p.length === 10) p = '52' + p;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
};

/** Google Calendar "add event" link for a local "YYYY-MM-DDTHH:mm" time in México. */
export function gcalLink({ title, start, end, details = '', location = '' }) {
  const f = (s) => s.replace(/[-:]/g, '') + '00';
  const p = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${f(start)}/${f(end)}`, details, location, ctz: 'America/Mexico_City' });
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function downloadIcs({ title, start, end, details = '', location = '' }) {
  const f = (s) => s.replace(/[-:]/g, '') + '00';
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Brillo//ES', 'BEGIN:VEVENT',
    `UID:${Date.now()}@brillo`, `DTSTART;TZID=America/Mexico_City:${f(start)}`, `DTEND;TZID=America/Mexico_City:${f(end)}`,
    `SUMMARY:${title}`, `DESCRIPTION:${details.replace(/\n/g, '\\n')}`, `LOCATION:${location}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Tu cita es mañana', 'TRIGGER:-PT24H', 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Tu cita es en 2 horas', 'TRIGGER:-PT2H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'mi-cita.ics';
  a.click();
}
