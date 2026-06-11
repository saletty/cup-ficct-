import { useState } from 'react';
import axios from 'axios';
import client from '../api/client';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

/* ── Indicador en tiempo real de requisitos ──────────────────── */
function PwdReqs({ pwd }) {
  const checks = [
    { label: 'Mínimo 8 caracteres',          ok: pwd.length >= 8 },
    { label: 'Al menos una mayúscula (A–Z)',  ok: /[A-Z]/.test(pwd) },
    { label: 'Al menos una minúscula (a–z)',  ok: /[a-z]/.test(pwd) },
    { label: 'Al menos un número (0–9)',      ok: /[0-9]/.test(pwd) },
    { label: 'Un carácter especial (@$!%*?&-)', ok: /[\W_]/.test(pwd) },
  ];
  if (!pwd) return null;
  return (
    <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:5, padding:'10px 12px', marginBottom:'0.75rem' }}>
      {checks.map(c => (
        <div key={c.label} style={{ display:'flex', alignItems:'center', gap:7, fontSize:'0.73rem', color: c.ok ? '#15803d' : '#6b7280', marginBottom:3 }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={c.ok ? '#16a34a' : '#d1d5db'} strokeWidth={3} strokeLinecap="round">
            {c.ok ? <polyline points="20 6 9 17 4 12"/> : <circle cx={12} cy={12} r={10}/>}
          </svg>
          {c.label}
        </div>
      ))}
    </div>
  );
}

/* ── Sub-pantalla: Cambio de contraseña obligatorio ─────────── */
function CambioContrasenaObligatorio({ usuario, onCambiado, onLogout }) {
  const [form, setForm] = useState({ password_actual: '', password_nueva: '', password_nueva_confirmation: '' });
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPwd, setShowPwd] = useState(false);

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setFieldErrors(p => ({ ...p, [e.target.name]: null, _general: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password_nueva !== form.password_nueva_confirmation) {
      setFieldErrors({ password_nueva_confirmation: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    setLoading(true); setFieldErrors({});
    try {
      await client.post(`/password/cambiar`, form, { headers: authHeader() });
      const u = JSON.parse(localStorage.getItem('usuario') || '{}');
      u.debe_cambiar_contrasena = false;
      localStorage.setItem('usuario', JSON.stringify(u));
      onCambiado();
    } catch (err) {
      const d = err.response?.data;
      if (d?.errors) {
        const mapped = {};
        Object.entries(d.errors).forEach(([k, msgs]) => { mapped[k] = msgs[0]; });
        setFieldErrors(mapped);
      } else {
        setFieldErrors({ _general: d?.mensaje || 'Error al cambiar la contraseña.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const inp = (field) => ({
    width:'100%', padding:'11px 14px', boxSizing:'border-box', fontSize:'0.92rem', outline:'none',
    border: fieldErrors[field] ? '1.5px solid #dc2626' : '1.5px solid #e0e0e0', borderRadius:4,
  });

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4f9', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'#fff', borderRadius:8, boxShadow:'0 8px 40px rgba(0,75,141,0.15)', width:'100%', maxWidth:460, overflow:'hidden' }}>
        <div style={{ background:'#004B8D', padding:'1.5rem 2rem', color:'#fff' }}>
          <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:8, width:42, height:42, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'0.75rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'1.2rem', fontWeight:700, margin:0 }}>Cambio de Contraseña Requerido</h2>
          <p style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.75)', marginTop:4 }}>Por seguridad, debe crear una nueva contraseña antes de continuar.</p>
        </div>
        <div style={{ padding:'1.75rem 2rem' }}>
          {fieldErrors._general && (
            <div style={{ background:'#fff3f5', border:'1px solid rgba(220,38,38,0.25)', borderRadius:5, padding:'10px 14px', fontSize:'0.82rem', color:'#b91c1c', marginBottom:'1rem' }}>
              {fieldErrors._general}
            </div>
          )}
          <form onSubmit={handleSubmit}>

            {/* Contraseña actual */}
            <div style={{ marginBottom:'1rem' }}>
              <label style={{ display:'block', fontSize:'0.73rem', fontWeight:700, color:'#444', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:5 }}>
                Contraseña temporal (recibida por correo)
              </label>
              <input name="password_actual" type={showPwd ? 'text' : 'password'}
                placeholder="Ingrese la contraseña temporal"
                value={form.password_actual} onChange={handleChange} required style={inp('password_actual')} />
              {fieldErrors.password_actual && (
                <p style={{ fontSize:'0.72rem', color:'#dc2626', marginTop:3 }}>{fieldErrors.password_actual}</p>
              )}
            </div>

            {/* Nueva contraseña */}
            <div style={{ marginBottom:'0.4rem' }}>
              <label style={{ display:'block', fontSize:'0.73rem', fontWeight:700, color:'#444', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:5 }}>
                Nueva contraseña *
              </label>
              <input name="password_nueva" type={showPwd ? 'text' : 'password'}
                placeholder="Ej: MiClave@2026"
                value={form.password_nueva} onChange={handleChange} required style={inp('password_nueva')} />
              {fieldErrors.password_nueva && (
                <p style={{ fontSize:'0.72rem', color:'#dc2626', marginTop:3 }}>{fieldErrors.password_nueva}</p>
              )}
            </div>

            <PwdReqs pwd={form.password_nueva} />

            {/* Confirmar contraseña */}
            <div style={{ marginBottom:'1rem' }}>
              <label style={{ display:'block', fontSize:'0.73rem', fontWeight:700, color:'#444', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:5 }}>
                Confirmar nueva contraseña *
              </label>
              <input name="password_nueva_confirmation" type={showPwd ? 'text' : 'password'}
                placeholder="Repita la nueva contraseña"
                value={form.password_nueva_confirmation} onChange={handleChange} required style={inp('password_nueva_confirmation')} />
              {fieldErrors.password_nueva_confirmation && (
                <p style={{ fontSize:'0.72rem', color:'#dc2626', marginTop:3 }}>{fieldErrors.password_nueva_confirmation}</p>
              )}
            </div>

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

export default function Dashboard({ usuario, debecambiar, onLogout, onCambiado }) {
  const [loading, setLoading]           = useState(false);
  const [mustChange, setMustChange]     = useState(!!debecambiar);

  const handleCambiado = () => {
    setMustChange(false);
    if (onCambiado) onCambiado();
  };

  if (mustChange) {
    return <CambioContrasenaObligatorio usuario={usuario} onCambiado={handleCambiado} onLogout={onLogout} />;
  }

  const handleLogout = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await client.post(`/logout`, {});
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
