// ============================================================
// CU13 — Ver Carga Horaria Propia (vista del Docente)
// El docente solo puede ver su propio horario.
// El coordinador/admin ve la de cualquier docente desde Docentes.jsx.
// ============================================================
import { useState, useEffect } from 'react';
import client from '../api/client';
import './pages.css';

const DIAS_ORDEN = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function CargaHoraria() {
  const [asignaciones, setAsignaciones] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  /* Obtener CI del usuario logueado desde localStorage */
  const usuario = (() => {
    try { return JSON.parse(localStorage.getItem('usuario')); } catch { return null; }
  })();

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

  /* Agrupar horarios de todas las asignaciones en una vista tipo semana */
  const horariosSemana = asignaciones.flatMap(a =>
    (a.grupo?.horarios ?? []).map(h => ({
      dia: h.dia,
      hora_inicio: h.hora_inicio,
      hora_fin: h.hora_fin,
      aula: h.aula,
      grupo: a.grupo_id,
      convocatoria: a.convocatoria_id,
      materia: a.materia?.nombre ?? '—',
    }))
  ).sort((a, b) => {
    const di = DIAS_ORDEN.indexOf(a.dia) - DIAS_ORDEN.indexOf(b.dia);
    return di !== 0 ? di : a.hora_inicio.localeCompare(b.hora_inicio);
  });

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
            <div className="pg-table-wrap"><div className="pg-empty">No tienes grupos asignados en la convocatoria actual.</div></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {asignaciones.map((a, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="pg-badge pg-badge--activa" style={{ fontSize: '0.9rem' }}>{a.grupo_id}</span>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2 }}>{a.materia?.nombre}</p>
                      <p style={{ fontSize: '0.72rem', color: '#6b7280' }}>{a.convocatoria_id} · {a.grupo?.carrera?.nombre_carrera ?? 'Carrera no especificada'}</p>
                    </div>
                  </div>
                  {(a.grupo?.horarios ?? []).length === 0
                    ? <p style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Sin horarios asignados</p>
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
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
                </div>
              ))}
            </div>
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
