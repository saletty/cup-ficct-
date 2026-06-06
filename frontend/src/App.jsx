import { useState } from 'react';
import Login          from './components/Login';
import Dashboard      from './components/Dashboard';
import Layout         from './components/Layout';
import Bitacora       from './pages/Bitacora';
import Carreras       from './pages/Carreras';
import Postulantes    from './pages/Postulantes';
import Bachillerato   from './pages/Bachillerato';
import Inscripcion    from './pages/Inscripcion';
import Convocatorias  from './pages/Convocatorias';
import Docentes       from './pages/Docentes';
import Grupos         from './pages/Grupos';
import CargaHoraria   from './pages/CargaHoraria';
import TiposPago      from './pages/TiposPago';
import Pagos          from './pages/Pagos';
import Examenes       from './pages/Examenes';
import Evaluaciones   from './pages/Evaluaciones';
import MisResultados  from './pages/MisResultados';
import DashboardAdmin from './pages/DashboardAdmin';
import Reportes       from './pages/Reportes';

/*
 * ================================================================
 * App.jsx — Enrutador principal (state-based routing)
 * ================================================================
 * CU1  Iniciar Sesión       → <Login>  (no autenticado)
 * CU2  Cerrar Sesión        → handleLogout() / Layout.jsx
 * CU3  Gestionar Usuarios   → page 'usuarios'  → <Dashboard>
 * CU4  Gestionar Roles      → page 'usuarios'  → <Dashboard>
 * CU5  Gestionar Permisos   → filtro sidebar   / permiso guard
 * CU6  Administrar Bitácora → page 'bitacora'  → <Bitacora>
 * CU7  Gestionar Carreras   → page 'carreras'  → <Carreras>
 * CU8  Gestionar Postulantes→ page 'postulantes' → <Postulantes>
 *                             + flujo registro en <Login>
 * CU9  Info. Bachillerato   → page 'bachillerato' → <Bachillerato>
 * CU10 Inscripción CUP      → page 'inscripcion'  → <Inscripcion>
 * CU11 Convocatorias        → page 'convocatorias' (pendiente frontend)
 * CU12 Gestionar Docentes   → page 'docentes'      (pendiente frontend)
 * CU13 Carga Horaria        → page 'carga-horaria' (pendiente frontend)
 * CU14 Gestionar Grupos     → page 'grupos'        (pendiente frontend)
 * CU15 Tipos de Pago        → page 'tipos-pago'    → <TiposPago>
 * CU16 Gestionar Pagos      → page 'pagos'         → <Pagos>
 * CU17 Gestionar Exámenes   → page 'examenes'      → <Examenes>
 * CU18 Resultados Admisión  → page 'evaluaciones'  → <Evaluaciones>
 * CU19 Mis Resultados       → page 'mis-resultados'→ <MisResultados>
 * ================================================================
 */

/**
 * Permiso requerido para ver cada página.
 * null = cualquier usuario autenticado puede verla.
 */
const PERMISOS_PAGINAS = {
  dashboard:       null,
  inscripcion:     null,
  postulantes:     'Gestionar postulantes',
  bachillerato:    'Gestionar postulantes',
  carreras:        'Gestionar carreras',
  convocatorias:   'Gestionar convocatorias',
  grupos:          'Gestionar grupos',
  docentes:        'Gestionar docentes',
  'carga-horaria': 'Ver carga horaria propia',
  bitacora:        'Gestionar usuarios',
  usuarios:        'Gestionar usuarios',
  'tipos-pago':    'Gestionar tipos de pago',
  pagos:           'Gestionar pagos',
  examenes:        'Gestionar exámenes',
  evaluaciones:    'Gestionar exámenes',
  'mis-resultados': null,
  reportes:         'Ver reportes',
};

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

  if (auth.debe_cambiar_contrasena) {
    return (
      <Dashboard
        usuario={auth.usuario}
        debecambiar={true}
        onLogout={handleLogout}
      />
    );
  }

  // Guard: ¿el usuario tiene permiso para ver la página actual?
  const permisosSet = new Set(auth.usuario?.permisos ?? []);
  const esAdmin     = auth.usuario?.rol === 'Administrador';

  const puedeVer = (key) => {
    const requerido = PERMISOS_PAGINAS[key];
    return !requerido || esAdmin || permisosSet.has(requerido);
  };

  // Si intentara acceder a una página no permitida, redirigir al dashboard
  const paginaActual = puedeVer(page) ? page : 'dashboard';

  // Páginas disponibles — se agregan aquí a medida que se implementen
  const PAGES = {
    dashboard:     <DashboardAdmin />,
    inscripcion:   <Inscripcion />,
    postulantes:   <Postulantes />,
    bachillerato:  <Bachillerato />,
    carreras:      <Carreras />,
    bitacora:      <Bitacora />,
    usuarios:      <Dashboard usuario={auth.usuario} debecambiar={false} onLogout={handleLogout} />,
    convocatorias:   <Convocatorias />,
    grupos:          <Grupos />,
    docentes:        <Docentes />,
    'carga-horaria': <CargaHoraria />,
    'tipos-pago':    <TiposPago />,
    pagos:           <Pagos />,
    examenes:        <Examenes />,
    evaluaciones:    <Evaluaciones />,
    'mis-resultados': <MisResultados />,
    reportes:         <Reportes />,
  };

  // setPage con guard incluido
  const handleSetPage = (key) => {
    if (puedeVer(key)) setPage(key);
  };

  return (
    <Layout
      page={paginaActual}
      setPage={handleSetPage}
      usuario={auth.usuario}
      onLogout={handleLogout}
    >
      {PAGES[paginaActual] ?? PAGES.dashboard}
    </Layout>
  );
}

/** Placeholder para páginas del frontend aún no desarrolladas */
function PaginaPendiente({ nombre }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '60vh', gap: '1rem', color: '#6b7280'
    }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
           style={{ width: 56, height: 56, color: '#d1d5db' }}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/>
      </svg>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#374151' }}>
        {nombre}
      </h2>
      <p style={{ fontSize: '0.875rem' }}>
        Esta sección está en desarrollo. La API ya está disponible.
      </p>
    </div>
  );
}

export default App;
