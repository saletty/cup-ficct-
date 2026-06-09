// ============================================================
// CU13 — Ver Carga Horaria + Registrar Asistencia (Docente)
// ============================================================
import { useState, useEffect } from 'react';
import client from '../../api/client';
import '../../shared/pages.css';

const DIAS_ORDEN = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const ESTADO_COLORS = {
  presente:    { bg: '#dcfce7', color: '#15803d', label: 'Presente' },
  ausente:     { bg: '#fee2e2', color: '#dc2626', label: 'Ausente'  },
  justificado: { bg: '#fef3c7', color: '#b45309', label: 'Justificado' },
};

const hoy = () => new Date().toISOString().split('T')[0];

export default function CargaHoraria() {
  const usuario = (() => {
    try { return JSON.parse(localStorage.getItem('usuario')); } catch { return null; }
  })();

  /* ── Estado principal ─────────────────────────────────── */
  const [asignaciones, setAsignaciones] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  /* ── Estado de asistencia ─────────────────────────────── */
  const [panelGrupo, setPanelGrupo]         = useState(null); // {grupo_id, convocatoria_id, materia}
  const [fecha, setFecha]                   = useState(hoy);
  const [lista, setLista]                   = useState([]);
  const [cargandoLista, setCargandoLista]   = useState(false);
  const [guardando, setGuardando]           = useState(false);
  const [mensajeAsist, setMensajeAsist]     = useState({ texto: '', tipo: '' });
  const [tieneRegistros, setTieneRegistros] = useState(false);

  /* ── Carga horaria ────────────────────────────────────── */
  useEffect(() => {
    if (!usuario?.CI) { setError('No se pudo identificar al usuario.'); setLoading(false); return; }
    client.get(`/docentes/${usuario.CI}/carga-horaria`)
      .then(({ data }) => setAsignaciones(data.asignaciones ?? []))
      .catch(err => {
        if (err.response?.status === 403) setError('Solo puedes consultar tu propia carga horaria.');
        else if (err.response?.status === 404) setError('No tienes un perfil de docente registrado. Contacte al coordinador.');
        else setError('Error al cargar la información.');
      })
      .finally(() => setLoading(false));
  }, []);

  /* ── Cargar lista de asistencia ──────────────────────── */
  const cargarLista = async (grupo_id, convocatoria_id, fechaVal) => {
    setCargandoLista(true);
    setMensajeAsist({ texto: '', tipo: '' });
    try {
      const { data } = await client.get('/asistencia', {
        params: { grupo_id, convocatoria_id, fecha: fechaVal },
      });
      setLista(data.postulantes ?? []);
      setTieneRegistros(data.tiene_registros ?? false);
    } catch {
      setLista([]);
    } finally {
      setCargandoLista(false);
    }
  };

  const abrirPanel = (a) => {
    const grupo = { grupo_id: a.grupo_id, convocatoria_id: a.convocatoria_id, materia: a.materia?.nombre ?? '—' };
    if (panelGrupo?.grupo_id === a.grupo_id && panelGrupo?.convocatoria_id === a.convocatoria_id) {
      setPanelGrupo(null);
      return;
    }
    setPanelGrupo(grupo);
    setFecha(hoy());
    setMensajeAsist({ texto: '', tipo: '' });
    cargarLista(a.grupo_id, a.convocatoria_id, hoy());
  };

  const cambiarFecha = (nuevaFecha) => {
    setFecha(nuevaFecha);
    if (panelGrupo) cargarLista(panelGrupo.grupo_id, panelGrupo.convocatoria_id, nuevaFecha);
  };

  const cambiarEstado = (ci, nuevoEstado) => {
    setLista(prev => prev.map(p => p.CI === ci ? { ...p, estado: nuevoEstado } : p));
  };

  const guardar = async () => {
    if (!panelGrupo || lista.length === 0) return;
    setGuardando(true);
    setMensajeAsist({ texto: '', tipo: '' });
    try {
      const { data } = await client.post('/asistencia', {
        grupo_id:        panelGrupo.grupo_id,
        convocatoria_id: panelGrupo.convocatoria_id,
        fecha,
        registros: lista.map(p => ({
          postulante_ci: p.CI,
          estado:        p.estado,
          observacion:   p.observacion ?? null,
        })),
      });
      setMensajeAsist({ texto: data.mensaje, tipo: 'ok' });
      setTieneRegistros(true);
      setLista(prev => prev.map(p => ({ ...p, ya_guardado: true })));
    } catch (err) {
      setMensajeAsist({
        texto: err.response?.data?.mensaje ?? 'Error al guardar. Intente nuevamente.',
        tipo: 'error',
      });
    } finally {
      setGuardando(false);
    }
  };

  /* ── Resumen semanal ──────────────────────────────────── */
  const horariosSemana = asignaciones.flatMap(a =>
    (a.grupo?.horarios ?? []).map(h => ({
      dia: h.dia, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin,
      aula: h.aula, grupo: a.grupo_id, convocatoria: a.convocatoria_id,
      materia: a.materia?.nombre ?? '—',
    }))
  ).sort((a, b) => {
    const di = DIAS_ORDEN.indexOf(a.dia) - DIAS_ORDEN.indexOf(b.dia);
    return di !== 0 ? di : a.hora_inicio.localeCompare(b.hora_inicio);
  });

  /* ── Conteo para el panel ─────────────────────────────── */
  const conteo = lista.reduce((acc, p) => {
    acc[p.estado] = (acc[p.estado] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU13</p>
          <h1 className="pg-title">Mi Carga Horaria</h1>
          <p className="pg-subtitle">
            {usuario?.nombre_completo} · {asignaciones.length} grupo(s) asignado(s)
          </p>
        </div>
      </div>

      {loading && <div className="pg-loading">Cargando tu carga horaria...</div>}
      {error   && <div className="pg-alert pg-alert--error" style={{ margin: '1rem 0' }}>{error}</div>}

      {!loading && !error && (
        <>
          {/* ── Tarjetas por grupo ─────────────────────────── */}
          {asignaciones.length === 0 ? (
            <div className="pg-table-wrap">
              <div className="pg-empty">No tienes grupos asignados en la convocatoria actual.</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {asignaciones.map((a, i) => {
                  const esActivo = panelGrupo?.grupo_id === a.grupo_id && panelGrupo?.convocatoria_id === a.convocatoria_id;
                  return (
                    <div key={i} style={{
                      background: '#fff', borderRadius: 8,
                      boxShadow: esActivo ? '0 0 0 2px #004B8D' : '0 1px 8px rgba(0,0,0,0.07)',
                      padding: '1.25rem', transition: 'box-shadow 0.15s',
                    }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span className="pg-badge pg-badge--activa" style={{ fontSize: '0.9rem' }}>{a.grupo_id}</span>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2 }}>{a.materia?.nombre}</p>
                          <p style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                            {a.convocatoria_id} · {a.grupo?.carrera?.nombre_carrera ?? 'Carrera no especificada'}
                          </p>
                        </div>
                      </div>

                      {(a.grupo?.horarios ?? []).length === 0
                        ? <p style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Sin horarios asignados</p>
                        : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                            {(a.grupo?.horarios ?? []).map((h, j) => (
                              <div key={j} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.78rem' }}>
                                <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 4, fontWeight: 600, minWidth: 70, textAlign: 'center' }}>{h.dia}</span>
                                <span>{h.hora_inicio} – {h.hora_fin}</span>
                                {h.aula && <span style={{ color: '#6b7280' }}>· Aula {h.aula.nro}</span>}
                              </div>
                            ))}
                          </div>
                        )
                      }

                      <button
                        onClick={() => abrirPanel(a)}
                        style={{
                          width: '100%', padding: '7px 0', borderRadius: 6, border: 'none',
                          background: esActivo ? '#004B8D' : '#eff6ff',
                          color: esActivo ? '#fff' : '#1d4ed8',
                          fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        {esActivo ? 'Cerrar asistencia' : 'Registrar asistencia'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* ── Panel de asistencia ───────────────────────── */}
              {panelGrupo && (
                <div style={{
                  background: '#fff', borderRadius: 10, border: '1.5px solid #e5e7eb',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '1.5rem', overflow: 'hidden',
                }}>
                  {/* Cabecera del panel */}
                  <div style={{
                    background: '#004B8D', color: '#fff', padding: '14px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                  }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        Asistencia · Grupo {panelGrupo.grupo_id}
                      </span>
                      <span style={{ opacity: 0.7, fontSize: '0.8rem', marginLeft: 8 }}>
                        {panelGrupo.convocatoria_id} · {panelGrupo.materia}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="date"
                        value={fecha}
                        onChange={e => cambiarFecha(e.target.value)}
                        style={{
                          padding: '5px 10px', borderRadius: 6, border: 'none',
                          fontSize: '0.85rem', background: 'rgba(255,255,255,0.15)',
                          color: '#fff', colorScheme: 'dark',
                        }}
                      />
                      <button
                        onClick={() => cambiarFecha(hoy())}
                        style={{
                          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                          color: '#fff', padding: '5px 12px', borderRadius: 6,
                          fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Hoy
                      </button>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div style={{ padding: '1.25rem 1.5rem' }}>
                    {cargandoLista ? (
                      <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>Cargando lista...</div>
                    ) : lista.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                        No hay postulantes inscritos en este grupo.
                      </div>
                    ) : (
                      <>
                        {tieneRegistros && (
                          <div style={{
                            background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6,
                            padding: '8px 14px', fontSize: '0.8rem', color: '#92400e',
                            marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14, flexShrink: 0 }}>
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                            </svg>
                            Ya existe un registro para esta fecha. Puedes modificarlo y guardar de nuevo.
                          </div>
                        )}

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                              <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '0.72rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', width: 80 }}>CI</th>
                              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '0.72rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre</th>
                              <th style={{ textAlign: 'center', padding: '8px 0', fontSize: '0.72rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lista.map((p, i) => (
                              <tr key={p.CI} style={{ borderBottom: i < lista.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                                <td style={{ padding: '10px 0', fontSize: '0.8rem', color: '#6b7280', fontFamily: 'monospace' }}>{p.CI}</td>
                                <td style={{ padding: '10px 12px', fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{p.nombre_completo}</td>
                                <td style={{ padding: '10px 0' }}>
                                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                    {['presente', 'ausente', 'justificado'].map(est => {
                                      const c = ESTADO_COLORS[est];
                                      const activo = p.estado === est;
                                      return (
                                        <button
                                          key={est}
                                          onClick={() => cambiarEstado(p.CI, est)}
                                          style={{
                                            padding: '4px 10px', borderRadius: 5, border: 'none',
                                            background: activo ? c.bg : '#f3f4f6',
                                            color: activo ? c.color : '#9ca3af',
                                            fontWeight: activo ? 700 : 500,
                                            fontSize: '0.75rem', cursor: 'pointer',
                                            outline: activo ? `2px solid ${c.color}40` : 'none',
                                            transition: 'all 0.1s',
                                          }}
                                        >
                                          {c.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Pie del panel */}
                        <div style={{
                          marginTop: 16, paddingTop: 14, borderTop: '1px solid #f3f4f6',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                        }}>
                          <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem' }}>
                            {Object.entries(ESTADO_COLORS).map(([est, c]) => (
                              <span key={est} style={{ color: c.color, fontWeight: 600 }}>
                                {c.label}: {conteo[est] ?? 0}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={guardar}
                            disabled={guardando || lista.length === 0}
                            style={{
                              background: guardando ? '#9ca3af' : '#059669',
                              color: '#fff', border: 'none', borderRadius: 7,
                              padding: '9px 24px', fontWeight: 700, fontSize: '0.9rem',
                              cursor: guardando ? 'not-allowed' : 'pointer',
                              display: 'flex', alignItems: 'center', gap: 6,
                            }}
                          >
                            {!guardando && (
                              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 15, height: 15 }}>
                                <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293z"/>
                              </svg>
                            )}
                            {guardando ? 'Guardando…' : 'Guardar asistencia'}
                          </button>
                        </div>

                        {mensajeAsist.texto && (
                          <div style={{
                            marginTop: 10, padding: '9px 14px', borderRadius: 7,
                            background: mensajeAsist.tipo === 'ok' ? '#ecfdf5' : '#fef2f2',
                            color: mensajeAsist.tipo === 'ok' ? '#065f46' : '#dc2626',
                            fontSize: '0.85rem', fontWeight: 500,
                            borderLeft: `3px solid ${mensajeAsist.tipo === 'ok' ? '#10b981' : '#ef4444'}`,
                          }}>
                            {mensajeAsist.texto}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Tabla resumen semanal ─────────────────────── */}
          {horariosSemana.length > 0 && (
            <>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1a1a1a' }}>
                Resumen semanal
              </h2>
              <div className="pg-table-wrap">
                <table className="pg-table">
                  <thead>
                    <tr><th>Día</th><th>Hora</th><th>Materia</th><th>Grupo</th><th>Aula</th></tr>
                  </thead>
                  <tbody>
                    {horariosSemana.map((h, i) => (
                      <tr key={i}>
                        <td><span className="pg-badge pg-badge--activa">{h.dia}</span></td>
                        <td>{h.hora_inicio} – {h.hora_fin}</td>
                        <td style={{ fontWeight: 600 }}>{h.materia}</td>
                        <td>{h.grupo} / {h.convocatoria}</td>
                        <td>{h.aula ? `${h.aula.nro} (cap. ${h.aula.capacidad})` : <span style={{ color: '#9ca3af' }}>Virtual</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
