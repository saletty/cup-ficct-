// Panel principal del postulante — resumen personalizado de su proceso CUP
import { useState, useEffect } from 'react';
import '../../shared/pages.css';
import client from '../../api/client';

function InfoCard({ titulo, contenido, color, bg, icon }) {
  return (
    <div style={{
      background: bg, border: `1px solid ${color}22`, borderRadius: 10,
      padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color }}>{titulo}</span>
      </div>
      <div style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.5 }}>{contenido}</div>
    </div>
  );
}

const BADGE_ESTADO = {
  pendiente:  { bg: '#fef9c3', color: '#92400e' },
  inscrito:   { bg: '#dbeafe', color: '#1e40af' },
  aprobado:   { bg: '#dcfce7', color: '#15803d' },
  reprobado:  { bg: '#fee2e2', color: '#991b1b' },
  anulado:    { bg: '#f3f4f6', color: '#6b7280' },
};

function EstadoBadge({ estado }) {
  const s = BADGE_ESTADO[estado] ?? { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 99,
      fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize',
    }}>{estado ?? '—'}</span>
  );
}

export default function DashboardPostulante({ usuario }) {
  const [inscripcion, setInscripcion] = useState(null);
  const [examen,      setExamen]      = useState(null);
  const [resultado,   setResultado]   = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.allSettled([
      client.get('/mis-horarios'),
      client.get('/mi-examen'),
      client.get('/mis-resultados'),
    ]).then(([hor, exa, res]) => {
      if (hor.status === 'fulfilled') setInscripcion(hor.value.data?.inscripcion ?? null);
      if (exa.status === 'fulfilled') setExamen(exa.value.data);
      if (res.status === 'fulfilled') {
        const arr = res.value.data;
        setResultado(Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null);
      }
      setLoading(false);
    });
  }, []);

  const primerNombre = usuario?.nombre_completo?.split(' ')[0] ?? 'Postulante';

  return (
    <div className="dash-wrap">
      {/* Bienvenida */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.9rem', fontWeight: 700, color: '#1a1a1a', margin: 0, lineHeight: 1.2 }}>
          Bienvenido, {primerNombre}
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 6 }}>
          Aquí puedes revisar el estado de tu postulación en el CUP — FICCT.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '3rem' }}>Cargando tu información...</div>
      ) : (
        <div className="pg-grid-3">

          {/* Inscripción */}
          <InfoCard
            titulo="Mi Inscripción"
            color="#1e40af"
            bg="#eff6ff"
            icon={<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
            contenido={inscripcion ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Convocatoria:</strong> {inscripcion.convocatoria?.nombre ?? inscripcion.convocatoria_id}</div>
                <div><strong>Carrera:</strong> {inscripcion.carrera_opcion1?.nombre_carrera ?? '—'}</div>
                <div style={{ marginTop: 4 }}><EstadoBadge estado={inscripcion.estado_admision} /></div>
              </div>
            ) : (
              <span style={{ color: '#6b7280' }}>No tienes inscripciones activas.</span>
            )}
          />

          {/* Mi Examen */}
          <InfoCard
            titulo="Mi Examen"
            color="#15803d"
            bg="#f0fdf4"
            icon={<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><rect x={3} y={4} width={18} height={18} rx={2}/><line x1={16} y1={2} x2={16} y2={6}/><line x1={8} y1={2} x2={8} y2={6}/><line x1={3} y1={10} x2={21} y2={10}/></svg>}
            contenido={examen?.examen ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Examen:</strong> {examen.examen?.descripcion ?? '—'}</div>
                <div><strong>Fecha:</strong> {examen.examen?.fecha ?? '—'}</div>
                <div><strong>Horario:</strong> {examen.examen?.hora_inicio?.slice(0,5)} – {examen.examen?.hora_fin?.slice(0,5)}</div>
                <div><strong>Aula:</strong> {examen.aula_nro ?? '—'}</div>
              </div>
            ) : (
              <span style={{ color: '#6b7280' }}>Aún no te han asignado un examen.</span>
            )}
          />

          {/* Mis Resultados */}
          <InfoCard
            titulo="Mis Resultados"
            color={resultado?.estado_resultado === 'aprobado' ? '#15803d' : resultado ? '#b91c1c' : '#92400e'}
            bg={resultado?.estado_resultado === 'aprobado' ? '#f0fdf4' : resultado ? '#fef2f2' : '#fffbeb'}
            icon={<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
            contenido={resultado ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Computación:</strong> {resultado.nota_examen1 ?? '—'}</div>
                <div><strong>Matemáticas:</strong> {resultado.nota_examen2 ?? '—'}</div>
                <div><strong>Inglés:</strong> {resultado.nota_examen3 ?? '—'}</div>
                <div><strong>Física:</strong> {resultado.nota_examen4 ?? '—'}</div>
                <div><strong>Promedio:</strong> {resultado.promedio_final ?? '—'}</div>
                <div style={{ marginTop: 4 }}><EstadoBadge estado={resultado.estado_resultado} /></div>
              </div>
            ) : (
              <span style={{ color: '#6b7280' }}>Aún no tienes resultados registrados.</span>
            )}
          />
        </div>
      )}

      {/* Nota informativa */}
      <div style={{ marginTop: '2rem', padding: '14px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.8rem', color: '#64748b', borderLeft: '3px solid #004B8D' }}>
        Usa el menú lateral para navegar a <strong>Mi Inscripción</strong>, <strong>Mis Horarios</strong> y <strong>Mis Resultados</strong>.
        Si necesitas ayuda, contacta a la administración de la FICCT.
      </div>
    </div>
  );
}
