// Vista de inscripción propia del postulante autenticado
import { useState, useEffect } from 'react';
import client from '../api/client';
import './pages.css';

const BADGE = {
  pendiente: 'pg-badge--pendiente',
  inscrito:  'pg-badge--activa',
  aprobado:  'pg-badge--aprobado',
  reprobado: 'pg-badge--bloqueado',
  anulado:   'pg-badge--cerrada',
};

export default function MiInscripcionPostulante({ usuario }) {
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');

  useEffect(() => {
    const ci = usuario?.CI;
    if (!ci) { setLoading(false); return; }
    client.get(`/inscripciones/postulante/${ci}`)
      .then(r => setInscripciones(r.data))
      .catch(() => setError('No se pudo cargar tu inscripción.'))
      .finally(() => setLoading(false));
  }, [usuario]);

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU10</p>
          <h1 className="pg-title">Mi Inscripción</h1>
          <p className="pg-subtitle">Datos de tu postulación al Curso Pre-universitario CUP</p>
        </div>
      </div>

      {error && <div className="pg-alert pg-alert--error">{error}</div>}

      {loading ? <div className="pg-loading">Cargando...</div> : inscripciones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={1.5} strokeLinecap="round" style={{ marginBottom: 12 }}>
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <p style={{ fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>No tienes inscripciones registradas</p>
          <p style={{ fontSize: '0.82rem' }}>Cuando el operador registre tu inscripción, aparecerá aquí.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {inscripciones.map((ins, i) => (
            <div key={ins.id ?? i} style={{
              background: 'white', border: '1px solid #e5e7eb', borderRadius: 10,
              padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#004B8D', marginBottom: 3 }}>
                    Inscripción #{ins.id}
                  </p>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
                    {ins.convocatoria?.nombre ?? ins.convocatoria_id}
                  </h3>
                </div>
                <span className={`pg-badge ${BADGE[ins.estado_admision] ?? ''}`}>
                  {ins.estado_admision}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'Primera opción',   value: ins.carrera_opcion1?.nombre_carrera ?? '—' },
                  { label: 'Segunda opción',   value: ins.carrera_opcion2?.nombre_carrera ?? 'Ninguna' },
                  { label: 'Fecha de registro',value: ins.fecha_registro
                      ? new Date(ins.fecha_registro).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })
                      : '—' },
                  { label: 'Estado convocatoria', value: ins.convocatoria?.estado ?? '—' },
                ].map(f => (
                  <div key={f.label} style={{ background: '#f9fafb', borderRadius: 6, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: 3 }}>{f.label}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#374151' }}>{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
