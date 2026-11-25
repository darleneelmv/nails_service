import { NavLink, Outlet, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, CalendarDays, Users, Sparkles, Images, Settings, UserCog, LogOut, ExternalLink, Crown } from 'lucide-react';
import { useAuth } from '../../lib/auth.jsx';
import { cx } from '../../lib/utils';

const NAV = [
  { to: '/app', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/app/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/app/clientas', label: 'Clientas', icon: Users },
  { to: '/app/servicios', label: 'Servicios', icon: Sparkles },
  { to: '/app/galeria', label: 'Galería', icon: Images },
  { to: '/app/estudio', label: 'Mi estudio', icon: Settings, owner: true },
  { to: '/app/equipo', label: 'Equipo', icon: UserCog, owner: true },
];

export default function AppLayout() {
  const { user, studio, logout, enterStudio } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  if (user.role === 'superadmin' && !studio) return <Navigate to="/admin" replace />;
  const isOwner = user.role !== 'staff';
  const items = NAV.filter((n) => !n.owner || isOwner);

  return (
    <div className="min-h-screen lg:pl-72">
      {user.role === 'superadmin' && (
        <div className="sticky top-0 z-30 flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500/90 to-pink-500/90 px-4 py-2 text-xs font-semibold text-ink-950 lg:-ml-72">
          <Crown className="h-4 w-4" /> Estás administrando “{studio.name}”
          <button onClick={async () => { await enterStudio(null); nav('/admin'); }} className="rounded-full bg-ink-950/20 px-3 py-1 hover:bg-ink-950/30">Volver a mi panel</button>
        </div>
      )}

      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-white/5 bg-ink-900/60 p-5 backdrop-blur-xl lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          {studio.logo
            ? <img src={studio.logo} className="h-11 w-11 rounded-2xl object-cover" alt="" />
            : <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand to-accent font-display text-xl font-bold text-ink-950">{studio.name[0]}</div>}
          <div className="min-w-0">
            <p className="truncate font-display text-lg leading-tight">{studio.name}</p>
            <p className="truncate text-xs text-ink-400">{user.name} · {user.role === 'staff' ? 'Equipo' : 'Dueña'}</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => cx('relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                isActive ? 'text-white' : 'text-ink-400 hover:bg-white/[.03] hover:text-ink-100')}>
              {({ isActive }) => (<>
                {isActive && <motion.span layoutId="side" className="absolute inset-0 rounded-2xl border border-brand/20 bg-gradient-to-r from-brand/20 to-accent/5" />}
                <n.icon className={cx('relative h-5 w-5', isActive && 'text-brand')} /><span className="relative">{n.label}</span>
              </>)}
            </NavLink>
          ))}
        </nav>
        <a href={`/${studio.slug}`} target="_blank" rel="noreferrer" className="btn-ghost mb-2 justify-start"><ExternalLink className="h-4 w-4" /> Ver mi página</a>
        <button onClick={() => { logout(); nav('/login'); }} className="btn justify-start text-ink-400 hover:text-white"><LogOut className="h-4 w-4" /> Cerrar sesión</button>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-ink-950/80 px-5 py-3 backdrop-blur-xl lg:hidden">
        <p className="font-display text-lg">{studio.name}</p>
        <div className="flex gap-1">
          <a href={`/${studio.slug}`} target="_blank" rel="noreferrer" className="rounded-full p-2 text-ink-300 hover:bg-white/5"><ExternalLink className="h-5 w-5" /></a>
          <button onClick={() => { logout(); nav('/login'); }} className="rounded-full p-2 text-ink-300 hover:bg-white/5"><LogOut className="h-5 w-5" /></button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-32 pt-6 lg:px-10 lg:pt-10">
        <AnimatePresence mode="wait">
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-3xl border border-white/10 bg-ink-900/90 p-1.5 backdrop-blur-xl lg:hidden">
        {items.slice(0, 5).concat(isOwner ? items.slice(5, 6) : []).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => cx('relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-semibold', isActive ? 'text-white' : 'text-ink-400')}>
            {({ isActive }) => (<>
              {isActive && <motion.span layoutId="bottom" className="absolute inset-0 rounded-2xl bg-brand/15" />}
              <n.icon className={cx('relative h-5 w-5', isActive && 'text-brand')} /><span className="relative">{n.label}</span>
            </>)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
