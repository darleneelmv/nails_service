import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { addDays } from 'date-fns';
import { Plus, Wallet, CalendarClock, Users, Hourglass, Copy, MessageCircle, Share2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { money, STATUS, time12, fmt, ymd, cx, waLink } from '../../lib/utils';
import { PageLoader, useToast, Empty } from '../../components/ui.jsx';
import AppointmentModal from '../../components/AppointmentModal.jsx';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function Counter({ value, format = (v) => v }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf; const t0 = performance.now();
    const tick = (t) => { const p = Math.min(1, (t - t0) / 900); setV(value * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(Math.round(v))}</>;
}

export default function Dashboard() {
  const { user, studio } = useAuth();
  const toast = useToast();
  const [s, setS] = useState(null);
  const [modal, setModal] = useState(null);
  const load = useCallback(() => api('/stats').then(setS), []);
  useEffect(() => { load(); }, [load]);
  if (!s) return <PageLoader />;

  const link = `${window.location.origin}/${studio.slug}`;
  const diff = s.prevMonth.v ? Math.round(((s.month.v - s.prevMonth.v) / s.prevMonth.v) * 100) : null;
  const days = Array.from({ length: 7 }, (_, i) => ymd(addDays(new Date(), i - 6)));
  const max = Math.max(1, ...s.last7.map((d) => d.total));

  const cards = [
    { icon: Wallet, label: 'Ingresos del mes', value: <Counter value={s.month.v} format={money} />, sub: diff == null ? `${s.month.n} servicios` : `${diff >= 0 ? '+' : ''}${diff}% vs mes pasado` },
    { icon: CalendarClock, label: 'Próximas citas', value: <Counter value={s.upcoming} />, sub: 'pendientes y confirmadas' },
    { icon: Hourglass, label: 'Por confirmar', value: <Counter value={s.pending} />, sub: 'reservadas en línea', hot: s.pending > 0 },
    { icon: Users, label: 'Clientas', value: <Counter value={s.clients} />, sub: `+${s.newClients} este mes` },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm first-letter:uppercase text-ink-400">{fmt(new Date(), "EEEE d 'de' MMMM")}</p>
          <h1 className="font-display text-4xl sm:text-5xl">{greeting()}, <em className="text-gradient">{user.name.split(' ')[0]}</em></h1>
        </div>
        <button onClick={() => setModal({ start_at: `${ymd(new Date())}T10:00` })} className="btn-primary"><Plus className="h-4 w-4" /> Nueva cita</button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={cx('card relative overflow-hidden p-5', c.hot && 'border-amber-400/30')}>
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand/10 blur-2xl" />
            <c.icon className={cx('mb-4 h-5 w-5', c.hot ? 'text-amber-300' : 'text-brand')} />
            <p className="font-display text-3xl">{c.value}</p>
            <p className="mt-1 text-xs font-semibold text-ink-300">{c.label}</p>
            <p className="text-[11px] text-ink-400">{c.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl">Hoy</h2>
            <Link to="/app/agenda" className="text-sm font-semibold text-brand">Ver agenda →</Link>
          </div>
          {s.today.length === 0 ? <Empty title="Día libre ✨" text="No tienes citas hoy. Comparte tu link para llenar la agenda." /> : (
            <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[3.2rem] before:top-2 before:w-px before:bg-white/10">
              {s.today.map((a, i) => (
                <motion.li key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                  <button onClick={() => setModal(a)} className="flex w-full items-center gap-4 rounded-2xl p-2 text-left transition hover:bg-white/[.03]">
                    <span className="w-12 text-right text-xs font-semibold text-ink-300">{time12(a.start_at.slice(11))}</span>
                    <span className={cx('relative z-10 h-3 w-3 shrink-0 rounded-full ring-4 ring-ink-900', STATUS[a.status].dot)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{a.client_name || 'Sin nombre'}</span>
                      <span className="block truncate text-xs text-ink-400">{a.service_name}</span>
                    </span>
                    <span className={cx('chip', STATUS[a.status].cls)}>{STATUS[a.status].label}</span>
                  </button>
                </motion.li>
              ))}
            </ol>
          )}
        </section>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-5 font-display text-2xl">Últimos 7 días</h2>
            <div className="flex h-36 items-end gap-2">
              {days.map((d, i) => {
                const row = s.last7.find((x) => x.day === d);
                const h = row ? Math.max(6, (row.total / max) * 100) : 4;
                return (
                  <div key={d} className="group flex h-full flex-1 flex-col items-center gap-2">
                    <span className="text-[10px] text-ink-400 opacity-0 transition group-hover:opacity-100">{row ? money(row.total) : ''}</span>
                    <div className="flex w-full flex-1 items-end"><motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.2 + i * 0.05, type: 'spring', damping: 15 }}
                      className={cx('w-full rounded-xl', row ? 'bg-gradient-to-t from-brand/40 to-accent' : 'bg-white/5')} /></div>
                    <span className="text-[10px] font-semibold uppercase text-ink-400">{fmt(d + 'T00:00', 'EEEEE')}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card relative overflow-hidden p-6">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
            <h2 className="mb-1 flex items-center gap-2 font-display text-2xl"><Share2 className="h-5 w-5 text-brand" /> Tu link</h2>
            <p className="mb-4 text-sm text-ink-400">Ponlo en tu bio de Instagram para recibir citas.</p>
            <div className="truncate rounded-2xl bg-ink-850 px-4 py-3 font-mono text-xs text-ink-300">{link}</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => { navigator.clipboard?.writeText(link); toast('Link copiado'); }} className="btn-ghost text-xs"><Copy className="h-4 w-4" /> Copiar</button>
              <a href={waLink('', `Agenda tu cita en ${studio.name} aquí 💅✨ ${link}`)} target="_blank" rel="noreferrer" className="btn-ghost text-xs"><MessageCircle className="h-4 w-4" /> Compartir</a>
            </div>
          </section>

          {s.topServices.length > 0 && (
            <section className="card p-6">
              <h2 className="mb-4 font-display text-2xl">Lo más pedido</h2>
              <ul className="space-y-3">
                {s.topServices.map((t) => (
                  <li key={t.name}>
                    <div className="mb-1 flex justify-between text-sm"><span>{t.name}</span><span className="text-ink-400">{t.n} · {money(t.total)}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(t.n / s.topServices[0].n) * 100}%` }} className="h-full rounded-full bg-gradient-to-r from-brand to-accent" />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
      <AppointmentModal open={!!modal} appt={modal} onClose={() => setModal(null)} onSaved={load} />
    </div>
  );
}
