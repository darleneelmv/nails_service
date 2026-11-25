import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { addDays } from 'date-fns';
import {
  CalendarHeart, Clock, MapPin, MessageCircle, ChevronLeft, ChevronRight, X, Check, Sparkles,
  Home, CalendarPlus, Download, Phone,
} from 'lucide-react';
import { api } from '../lib/api';
import { Instagram, Facebook } from '../components/BrandIcons.jsx';
import { applyTheme, cx, money, duration, ymd, fmt, time12, DAYS, waLink, gcalLink, downloadIcs } from '../lib/utils';
import { Modal, PageLoader, Spinner, Stars, Toggle, Field } from '../components/ui.jsx';

const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } };

export default function PublicStudio() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [booking, setBooking] = useState(null); // service preselected or true
  const [lightbox, setLightbox] = useState(-1);

  useEffect(() => {
    api(`/public/${slug}`).then((d) => {
      setData(d);
      applyTheme(d.studio);
      document.title = `${d.studio.name} · Agenda tu cita`;
    }).catch((e) => setErr(e.message));
  }, [slug]);

  if (err) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-display text-4xl">Ups ✨</p><p className="text-ink-400">{err}</p>
      <Link to="/" className="btn-ghost">Ir al inicio</Link>
    </div>
  );
  if (!data) return <PageLoader />;

  const { studio, services, gallery, hours } = data;
  return (
    <div className="relative overflow-x-clip">
      <Nav studio={studio} onBook={() => setBooking(true)} />
      <Hero studio={studio} gallery={gallery} onBook={() => setBooking(true)} />
      <Marquee items={services.map((s) => s.name)} />
      <ServicesSection services={services} onBook={(s) => setBooking(s)} />
      {gallery.length > 0 && <GallerySection gallery={gallery} onOpen={setLightbox} />}
      <InfoSection studio={studio} hours={hours} />
      <CTA studio={studio} onBook={() => setBooking(true)} />
      <footer className="border-t border-white/5 py-8 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} {studio.name} · Agenda en línea con <Link to="/" className="font-semibold text-brand">Brillo</Link>
      </footer>

      {/* Floating mobile CTA */}
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ delay: 1 }} className="fixed inset-x-4 bottom-4 z-40 sm:hidden">
        <button onClick={() => setBooking(true)} className="btn-primary w-full py-4 text-base"><CalendarHeart className="h-5 w-5" /> Agendar cita</button>
      </motion.div>

      <Booking open={!!booking} initial={typeof booking === 'object' ? booking : null} studio={studio} services={services}
        onClose={() => setBooking(null)} />
      <Lightbox items={gallery} index={lightbox} setIndex={setLightbox} />
    </div>
  );
}

function Nav({ studio, onBook }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const f = () => setSolid(window.scrollY > 40);
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <header className={cx('fixed inset-x-0 top-0 z-40 transition-all duration-500', solid ? 'bg-ink-950/75 backdrop-blur-xl border-b border-white/5' : '')}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <a href="#" className="flex items-center gap-3">
          {studio.logo
            ? <img src={studio.logo} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-brand/40" />
            : <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand to-accent font-display text-lg font-bold text-ink-950">{studio.name[0]}</div>}
          <span className="font-display text-lg">{studio.name}</span>
        </a>
        <nav className="hidden items-center gap-7 text-sm text-ink-300 md:flex">
          <a href="#servicios" className="hover:text-white">Servicios</a>
          <a href="#trabajos" className="hover:text-white">Trabajos</a>
          <a href="#visitanos" className="hover:text-white">Visítanos</a>
        </nav>
        <button onClick={onBook} className="btn-primary hidden sm:inline-flex"><CalendarHeart className="h-4 w-4" /> Agendar</button>
      </div>
    </header>
  );
}

function Hero({ studio, gallery, onBook }) {
  const ref = useRef();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const yCards = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const featured = gallery.slice(0, 3);
  const words = studio.name.split(' ');

  return (
    <section ref={ref} className="grain relative flex min-h-[100svh] items-center overflow-hidden pt-24">
      <motion.div style={{ y }} className="absolute inset-0 -z-10">
        {studio.cover && <img src={studio.cover} alt="" className="h-full w-full scale-110 object-cover opacity-40 blur-2xl" />}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/40 via-ink-950/70 to-ink-950" />
        <div className="absolute -left-40 top-20 h-[30rem] w-[30rem] rounded-full bg-brand/25 blur-[120px]" />
        <div className="absolute -right-20 bottom-10 h-[26rem] w-[26rem] rounded-full bg-accent/20 blur-[120px]" />
      </motion.div>
      <Stars count={30} className="opacity-60" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-16 lg:grid-cols-[1.1fr_.9fr]">
        <motion.div style={{ opacity }} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.12 } } }}>
          <motion.span variants={fadeUp} className="chip mb-6 border border-brand/30 bg-brand/10 text-brand">
            <Sparkles className="h-3.5 w-3.5" /> Citas abiertas · {studio.address?.split(',')[0] || 'Agenda en línea'}
          </motion.span>
          <h1 className="font-display text-[3.4rem] leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
            {words.map((w, i) => (
              <motion.span key={i} variants={fadeUp} className={cx('mr-4 inline-block', i === words.length - 1 && 'italic text-gradient')}>{w}</motion.span>
            ))}
          </h1>
          <motion.p variants={fadeUp} className="mt-6 max-w-lg text-lg text-ink-300">{studio.tagline}</motion.p>
          {studio.bio && <motion.p variants={fadeUp} className="mt-3 max-w-lg text-sm leading-relaxed text-ink-400">{studio.bio}</motion.p>}
          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap gap-3">
            <button onClick={onBook} className="btn-primary px-7 py-4 text-base"><CalendarHeart className="h-5 w-5" /> Agendar mi cita</button>
            <a href="#trabajos" className="btn-ghost px-7 py-4 text-base">Ver trabajos</a>
          </motion.div>
        </motion.div>

        <motion.div style={{ y: yCards }} className="relative hidden h-[34rem] lg:block">
          {featured.map((g, i) => (
            <motion.div key={g.id}
              initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
              animate={{ opacity: 1, scale: 1, rotate: [-8, 6, -3][i] }}
              transition={{ delay: 0.4 + i * 0.15, type: 'spring', damping: 14 }}
              whileHover={{ scale: 1.06, rotate: 0, zIndex: 10 }}
              className={cx('absolute w-60 overflow-hidden rounded-[2rem] border border-white/10 bg-ink-900 p-2 shadow-2xl',
                ['left-0 top-10', 'right-0 top-0', 'left-24 bottom-0'][i])}>
              <div className="animate-float" style={{ animationDelay: `${i}s` }}>
                <img src={g.image} alt={g.caption} className="aspect-[4/5] w-full rounded-[1.5rem] object-cover" />
                <p className="px-2 py-2 text-xs text-ink-300">{g.caption}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
      <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-xs uppercase tracking-[.3em] text-ink-400 sm:block">desliza</motion.div>
    </section>
  );
}

function Marquee({ items }) {
  if (!items.length) return null;
  const row = [...items, ...items, ...items, ...items];
  return (
    <div className="relative -rotate-1 border-y border-white/5 bg-gradient-to-r from-brand/15 via-accent/10 to-brand/15 py-4">
      <motion.div className="flex w-max gap-10 whitespace-nowrap font-display text-2xl italic text-ink-100/90"
        animate={{ x: ['0%', '-50%'] }} transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}>
        {row.map((t, i) => <span key={i} className="flex items-center gap-10">{t}<span className="text-brand">✦</span></span>)}
      </motion.div>
    </div>
  );
}

function SectionTitle({ kicker, title, text }) {
  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} className="mb-12 max-w-2xl">
      <p className="mb-3 text-xs font-bold uppercase tracking-[.3em] text-brand">{kicker}</p>
      <h2 className="font-display text-4xl leading-tight sm:text-5xl">{title}</h2>
      {text && <p className="mt-3 text-ink-400">{text}</p>}
    </motion.div>
  );
}

function ServicesSection({ services, onBook }) {
  const cats = useMemo(() => ['Todos', ...new Set(services.map((s) => s.category).filter(Boolean))], [services]);
  const [cat, setCat] = useState('Todos');
  const list = services.filter((s) => cat === 'Todos' || s.category === cat);
  return (
    <section id="servicios" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
      <SectionTitle kicker="Servicios" title={<>Elige tu <em className="text-gradient">look</em></>} text="Toca cualquier servicio para apartar tu lugar." />
      {cats.length > 2 && (
        <div className="scrollbar-none -mx-5 mb-8 flex gap-2 overflow-x-auto px-5">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={cx('relative rounded-full px-4 py-2 text-sm font-semibold transition', cat === c ? 'text-ink-950' : 'text-ink-300 hover:text-white')}>
              {cat === c && <motion.span layoutId="cat" className="absolute inset-0 rounded-full bg-gradient-to-r from-brand to-accent" />}
              <span className="relative">{c}</span>
            </button>
          ))}
        </div>
      )}
      <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((s, i) => (
            <motion.button layout key={s.id} onClick={() => onBook(s)}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              viewport={{ once: true }} transition={{ delay: (i % 3) * 0.08 }}
              whileHover={{ y: -6 }}
              className="card group overflow-hidden text-left transition-colors hover:border-brand/40">
              <div className="relative aspect-[4/3] overflow-hidden bg-ink-850">
                {s.image
                  ? <img src={s.image} alt={s.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                  : <div className="grid h-full place-items-center text-5xl">💅</div>}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent" />
                <span className="chip absolute left-4 top-4 bg-black/50 text-white backdrop-blur"><Clock className="h-3 w-3" /> {duration(s.duration_min)}</span>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-2xl">{s.name}</h3>
                  <span className="shrink-0 font-semibold text-brand">{s.price != null ? `desde ${money(s.price)}` : money(null)}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-ink-400">{s.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand opacity-80 transition group-hover:gap-2 group-hover:opacity-100">
                  Agendar <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}

function GallerySection({ gallery, onOpen }) {
  return (
    <section id="trabajos" className="relative scroll-mt-20 py-24">
      <div className="absolute inset-x-0 top-1/3 -z-10 mx-auto h-96 max-w-3xl rounded-full bg-brand/10 blur-[140px]" />
      <div className="mx-auto max-w-6xl px-5">
        <SectionTitle kicker="Portafolio" title={<>Trabajos <em className="text-gradient">recientes</em></>} text="Inspírate y enséñanos cuál quieres 💖" />
        <div className="columns-2 gap-4 md:columns-3">
          {gallery.map((g, i) => (
            <motion.button key={g.id} onClick={() => onOpen(i)}
              initial={{ opacity: 0, y: 40, scale: 0.96 }} whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }} transition={{ delay: (i % 3) * 0.1, duration: 0.6 }}
              className="group relative mb-4 block w-full overflow-hidden rounded-3xl">
              <img src={g.image} alt={g.caption} loading="lazy"
                className={cx('w-full object-cover transition duration-700 group-hover:scale-110', i % 3 === 1 ? 'aspect-[3/4]' : 'aspect-square')} />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/0 p-4 opacity-0 transition group-hover:opacity-100">
                <div className="text-left">
                  <p className="text-sm font-semibold">{g.caption}</p>
                  {g.service_name && <p className="text-xs text-brand">{g.service_name}</p>}
                </div>
              </div>
              {g.featured ? <span className="chip absolute right-3 top-3 bg-black/50 text-white backdrop-blur">✦ Favorito</span> : null}
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Lightbox({ items, index, setIndex }) {
  const g = items[index];
  useEffect(() => {
    if (index < 0) return;
    const f = (e) => {
      if (e.key === 'Escape') setIndex(-1);
      if (e.key === 'ArrowRight') setIndex((index + 1) % items.length);
      if (e.key === 'ArrowLeft') setIndex((index - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [index, items.length, setIndex]);
  return (
    <AnimatePresence>
      {g && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIndex(-1)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-3"><X /></button>
          <button onClick={(e) => { e.stopPropagation(); setIndex((index - 1 + items.length) % items.length); }} className="absolute left-3 rounded-full bg-white/10 p-3"><ChevronLeft /></button>
          <motion.figure key={g.id} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="max-w-3xl">
            <img src={g.image} alt={g.caption} className="max-h-[78vh] rounded-3xl object-contain" />
            <figcaption className="mt-3 text-center text-sm text-ink-300">{g.caption}{g.service_name && <span className="text-brand"> · {g.service_name}</span>}</figcaption>
          </motion.figure>
          <button onClick={(e) => { e.stopPropagation(); setIndex((index + 1) % items.length); }} className="absolute right-3 rounded-full bg-white/10 p-3"><ChevronRight /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InfoSection({ studio, hours }) {
  const todayIdx = new Date().getDay();
  return (
    <section id="visitanos" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
      <SectionTitle kicker="Visítanos" title={<>Te <em className="text-gradient">esperamos</em></>} />
      <div className="grid gap-5 md:grid-cols-2">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="card p-7">
          <h3 className="mb-5 flex items-center gap-2 font-display text-2xl"><Clock className="h-5 w-5 text-brand" /> Horario</h3>
          <ul className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const h = hours.find((x) => x.weekday === d);
              return (
                <li key={d} className={cx('flex justify-between rounded-xl px-3 py-2 text-sm', d === todayIdx && 'bg-brand/10 text-white')}>
                  <span className={d === todayIdx ? 'font-semibold' : 'text-ink-300'}>{DAYS[d]}{d === todayIdx && ' · hoy'}</span>
                  <span className={h?.enabled ? '' : 'text-ink-400'}>{h?.enabled ? `${time12(h.open)} – ${time12(h.close)}` : 'Cerrado'}</span>
                </li>
              );
            })}
          </ul>
        </motion.div>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="card flex flex-col gap-3 p-7">
          <h3 className="mb-2 flex items-center gap-2 font-display text-2xl"><MapPin className="h-5 w-5 text-brand" /> Contacto</h3>
          {studio.address && <p className="text-ink-300">{studio.address}</p>}
          {studio.home_service ? <p className="flex items-center gap-2 text-sm text-ink-300"><Home className="h-4 w-4 text-brand" /> También vamos a domicilio (costo extra según zona)</p> : null}
          <div className="mt-auto grid gap-2 pt-4 sm:grid-cols-2">
            {studio.whatsapp && <a className="btn-ghost" href={waLink(studio.whatsapp, `Hola ${studio.name} ✨`)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
            {studio.phone && <a className="btn-ghost" href={`tel:${studio.phone}`}><Phone className="h-4 w-4" /> Llamar</a>}
            {studio.instagram && <a className="btn-ghost" href={`https://instagram.com/${studio.instagram.replace('@', '')}`} target="_blank" rel="noreferrer"><Instagram className="h-4 w-4" /> Instagram</a>}
            {studio.facebook && <a className="btn-ghost" href={studio.facebook.startsWith('http') ? studio.facebook : `https://facebook.com/${studio.facebook}`} target="_blank" rel="noreferrer"><Facebook className="h-4 w-4" /> Facebook</a>}
            {studio.maps_url && <a className="btn-ghost" href={studio.maps_url} target="_blank" rel="noreferrer"><MapPin className="h-4 w-4" /> Cómo llegar</a>}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CTA({ studio, onBook }) {
  return (
    <section className="px-5 pb-28">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
        className="grain relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-brand/30 via-ink-900 to-accent/25 px-8 py-16 text-center">
        <Stars count={18} />
        <h2 className="relative font-display text-4xl sm:text-6xl">¿Lista para <em className="text-gradient">brillar</em>?</h2>
        <p className="relative mx-auto mt-4 max-w-md text-ink-300">Aparta tu lugar en {studio.name} en menos de un minuto.</p>
        <button onClick={onBook} className="btn-primary relative mt-8 px-8 py-4 text-base"><CalendarHeart className="h-5 w-5" /> Agendar ahora</button>
      </motion.div>
    </section>
  );
}

/* ---------------- Booking flow ---------------- */
function Booking({ open, initial, studio, services, onClose }) {
  const [step, setStep] = useState(0);
  const [svc, setSvc] = useState(null);
  const [date, setDate] = useState(ymd(new Date()));
  const [slots, setSlots] = useState(null);
  const [time, setTime] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', notes: '', at_home: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!open) return;
    setSvc(initial); setStep(initial ? 1 : 0); setTime(''); setDone(null); setError('');
  }, [open, initial]);

  // Load which days have free spots, and jump to the first available one.
  const [avail, setAvail] = useState(null);
  useEffect(() => {
    if (!svc || !open) return;
    setAvail(null);
    api(`/public/${studio.slug}/availability?service_id=${svc.id}&days=30`).then((d) => {
      setAvail(d.days);
      const first = d.days.find((x) => x.free > 0);
      if (first) setDate(first.date);
    }).catch(() => setAvail([]));
  }, [svc, open, studio.slug]);

  useEffect(() => {
    if (!svc || step !== 1) return;
    setSlots(null); setTime('');
    let alive = true;
    api(`/public/${studio.slug}/slots?service_id=${svc.id}&date=${date}`)
      .then((d) => alive && setSlots(d.slots)).catch(() => alive && setSlots([]));
    return () => { alive = false; };
  }, [svc, date, step, studio.slug]);

  const fallbackDays = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ date: ymd(addDays(new Date(), i)), status: 'open' })), []);
  const days = avail || fallbackDays;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await api(`/public/${studio.slug}/book`, { method: 'POST', body: { service_id: svc.id, date, time, ...form, at_home: form.at_home ? 1 : 0 } });
      setDone(r); setStep(3);
    } catch (err) { setError(err.message); if (err.status === 409) setStep(1); }
    setBusy(false);
  };

  const titles = ['Elige tu servicio', 'Elige día y hora', 'Tus datos', '¡Cita apartada!'];
  const event = done && {
    title: `💅 ${done.service} en ${studio.name}`, start: done.start_at, end: done.end_at,
    details: `Tu cita en ${studio.name}. ${studio.whatsapp ? 'WhatsApp: ' + studio.whatsapp : ''}`, location: studio.address,
  };

  return (
    <Modal open={open} onClose={onClose} title={titles[step]}>
      {step < 3 && (
        <div className="mb-6 flex gap-1.5">
          {[0, 1, 2].map((i) => <div key={i} className={cx('h-1 flex-1 rounded-full transition-all', i <= step ? 'bg-gradient-to-r from-brand to-accent' : 'bg-white/10')} />)}
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
          {step === 0 && (
            <div className="space-y-2">
              {services.map((s) => (
                <button key={s.id} onClick={() => { setSvc(s); setStep(1); }}
                  className="flex w-full items-center gap-4 rounded-2xl border border-white/5 bg-ink-850 p-3 text-left transition hover:border-brand/50">
                  {s.image ? <img src={s.image} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-xl bg-ink-800 text-2xl">💅</div>}
                  <div className="flex-1"><p className="font-semibold">{s.name}</p><p className="text-xs text-ink-400">{duration(s.duration_min)} · {money(s.price)}</p></div>
                  <ChevronRight className="h-5 w-5 text-ink-400" />
                </button>
              ))}
            </div>
          )}

          {step === 1 && svc && (
            <div>
              <button onClick={() => setStep(0)} className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-brand/10 p-3 text-left text-sm">
                <Sparkles className="h-4 w-4 text-brand" /><span className="flex-1"><b>{svc.name}</b> · {duration(svc.duration_min)}</span><span className="text-xs text-brand">cambiar</span>
              </button>
              <div className="scrollbar-none -mx-6 flex gap-2 overflow-x-auto px-6 pb-2">
                {days.map((x) => {
                  const v = x.date; const on = v === date; const d = v + 'T00:00';
                  const off = x.status === 'closed' || x.status === 'full';
                  return (
                    <button key={v} disabled={off} onClick={() => setDate(v)}
                      title={x.status === 'closed' ? 'Cerrado' : x.status === 'full' ? 'Sin lugares' : `${x.free ?? ''} horarios libres`}
                      className={cx('relative flex w-16 shrink-0 flex-col items-center rounded-2xl border py-3 transition',
                        on ? 'border-transparent bg-gradient-to-b from-brand to-accent text-ink-950'
                          : off ? 'cursor-not-allowed border-white/5 bg-ink-900 text-ink-600'
                            : 'border-white/5 bg-ink-850 hover:border-white/20')}>
                      <span className="text-[10px] font-bold uppercase">{fmt(d, 'EEE')}</span>
                      <span className={cx('font-display text-2xl', off && 'line-through decoration-1')}>{fmt(d, 'd')}</span>
                      <span className="text-[10px] uppercase opacity-70">{x.status === 'closed' ? 'cerrado' : x.status === 'full' ? 'lleno' : fmt(d, 'MMM')}</span>
                      {!off && !on && <span className={cx('absolute -bottom-1 h-1.5 w-1.5 rounded-full', x.status === 'few' ? 'bg-amber-400' : 'bg-emerald-400')} />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-ink-400">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Disponible</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Últimos lugares</span>
                <span className="flex items-center gap-1.5"><span className="line-through">00</span> Lleno o cerrado</span>
              </div>
              <p className="mb-3 mt-4 text-sm font-semibold first-letter:uppercase text-ink-300">{fmt(date + 'T00:00', "EEEE d 'de' MMMM")}</p>
              {error && <p className="mb-3 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
              {slots == null ? <div className="py-8 text-center"><Spinner className="mx-auto" /></div>
                : slots.length === 0 ? <p className="rounded-2xl bg-ink-850 p-6 text-center text-sm text-ink-400">No hay horarios este día 🥲 prueba otro.</p>
                  : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {slots.map((t, i) => (
                        <motion.button key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                          onClick={() => setTime(t)}
                          className={cx('rounded-xl border py-2.5 text-sm font-semibold transition',
                            time === t ? 'border-brand bg-brand/20 text-white' : 'border-white/5 bg-ink-850 text-ink-300 hover:border-white/20')}>
                          {time12(t)}
                        </motion.button>
                      ))}
                    </div>
                  )}
              <button disabled={!time} onClick={() => setStep(2)} className="btn-primary mt-6 w-full py-3.5">Continuar</button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={submit} className="space-y-4">
              <div className="rounded-2xl bg-ink-850 p-4 text-sm">
                <p className="font-semibold">{svc.name}</p>
                <p className="first-letter:uppercase text-ink-400">{fmt(`${date}T${time}`, "EEEE d 'de' MMMM")} · {time12(time)}</p>
              </div>
              <Field label="Tu nombre"><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="¿Cómo te llamas?" /></Field>
              <Field label="WhatsApp"><input required inputMode="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10 dígitos" /></Field>
              <Field label="¿Algo que debamos saber? (opcional)"><textarea rows={2} className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Diseño, largo, forma, si traes foto de referencia…" /></Field>
              {studio.home_service ? (
                <label className="flex items-center justify-between rounded-2xl bg-ink-850 p-4 text-sm">
                  <span className="flex items-center gap-2"><Home className="h-4 w-4 text-brand" /> Lo quiero a domicilio <span className="text-xs text-ink-400">(costo extra)</span></span>
                  <Toggle checked={form.at_home} onChange={(v) => setForm({ ...form, at_home: v })} />
                </label>
              ) : null}
              {error && <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="btn-ghost">Atrás</button>
                <button disabled={busy} className="btn-primary flex-1 py-3.5">{busy ? <Spinner className="text-ink-950" /> : 'Confirmar cita'}</button>
              </div>
            </form>
          )}

          {step === 3 && done && (
            <div className="text-center">
              <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 10 }}
                className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-brand to-accent text-ink-950 shadow-[0_0_60px_-10px] shadow-brand">
                <Check className="h-10 w-10" strokeWidth={3} />
              </motion.div>
              <p className="text-ink-300">Te esperamos el</p>
              <p className="font-display text-2xl first-letter:uppercase">{fmt(done.start_at, "EEEE d 'de' MMMM")}</p>
              <p className="font-display text-xl text-brand">{time12(done.start_at.slice(11))}</p>
              <p className="mx-auto mt-3 max-w-xs text-sm text-ink-400">Tu cita quedó apartada. {studio.name} te confirmará por WhatsApp.</p>
              <div className="mt-6 grid gap-2">
                <a href={gcalLink(event)} target="_blank" rel="noreferrer" className="btn-primary py-3"><CalendarPlus className="h-4 w-4" /> Agregar a Google Calendar</a>
                <button onClick={() => downloadIcs(event)} className="btn-ghost py-3"><Download className="h-4 w-4" /> Guardar en iPhone / otro calendario</button>
                {studio.whatsapp && (
                  <a className="btn-ghost py-3" target="_blank" rel="noreferrer"
                    href={waLink(studio.whatsapp, `Hola! Acabo de agendar ${done.service} para el ${fmt(done.start_at, "EEEE d 'de' MMMM")} a las ${time12(done.start_at.slice(11))} a nombre de ${form.name} ✨`)}>
                    <MessageCircle className="h-4 w-4" /> Avisar por WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
}
