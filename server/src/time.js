// All times are stored as studio-local strings "YYYY-MM-DDTHH:mm" (México, America/Mexico_City).
export const TZ = process.env.TZ_STUDIOS || 'America/Mexico_City';

export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const fromMin = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function addMinutes(local, mins) {
  const [d, t] = local.split('T');
  const [y, mo, da] = d.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, da, 0, toMin(t) + mins));
  return dt.toISOString().slice(0, 16);
}

/** Current local time in the studio time zone as "YYYY-MM-DDTHH:mm". */
export function nowLocal() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`;
}

export const weekday = (date) => new Date(date + 'T12:00:00Z').getUTCDay();
