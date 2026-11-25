import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Trash2, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { Modal, Field, Toggle, useToast, PageLoader } from '../../components/ui.jsx';
import { PageHeader } from './Layout.jsx';

export default function Team() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const load = useCallback(() => api('/team').then(setList), []);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    try { await api('/team', { method: 'POST', body: f }); toast('Usuaria creada'); setOpen(false); setF({ name: '', email: '', password: '' }); load(); }
    catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div>
      <PageHeader title="Equipo" subtitle="Tus manicuristas ven agenda, clientas y galería. No pueden cambiar precios ni ajustes."
        action={<button onClick={() => setOpen(true)} className="btn-primary"><UserPlus className="h-4 w-4" /> Agregar</button>} />
      {!list ? <PageLoader /> : (
        <div className="card divide-y divide-white/5">
          {list.map((u) => (
            <div key={u.id} className="flex items-center gap-4 p-4">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/15 font-display">{u.name[0]}</div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{u.name} {u.role === 'owner' && <ShieldCheck className="inline h-4 w-4 text-brand" />}</p>
                <p className="truncate text-xs text-ink-400">{u.email} · {u.role === 'owner' ? 'Dueña' : 'Equipo'}</p>
              </div>
              {u.role === 'staff' && (
                <>
                  <Toggle checked={!!u.active} onChange={async (v) => { await api(`/team/${u.id}`, { method: 'PUT', body: { active: v ? 1 : 0 } }); load(); }} />
                  <button onClick={async () => { const p = window.prompt('Nueva contraseña para ' + u.name); if (p) { await api(`/team/${u.id}`, { method: 'PUT', body: { password: p } }); toast('Contraseña cambiada'); } }} className="btn-ghost text-xs">Contraseña</button>
                  <button onClick={async () => { if (window.confirm('¿Eliminar usuaria?')) { await api(`/team/${u.id}`, { method: 'DELETE' }); load(); } }} className="text-ink-400 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva integrante">
        <form onSubmit={create} className="space-y-4">
          <Field label="Nombre"><input required className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Correo (para entrar)"><input required type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Contraseña"><input required minLength={6} className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <button className="btn-primary w-full py-3">Crear acceso</button>
        </form>
      </Modal>
    </div>
  );
}
