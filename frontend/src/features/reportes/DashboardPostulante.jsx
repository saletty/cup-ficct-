// Panel principal del postulante — resumen personalizado de su proceso CUP
import { useState, useEffect } from 'react';
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
    const ci = usuario?.CI;
    if (!ci) { setLoading(false); return; }

    Promise.allSettled([
      client.get(`/inscripciones/postulante/${ci}`),
      client.get('/mi-examen'),
      client.get('/mis-resultados'),
    ]).then(([ins, exa, res]) => {
      const insData = ins.status === 'fulfilled' ? ins.value.data : null;
      // Tomar la inscripción más reciente no anulada
      if (Array.isArray(insData) && insData.length > 0) {
        const activa = insData.find(i => i.estado_admision !== 'anulado') ?? insData[0];
        setInscripcion(activa);
      }
      if (exa.status === 'fulfilled') setExamen(exa.value.data);
      if (res.status === 'fulfilled') setResultado(res.value.data);
      setLoading(false);
    });
  }, [usuario]);

  const primerNombre = usuario?.nombre_completo?.split(' ')[0] ?? 'Postulante';

  return (
    <div style={{ padding: '2rem 2.5rem' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>

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
            contenido={examen?.asignacion ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Examen:</strong> {examen.examen?.descripcion ?? '—'}</div>
                <div><strong>Fecha:</strong> {examen.examen?.fecha ?? '—'}</div>
                <div><strong>Horario:</strong> {examen.examen?.hora_inicio} – {examen.examen?.hora_fin}</div>
                <div><strong>Aula:</strong> {examen.asignacion?.aula_nro ?? '—'}</div>
              </div>
            ) : (
              <span style={{ color: '#6b7280' }}>Aún no te han asignado un examen.</span>
            )}
          />

          {/* Mis Resultados */}
          <InfoCard
            titulo="Mis Resultados"
            color={resultado?.evaluacion?.estado_resultado === 'aprobado' ? '#15803d' : resultado?.evaluacion ? '#b91c1c' : '#92400e'}
            bg={resultado?.evaluacion?.estado_resultado === 'aprobado' ? '#f0fdf4' : resultado?.evaluacion ? '#fef2f2' : '#fffbeb'}
            icon={<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
            contenido={resultado?.evaluacion ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Computación:</strong> {resultado.evaluacion.nota_examen1 ?? '—'}</div>
                <div><strong>Matemáticas:</strong> {resultado.evaluacion.nota_examen2 ?? '—'}</div>
                <div><strong>Inglés:</strong> {resultado.evaluacion.nota_examen3 ?? '—'}</div>
                <div><strong>Física:</strong> {resultado.evaluacion.nota_examen4 ?? '—'}</div>
                <div><strong>Promedio:</strong> {resultado.evaluacion.promedio_final ?? '—'}</div>
                <div style={{ marginTop: 4 }}><EstadoBadge estado={resultado.evaluacion.estado_resultado} /></div>
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
