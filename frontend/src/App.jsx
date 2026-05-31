import { useState } from 'react';
import Login     from './components/Login';
import Dashboard from './components/Dashboard';
import Layout    from './components/Layout';
import Bitacora  from './pages/Bitacora';
import Carreras  from './pages/Carreras';
import Postulantes from './pages/Postulantes';
import Bachillerato from './pages/Bachillerato';
import Inscripcion  from './pages/Inscripcion';

function App() {
  const [auth, setAuth] = useState(() => {
    try {
      const token   = localStorage.getItem('token');
      const usuario = localStorage.getItem('usuario');
      return token ? { token, usuario: JSON.parse(usuario) } : null;
    } catch { return null; }
  });

  const [page, setPage] = useState('dashboard');

  const handleLogin  = (data) => { setAuth(data); setPage('dashboard'); };
  const handleLogout = ()     => { setAuth(null); setPage('dashboard'); };

  if (!auth) return <Login onLogin={handleLogin} />;

  // Pantalla de cambio de contraseña obligatorio
  if (auth.debe_cambiar_contrasena) {
    return (
      <Dashboard
        usuario={auth.usuario}
        debecambiar={true}
        onLogout={handleLogout}
      />
    );
  }

  const PAGES = {
    dashboard:   <Dashboard usuario={auth.usuario} debecambiar={false} onLogout={handleLogout} />,
    bitacora:    <Bitacora />,
    carreras:    <Carreras />,
    postulantes: <Postulantes />,
    bachillerato:<Bachillerato />,
    inscripcion: <Inscripcion />,
    usuarios:    <Dashboard usuario={auth.usuario} debecambiar={false} onLogout={handleLogout} />,
  };

  return (
    <Layout page={page} setPage={setPage} usuario={auth.usuario} onLogout={handleLogout}>
      {PAGES[page] ?? PAGES.dashboard}
    </Layout>
  );
}

export default App;