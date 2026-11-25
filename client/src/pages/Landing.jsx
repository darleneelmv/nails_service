import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarHeart, Users, Image, BellRing, Smartphone, ShieldCheck, Check, ArrowRight, MessageCircle } from 'lucide-react';
import { Stars } from '../components/ui.jsx';
import { BRAND, PLANS, SALES_WHATSAPP, DEMO_SLUG } from '../config';
import { money, waLink, cx } from '../lib/utils';

const features = [
  { icon: CalendarHeart, t: 'Citas en línea 24/7', d: 'Tus clientas eligen servicio, día y hora libre. Sin mensajes de ida y vuelta.' },
  { icon: BellRing, t: 'Directo a tu calendario', d: 'Cada cita aparece en tu Google Calendar o iPhone con recordatorio.' },
  { icon: Image, t: 'Tu portafolio vivo', d: 'Sube tus trabajos recientes y comparte un solo link en tu bio.' },
  { icon: Users, t: 'Clientas organizadas', d: 'Historial, notas, cuánto ha gastado cada una y cuándo vino.' },
  { icon: Smartphone, t: 'Hecha para el celular', d: 'Administra todo desde tu teléfono, se siente como app.' },
  { icon: ShieldCheck, t: 'Tu equipo, tus permisos', d: 'Da acceso a tus manicuristas sin que vean tus ajustes.' },
];

export default function Landing() {
  const contact = SALES_WHATSAPP ? waLink(SALES_WHATSAPP, `Hola! Me interesa ${BRAND} para mi estudio ✨`) : '/login';
  return (
    <div className="overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="font-display text-2xl">{BRAND}<span className="text-brand">✦</span></span>
        <Link to="/login" className="btn-ghost">Entrar</Link>
      </header>

      <section className="grain relative mx-auto max-w-6xl px-5 pb-24 pt-16 text-center">
        <div className="absolute left-1/2 top-0 -z-10 h-[28rem] w-[40rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[140px]" />
        <Stars count={26} className="opacity-60" />
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="chip mx-auto mb-6 border border-brand/30 bg-brand/10 text-brand">
          Para estudios de uñas, pestañas, cejas y belleza
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mx-auto max-w-4xl font-display text-5xl leading-[1] sm:text-7xl">
          La agenda que hace <em className="text-gradient">brillar</em> tu estudio
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mx-auto mt-6 max-w-xl text-lg text-ink-300">
          Página web con tus trabajos, citas en línea, clientas y ganancias. Todo en un link para tu Instagram.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-9 flex flex-wrap justify-center gap-3">
          <Link to={`/${DEMO_SLUG}`} className="btn-primary px-7 py-4 text-base">Ver demo en vivo <ArrowRight className="h-4 w-4" /></Link>
          <a href={contact} target={SALES_WHATSAPP ? '_blank' : undefined} rel="noreferrer" className="btn-ghost px-7 py-4 text-base"><MessageCircle className="h-4 w-4" /> Quiero la mía</a>
        </motion.div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div key={f.t} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.08 }}
            whileHover={{ y: -4 }} className="card p-6">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand/25 to-accent/10"><f.icon className="h-5 w-5 text-brand" /></div>
            <h3 className="font-display text-xl">{f.t}</h3>
            <p className="mt-1.5 text-sm text-ink-400">{f.d}</p>
          </motion.div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-28">
        <h2 className="mb-10 text-center font-display text-4xl sm:text-5xl">Planes <em className="text-gradient">simples</em></h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={cx('card relative p-7', p.highlight && 'border-brand/50 shadow-[0_0_80px_-30px] shadow-brand')}>
              {p.highlight && <span className="chip absolute -top-3 left-7 bg-gradient-to-r from-brand to-accent text-ink-950">Más popular</span>}
              <p className="font-semibold text-ink-300">{p.name}</p>
              <p className="mt-2 font-display text-4xl">{money(p.price)}<span className="text-base text-ink-400">{p.period}</span></p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand" />{f}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-ink-400">Primer mes gratis para probar ✨</p>
      </section>
      <footer className="border-t border-white/5 py-8 text-center text-xs text-ink-400">© {new Date().getFullYear()} {BRAND}</footer>
    </div>
  );
}
