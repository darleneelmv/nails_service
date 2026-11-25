import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImagePlus, Loader2, X, Sparkles } from 'lucide-react';
import { uploadImage } from '../lib/api';
import { cx } from '../lib/utils';

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, type = 'ok') => {
    const id = Math.random();
    setItems((x) => [...x, { id, msg, type }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={cx('pointer-events-auto rounded-2xl px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl border',
                t.type === 'error' ? 'bg-rose-950/90 border-rose-500/30 text-rose-100' : 'bg-ink-800/95 border-white/10 text-ink-100')}>
              {t.type !== 'error' && <Sparkles className="mr-2 inline h-4 w-4 text-brand" />}{t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------- Modal / sheet ---------- */
export function Modal({ open, onClose, title, children, wide }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className={cx('relative max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] border border-white/10 bg-ink-900 p-6 shadow-2xl sm:rounded-[2rem]',
              wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <h3 className="font-display text-2xl">{title}</h3>
              <button onClick={onClose} className="rounded-full p-2 text-ink-400 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const Field = ({ label, children, className }) => (
  <label className={cx('block', className)}><span className="label">{label}</span>{children}</label>
);

export function Spinner({ className }) {
  return <Loader2 className={cx('h-5 w-5 animate-spin text-brand', className)} />;
}

export function PageLoader() {
  return <div className="flex min-h-[50vh] items-center justify-center"><Spinner className="h-8 w-8" /></div>;
}

export function Empty({ icon: Icon = Sparkles, title, text, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand/10"><Icon className="h-6 w-6 text-brand" /></div>
      <p className="font-display text-xl">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-400">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------- Image upload ---------- */
export function ImageInput({ value, onChange, aspect = 'aspect-square', label = 'Subir foto', className }) {
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const pick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try { onChange(await uploadImage(f)); } catch (err) { toast(err.message, 'error'); }
    setBusy(false);
    e.target.value = '';
  };
  return (
    <button type="button" onClick={() => ref.current.click()}
      className={cx('group relative w-full overflow-hidden rounded-2xl border border-dashed border-white/15 bg-ink-850 transition hover:border-brand/50', aspect, className)}>
      {value && <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105" />}
      <div className={cx('absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs font-semibold text-ink-300 transition',
        value ? 'bg-black/50 opacity-0 group-hover:opacity-100' : '')}>
        {busy ? <Spinner /> : <ImagePlus className="h-6 w-6" />}
        {busy ? 'Subiendo…' : value ? 'Cambiar' : label}
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
    </button>
  );
}

/* ---------- Decorative twinkling stars ---------- */
export function Stars({ count = 24, className }) {
  const stars = useRef(Array.from({ length: count }, () => ({
    x: Math.random() * 100, y: Math.random() * 100, s: 4 + Math.random() * 10, d: Math.random() * 3,
  }))).current;
  return (
    <div className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      {stars.map((st, i) => (
        <svg key={i} viewBox="0 0 24 24" className="absolute animate-twinkle text-brand"
          style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, animationDelay: `${st.d}s` }}>
          <path fill="currentColor" d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" />
        </svg>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={cx('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-brand' : 'bg-ink-600')}>
      <motion.span layout className="absolute top-1 h-4 w-4 rounded-full bg-white shadow" style={{ left: checked ? 24 : 4 }} />
    </button>
  );
}
