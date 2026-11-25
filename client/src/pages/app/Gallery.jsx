import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, Star, Trash2, Images } from 'lucide-react';
import { api, uploadImage } from '../../lib/api';
import { cx } from '../../lib/utils';
import { Modal, Field, Toggle, useToast, Empty, PageLoader, Spinner } from '../../components/ui.jsx';
import { PageHeader } from './Layout.jsx';

export default function Gallery() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [services, setServices] = useState([]);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(0);
  const input = useRef();
  const load = useCallback(() => api('/gallery').then(setList), []);
  useEffect(() => { load(); api('/services').then(setServices); }, [load]);

  const onFiles = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    setBusy(files.length);
    for (const file of files) {
      try {
        const image = await uploadImage(file);
        await api('/gallery', { method: 'POST', body: { image, caption: '' } });
      } catch (err) { toast(err.message, 'error'); }
      setBusy((b) => b - 1);
    }
    toast(`${files.length} ${files.length === 1 ? 'foto subida' : 'fotos subidas'} ✨`);
    load();
  };

  return (
    <div>
      <PageHeader title="Galería" subtitle="Tus trabajos recientes aparecen en tu página"
        action={<button onClick={() => input.current.click()} className="btn-primary">{busy ? <Spinner className="text-ink-950" /> : <ImagePlus className="h-4 w-4" />} {busy ? `Subiendo ${busy}…` : 'Subir fotos'}</button>} />
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      {!list ? <PageLoader /> : list.length === 0 ? <Empty icon={Images} title="Presume tu trabajo" text="Sube fotos de tus diseños: se verán en tu página como portafolio." action={<button onClick={() => input.current.click()} className="btn-primary">Subir fotos</button>} /> : (
        <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence>
            {list.map((g) => (
              <motion.button layout key={g.id} onClick={() => setEdit(g)} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="group relative aspect-square overflow-hidden rounded-3xl">
                <img src={g.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition group-hover:opacity-100" />
                {g.featured ? <Star className="absolute right-3 top-3 h-5 w-5 fill-amber-300 text-amber-300 drop-shadow" /> : null}
                {g.caption && <p className="absolute inset-x-3 bottom-3 truncate text-left text-xs font-semibold opacity-0 transition group-hover:opacity-100">{g.caption}</p>}
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      <EditPhoto photo={edit} services={services} onClose={() => setEdit(null)} onSaved={load} />
    </div>
  );
}

function EditPhoto({ photo, services, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({});
  useEffect(() => { if (photo) setF(photo); }, [photo]);
  const save = async (e) => {
    e.preventDefault();
    await api(`/gallery/${photo.id}`, { method: 'PUT', body: { caption: f.caption, service_id: f.service_id || null, featured: f.featured ? 1 : 0 } });
    toast('Guardado'); onSaved(); onClose();
  };
  const remove = async () => {
    if (!window.confirm('¿Quitar esta foto?')) return;
    await api(`/gallery/${photo.id}`, { method: 'DELETE' }); toast('Foto eliminada'); onSaved(); onClose();
  };
  return (
    <Modal open={!!photo} onClose={onClose} title="Foto">
      {photo && <img src={photo.image} alt="" className="mb-5 max-h-72 w-full rounded-2xl object-cover" />}
      <form onSubmit={save} className="space-y-4">
        <Field label="Descripción"><input className="input" value={f.caption || ''} onChange={(e) => setF({ ...f, caption: e.target.value })} placeholder="Ej. Chrome rosa con estrellitas" /></Field>
        <Field label="Servicio">
          <select className="input" value={f.service_id || ''} onChange={(e) => setF({ ...f, service_id: e.target.value })}>
            <option value="">— Ninguno —</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <label className={cx('flex items-center justify-between rounded-2xl bg-ink-850 px-4 py-3 text-sm')}>
          <span className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-300" /> Destacada (sale en la portada)</span>
          <Toggle checked={!!f.featured} onChange={(v) => setF({ ...f, featured: v })} />
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={remove} className="btn-danger"><Trash2 className="h-4 w-4" /></button>
          <button className="btn-primary flex-1 py-3">Guardar</button>
        </div>
      </form>
    </Modal>
  );
}
