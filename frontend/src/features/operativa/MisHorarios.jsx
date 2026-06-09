// Horarios de los grupos de la convocatoria del postulante
import { useState, useEffect } from 'react';
import client from '../../api/client';
import '../../shared/pages.css';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function ordenarDia(dia) {
  const idx = DIAS.findIndex(d => d.toLowerCase() === String(dia).toLowerCase());
  return idx >= 0 ? idx : 99;
}

function HorarioFila({ h }) {
  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{h.dia}</td>
      <td style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}>
        {h.hora_inicio} – {h.hora_fin}
      </td>
      <td>
        <span className="pg-badge pg-badge--activa">Aula {h.aula_nro}</span>
        {h.aula_desc && <span style={{ fontSize: '0.72rem', color: '#6b7280', marginLeft: 6 }}>{h.aula_desc}</span>}
      </td>
    </tr>
  );
}

export default function MisHorarios() {
  const [datos,   setDatos]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    client.get('/mis-horarios')
      .then(r => setDatos(r.data))
      .catch(() => setError('No se pudo cargar la información de horarios.'))
      .finally(() => setLoading(false));
  }, []);

  const insc   = datos?.inscripcion;
  const grupos = datos?.grupos ?? [];

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">Mis Horarios</p>
          <h1 className="pg-title">Horarios de Clases</h1>
          <p className="pg-subtitle">Grupos activos en tu convocatoria</p>
        </div>
      </div>

      {error && <div className="pg-alert pg-alert--error">{error}</div>}

      {loading ? <div className="pg-loading">Cargando...</div> : !insc ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={1.5} strokeLinecap="round" style={{ marginBottom: 12 }}>
            <rect x={3} y={4} width={18} height={18} rx={2}/><line x1={16} y1={2} x2={16} y2={6}/><line x1={8} y1={2} x2={8} y2={6}/><line x1={3} y1={10} x2={21} y2={10}/>
          </svg>
          <p style={{ fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Sin horarios disponibles</p>
          <p style={{ fontSize: '0.82rem' }}>Debes estar inscrito en una convocatoria activa para ver los horarios.</p>
        </div>
      ) : (
        <>
          {/* Encabezado de convocatoria */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth={2} strokeLinecap="round">
              <rect x={3} y={4} width={18} height={18} rx={2}/><line x1={16} y1={2} x2={16} y2={6}/><line x1={8} y1={2} x2={8} y2={6}/><line x1={3} y1={10} x2={21} y2={10}/>
            </svg>
            <div style={{ fontSize: '0.82rem', color: '#1e40af' }}>
              <strong>{insc.convocatoria?.nombre}</strong>
              {insc.carrera && <span style={{ marginLeft: 8, color: '#3b82f6' }}>— {insc.carrera.nombre_carrera}</span>}
            </div>
            <span className="pg-badge pg-badge--activa" style={{ marginLeft: 'auto' }}>
              {insc.estado_admision}
            </span>
          </div>

          {grupos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '0.88rem' }}>
              No hay grupos activos con horarios asignados aún.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {grupos.map(g => (
                <div key={g.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  {/* Encabezado del grupo */}
                  <div style={{ background: '#004B8D', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <span style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>Grupo {g.id}</span>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', marginLeft: 10 }}>{g.carrera}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {g.modalidad && (
                        <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '2px 10px', borderRadius: 99, fontSize: '0.72rem', textTransform: 'capitalize' }}>
                          {g.modalidad}
                        </span>
                      )}
                      <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '2px 10px', borderRadius: 99, fontSize: '0.72rem' }}>
                        Cupo: {g.cupo_maximo}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: g.docentes.length > 0 ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                    {/* Horarios */}
                    <div>
                      <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '0.75rem' }}>
                        Horario de clases
                      </p>
                      {g.horarios.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Sin horarios asignados.</p>
                      ) : (
                        <div className="pg-table-wrap" style={{ margin: 0 }}>
                          <table className="pg-table">
                            <thead>
                              <tr><th>Día</th><th>Horario</th><th>Aula</th></tr>
                            </thead>
                            <tbody>
                              {[...g.horarios]
                                .sort((a, b) => ordenarDia(a.dia) - ordenarDia(b.dia))
                                .map((h, i) => <HorarioFila key={i} h={h} />)
                              }
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Docentes */}
                    {g.docentes.length > 0 && (
                      <div>
                        <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '0.75rem' }}>
                          Docentes asignados
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {g.docentes.map((d, i) => (
                            <div key={i} style={{ background: '#f9fafb', borderRadius: 6, padding: '8px 12px', border: '1px solid #e5e7eb' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1a1a1a' }}>{d.nombre}</div>
                              {d.materia && d.materia !== '—' && (
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>{d.materia}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
