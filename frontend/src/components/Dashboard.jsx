import { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api/v1';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

/* ── Sub-pantalla: Cambio de contraseña obligatorio ─────────── */
function CambioContrasenaObligatorio({ usuario, onCambiado, onLogout }) {
  const [form, setForm] = useState({ password_actual: '', password_nueva: '', password_nueva_confirmation: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password_nueva !== form.password_nueva_confirmation) {
      setError('Las contraseñas nuevas no coinciden.'); return;
    }
    setLoading(true); setError('');
    try {
      await axios.post(`${API_URL}/password/cambiar`, form, { headers: authHeader() });
      const u = JSON.parse(localStorage.getItem('usuario') || '{}');
      u.debe_cambiar_contrasena = false;
      localStorage.setItem('usuario', JSON.stringify(u));
      onCambiado();
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4f9', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'#fff', borderRadius:8, boxShadow:'0 8px 40px rgba(0,75,141,0.15)', width:'100%', maxWidth:440, overflow:'hidden' }}>
        <div style={{ background:'#004B8D', padding:'1.5rem 2rem', color:'#fff', position:'relative' }}>
          <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:8, width:42, height:42, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'0.75rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'1.2rem', fontWeight:700, margin:0 }}>Cambio de Contraseña Requerido</h2>
          <p style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.75)', marginTop:4 }}>Por seguridad, debe crear una nueva contraseña antes de continuar.</p>
        </div>
        <div style={{ padding:'1.75rem 2rem' }}>
          {error && <div style={{ background:'#fff3f5', border:'1px solid rgba(139,0,0,0.2)', borderRadius:5, padding:'10px 14px', fontSize:'0.82rem', color:'#8b0000', marginBottom:'1rem' }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            {[
              { name:'password_actual',           label:'Contraseña temporal (recibida por correo)', ph:'Ingrese la contraseña temporal' },
              { name:'password_nueva',             label:'Nueva contraseña *',                         ph:'Mínimo 8 caracteres' },
              { name:'password_nueva_confirmation', label:'Confirmar nueva contraseña *',               ph:'Repita la nueva contraseña' },
            ].map(f => (
              <div key={f.name} style={{ marginBottom:'1rem' }}>
                <label style={{ display:'block', fontSize:'0.73rem', fontWeight:700, color:'#444', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:5 }}>{f.label}</label>
                <input name={f.name} type={showPwd ? 'text' : 'password'} placeholder={f.ph}
                  value={form[f.name]} onChange={handleChange} required
                  style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e0e0e0', borderRadius:4, fontSize:'0.92rem', outline:'none', boxSizing:'border-box' }} />
              </div>
            ))}
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.78rem', color:'#6b6b6b', marginBottom:'1.25rem', cursor:'pointer' }}>
              <input type="checkbox" onChange={() => setShowPwd(p => !p)} /> Mostrar contraseñas
            </label>
            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:13, background: loading ? '#7aa5cc' : '#004B8D', color:'#fff', border:'none', borderRadius:4, fontSize:'0.88rem', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', cursor: loading ? 'not-allowed':'pointer' }}>
              {loading ? 'Guardando...' : 'Establecer Nueva Contraseña'}
            </button>
          </form>
          <button onClick={onLogout} style={{ display:'block', width:'100%', marginTop:'0.75rem', background:'none', border:'none', fontSize:'0.76rem', color:'#6b6b6b', cursor:'pointer', textDecoration:'underline' }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ usuario, debecambiar, onLogout }) {
  const [loading, setLoading]           = useState(false);
  const [mustChange, setMustChange]     = useState(!!debecambiar);

  // Si el usuario ya cambió la contraseña, actualizar el flag
  const handleCambiado = () => setMustChange(false);

  if (mustChange) {
    return <CambioContrasenaObligatorio usuario={usuario} onCambiado={handleCambiado} onLogout={onLogout} />;
  }

  const handleLogout = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/logout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      // Si falla el logout remoto, limpiamos igual
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      onLogout();
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Navbar */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.navBrand}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                 stroke="white" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 2L3 7v6c0 5.25 3.75 10.15 9 11.35C17.25 23.15 21 18.25 21 13V7L12 2z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span style={styles.navTitle}>CUP — FICCT</span>
          </div>

          <div style={styles.navRight}>
            <div style={styles.userChip}>
              <div style={styles.userAvatar}>
                {usuario?.nombre_completo?.[0] ?? 'U'}
              </div>
              <div style={styles.userInfo}>
                <span style={styles.userName}>{usuario?.nombre_completo}</span>
                <span style={styles.userRole}>{usuario?.rol}</span>
              </div>
            </div>
            <button
              style={loading ? { ...styles.btnLogout, opacity: 0.6 } : styles.btnLogout}
              onClick={handleLogout}
              disabled={loading}
            >
              {loading ? 'Saliendo...' : 'Cerrar sesión'}
            </button>
          </div>
        </div>
      </nav>

      {/* Contenido */}
      <main style={styles.main}>
        <div style={styles.container}>
          <div style={styles.welcome}>
            <p style={styles.welcomeLabel}>Panel de Administración</p>
            <h1 style={styles.welcomeTitle}>
              Bienvenido, {usuario?.nombre_completo?.split(' ')[0]}
            </h1>
            <p style={styles.welcomeSub}>
              Has iniciado sesión como <strong>{usuario?.rol}</strong> en el
              Sistema de Admisión Universitaria CUP — FICCT.
            </p>
          </div>

          {/* Permisos */}
          {usuario?.permisos?.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Tus permisos en el sistema</h2>
              <div style={styles.permisoGrid}>
                {usuario.permisos.map((p) => (
                  <div style={styles.permisoChip} key={p}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="#004B8D" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {p}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Módulos (placeholders) */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Módulos del sistema</h2>
            <div style={styles.moduleGrid}>
              {[
                { label: 'Postulantes',   desc: 'Registrar, editar y gestionar postulantes',   icon: '01' },
                { label: 'Exámenes',      desc: 'Registrar y editar notas por materia',         icon: '02' },
                { label: 'Grupos',        desc: 'Visualizar grupos y asignaciones',             icon: '03' },
                { label: 'Reportes',      desc: 'Generar reportes y estadísticas del sistema',  icon: '04' },
                { label: 'Usuarios',      desc: 'Administrar cuentas de acceso al sistema',     icon: '05' },
                { label: 'Configuración', desc: 'Roles, permisos y convocatorias activas',      icon: '06' },
              ].map((m) => (
                <div style={styles.moduleCard} key={m.label}
                     onMouseEnter={(e) => {
                       e.currentTarget.style.borderColor = '#004B8D';
                       e.currentTarget.style.transform = 'translateY(-2px)';
                       e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,75,141,0.12)';
                     }}
                     onMouseLeave={(e) => {
                       e.currentTarget.style.borderColor = '#e5e5e5';
                       e.currentTarget.style.transform = 'translateY(0)';
                       e.currentTarget.style.boxShadow = 'none';
                     }}
                >
                  <span style={styles.moduleNum}>{m.icon}</span>
                  <h3 style={styles.moduleLabel}>{m.label}</h3>
                  <p style={styles.moduleDesc}>{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Estilos inline ─────────────────────────────────────────── */
const styles = {
  page:        { minHeight: '100vh', background: '#f8f8f8', display: 'flex', flexDirection: 'column' },
  nav:         { background: '#004B8D', boxShadow: '0 2px 12px rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 100 },
  navInner:    { maxWidth: 1200, margin: '0 auto', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  navBrand:    { display: 'flex', alignItems: 'center', gap: 10 },
  navTitle:    { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1rem', fontWeight: 700, color: 'white', letterSpacing: '0.02em' },
  navRight:    { display: 'flex', alignItems: 'center', gap: '1rem' },
  userChip:    { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', background: 'rgba(255,255,255,0.12)', borderRadius: 40 },
  userAvatar:  { width: 32, height: 32, borderRadius: '50%', background: 'white', color: '#004B8D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem' },
  userInfo:    { display: 'flex', flexDirection: 'column', lineHeight: 1.2 },
  userName:    { fontSize: '0.82rem', fontWeight: 600, color: 'white' },
  userRole:    { fontSize: '0.68rem', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  btnLogout:   { padding: '8px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.2s' },
  main:        { flex: 1, padding: '3rem 2rem' },
  container:   { maxWidth: 1200, margin: '0 auto' },
  welcome:     { marginBottom: '2.5rem' },
  welcomeLabel:{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#004B8D', marginBottom: '0.5rem' },
  welcomeTitle:{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2.2rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '0.6rem' },
  welcomeSub:  { fontSize: '0.95rem', color: '#6b6b6b', lineHeight: 1.6 },
  section:     { marginBottom: '2.5rem' },
  sectionTitle:{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.15rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e5e5' },
  permisoGrid: { display: 'flex', flexWrap: 'wrap', gap: '0.6rem' },
  permisoChip: { display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', background: 'rgba(0,75,141,0.07)', border: '1px solid rgba(0,75,141,0.15)', borderRadius: 20, fontSize: '0.78rem', fontWeight: 500, color: '#1a1a1a' },
  moduleGrid:  { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' },
  moduleCard:  { background: 'white', border: '1px solid #e5e5e5', borderRadius: 6, padding: '1.5rem', cursor: 'default', transition: 'all 0.25s', position: 'relative' },
  moduleNum:   { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.8rem', fontWeight: 700, color: 'rgba(0,75,141,0.12)', display: 'block', marginBottom: '0.5rem', lineHeight: 1 },
  moduleLabel: { fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '0.4rem' },
  moduleDesc:  { fontSize: '0.78rem', color: '#6b6b6b', lineHeight: 1.55 },
};
