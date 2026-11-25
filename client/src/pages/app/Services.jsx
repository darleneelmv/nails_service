import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, Trash2, EyeOff, Sparkles, ArrowUp, ArrowDown } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { money, duration, cx } from '../../lib/utils';
import { Modal, Field, ImageInput, Toggle, useToast, Empty, PageLoader } from '../../components/ui.jsx';
import { PageHeader } from './Layout.jsx';

export default function Services() {
  const { user } = useAuth();
  const toast = useToast();
  const canEdit = user.role !== 'staff';
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(null);
  const load = useCallback(() => api('/services').then(setList), []);
  useEffect(() => { load(); }, [load]);

  const move = async (i, dir) => {
    const arr = [...list];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setList(arr);
    await Promise.all(arr.map((s, k) => api(`/services/${s.id}`, { method: 'PUT', body: { sort: k } })));
    toast('Orden actualizado');
  };

  return (
    <div>
      <PageHeader title="Servicios" subtitle="Lo que tus clientas ven y pueden agendar"
        action={canEdit && <button onClick={() => setEdit({})} className="btn-primary"><Plus className="h-4 w-4" /> Agregar</button>} />
      {!list ? <PageLoader /> : list.length === 0 ? <Empty icon={Sparkles} title="Agrega tu primer servicio" action={canEdit && <button onClick={() => setEdit({})} className="btn-primary">Agregar servicio</button>} /> : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {list.map((s, i) => (
              <motion.div layout key={s.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className={cx('card group overflow-hidden', !s.active && 'opacity-50')}>
                <button disabled={!canEdit} onClick={() => setEdit(s)} className="block w-full text-left">
                  <div className="relative aspect-[16/10] bg-ink-850">
                    {s.image ? <img src={s.image} className="h-full w-full object-cover" alt="" /> : <div className="grid h-full place-items-center text-4xl">💅</div>}
                    {!s.active && <span className="chip absolute left-3 top-3 bg-black/60 text-white"><EyeOff className="h-3 w-3" /> Oculto</span>}
                    {s.category && <span className="chip absolute right-3 top-3 bg-black/50 text-white backdrop-blur">{s.category}</span>}
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between gap-2"><h3 className="font-display text-xl">{s.name}</h3><span className="font-semibold text-brand">{money(s.price)}</span></div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-ink-400"><Clock className="h-3 w-3" /> {duration(s.duration_min)}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-ink-400">{s.description}</p>
                  </div>
                </button>
                {canEdit && (
                  <div className="flex border-t border-white/5">
                    <button onClick={() => move(i, -1)} className="flex-1 py-2 text-ink-400 hover:bg-white/5 hover:text-white"><ArrowUp className="mx-auto h-4 w-4" /></button>
                    <button onClick={() => move(i, 1)} className="flex-1 border-l border-white/5 py-2 text-ink-400 hover:bg-white/5 hover:text-white"><ArrowDown className="mx-auto h-4 w-4" /></button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      <ServiceModal service={edit} onClose={() => setEdit(null)} onSaved={load} count={list?.length || 0} />
    </div>
  );
}

function ServiceModal({ service, onClose, onSaved, count }) {
  const toast = useToast();
  const [f, setF] = useState({});
  const editing = !!service?.id;
  useEffect(() => {
    if (service) setF({ name: '', description: '', category: '', price: '', duration_min: 60, image: '', active: 1, ...service, price: service.price ?? '' });
  }, [service]);
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });
  const save = async (e) => {
    e.preventDefault();
    const body = { ...f, price: f.price === '' ? null : Number(f.price), duration_min: Number(f.duration_min) || 60, active: f.active ? 1 : 0 };
    delete body.id; delete body.studio_id;
    try {
      if (editing) await api(`/services/${service.id}`, { method: 'PUT', body });
      else await api('/services', { method: 'POST', body: { ...body, sort: count } });
      toast('Servicio guardado ✨'); onSaved(); onClose();
    } catch (err) { toast(err.message, 'error'); }
  };
  const remove = async () => {
    if (!window.confirm(`¿Eliminar "${f.name}"? Si solo quieres esconderlo, apágalo.`)) return;
    await api(`/services/${service.id}`, { method: 'DELETE' }); toast('Servicio eliminado'); onSaved(); onClose();
  };
  return (
    <Modal open={!!service} onClose={onClose} title={editing ? 'Editar servicio' : 'Nuevo servicio'}>
      <form onSubmit={save} className="space-y-4">
        <ImageInput value={f.image} onChange={set('image')} aspect="aspect-[16/9]" label="Foto del servicio" />
        <Field label="Nombre"><input required className="input" value={f.name || ''} onChange={set('name')} placeholder="Ej. Acrílicas" /></Field>
        <Field label="Descripción"><textarea rows={3} className="input" value={f.description || ''} onChange={set('description')} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Precio"><input type="number" min="0" className="input" value={f.price} onChange={set('price')} placeholder="Consultar" /></Field>
          <Field label="Minutos"><input type="number" min="15" step="15" className="input" value={f.duration_min || ''} onChange={set('duration_min')} /></Field>
          <Field label="Categoría"><input className="input" value={f.category || ''} onChange={set('category')} placeholder="Opcional" /></Field>
        </div>
        <label className="flex items-center justify-between rounded-2xl bg-ink-850 px-4 py-3 text-sm">Visible en mi página <Toggle checked={!!f.active} onChange={(v) => setF({ ...f, active: v ? 1 : 0 })} /></label>
        <div className="flex gap-2">
          {editing && <button type="button" onClick={remove} className="btn-danger"><Trash2 className="h-4 w-4" /></button>}
          <button className="btn-primary flex-1 py-3">Guardar</button>
        </div>
      </form>
    </Modal>
  );
}
