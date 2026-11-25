import { useEffect, useState } from 'react';
import { CalendarSync, Copy, RefreshCw, Palette, Store, Clock, KeyRound, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { DAYS, applyTheme } from '../../lib/utils';
import { Field, ImageInput, Toggle, useToast, PageLoader } from '../../components/ui.jsx';
import { PageHeader } from './Layout.jsx';

const PRESETS = [
  ['#e879f9', '#f472b6', 'Starlight'], ['#f9a8d4', '#fda4af', 'Coquette'], ['#c4b5fd', '#818cf8', 'Lavanda'],
  ['#fcd34d', '#fb923c', 'Gold'], ['#5eead4', '#a78bfa', 'Aurora'], ['#fca5a5', '#e11d48', 'Cereza'],
];

export default function Settings() {
  const toast = useToast();
  const { refresh } = useAuth();
  const [s, setS] = useState(null);
  const [hours, setHours] = useState([]);
  const [pw, setPw] = useState({ current: '', next: '' });

  const load = () => api('/studio').then((d) => { setS(d.studio); setHours(d.hours); });
  useEffect(() => { load(); }, []);
  if (!s) return <PageLoader />;

  const set = (k) => (e) => setS({ ...s, [k]: e?.target ? e.target.value : e });
  const icalUrl = `${window.location.origin}/api/ical/${s.ical_token}.ics`;
  const webcal = icalUrl.replace(/^https?:/, 'webcal:');

  const save = async () => {
    try {
      await api('/studio', { method: 'PUT', body: { ...s, slot_minutes: Number(s.slot_minutes), booking_notice_hours: Number(s.booking_notice_hours), hours } });
      applyTheme(s); await refresh(); toast('Cambios guardados ✨');
    } catch (err) { toast(err.message, 'error'); }
  };
  const changePw = async (e) => {
    e.preventDefault();
    try { await api('/me/password', { method: 'POST', body: pw }); setPw({ current: '', next: '' }); toast('Contraseña actualizada'); }
    catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Mi estudio" subtitle="Así se ve tu página pública"
        action={<div className="flex gap-2"><a href={`/${s.slug}`} target="_blank" rel="noreferrer" className="btn-ghost"><ExternalLink className="h-4 w-4" /> Ver</a><button onClick={save} className="btn-primary">Guardar cambios</button></div>} />

      <section className="card p-6">
        <h2 className="mb-5 flex items-center gap-2 font-display text-2xl"><Store className="h-5 w-5 text-brand" /> Información</h2>
        <div className="grid gap-5 md:grid-cols-[180px_1fr]">
          <div className="space-y-3">
            <span className="label">Logo</span><ImageInput value={s.logo} onChange={set('logo')} className="rounded-full" label="Logo" />
          </div>
          <div className="space-y-4">
            <span className="label">Portada</span><ImageInput value={s.cover} onChange={set('cover')} aspect="aspect-[21/9]" label="Foto de portada" />
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del estudio"><input className="input" value={s.name} onChange={set('name')} /></Field>
          <Field label="Frase"><input className="input" value={s.tagline} onChange={set('tagline')} /></Field>
          <Field label="Descripción" className="sm:col-span-2"><textarea rows={3} className="input" value={s.bio} onChange={set('bio')} /></Field>
          <Field label="WhatsApp"><input className="input" inputMode="tel" value={s.whatsapp} onChange={set('whatsapp')} placeholder="10 dígitos" /></Field>
          <Field label="Teléfono"><input className="input" inputMode="tel" value={s.phone} onChange={set('phone')} /></Field>
          <Field label="Instagram (usuario)"><input className="input" value={s.instagram} onChange={set('instagram')} placeholder="sin @" /></Field>
          <Field label="Facebook"><input className="input" value={s.facebook} onChange={set('facebook')} /></Field>
          <Field label="Dirección"><input className="input" value={s.address} onChange={set('address')} /></Field>
          <Field label="Link de Google Maps"><input className="input" value={s.maps_url} onChange={set('maps_url')} /></Field>
        </div>
        <label className="mt-4 flex items-center justify-between rounded-2xl bg-ink-850 px-4 py-3 text-sm">Ofrezco servicio a domicilio <Toggle checked={!!s.home_service} onChange={(v) => setS({ ...s, home_service: v ? 1 : 0 })} /></label>
      </section>

      <section className="card p-6">
        <h2 className="mb-5 flex items-center gap-2 font-display text-2xl"><Palette className="h-5 w-5 text-brand" /> Colores</h2>
        <div className="mb-5 flex flex-wrap gap-3">
          {PRESETS.map(([a, b, n]) => (
            <button key={n} onClick={() => { const ns = { ...s, color_primary: a, color_accent: b }; setS(ns); applyTheme(ns); }}
              className="flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm hover:border-white/30">
              <span className="h-5 w-5 rounded-full" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} />{n}
            </button>
          ))}
        </div>
        <div className="flex gap-6">
          <Field label="Principal"><input type="color" className="h-12 w-20 cursor-pointer rounded-xl bg-transparent" value={s.color_primary} onChange={(e) => { const ns = { ...s, color_primary: e.target.value }; setS(ns); applyTheme(ns); }} /></Field>
          <Field label="Acento"><input type="color" className="h-12 w-20 cursor-pointer rounded-xl bg-transparent" value={s.color_accent} onChange={(e) => { const ns = { ...s, color_accent: e.target.value }; setS(ns); applyTheme(ns); }} /></Field>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-1 flex items-center gap-2 font-display text-2xl"><Clock className="h-5 w-5 text-brand" /> Horario y citas</h2>
        <p className="mb-5 text-sm text-ink-400">Tu página solo ofrece horarios dentro de este horario. Las horas con cita (por confirmar o confirmada), tu hora de comida y lo que bloquees en la Agenda se ocultan solas.</p>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const h = hours.find((x) => x.weekday === d);
            if (!h) return null;
            const upd = (patch) => setHours(hours.map((x) => (x.weekday === d ? { ...x, ...patch } : x)));
            return (
              <div key={d} className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink-850 px-4 py-2.5">
                <Toggle checked={!!h.enabled} onChange={(v) => upd({ enabled: v ? 1 : 0 })} />
                <span className="w-24 text-sm font-semibold">{DAYS[d]}</span>
                {h.enabled ? (
                  <div className="flex items-center gap-2 text-sm">
                    <input type="time" className="input w-32 py-1.5" value={h.open} onChange={(e) => upd({ open: e.target.value })} />
                    <span className="text-ink-400">a</span>
                    <input type="time" className="input w-32 py-1.5" value={h.close} onChange={(e) => upd({ close: e.target.value })} />
                    {h.break_start !== undefined && (h.break_start || h.showBreak) ? (
                      <span className="flex items-center gap-2 text-ink-400">· comida
                        <input type="time" className="input w-28 py-1.5" value={h.break_start || ''} onChange={(e) => upd({ break_start: e.target.value })} />
                        <span>a</span>
                        <input type="time" className="input w-28 py-1.5" value={h.break_end || ''} onChange={(e) => upd({ break_end: e.target.value })} />
                        <button type="button" onClick={() => upd({ break_start: '', break_end: '', showBreak: false })} className="text-xs hover:text-rose-300">quitar</button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => upd({ showBreak: true, break_start: '14:00', break_end: '15:00' })} className="text-xs font-semibold text-brand">+ hora de comida</button>
                    )}
                  </div>
                ) : <span className="text-sm text-ink-400">Cerrado</span>}
              </div>
            );
          })}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Mostrar horarios cada">
            <select className="input" value={s.slot_minutes} onChange={set('slot_minutes')}>
              {[15, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutos</option>)}
            </select>
          </Field>
          <Field label="Anticipación mínima para agendar">
            <select className="input" value={s.booking_notice_hours} onChange={set('booking_notice_hours')}>
              {[0, 1, 2, 4, 12, 24, 48].map((m) => <option key={m} value={m}>{m === 0 ? 'Sin mínimo' : `${m} horas`}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="card relative overflow-hidden p-6">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/20 blur-3xl" />
        <h2 className="mb-2 flex items-center gap-2 font-display text-2xl"><CalendarSync className="h-5 w-5 text-brand" /> Conectar con mi calendario</h2>
        <p className="mb-4 text-sm text-ink-400">Suscríbete una sola vez y todas tus citas (con recordatorio 1 día y 1 hora antes) aparecen solas en Google Calendar o en el calendario del iPhone.</p>
        <div className="truncate rounded-2xl bg-ink-850 px-4 py-3 font-mono text-xs text-ink-300">{icalUrl}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => { navigator.clipboard?.writeText(icalUrl); toast('Link copiado'); }} className="btn-ghost"><Copy className="h-4 w-4" /> Copiar link</button>
          <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer" className="btn-ghost">Agregar a Google Calendar</a>
          <a href={webcal} className="btn-ghost">Agregar a iPhone</a>
          <button onClick={async () => { if (window.confirm('El link anterior dejará de funcionar. ¿Continuar?')) { await api('/studio/ical-reset', { method: 'POST' }); load(); toast('Link renovado'); } }} className="btn-ghost"><RefreshCw className="h-4 w-4" /> Renovar</button>
        </div>
        <p className="mt-3 text-xs text-ink-400">Google Calendar actualiza calendarios suscritos cada pocas horas; para verla al instante usa también el botón “A mi calendario” en cada cita.</p>
      </section>

      <section className="card p-6">
        <h2 className="mb-5 flex items-center gap-2 font-display text-2xl"><KeyRound className="h-5 w-5 text-brand" /> Mi contraseña</h2>
        <form onSubmit={changePw} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input type="password" className="input" placeholder="Actual" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          <input type="password" className="input" placeholder="Nueva (mín. 6)" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          <button className="btn-ghost">Cambiar</button>
        </form>
      </section>

      <div className="flex justify-end"><button onClick={save} className="btn-primary px-8 py-3">Guardar cambios</button></div>
    </div>
  );
}
