import { useState, useRef } from 'react';
import client from '../api/client';

export default function Ventanilla() {
  const [ci, setCi]               = useState('');
  const [estado, setEstado]       = useState(null);
  const [cargando, setCargando]   = useState(false);
  const [error, setError]         = useState('');
  const [habilitando, setHabilitando] = useState(false);
  const [mensaje, setMensaje]     = useState({ texto: '', tipo: '' });
  const [habilitadosHoy, setHabilitadosHoy] = useState(0);
  const inputRef = useRef(null);

  const verificar = async (e) => {
    e?.preventDefault();
    const val = ci.trim();
    if (!val || isNaN(val)) return;
    setCargando(true);
    setError('');
    setEstado(null);
    setMensaje({ texto: '', tipo: '' });
    try {
      const r = await client.get(`/registro/estado-ci/${val}`);
      setEstado(r.data);
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'No se pudo verificar el CI.');
    } finally {
      setCargando(false);
    }
  };

  const habilitar = async () => {
    setHabilitando(true);
    setMensaje({ texto: '', tipo: '' });
    try {
      const r = await client.post('/registro/operador', { CI: parseInt(ci) });
      setMensaje({ texto: r.data.mensaje, tipo: 'ok' });
      setHabilitadosHoy(h => h + 1);
      const r2 = await client.get(`/registro/estado-ci/${ci}`);
      setEstado(r2.data);
    } catch (err) {
      setMensaje({
        texto: err.response?.data?.mensaje ?? 'Error al habilitar. Intente nuevamente.',
        tipo: 'error',
      });
    } finally {
      setHabilitando(false);
    }
  };

  const limpiar = () => {
    setCi('');
    setEstado(null);
    setError('');
    setMensaje({ texto: '', tipo: '' });
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>
            Ventanilla de Registro
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: 4, marginBottom: 0 }}>
            Verifica el CI del postulante y habilítalo si tiene pago.
          </p>
        </div>
        {habilitadosHoy > 0 && (
          <div style={{
            background: '#d1fae5', color: '#065f46', padding: '6px 14px',
            borderRadius: 20, fontSize: '0.82rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          }}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            {habilitadosHoy} habilitado{habilitadosHoy !== 1 ? 's' : ''} hoy
          </div>
        )}
      </div>

      {/* ── Formulario de búsqueda ───────────────────────────────── */}
      <form onSubmit={verificar} style={{
        background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.09)',
        padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid #e5e7eb',
      }}>
        <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: 8, fontSize: '0.9rem' }}>
          Cédula de Identidad del postulante
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            ref={inputRef}
            type="number"
            value={ci}
            onChange={e => setCi(e.target.value)}
            placeholder="Ej: 8001001"
            autoFocus
            style={{
              flex: 1, padding: '11px 14px', border: '1.5px solid #d1d5db',
              borderRadius: 8, fontSize: '1.1rem', fontWeight: 500,
              outline: 'none', letterSpacing: '0.03em',
            }}
            onFocus={e => (e.target.style.borderColor = '#004B8D')}
            onBlur={e => (e.target.style.borderColor = '#d1d5db')}
          />
          <button
            type="submit"
            disabled={cargando || !ci.trim()}
            style={{
              background: cargando || !ci.trim() ? '#9ca3af' : '#004B8D',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '11px 24px', fontWeight: 600, fontSize: '0.95rem',
              cursor: cargando || !ci.trim() ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {cargando ? 'Verificando…' : 'Verificar'}
          </button>
          {(estado || error) && (
            <button
              type="button"
              onClick={limpiar}
              style={{
                background: '#f3f4f6', color: '#6b7280', border: '1.5px solid #e5e7eb',
                borderRadius: 8, padding: '11px 16px', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 500,
              }}
            >
              Limpiar
            </button>
          )}
        </div>
        {error && (
          <p style={{ color: '#dc2626', fontSize: '0.82rem', marginTop: 8, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14, flexShrink: 0 }}>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            {error}
          </p>
        )}
      </form>

      {/* ── Resultado ────────────────────────────────────────────── */}
      {estado && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Tarjetas de estado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <EstadoCard
              titulo="Estado de Pago"
              etiqueta={
                !estado.tiene_pago
                  ? 'Sin pago registrado'
                  : estado.estado_pago === 'verificado'
                  ? `Verificado · ${estado.tipo_pago ?? ''}`
                  : `Pendiente · ${estado.tipo_pago ?? ''}`
              }
              iconPath={
                !estado.tiene_pago
                  ? 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
                  : estado.estado_pago === 'verificado'
                  ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                  : 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
              }
              color={
                !estado.tiene_pago ? '#dc2626'
                  : estado.estado_pago === 'verificado' ? '#059669'
                  : '#d97706'
              }
              bg={
                !estado.tiene_pago ? '#fef2f2'
                  : estado.estado_pago === 'verificado' ? '#ecfdf5'
                  : '#fffbeb'
              }
            />
            <EstadoCard
              titulo="Estado de Registro"
              etiqueta={
                !estado.ya_registrado
                  ? 'No registrado en el sistema'
                  : estado.estado_cuenta === 'ACTIVO'
                  ? `Habilitado · ${estado.nombre ?? ''}`
                  : `Cuenta ${(estado.estado_cuenta ?? '').toLowerCase()}`
              }
              iconPath={
                estado.ya_registrado && estado.estado_cuenta === 'ACTIVO'
                  ? 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                  : 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
              }
              color={
                estado.ya_registrado && estado.estado_cuenta === 'ACTIVO'
                  ? '#059669'
                  : '#6b7280'
              }
              bg={
                estado.ya_registrado && estado.estado_cuenta === 'ACTIVO'
                  ? '#ecfdf5'
                  : '#f9fafb'
              }
            />
          </div>

          {/* Panel de acción */}
          <div style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '1.25rem 1.5rem',
          }}>
            {!estado.tiene_pago ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ background: '#fef3c7', borderRadius: 8, padding: 10, flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round"
                    style={{ width: 22, height: 22, display: 'block' }}>
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: '#92400e', margin: '0 0 4px' }}>Sin pago registrado</p>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                    Indique al postulante que debe dirigirse a <strong>caja</strong> para realizar su pago de Bs 700 antes de continuar.
                  </p>
                </div>
              </div>
            ) : estado.puede_habilitar ? (
              <div>
                <p style={{ color: '#374151', fontWeight: 500, margin: '0 0 14px', fontSize: '0.9rem' }}>
                  El postulante tiene pago <strong>{estado.estado_pago}</strong> y puede ser habilitado para completar su registro en la plataforma web.
                </p>
                <button
                  onClick={habilitar}
                  disabled={habilitando}
                  style={{
                    background: habilitando ? '#9ca3af' : '#059669',
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '10px 28px', fontWeight: 700, fontSize: '1rem',
                    cursor: habilitando ? 'not-allowed' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {!habilitando && (
                    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  )}
                  {habilitando ? 'Habilitando…' : 'Habilitar Postulante'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: '#ecfdf5', borderRadius: 8, padding: 10, flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round"
                    style={{ width: 22, height: 22, display: 'block' }}>
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: '#065f46', margin: '0 0 2px' }}>
                    Postulante ya habilitado
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                    {estado.nombre ? `${estado.nombre} ya` : 'Este CI ya'} tiene una cuenta activa. Puede ingresar a la plataforma web con su CI y contraseña.
                  </p>
                </div>
              </div>
            )}

            {mensaje.texto && (
              <div style={{
                marginTop: 14, padding: '10px 14px', borderRadius: 8,
                background: mensaje.tipo === 'ok' ? '#ecfdf5' : '#fef2f2',
                color: mensaje.tipo === 'ok' ? '#065f46' : '#dc2626',
                fontSize: '0.875rem', fontWeight: 500,
                borderLeft: `3px solid ${mensaje.tipo === 'ok' ? '#10b981' : '#ef4444'}`,
              }}>
                {mensaje.texto}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EstadoCard({ titulo, etiqueta, iconPath, color, bg }) {
  return (
    <div style={{
      background: bg, borderRadius: 10, padding: '1rem 1.25rem',
      border: `1.5px solid ${color}33`,
    }}>
      <p style={{
        fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af',
        textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px',
      }}>
        {titulo}
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ width: 20, height: 20, flexShrink: 0, marginTop: 1 }}>
          <path d={iconPath}/>
        </svg>
        <span style={{ color, fontWeight: 600, fontSize: '0.88rem', lineHeight: 1.4 }}>
          {etiqueta}
        </span>
      </div>
    </div>
  );
}
