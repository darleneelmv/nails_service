import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Plus, LogIn, ExternalLink, Trash2, Pencil, LogOut, Store, Users, Wallet, KeyRound, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';
import { money, cx, ymd, applyTheme } from '../../lib/utils';
import { Modal, Field, Toggle, useToast, PageLoader, Stars } from '../../components/ui.jsx';

const PLANS = { beta: { label: 'Beta gratis', price: 0 }, esencial: { label: 'Esencial', price: 299 }, estudio: { label: 'Estudio', price: 449 }, unico: { label: 'Pago único + mant.', price: 149 } };

export default function Admin() {
  const { user, logout, enterStudio } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('studios');
  const [studios, setStudios] = useState(null);
  const [users, setUsers] = useState([]);
  const [create, setCreate] = useState(false);
  const [edit, setEdit] = useState(null);
  const [newUser, setNewUser] = useState(null);

  const load = useCallback(() => { api('/super/studios').then(setStudios); api('/super/users').then(setUsers); }, []);
  useEffect(() => { applyTheme(null); load(); }, [load]);

  if (!studios) return <PageLoader />;
  const active = studios.filter((s) => s.active);
  const mrr = active.reduce((t, s) => t + (PLANS[s.plan]?.price || 0), 0);
  const today = ymd(new Date());
  const overdue = active.filter((s) => s.paid_until && s.paid_until < today);

  const enter = async (s) => { await enterStudio(s.id); nav('/app'); };

  return (
    <div className="min-h-screen">
      <header className="grain relative overflow-hidden border-b border-white/5">
        <Stars count={16} className="opacity-40" />
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-amber-400/15 blur-[100px]" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-5 pb-8 pt-10">
          <div>
            <p className="chip mb-3 bg-amber-400/15 text-amber-300"><Crown className="h-3.5 w-3.5" /> Administrador</p>
            <h1 className="font-display text-5xl">Hola, <em className="text-gradient">{user.name}</em></h1>
            <p className="mt-1 text-sm text-ink-400">Aquí controlas todos los estudios que usan Brillo.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCreate(true)} className="btn-primary"><Plus className="h-4 w-4" /> Nuevo estudio</button>
            <button onClick={() => { logout(); nav('/login'); }} className="btn-ghost"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { i: Store, l: 'Estudios activos', v: active.length },
            { i: Wallet, l: 'Ingreso mensual', v: money(mrr) },
            { i: Users, l: 'Usuarias', v: users.filter((u) => u.role !== 'superadmin').length },
            { i: AlertTriangle, l: 'Pagos vencidos', v: overdue.length, hot: overdue.length > 0 },
          ].map((c, k) => (
            <motion.div key={c.l} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.05 }} className={cx('card p-5', c.hot && 'border-rose-400/30')}>
              <c.i className={cx('mb-3 h-5 w-5', c.hot ? 'text-rose-300' : 'text-brand')} />
              <p className="font-display text-3xl">{c.v}</p><p className="text-xs text-ink-400">{c.l}</p>
            </motion.div>
          ))}
        </div>

        <div className="mb-5 flex gap-2">
          {[['studios', 'Estudios'], ['users', 'Usuarios']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={cx('relative rounded-full px-4 py-2 text-sm font-semibold', tab === k ? 'text-ink-950' : 'text-ink-300')}>
              {tab === k && <motion.span layoutId="admintab" className="absolute inset-0 rounded-full bg-white" />}<span className="relative">{l}</span>
            </button>
          ))}
        </div>

        {tab === 'studios' ? (
          <div className="grid gap-4 md:grid-cols-2">
            {studios.map((s, i) => {
              const late = s.paid_until && s.paid_until < today;
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={cx('card overflow-hidden', !s.active && 'opacity-60')}>
                  <div className="relative h-24 bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(120deg, ${s.color_primary}55, ${s.color_accent}22)` }}>
                    {s.cover && <img src={s.cover} alt="" className="h-full w-full object-cover opacity-40" />}
                    <span className={cx('chip absolute right-4 top-4', s.active ? 'bg-emerald-400/20 text-emerald-200' : 'bg-zinc-500/30 text-zinc-300')}>{s.active ? 'Activo' : 'Suspendido'}</span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-2xl">{s.name}</h3>
                        <p className="truncate text-xs text-ink-400">/{s.slug} · {s.owner_email || 'sin dueña'}</p>
                      </div>
                      <span className="chip bg-brand/15 text-brand">{PLANS[s.plan]?.label || s.plan}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      {[['Citas', s.appointments], ['Clientas', s.clients], ['Usuarias', s.users]].map(([l, v]) => (
                        <div key={l} className="rounded-2xl bg-ink-850 py-2"><p className="font-display text-xl">{v}</p><p className="text-[10px] uppercase text-ink-400">{l}</p></div>
                      ))}
                    </div>
                    {s.paid_until && <p className={cx('mt-3 text-xs', late ? 'text-rose-300' : 'text-ink-400')}>{late ? '⚠️ Venció' : 'Pagado hasta'} {s.paid_until}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => enter(s)} className="btn-primary flex-1"><LogIn className="h-4 w-4" /> Entrar</button>
                      <a href={`/${s.slug}`} target="_blank" rel="noreferrer" className="btn-ghost"><ExternalLink className="h-4 w-4" /></a>
                      <button onClick={() => setEdit(s)} className="btn-ghost"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setNewUser({ studio_id: s.id, role: 'staff', name: '', email: '', password: '' })} className="btn-ghost"><Users className="h-4 w-4" /></button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="card divide-y divide-white/5">
            {users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{u.name} <span className="chip ml-1 bg-white/5 text-ink-300">{u.role === 'superadmin' ? 'Admin' : u.role === 'owner' ? 'Dueña' : 'Equipo'}</span></p>
                  <p className="truncate text-xs text-ink-400">{u.email}{u.studio_name ? ` · ${u.studio_name}` : ''}</p>
                </div>
                {u.role !== 'superadmin' && (
                  <>
                    <Toggle checked={!!u.active} onChange={async (v) => { await api(`/super/users/${u.id}`, { method: 'PUT', body: { active: v ? 1 : 0 } }); load(); }} />
                    <button onClick={async () => { const p = window.prompt(`Nueva contraseña para ${u.email}`); if (p) { await api(`/super/users/${u.id}`, { method: 'PUT', body: { password: p } }); toast('Contraseña cambiada'); } }} className="btn-ghost text-xs"><KeyRound className="h-4 w-4" /></button>
                    <button onClick={async () => { if (window.confirm(`¿Eliminar a ${u.email}?`)) { await api(`/super/users/${u.id}`, { method: 'DELETE' }); load(); } }} className="text-ink-400 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <CreateStudio open={create} onClose={() => setCreate(false)} onSaved={load} />
      <EditStudio studio={edit} onClose={() => setEdit(null)} onSaved={load} />
      <Modal open={!!newUser} onClose={() => setNewUser(null)} title="Dar acceso">
        {newUser && (
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            try { await api('/super/users', { method: 'POST', body: newUser }); toast('Usuario creado'); setNewUser(null); load(); }
            catch (err) { toast(err.message, 'error'); }
          }}>
            <Field label="Rol">
              <select className="input" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="owner">Dueña (control total de su estudio)</option>
                <option value="staff">Equipo (agenda y clientas)</option>
              </select>
            </Field>
            <Field label="Nombre"><input required className="input" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} /></Field>
            <Field label="Correo"><input required type="email" className="input" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /></Field>
            <Field label="Contraseña"><input required minLength={6} className="input" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} /></Field>
            <button className="btn-primary w-full py-3">Crear</button>
          </form>
        )}
      </Modal>
    </div>
  );
}

function CreateStudio({ open, onClose, onSaved }) {
  const toast = useToast();
  const blank = { name: '', slug: '', owner_name: '', owner_email: '', owner_password: '', plan: 'beta', paid_until: '' };
  const [f, setF] = useState(blank);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    try {
      const r = await api('/super/studios', { method: 'POST', body: { ...f, paid_until: f.paid_until || null } });
      toast(`Estudio creado: /${r.slug}`); setF(blank); onSaved(); onClose();
    } catch (err) { toast(err.message, 'error'); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Nuevo estudio">
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre del estudio"><input required className="input" value={f.name} onChange={set('name')} /></Field>
          <Field label="Link (opcional)"><input className="input" value={f.slug} onChange={set('slug')} placeholder="mi-estudio" /></Field>
        </div>
        <p className="label pt-2">Acceso de la dueña</p>
        <Field label="Nombre"><input className="input" value={f.owner_name} onChange={set('owner_name')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Correo"><input required type="email" className="input" value={f.owner_email} onChange={set('owner_email')} /></Field>
          <Field label="Contraseña"><input required minLength={6} className="input" value={f.owner_password} onChange={set('owner_password')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plan"><select className="input" value={f.plan} onChange={set('plan')}>{Object.entries(PLANS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          <Field label="Pagado hasta"><input type="date" className="input" value={f.paid_until} onChange={set('paid_until')} /></Field>
        </div>
        <button className="btn-primary w-full py-3">Crear estudio</button>
      </form>
    </Modal>
  );
}

function EditStudio({ studio, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({});
  useEffect(() => { if (studio) setF({ name: studio.name, slug: studio.slug, plan: studio.plan, paid_until: studio.paid_until || '', active: studio.active }); }, [studio]);
  const save = async (e) => {
    e.preventDefault();
    try { await api(`/super/studios/${studio.id}`, { method: 'PUT', body: { ...f, paid_until: f.paid_until || null } }); toast('Guardado'); onSaved(); onClose(); }
    catch (err) { toast(err.message, 'error'); }
  };
  const remove = async () => {
    if (window.prompt(`Escribe "${studio.slug}" para borrar TODO (citas, clientas, fotos)`) !== studio.slug) return;
    await api(`/super/studios/${studio.id}`, { method: 'DELETE' }); toast('Estudio eliminado'); onSaved(); onClose();
  };
  return (
    <Modal open={!!studio} onClose={onClose} title="Editar estudio">
      <form onSubmit={save} className="space-y-4">
        <Field label="Nombre"><input className="input" value={f.name || ''} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Link"><input className="input" value={f.slug || ''} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plan"><select className="input" value={f.plan || 'beta'} onChange={(e) => setF({ ...f, plan: e.target.value })}>{Object.entries(PLANS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          <Field label="Pagado hasta"><input type="date" className="input" value={f.paid_until || ''} onChange={(e) => setF({ ...f, paid_until: e.target.value })} /></Field>
        </div>
        <label className="flex items-center justify-between rounded-2xl bg-ink-850 px-4 py-3 text-sm">
          <span>Activo <span className="text-xs text-ink-400">(apágalo si no paga: su página y login se bloquean)</span></span>
          <Toggle checked={!!f.active} onChange={(v) => setF({ ...f, active: v ? 1 : 0 })} />
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={remove} className="btn-danger"><Trash2 className="h-4 w-4" /></button>
          <button className="btn-primary flex-1 py-3">Guardar</button>
        </div>
      </form>
    </Modal>
  );
}
