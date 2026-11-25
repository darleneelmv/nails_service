import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { Field, Spinner, Stars } from '../components/ui.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === 'superadmin' ? '/admin' : '/app'} replace />;

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const u = await login(f.email, f.password);
      nav(u.role === 'superadmin' ? '/admin' : '/app');
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };

  return (
    <div className="grain relative flex min-h-screen items-center justify-center overflow-hidden p-5">
      <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-brand/25 blur-[120px]" />
      <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-accent/20 blur-[120px]" />
      <Stars count={20} className="opacity-50" />
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="card relative w-full max-w-sm p-8">
        <Link to="/" className="mb-8 block text-center font-display text-3xl">Brillo<span className="text-brand">✦</span></Link>
        <h1 className="mb-1 text-center font-display text-2xl">Bienvenida de vuelta</h1>
        <p className="mb-7 text-center text-sm text-ink-400">Entra para ver tu agenda</p>
        <div className="space-y-4">
          <Field label="Correo"><input type="email" required autoComplete="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Contraseña"><input type="password" required autoComplete="current-password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        </div>
        {err && <p className="mt-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{err}</p>}
        <button disabled={busy} className="btn-primary mt-6 w-full py-3">{busy ? <Spinner className="text-ink-950" /> : <><LogIn className="h-4 w-4" /> Entrar</>}</button>
        <p className="mt-6 text-center text-xs text-ink-400">¿No tienes cuenta? Tu acceso te lo da tu administrador.</p>
      </motion.form>
    </div>
  );
}
