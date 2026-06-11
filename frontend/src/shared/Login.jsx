import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Login.css';
import client from '../api/client';

/*
 * ================================================================
 * Login.jsx — Página de bienvenida y autenticación
 * ================================================================
 * CU1  Iniciar Sesión       → modo 'login'         handleLogin()
 * CU2  Cerrar Sesión        → gestionado en Layout.jsx (logout btn)
 * CU8  Gestionar Postulantes→ modo 'reg-1'/'reg-2' handleVerificarCI()
 *                                                   handleCompletarRegistro()
 * CU9  Info. de Bachillerato→ embebido en reg-2     (campos colegio/egreso/título)
 * ================================================================
 */

/* ── Datos estáticos de la página ──────────────────────────── */
const CARRERAS_STATIC = [
  { nombre: 'Ingeniería de Sistemas', descripcion: 'Análisis, diseño y desarrollo de sistemas de información empresarial, bases de datos, ingeniería de software y arquitecturas cloud.', duracion: '5 años', icon: 'systems', modalidad: 'Virtual y Presencial' },
  { nombre: 'Ingeniería Informática', descripcion: 'Hardware, arquitectura de computadoras, redes e inteligencia artificial para el diseño de infraestructuras tecnológicas completas.', duracion: '5 años', icon: 'informatics', modalidad: 'Virtual y Presencial' },
  { nombre: 'Ingeniería en Telecomunicaciones', descripcion: 'Sistemas de comunicación, redes inalámbricas 5G, fibra óptica y tecnologías emergentes para transmisión de datos a nivel nacional e internacional.', duracion: '5 años', icon: 'telecom', modalidad: 'Presencial' },
  { nombre: 'Ingeniería en Robótica', descripcion: 'Mecatrónica, electrónica e inteligencia artificial para diseñar sistemas autónomos aplicados a industria, medicina y exploración.', duracion: '5 años', icon: 'robotics', modalidad: 'Presencial' },
];

const MATERIAS =[
  { 
    nombre: 'Computación', 
    descripcion: 'Historia de la computación, sistemas de numeración (binario, octal, hexadecimal), conceptos básicos de hardware/software, lógica de programación, algoritmos y diagramas de flujo.', 
    porcentaje: 25, 
    examenes: 3 
  },
  { 
    nombre: 'Matemáticas', 
    descripcion: 'Lógica matemática, teoría de conjuntos, sistemas de ecuaciones, polinomios, funciones, inecuaciones y trigonometría.', 
    porcentaje: 25, 
    examenes: 3 
  },
  { 
    nombre: 'Inglés', 
    descripcion: 'Gramática, ortografía, comprensión de textos, técnicas de lectura crítica, estructura y redacción de textos.', 
    porcentaje: 25, 
    examenes: 3 
  },
  { 
    nombre: 'Física', 
    descripcion: 'Vectores, cinemática (MRU, MRUV, movimiento parabólico), dinámica (Leyes de Newton), estática, trabajo, energía y potencia.', 
    porcentaje: 25, 
    examenes: 3 
  }
];

/* ── Íconos SVG ─────────────────────────────────────────────── */
const icons = {
  systems:    <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  informatics:<svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>,
  telecom:    <svg viewBox="0 0 24 24"><path d="M5.07 5.07a16 16 0 0 1 13.86 0M1.42 9.65a22 22 0 0 1 21.16 0M8.83 13.5a10 10 0 0 1 6.34 0M12 17h.01"/></svg>,
  robotics:   <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 14h.01M16 14h.01M8 18h8"/></svg>,
  shield:     <svg viewBox="0 0 24 24" fill="none" stroke="#004B8D" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2L3 7v6c0 5.25 3.75 10.15 9 11.35C17.25 23.15 21 18.25 21 13V7L12 2z"/><path d="M9 12l2 2 4-4"/></svg>,
  check:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  warn:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  lock:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  eye:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
};

/* ── Selector de carrera con colores por modalidad ──────────── */
function getModalidad(nombre) {
  if (!nombre) return null;
  if (nombre.toLowerCase().includes('virtual'))    return 'virtual';
  if (nombre.toLowerCase().includes('presencial')) return 'presencial';
  return null;
}

function CarreraSelect({ id, name, value, onChange, opciones, placeholder, excluir }) {
  const [open, setOpen] = useState(false);
  // Deduplicar por nombre exacto
  const unique = opciones.filter((c, i, arr) =>
    arr.findIndex(x => x.nombre_carrera === c.nombre_carrera) === i
  );
  const disponibles = excluir ? unique.filter(c => String(c.id) !== String(excluir)) : unique;
  const seleccionada = disponibles.find(c => String(c.id) === String(value));

  const colorPorMod = (nombre) => {
    const m = getModalidad(nombre);
    return m === 'presencial' ? '#15803d' : m === 'virtual' ? '#dc2626' : '#374151';
  };
  const bgPorMod = (nombre) => {
    const m = getModalidad(nombre);
    return m === 'presencial' ? '#f0fdf4' : m === 'virtual' ? '#fef2f2' : '#f9fafb';
  };

  return (
    <div style={{ position:'relative' }}>
      {/* Leyenda */}
      <div style={{ display:'flex', gap:14, marginBottom:6, fontSize:'0.7rem', color:'#6b7280' }}>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:9, height:9, borderRadius:'50%', background:'#16a34a', display:'inline-block' }}/>
          Presencial
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:9, height:9, borderRadius:'50%', background:'#dc2626', display:'inline-block' }}/>
          Virtual
        </span>
      </div>

      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          border: '1.5px solid #ddd', borderRadius:5, background:'white',
          padding:'10px 14px', display:'flex', alignItems:'center',
          justifyContent:'space-between', cursor:'pointer', userSelect:'none',
        }}
      >
        {seleccionada ? (
          <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.88rem', color: colorPorMod(seleccionada.nombre_carrera) }}>
            <span style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background: colorPorMod(seleccionada.nombre_carrera) }}/>
            {seleccionada.nombre_carrera}
          </span>
        ) : (
          <span style={{ color:'#9ca3af', fontSize:'0.88rem' }}>{placeholder}</span>
        )}
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2.5}><path d="M6 9l6 6 6-6"/></svg>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0, zIndex:200,
          background:'white', border:'1.5px solid #ddd', borderTop:'none',
          borderRadius:'0 0 6px 6px', maxHeight:220, overflowY:'auto',
          boxShadow:'0 8px 24px rgba(0,0,0,0.1)',
        }}>
          <div
            onClick={() => { onChange({ target:{ name, value:'' } }); setOpen(false); }}
            style={{ padding:'9px 14px', fontSize:'0.82rem', color:'#9ca3af', cursor:'pointer' }}
          >
            {placeholder}
          </div>
          {disponibles.map(c => (
            <div
              key={c.id}
              onClick={() => { onChange({ target:{ name, value: c.id } }); setOpen(false); }}
              style={{
                padding:'9px 14px', display:'flex', alignItems:'center', gap:8,
                fontSize:'0.85rem', cursor:'pointer',
                background: String(c.id) === String(value) ? bgPorMod(c.nombre_carrera) : 'white',
                color: colorPorMod(c.nombre_carrera),
                borderLeft: `3px solid ${colorPorMod(c.nombre_carrera)}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = bgPorMod(c.nombre_carrera); }}
              onMouseLeave={e => { e.currentTarget.style.background = String(c.id) === String(value) ? bgPorMod(c.nombre_carrera) : 'white'; }}
            >
              <span style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background: colorPorMod(c.nombre_carrera) }}/>
              {c.nombre_carrera}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Componentes reutilizables de la tarjeta ─────────────────── */
function Spinner() {
  return <span className="lp-btn-login__spinner" />;
}
function Alert({ type, children }) {
  return <div className={`lp-alert lp-alert--${type}`}><span className="lp-alert__icon">{type === 'error' ? icons.warn : icons.check}</span><span>{children}</span></div>;
}
function FormGroup({ label, id, children }) {
  return (
    <div className="lp-form-group">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

/* ── Componente principal ───────────────────────────────────── */
export default function Login({ onLogin }) {
  /* Estado de navegación de la tarjeta */
  const [mode, setMode] = useState('welcome');
  // 'welcome' | 'login' | 'reg-1' | 'reg-2' | 'reset-request' | 'reset-sent'

  /* Formulario de login */
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [showPwd, setShowPwd]     = useState(false);
  const [blockInfo, setBlockInfo] = useState(null); // { segundos, bloqueado_hasta }

  /* Formulario de registro fase 1 (verificar CI) */
  const [ciForm, setCiForm] = useState({ CI: '' });
  const [ciVerificado, setCiVerificado] = useState(null);

  /* Formulario de registro fase 2 (datos completos) */
  const emptyReg = {
    CI: '', nombre_completo: '', email: '', email_confirmation: '',
    fecha_nacimiento: '', sexo: '', direccion: '', telefono: '',
    colegio_procedencia: '', ciudad: '', anio_egreso: '',
    titulo_bachiller: '', carrera_opcion1_id: '', carrera_opcion2_id: '',
  };
  const [regForm, setRegForm] = useState(emptyReg);

  /* Formulario de restablecimiento */
  const [resetEmail, setResetEmail] = useState('');

  /* Estado compartido */
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [carreras, setCarreras] = useState([]);

  /* Refs para scroll suave */
  const heroRef     = useRef(null);
  const carrerasRef = useRef(null);
  const cupRef      = useRef(null);
  const footerRef   = useRef(null);

  /* Efectos */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    client.get(`/registro/carreras`)
      .then(r => setCarreras(r.data))
      .catch(() => {}); // Silencioso: se usa CARRERAS_STATIC si falla
  }, []);

  /* Temporizador de bloqueo */
  useEffect(() => {
    if (!blockInfo) return;
    if (blockInfo.segundos <= 0) { setBlockInfo(null); return; }
    const t = setTimeout(() => setBlockInfo(p => ({ ...p, segundos: p.segundos - 1 })), 1000);
    return () => clearTimeout(t);
  }, [blockInfo]);

  /* Helpers */
  const clearMessages  = () => { setError(''); setSuccess(''); };
  const goTo = (m)     => { setMode(m); clearMessages(); };
  const scrollTo = (r) => r.current?.scrollIntoView({ behavior: 'smooth' });

  const handleLoginChange = (e) => {
    setLoginForm(p => ({ ...p, [e.target.name]: e.target.value }));
    clearMessages();
  };
  const handleRegChange = (e) => {
    setRegForm(p => ({ ...p, [e.target.name]: e.target.value }));
    clearMessages();
  };

  /* ── Acción: Login ─────────────────────────────────────────── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); clearMessages();
    try {
      const { data } = await client.post(`/login`, loginForm);
      localStorage.setItem('token',   data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      onLogin({ ...data });
    } catch (err) {
      const d = err.response?.data;
      if (err.response?.status === 429 && d?.segundos) {
        setBlockInfo({ segundos: d.segundos, bloqueado_hasta: d.bloqueado_hasta });
        setError(d.mensaje);
      } else {
        setError(d?.mensaje || 'Error al conectar con el servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Acción: Verificar CI ──────────────────────────────────── */
  const handleVerificarCI = async (e) => {
    e.preventDefault();
    if (!ciForm.CI.trim()) { setError('Ingrese su Cédula de Identidad.'); return; }
    setLoading(true); clearMessages();
    try {
      const { data } = await client.post(`/registro/verificar-ci`, { CI: ciForm.CI });
      setCiVerificado(data.CI);
      setRegForm(p => ({ ...p, CI: data.CI }));
      goTo('reg-2');
    } catch (err) {
      const d = err.response?.data;
      if (d?.codigo === 'YA_REGISTRADO') {
        setError('Este CI ya tiene una cuenta. Use "Acceso al Sistema".');
      } else {
        setError(d?.mensaje || 'Error al verificar el CI.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Acción: Completar Registro ────────────────────────────── */
  const handleCompletarRegistro = async (e) => {
    e.preventDefault();
    setLoading(true); clearMessages();
    try {
      const { data } = await client.post(`/registro/completar`, regForm);
      setSuccess(data.mensaje);
      setRegForm(emptyReg);
      setCiVerificado(null);
      // Volver al inicio después de 5 segundos
      setTimeout(() => goTo('welcome'), 5000);
    } catch (err) {
      const d = err.response?.data;
      if (d?.errors) {
        const msgs = Object.values(d.errors).flat();
        setError(msgs.join(' · '));
      } else {
        setError(d?.mensaje || 'Error al completar el registro.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Acción: Solicitar Reset Password ──────────────────────── */
  const handleSolicitarReset = async (e) => {
    e.preventDefault();
    setLoading(true); clearMessages();
    try {
      const { data } = await client.post(`/password/solicitar`, { email: resetEmail });
      setSuccess(data.mensaje);
      goTo('reset-sent');
    } catch {
      setError('Error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Renderizado de la tarjeta según modo ───────────────────── */
  const isWide = mode === 'reg-2';

  const cardHeader = {
    welcome:       { title: 'Sistema CUP — FICCT', sub: 'Seleccione una opción para continuar' },
    login:         { title: 'Acceso al Sistema',    sub: 'Ingrese sus credenciales institucionales' },
    'reg-1':       { title: 'Registrarse al CUP',   sub: 'Paso 1 de 2 — Verificación de CI' },
    'reg-2':       { title: 'Completar Registro',   sub: 'Paso 2 de 2 — Datos personales y académicos' },
    'reset-request':{ title: 'Recuperar Contraseña', sub: 'Ingrese su correo institucional' },
    'reset-sent':  { title: 'Correo Enviado',        sub: 'Revise su bandeja de entrada' },
  }[mode];

  return (
    <div className="login-page">

      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <nav className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`}>
        <div className="lp-nav__inner">
          <div className="lp-nav__brand">
            <div className="lp-nav__shield">{icons.shield}</div>
            <div className="lp-nav__titles">
              <span className="lp-nav__name">FICCT — UAGRM</span>
              <span className="lp-nav__sub">Sistema de Admisión CUP</span>
            </div>
          </div>
          <ul className="lp-nav__links">
            <li><button onClick={() => scrollTo(heroRef)}>Inicio</button></li>
            <li><button onClick={() => scrollTo(carrerasRef)}>Carreras</button></li>
            <li><button onClick={() => scrollTo(cupRef)}>CUP</button></li>
            <li><button onClick={() => scrollTo(footerRef)}>Contacto</button></li>
          </ul>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="lp-hero" ref={heroRef}>
        <div className={`lp-hero__inner${isWide ? ' lp-hero__inner--wide' : ''}`}>

          {/* Lado izquierdo (branding) */}
          {!isWide && (
            <div className="lp-hero__left">
              <div className="lp-hero__eyebrow">Universidad Autónoma Gabriel René Moreno</div>
              <h1 className="lp-hero__title">
                Facultad de Ingeniería en<br />
                <span>Ciencias de la Computación</span>
                y Telecomunicaciones
              </h1>
              <p className="lp-hero__desc">
                Bienvenido al Sistema de Admisión Universitaria CUP de la FICCT.
                Acceda con sus credenciales o complete su registro para postular
                a las carreras de ingeniería que ofrece nuestra Facultad.
              </p>
              <div className="lp-hero__stats">
                <div><span className="lp-hero__stat-value">4</span><span className="lp-hero__stat-label">Carreras</span></div>
                <div><span className="lp-hero__stat-value">4</span><span className="lp-hero__stat-label">Materias</span></div>
                <div><span className="lp-hero__stat-value">60pts</span><span className="lp-hero__stat-label">Para aprobar</span></div>
              </div>
            </div>
          )}

          {/* ── TARJETA DINÁMICA ──────────────────────────────── */}
          <div className={`lp-login-card${isWide ? ' lp-login-card--wide' : ''}`}>

            {/* Encabezado */}
            <div className="lp-login-card__header">
              {mode !== 'welcome' && (
                <button className="lp-back-btn" onClick={() => goTo(mode === 'reg-2' ? 'reg-1' : 'welcome')} title="Volver">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                </button>
              )}
              <h2>{cardHeader?.title}</h2>
              <p>{cardHeader?.sub}</p>
              {mode === 'reg-2' && (
                <div className="lp-step-dots">
                  <span className="lp-step-dot lp-step-dot--done" />
                  <span className="lp-step-dot lp-step-dot--active" />
                </div>
              )}
              {mode === 'reg-1' && (
                <div className="lp-step-dots">
                  <span className="lp-step-dot lp-step-dot--active" />
                  <span className="lp-step-dot" />
                </div>
              )}
            </div>

            <div className="lp-login-card__body">
              {error   && <Alert type="error">{error}</Alert>}
              {success && <Alert type="success">{success}</Alert>}

              {/* ── BIENVENIDA ──────────────────────────────── */}
              {mode === 'welcome' && (
                <div className="lp-welcome">
                  <button className="lp-welcome-btn lp-welcome-btn--primary" onClick={() => goTo('login')}>
                    <div className="lp-welcome-btn__icon">{icons.shield}</div>
                    <div>
                      <strong>Acceso al Sistema</strong>
                      <span>Ingrese sus credenciales institucionales</span>
                    </div>
                  </button>
                  <button className="lp-welcome-btn lp-welcome-btn--secondary" onClick={() => goTo('reg-1')}>
                    <div className="lp-welcome-btn__icon lp-welcome-btn__icon--outline">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#004B8D" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                    </div>
                    <div>
                      <strong>Registrarse al Sistema</strong>
                      <span>Ingrese sus datos personales</span>
                    </div>
                  </button>
                </div>
              )}

              {/* ── FORMULARIO LOGIN ─────────────────────────── */}
              {mode === 'login' && (
                <form onSubmit={handleLogin}>
                  {blockInfo?.segundos > 0 && (
                    <div className="lp-blocked">
                      <span className="lp-blocked__icon">{icons.lock}</span>
                      <span>Cuenta bloqueada — Espere <strong>{blockInfo.segundos}s</strong></span>
                    </div>
                  )}
                  <FormGroup label="Correo electrónico o CI" id="identifier">
                    <input id="identifier" name="identifier" type="text"
                      placeholder="usuario@ficct.edu.bo  ó  12345678"
                      value={loginForm.identifier} onChange={handleLoginChange}
                      required autoFocus />
                  </FormGroup>
                  <FormGroup label="Contraseña" id="password">
                    <div className="lp-input-pwd">
                      <input id="password" name="password" type={showPwd ? 'text' : 'password'}
                        placeholder="••••••••" value={loginForm.password}
                        onChange={handleLoginChange} required />
                      <button type="button" className="lp-input-pwd__toggle"
                        onClick={() => setShowPwd(p => !p)}>
                        {showPwd ? icons.eyeOff : icons.eye}
                      </button>
                    </div>
                  </FormGroup>
                  <button type="submit" className="lp-btn-login" disabled={loading || blockInfo?.segundos > 0}>
                    {loading && <Spinner />}{loading ? 'Verificando...' : 'Iniciar Sesión'}
                  </button>
                  <button type="button" className="lp-link-btn" onClick={() => goTo('reset-request')}>
                    ¿Olvidó su contraseña?
                  </button>
                </form>
              )}

              {/* ── REGISTRO FASE 1: Verificar CI ───────────── */}
              {mode === 'reg-1' && (
                <form onSubmit={handleVerificarCI}>
                  <div className="lp-reg1-hint">
                    <span className="lp-reg1-hint__icon">{icons.warn}</span>
                    <p>Su CI debe haber sido habilitado previamente en la ventanilla de la Facultad.</p>
                  </div>
                  <FormGroup label="Cédula de Identidad (CI)" id="CI">
                    <input id="CI" name="CI" type="number" placeholder="Ej: 12345678"
                      value={ciForm.CI} onChange={e => { setCiForm({ CI: e.target.value }); clearMessages(); }}
                      required autoFocus min="1000" />
                  </FormGroup>
                  <button type="submit" className="lp-btn-login" disabled={loading}>
                    {loading && <Spinner />}{loading ? 'Verificando...' : 'Verificar CI'}
                  </button>
                </form>
              )}

              {/* ── REGISTRO FASE 2: Datos completos ────────── */}
              {mode === 'reg-2' && (
                <form onSubmit={handleCompletarRegistro} className="lp-reg-form">

                  {/* CI bloqueado */}
                  <div className="lp-reg-ci-badge">
                    <span>CI verificado:</span>
                    <strong>{regForm.CI}</strong>
                  </div>

                  {/* SECCIÓN 1: Datos personales */}
                  <div className="lp-reg-section">
                    <h4 className="lp-reg-section__title">Datos Personales</h4>
                    <div className="lp-reg-grid lp-reg-grid--full">
                      <FormGroup label="Nombre completo *" id="nombre_completo">
                        <input id="nombre_completo" name="nombre_completo" type="text"
                          placeholder="Ej: Juan Carlos Pérez Mamani"
                          value={regForm.nombre_completo} onChange={handleRegChange} required />
                      </FormGroup>
                    </div>
                    <div className="lp-reg-grid lp-reg-grid--2">
                      <FormGroup label="Fecha de nacimiento *" id="fecha_nacimiento">
                        <input id="fecha_nacimiento" name="fecha_nacimiento" type="date"
                          value={regForm.fecha_nacimiento} onChange={handleRegChange} required />
                      </FormGroup>
                      <FormGroup label="Sexo *" id="sexo">
                        <select id="sexo" name="sexo" value={regForm.sexo} onChange={handleRegChange} required>
                          <option value="">Seleccionar...</option>
                          <option value="M">Masculino</option>
                          <option value="F">Femenino</option>
                        </select>
                      </FormGroup>
                    </div>
                  </div>

                  {/* SECCIÓN 2: Contacto */}
                  <div className="lp-reg-section">
                    <h4 className="lp-reg-section__title">Contacto y Ubicación</h4>
                    <div className="lp-reg-grid lp-reg-grid--full">
                      <FormGroup label="Dirección *" id="direccion">
                        <input id="direccion" name="direccion" type="text"
                          placeholder="Ej: Av. Cañoto #240, Santa Cruz"
                          value={regForm.direccion} onChange={handleRegChange} required />
                      </FormGroup>
                    </div>
                    <div className="lp-reg-grid lp-reg-grid--2">
                      <FormGroup label="Teléfono / Celular *" id="telefono">
                        <input id="telefono" name="telefono" type="tel"
                          placeholder="Ej: 70012345"
                          value={regForm.telefono} onChange={handleRegChange} required />
                      </FormGroup>
                      <FormGroup label="Ciudad *" id="ciudad">
                        <input id="ciudad" name="ciudad" type="text"
                          placeholder="Ej: Santa Cruz"
                          value={regForm.ciudad} onChange={handleRegChange} required />
                      </FormGroup>
                    </div>
                  </div>

                  {/* SECCIÓN 3: Educación */}
                  <div className="lp-reg-section">
                    <h4 className="lp-reg-section__title">Información Académica</h4>
                    <div className="lp-reg-grid lp-reg-grid--full">
                      <FormGroup label="Colegio de procedencia *" id="colegio_procedencia">
                        <input id="colegio_procedencia" name="colegio_procedencia" type="text"
                          placeholder="Ej: U.E. Cristo Rey"
                          value={regForm.colegio_procedencia} onChange={handleRegChange} required />
                      </FormGroup>
                    </div>
                    <div className="lp-reg-grid lp-reg-grid--2">
                      <FormGroup label="Año de egreso *" id="anio_egreso">
                        <input id="anio_egreso" name="anio_egreso" type="number"
                          placeholder={`Ej: ${new Date().getFullYear() - 1}`}
                          min="1990" max={new Date().getFullYear()}
                          value={regForm.anio_egreso} onChange={handleRegChange} required />
                      </FormGroup>
                      <FormGroup label="Título de bachiller *" id="titulo_bachiller">
                        <input id="titulo_bachiller" name="titulo_bachiller" type="text"
                          placeholder="Ej: Bachiller en Humanidades"
                          value={regForm.titulo_bachiller} onChange={handleRegChange} required />
                      </FormGroup>
                    </div>
                  </div>

                  {/* SECCIÓN 4: Acceso */}
                  <div className="lp-reg-section">
                    <h4 className="lp-reg-section__title">Correo de Acceso</h4>
                    <div className="lp-reg-grid lp-reg-grid--2">
                      <FormGroup label="Correo electrónico *" id="email">
                        <input id="email" name="email" type="email"
                          placeholder="juan@gmail.com"
                          value={regForm.email} onChange={handleRegChange} required />
                      </FormGroup>
                      <FormGroup label="Confirmar correo *" id="email_confirmation">
                        <input id="email_confirmation" name="email_confirmation" type="email"
                          placeholder="Repita su correo"
                          value={regForm.email_confirmation} onChange={handleRegChange} required />
                      </FormGroup>
                    </div>
                    <div className="lp-info-note">
                      Se enviará una <strong>contraseña temporal</strong> a este correo para su primer acceso al sistema.
                    </div>
                  </div>

                  {/* SECCIÓN 5: Carreras */}
                  <div className="lp-reg-section">
                    <h4 className="lp-reg-section__title">Elección de Carrera</h4>
                    <div className="lp-reg-grid lp-reg-grid--2">
                      <FormGroup label="Primera opción *" id="carrera_opcion1_id">
                        <CarreraSelect
                          id="carrera_opcion1_id"
                          name="carrera_opcion1_id"
                          value={regForm.carrera_opcion1_id}
                          onChange={handleRegChange}
                          opciones={carreras.length ? carreras : CARRERAS_STATIC.map((c,i) => ({ id: ['SIS','INF','TEL','ROB'][i], nombre_carrera: c.nombre }))}
                          placeholder="Seleccionar carrera..."
                        />
                      </FormGroup>
                      <FormGroup label="Segunda opción (opcional)" id="carrera_opcion2_id">
                        <CarreraSelect
                          id="carrera_opcion2_id"
                          name="carrera_opcion2_id"
                          value={regForm.carrera_opcion2_id}
                          onChange={handleRegChange}
                          opciones={carreras.length ? carreras : CARRERAS_STATIC.map((c,i) => ({ id: ['SIS','INF','TEL','ROB'][i], nombre_carrera: c.nombre }))}
                          placeholder="Ninguna"
                          excluir={regForm.carrera_opcion1_id}
                        />
                      </FormGroup>
                    </div>
                  </div>

                  <button type="submit" className="lp-btn-login" disabled={loading}>
                    {loading && <Spinner />}{loading ? 'Registrando...' : 'Completar Registro'}
                  </button>
                </form>
              )}

              {/* ── SOLICITAR RESET PASSWORD ─────────────────── */}
              {mode === 'reset-request' && (
                <form onSubmit={handleSolicitarReset}>
                  <p style={{ fontSize: '0.85rem', color: '#6b6b6b', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                    Ingrese el correo electrónico asociado a su cuenta. Le enviaremos un enlace para crear una nueva contraseña (válido por 15 minutos).
                  </p>
                  <FormGroup label="Correo electrónico" id="resetEmail">
                    <input id="resetEmail" name="resetEmail" type="email"
                      placeholder="usuario@ficct.edu.bo"
                      value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                      required autoFocus />
                  </FormGroup>
                  <button type="submit" className="lp-btn-login" disabled={loading}>
                    {loading && <Spinner />}{loading ? 'Enviando...' : 'Enviar Instrucciones'}
                  </button>
                  <button type="button" className="lp-link-btn" onClick={() => goTo('login')}>
                    Volver al inicio de sesión
                  </button>
                </form>
              )}

              {/* ── RESET ENVIADO ─────────────────────────────── */}
              {mode === 'reset-sent' && (
                <div className="lp-sent-ok">
                  <div className="lp-sent-ok__icon">{icons.check}</div>
                  <p>Revise su bandeja de entrada. Si el correo está registrado, recibirá el enlace de restablecimiento en breve.</p>
                  <button className="lp-btn-login" onClick={() => goTo('login')}>
                    Volver al inicio de sesión
                  </button>
                </div>
              )}
            </div>

            <div className="lp-login-card__footer">
              Para soporte técnico contacte a la administración de la Facultad · FICCT UAGRM
            </div>
          </div>
        </div>
      </section>

      {/* ── CARRERAS ──────────────────────────────────────────── */}
      <section className="lp-section lp-section--white" ref={carrerasRef}>
        <div className="lp-section__inner">
          <p className="lp-section-label">Oferta Académica</p>
          <h2 className="lp-section-title">Carreras que ofrece la FICCT</h2>
          <p className="lp-section-subtitle">Cuatro disciplinas de ingeniería de vanguardia tecnológica para el desarrollo de Bolivia.</p>
          <div className="lp-careers-grid">
            {CARRERAS_STATIC.map(c => (
              <div className="lp-career-card" key={c.nombre}>
                <div className="lp-career-card__badge">Ing. de 5 años</div>
                <div className="lp-career-card__icon">{icons[c.icon]}</div>
                <h3>{c.nombre}</h3>
                <p>{c.descripcion}</p>
                <div className="lp-career-card__meta">
                  <div className="lp-career-card__meta-item"><span className="lp-career-card__meta-label">Duración</span><span className="lp-career-card__meta-value">{c.duracion}</span></div>
                  <div className="lp-career-card__meta-item"><span className="lp-career-card__meta-label">Modalidad</span><span className="lp-career-card__meta-value">{c.modalidad}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN CUP ───────────────────────────────────────── */}
      <section className="lp-section lp-section--cream" ref={cupRef}>
        <div className="lp-section__inner">
          <p className="lp-section-label">Proceso de Admisión</p>
          <h2 className="lp-section-title">Curso Pre-universitario (CUP)</h2>
          <div className="lp-cup-header">
            <div className="lp-cup-left">
              <p className="lp-section-subtitle" style={{ marginBottom: '1.5rem' }}>El CUP es el proceso de admisión que deben completar todos los postulantes a la FICCT. Grupos de máximo 70 estudiantes, 3 evaluaciones por materia, nota mínima 60 puntos.</p>
              <div style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'10px 18px', background:'rgba(0,75,141,0.08)', border:'1px solid rgba(0,75,141,0.2)', borderRadius:6, fontSize:'0.82rem', fontWeight:600, color:'#004B8D' }}>
                <span style={{ width:18, height:18 }}>{icons.check}</span>
                Nota mínima de aprobación: 60 puntos sobre 100
              </div>
            </div>
            <div className="lp-cup-right">
              <div className="lp-cup-info-card">
                <h4>Proceso paso a paso</h4>
                <div className="lp-cup-steps">
                  {[['Pago','Realizar el pago de inscripción habilitado por la Facultad.'],['Requisitos','Presentar título de bachiller y documentos en ventanilla.'],['Registro','Completar su perfil en esta plataforma usando su CI.'],['Asignación','La Facultad asigna grupos, horarios, aula y docentes.'],['Evaluaciones','3 exámenes por materia: Computación, Matemáticas, Inglés y Física.'],['Resultado','Promedio ≥ 60 pts = APROBADO. Admisión a la carrera elegida.']].map(([t,d],i) => (
                    <div className="lp-cup-step" key={t}>
                      <div className="lp-cup-step__num">{i+1}</div>
                      <div className="lp-cup-step__text"><strong>{t}:</strong> {d}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="lp-section-label" style={{ marginBottom:'1.5rem' }}>Materias evaluadas</p>
          <div className="lp-subjects-grid">
            {MATERIAS.map(m => (
              <div className="lp-subject-card" key={m.nombre}>
                <div className="lp-subject-card__ring"><span className="lp-subject-card__pct">{m.porcentaje}%</span></div>
                <h3>{m.nombre}</h3>
                <p>{m.descripcion}</p>
                <span className="lp-subject-card__tag">{m.examenes} exámenes</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PIE DE PÁGINA ─────────────────────────────────────── */}
      <footer className="lp-footer" ref={footerRef}>
        <div className="lp-footer__inner">
          <div className="lp-footer__top">
            <div className="lp-footer__brand">
              <h3>FICCT — Universidad Autónoma Gabriel René Moreno</h3>
              <p>Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones. Formando ingenieros con excelencia académica para el desarrollo tecnológico de Bolivia.</p>
              <div className="lp-footer__badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                Acreditada — UAGRM · Santa Cruz, Bolivia
              </div>
            </div>
            <div className="lp-footer__col">
              <h4>Carreras</h4>
              <ul>
                <li>Ing. de Sistemas</li><li>Ing. Informática</li>
                <li>Ing. en Telecomunicaciones</li><li>Ing. en Robótica</li>
              </ul>
            </div>
            <div className="lp-footer__col">
              <h4>Contacto</h4>
              <ul>
                <li>Modulos UAGRM — Santa Cruz</li><li>Edificio FICCT, 236</li>
                <li>secretaria@ficct.uagrm.edu.bo</li><li>Lun–Vie: 08:00–15:00</li>
              </ul>
            </div>
          </div>
          <div className="lp-footer__bottom">
            <span>&copy; {new Date().getFullYear()} FICCT — UAGRM. Todos los derechos reservados.</span>
            <span>Sistema CUP v1.0 &nbsp;·&nbsp; Laravel 12 &nbsp;·&nbsp; React 19</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
