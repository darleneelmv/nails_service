import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, MessageCircle, Phone, Trash2, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { money, fmt, STATUS, cx, waLink } from '../../lib/utils';
import { Modal, Field, useToast, Empty, PageLoader } from '../../components/ui.jsx';
import { PageHeader } from './Layout.jsx';

export default function Clients() {
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const load = useCallback(() => api(`/clients?q=${encodeURIComponent(q)}`).then(setList), [q]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  return (
    <div>
      <PageHeader title="Clientas" subtitle={list ? `${list.length} en total` : ''}
        action={<button onClick={() => setOpen({})} className="btn-primary"><Plus className="h-4 w-4" /> Nueva</button>} />
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input className="input pl-11" placeholder="Buscar por nombre o teléfono…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!list ? <PageLoader /> : list.length === 0 ? <Empty icon={Users} title="Sin clientas aún" text="Se agregan solas cuando alguien agenda desde tu página." /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((c, i) => (
            <motion.button key={c.id} onClick={() => setOpen(c)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}
              className="card flex items-center gap-4 p-4 text-left transition hover:border-brand/30">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand/30 to-accent/10 font-display text-lg">
                {c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="truncate text-xs text-ink-400">{c.phone || 'Sin teléfono'}{c.last_visit ? ` · última: ${fmt(c.last_visit, 'd MMM')}` : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-brand">{money(c.spent)}</p>
                <p className="text-[11px] text-ink-400">{c.visits} {c.visits === 1 ? 'visita' : 'visitas'}</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}
      <ClientModal client={open} onClose={() => setOpen(null)} onSaved={load} />
    </div>
  );
}

function ClientModal({ client, onClose, onSaved }) {
  const toast = useToast();
  const { user } = useAuth();
  const [f, setF] = useState({});
  const [history, setHistory] = useState([]);
  const editing = !!client?.id;
  useEffect(() => {
    if (!client) return;
    setF({ name: '', phone: '', email: '', birthday: '', notes: '', ...client });
    setHistory([]);
    if (client.id) api(`/clients/${client.id}`).then((c) => setHistory(c.history));
  }, [client]);
  const save = async (e) => {
    e.preventDefault();
    try {
      const body = { name: f.name, phone: f.phone, email: f.email, birthday: f.birthday, notes: f.notes };
      if (editing) await api(`/clients/${client.id}`, { method: 'PUT', body });
      else await api('/clients', { method: 'POST', body });
      toast('Clienta guardada'); onSaved(); onClose();
    } catch (err) { toast(err.message, 'error'); }
  };
  const remove = async () => {
    if (!window.confirm('¿Eliminar clienta? Sus citas quedan sin nombre.')) return;
    await api(`/clients/${client.id}`, { method: 'DELETE' }); toast('Eliminada'); onSaved(); onClose();
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open={!!client} onClose={onClose} title={editing ? f.name : 'Nueva clienta'}>
      {editing && f.phone && (
        <div className="mb-5 grid grid-cols-2 gap-2">
          <a href={waLink(f.phone, `Hola ${f.name?.split(' ')[0]} ✨`)} target="_blank" rel="noreferrer" className="btn-ghost"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
          <a href={`tel:${f.phone}`} className="btn-ghost"><Phone className="h-4 w-4" /> Llamar</a>
        </div>
      )}
      <form onSubmit={save} className="space-y-4">
        <Field label="Nombre"><input required className="input" value={f.name || ''} onChange={set('name')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="WhatsApp"><input className="input" inputMode="tel" value={f.phone || ''} onChange={set('phone')} /></Field>
          <Field label="Cumpleaños"><input type="date" className="input" value={f.birthday || ''} onChange={set('birthday')} /></Field>
        </div>
        <Field label="Correo"><input type="email" className="input" value={f.email || ''} onChange={set('email')} /></Field>
        <Field label="Notas (alergias, forma favorita, etc.)"><textarea rows={3} className="input" value={f.notes || ''} onChange={set('notes')} /></Field>
        <div className="flex gap-2">
          {editing && user.role !== 'staff' && <button type="button" onClick={remove} className="btn-danger"><Trash2 className="h-4 w-4" /></button>}
          <button className="btn-primary flex-1 py-3">Guardar</button>
        </div>
      </form>
      {history.length > 0 && (
        <div className="mt-6">
          <p className="label">Historial</p>
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between rounded-xl bg-ink-850 px-4 py-2.5 text-sm">
                <span><span className="capitalize">{fmt(h.start_at, "d MMM yyyy")}</span> · {h.service_name || '—'}</span>
                <span className="flex items-center gap-2"><span className="text-ink-300">{h.price != null ? money(h.price) : ''}</span><span className={cx('chip', STATUS[h.status].cls)}>{STATUS[h.status].label}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
