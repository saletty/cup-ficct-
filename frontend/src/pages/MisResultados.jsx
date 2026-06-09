// ============================================================
// CU19 — Consultar Resultados de Admisión
// El postulante consulta sus notas y estado final de admisión.
// También muestra su rol de examen asignado (aula, fecha, hora).
// ============================================================
import { useState, useEffect } from 'react';
import client from '../api/client';
import './pages.css';

const BADGE_ESTADO = {
  aprobado:  'pg-badge--aprobado',
  reprobado: 'pg-badge--bloqueado',
};

const NotaBar = ({ valor, label }) => {
  if (valor === null || valor === undefined) return null;
  const pct    = Math.min(100, Math.max(0, Number(valor)));
  const color  = pct < 60 ? '#dc2626' : '#16a34a';
  const bg     = pct < 60 ? '#fee2e2' : '#dcfce7';
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.78rem' }}>
        <span style={{ color: '#4b5563', fontWeight: 600 }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{pct}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: '#f3f4f6', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      {pct < 60 && <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: 2 }}>Inferior al mínimo (60)</div>}
    </div>
  );
};

export default function MisResultados() {
  const [resultados, setResultados] = useState([]);
  const [miExamen, setMiExamen]     = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [rRes, eRes] = await Promise.allSettled([
          client.get('/mis-resultados'),
          client.get('/mi-examen'),
        ]);
        if (rRes.status === 'fulfilled') setResultados(rRes.value.data);
        if (eRes.status === 'fulfilled') setMiExamen(eRes.value.data);
      } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  if (loading) return <div className="pg"><div className="pg-loading">Cargando tus resultados...</div></div>;

  return (
    <div className="pg">
      <div className="pg-header__left" style={{ marginBottom: '1.75rem' }}>
        <p className="pg-tag">CU19</p>
        <h1 className="pg-title">Mis Resultados de Admisión</h1>
        <p className="pg-subtitle">Consulta tu rol de examen y tus calificaciones obtenidas</p>
      </div>

      {/* Rol de examen asignado */}
      {miExamen ? (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: 40, height: 40, background: '#eff6ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" style={{ width: 22, height: 22 }}>
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#1a1a1a' }}>Tu Rol de Examen</div>
              <span className="pg-badge pg-badge--aprobado" style={{ fontSize: '0.65rem' }}>PROGRAMADO</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Examen', value: miExamen.examen?.descripcion },
              { label: 'Fecha', value: miExamen.examen?.fecha ? new Date(miExamen.examen.fecha + 'T12:00:00').toLocaleDateString('es-BO', { day:'2-digit', month:'long', year:'numeric' }) : '—' },
              { label: 'Horario', value: miExamen.examen ? `${miExamen.examen.hora_inicio?.slice(0,5)} – ${miExamen.examen.hora_fin?.slice(0,5)}` : '—' },
              { label: 'Aula', value: miExamen.aula?.nro },
              { label: 'Capacidad', value: miExamen.aula ? `${miExamen.aula.capacidad} lugares` : '—' },
              { label: 'Ubicación', value: miExamen.aula?.descripcion ?? '—' },
            ].map(item => (
              <div key={item.label} style={{ background: '#f8f9fa', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a1a1a' }}>{item.value ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '1rem 1.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#92400e' }}>
          <strong>Sin rol asignado.</strong> Aún no tienes un examen programado asignado. Consulta a tu coordinador.
        </div>
      )}

      {/* Resultados de evaluaciones */}
      {resultados.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ width: 48, height: 48, marginBottom: '1rem', opacity: 0.4 }}>
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          <p>Tus resultados aún no han sido registrados.</p>
        </div>
      ) : (
        resultados.map(ev => (
          <div key={ev.id} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a1a' }}>
                  {ev.examen?.descripcion ?? `Examen #${ev.examen_id}`}
                </div>
                {ev.examen?.fecha && (
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>
                    {new Date(ev.examen.fecha + 'T12:00:00').toLocaleDateString('es-BO', { day:'2-digit', month:'long', year:'numeric' })}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Promedio Final</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: ev.estado_resultado === 'aprobado' ? '#15803d' : '#dc2626', lineHeight: 1 }}>
                  {ev.promedio_final ?? '—'}
                </div>
                {ev.estado_resultado && (
                  <span className={`pg-badge ${BADGE_ESTADO[ev.estado_resultado] ?? ''}`} style={{ marginTop: 4 }}>
                    {ev.estado_resultado}
                  </span>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
              <NotaBar valor={ev.nota_examen1} label="Computación" />
              <NotaBar valor={ev.nota_examen2} label="Matemáticas" />
              <NotaBar valor={ev.nota_examen3} label="Inglés" />
              <NotaBar valor={ev.nota_examen4} label="Física" />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
