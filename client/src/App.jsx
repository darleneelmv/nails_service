import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { PageLoader } from './components/ui.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import PublicStudio from './pages/PublicStudio.jsx';
import AppLayout from './pages/app/Layout.jsx';
import Dashboard from './pages/app/Dashboard.jsx';
import Agenda from './pages/app/Agenda.jsx';
import Clients from './pages/app/Clients.jsx';
import Services from './pages/app/Services.jsx';
import Gallery from './pages/app/Gallery.jsx';
import Settings from './pages/app/Settings.jsx';
import Team from './pages/app/Team.jsx';
import Admin from './pages/admin/Admin.jsx';

function Private({ children, superOnly }) {
  const { loading, user } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (superOnly && user.role !== 'superadmin') return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<Private superOnly><Admin /></Private>} />
      <Route path="/app" element={<Private><AppLayout /></Private>}>
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="clientas" element={<Clients />} />
        <Route path="servicios" element={<Services />} />
        <Route path="galeria" element={<Gallery />} />
        <Route path="estudio" element={<Settings />} />
        <Route path="equipo" element={<Team />} />
      </Route>
      <Route path="/:slug" element={<PublicStudio />} />
    </Routes>
  );
}
