import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addDays, startOfWeek, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Ban, Trash2, Home } from 'lucide-react';
import { api } from '../../lib/api';
import { STATUS, cx, fmt, ymd, time12, parseLocal } from '../../lib/utils';
import { Modal, Field, useToast } from '../../components/ui.jsx';
import AppointmentModal from '../../components/AppointmentModal.jsx';
import { PageHeader } from './Layout.jsx';

const START_H = 8;
const END_H = 21;
const PX = 64; // px per hour

export default function Agenda() {
  const toast = useToast();
  const [day, setDay] = useState(new Date());
  const [appts, setAppts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [modal, setModal] = useState(null);
  const [blockModal, setBlockModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const weekStart = useMemo(() => startOfWeek(day, { weekStartsOn: 1 }), [day]);
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const load = useCallback(() => {
    const from = ymd(weekStart);
    const to = ymd(addDays(weekStart, 7));
    api(`/appointments?from=${from}&to=${to}`).then(setAppts);
    api('/blocks').then(setBlocks);
  }, [weekStart]);
  useEffect(() => { load(); }, [load]);

  const dayAppts = appts.filter((a) => a.start_at.startsWith(ymd(day)) && (filter === 'all' || a.status === filter));
  const dayBlocks = blocks.filter((b) => b.start_at.slice(0, 10) <= ymd(day) && b.end_at.slice(0, 10) >= ymd(day));
  const pos = (s) => { const d = parseLocal(s); return (d.getHours() + d.getMinutes() / 60 - START_H) * PX; };

  const now = new Date();
  const nowTop = (now.getHours() + now.getMinutes() / 60 - START_H) * PX;

  return (
    <div>
      <PageHeader title="Agenda" subtitle="Toca un espacio vacío para agendar"
        action={<div className="flex gap-2">
          <button onClick={() => setBlockModal(true)} className="btn-ghost"><Ban className="h-4 w-4" /> Bloquear</button>
          <button onClick={() => setModal({ start_at: `${ymd(day)}T10:00` })} className="btn-primary"><Plus className="h-4 w-4" /> Cita</button>
        </div>} />

      <div className="card mb-5 p-4">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setDay(addDays(day, -7))} className="rounded-full p-2 hover:bg-white/5"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={() => setDay(new Date())} className="font-display text-xl first-letter:uppercase">{fmt(weekStart, 'MMMM yyyy')}</button>
          <button onClick={() => setDay(addDays(day, 7))} className="rounded-full p-2 hover:bg-white/5"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((d) => {
            const on = isSameDay(d, day);
            const count = appts.filter((a) => a.start_at.startsWith(ymd(d)) && a.status !== 'cancelled').length;
            return (
              <button key={d.toISOString()} onClick={() => setDay(d)}
                className={cx('relative flex flex-col items-center rounded-2xl py-2.5 transition', on ? 'text-ink-950' : 'hover:bg-white/5')}>
                {on && <motion.span layoutId="daypick" className="absolute inset-0 rounded-2xl bg-gradient-to-b from-brand to-accent" />}
                <span className="relative text-[10px] font-bold uppercase opacity-80">{fmt(d, 'EEE')}</span>
                <span className={cx('relative font-display text-2xl', isSameDay(d, now) && !on && 'text-brand')}>{fmt(d, 'd')}</span>
                <span className="relative mt-0.5 flex h-1.5 gap-0.5">
                  {Array.from({ length: Math.min(count, 4) }).map((_, i) => <span key={i} className={cx('h-1.5 w-1.5 rounded-full', on ? 'bg-ink-950/60' : 'bg-brand')} />)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto">
        {[['all', 'Todas'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={cx('chip shrink-0 px-3 py-1.5', filter === k ? 'bg-white text-ink-950' : 'bg-white/5 text-ink-300')}>{l}</button>
        ))}
      </div>

      <div className="card relative overflow-hidden">
        <p className="border-b border-white/5 px-5 py-4 font-display text-xl first-letter:uppercase">{fmt(day, "EEEE d 'de' MMMM")}
          <span className="ml-2 text-sm text-ink-400">· {dayAppts.length} {dayAppts.length === 1 ? 'cita' : 'citas'}</span></p>
        <div className="relative" style={{ height: (END_H - START_H) * PX }}>
          {Array.from({ length: END_H - START_H }).map((_, i) => (
            <button key={i} onClick={() => setModal({ start_at: `${ymd(day)}T${String(START_H + i).padStart(2, '0')}:00` })}
              className="absolute inset-x-0 flex border-t border-white/[.04] text-left hover:bg-white/[.02]" style={{ top: i * PX, height: PX }}>
              <span className="w-16 -translate-y-2 pl-4 text-[11px] text-ink-400">{time12(`${START_H + i}:00`)}</span>
            </button>
          ))}
          {isSameDay(day, now) && nowTop > 0 && nowTop < (END_H - START_H) * PX && (
            <div className="pointer-events-none absolute left-14 right-0 z-20 flex items-center" style={{ top: nowTop }}>
              <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_12px] shadow-accent" /><span className="h-px flex-1 bg-accent/70" />
            </div>
          )}
          {dayBlocks.map((b) => {
            const top = b.start_at.slice(0, 10) < ymd(day) ? 0 : Math.max(0, pos(b.start_at));
            const bottom = b.end_at.slice(0, 10) > ymd(day) ? (END_H - START_H) * PX : pos(b.end_at);
            return (
              <div key={b.id} className="pointer-events-none absolute left-16 right-3 z-0 rounded-xl border border-dashed border-white/10 bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(255,255,255,.03)_8px,rgba(255,255,255,.03)_16px)] px-3 py-1 text-[11px] text-ink-400"
                style={{ top, height: Math.max(20, bottom - top) }}>🚫 {b.reason || 'Bloqueado'}</div>
            );
          })}
          <AnimatePresence>
            {dayAppts.map((a, i) => {
              const top = pos(a.start_at);
              const h = Math.max(34, pos(a.end_at) - top - 4);
              return (
                <motion.button key={a.id} onClick={() => setModal(a)}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }}
                  className={cx('absolute left-16 right-3 z-10 overflow-hidden rounded-2xl border-l-4 px-3 py-2 text-left shadow-lg backdrop-blur transition hover:brightness-110',
                    a.status === 'cancelled' ? 'border-zinc-500 bg-zinc-800/60 opacity-60' : 'border-brand bg-gradient-to-r from-brand/25 to-accent/10')}
                  style={{ top: top + 2, height: h }}>
                  <div className="flex items-center gap-2">
                    <span className={cx('h-2 w-2 rounded-full', STATUS[a.status].dot)} />
                    <span className="truncate text-sm font-semibold">{a.client_name || 'Sin nombre'}</span>
                    {a.at_home ? <Home className="h-3.5 w-3.5 text-brand" /> : null}
                    {a.source === 'web' && <span className="chip bg-white/10 py-0 text-[9px] text-ink-300">web</span>}
                  </div>
                  <p className="truncate text-xs text-ink-300">{time12(a.start_at.slice(11))} – {time12(a.end_at.slice(11))} · {a.service_name}</p>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {blocks.length > 0 && (
        <div className="card mt-5 p-5">
          <h3 className="mb-3 font-display text-xl">Horarios bloqueados</h3>
          <ul className="space-y-2">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-xl bg-ink-850 px-4 py-2 text-sm">
                <span>{b.reason || 'Bloqueado'} · <span className="text-ink-400">{fmt(b.start_at, "d MMM HH:mm")} → {fmt(b.end_at, "d MMM HH:mm")}</span></span>
                <button onClick={async () => { await api(`/blocks/${b.id}`, { method: 'DELETE' }); toast('Desbloqueado'); load(); }} className="text-ink-400 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AppointmentModal open={!!modal} appt={modal} onClose={() => setModal(null)} onSaved={load} />
      <BlockModal open={blockModal} day={ymd(day)} onClose={() => setBlockModal(false)} onSaved={load} />
    </div>
  );
}

function BlockModal({ open, day, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({});
  useEffect(() => { if (open) setF({ from: day, fromT: '00:00', to: day, toT: '23:59', reason: 'Día libre' }); }, [open, day]);
  const save = async (e) => {
    e.preventDefault();
    try {
      await api('/blocks', { method: 'POST', body: { start_at: `${f.from}T${f.fromT}`, end_at: `${f.to}T${f.toT}`, reason: f.reason } });
      toast('Horario bloqueado'); onSaved(); onClose();
    } catch (err) { toast(err.message, 'error'); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Bloquear horario">
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-ink-400">Nadie podrá agendar en línea en este rango (vacaciones, comida, curso…).</p>
        <Field label="Motivo"><input className="input" value={f.reason || ''} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Desde"><input type="date" className="input" value={f.from || ''} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
          <Field label="Hora"><input type="time" className="input" value={f.fromT || ''} onChange={(e) => setF({ ...f, fromT: e.target.value })} /></Field>
          <Field label="Hasta"><input type="date" className="input" value={f.to || ''} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
          <Field label="Hora"><input type="time" className="input" value={f.toT || ''} onChange={(e) => setF({ ...f, toT: e.target.value })} /></Field>
        </div>
        <button className="btn-primary w-full py-3">Bloquear</button>
      </form>
    </Modal>
  );
}
