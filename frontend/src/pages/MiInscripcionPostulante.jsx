// CU10 — Inscripción propia del postulante: historial + nueva postulación
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

function NuevaInscripcionForm({ ci, onExito }) {
  const [convocatorias, setConvocatorias] = useState([]);
  const [carreras, setCarreras]           = useState([]);
  const [form, setForm]                   = useState({ convocatoria_id: '', carrera_opcion1_id: '', carrera_opcion2_id: '' });
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');
  const [ok, setOk]                       = useState('');

  useEffect(() => {
    client.get('/inscripciones/convocatorias').then(r => setConvocatorias(r.data)).catch(() => {});
    client.get('/carreras').then(r => setCarreras(r.data)).catch(() => {});
  }, []);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setOk('');
    try {
      await client.post('/inscripciones', { ...form, postulante_ci: Number(ci) });
      setOk('Inscripción registrada exitosamente.');
      setForm({ convocatoria_id: '', carrera_opcion1_id: '', carrera_opcion2_id: '' });
      setTimeout(() => { setOk(''); onExito(); }, 2000);
    } catch (err) {
      const d = err.response?.data;
      setError(d?.errors ? Object.values(d.errors).flat().join(' · ') : d?.mensaje || 'Error al inscribirse.');
    } finally { setSaving(false); }
  };

  const sel = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '0.88rem', border: '1.5px solid #d1d5db', borderRadius: 5, background: 'white', outline: 'none' };

  return (
    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '1.25rem', marginBottom: '1.5rem' }}>
      <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1e40af', marginBottom: '0.75rem' }}>
        Nueva Postulación
      </p>

      {error && <div className="pg-alert pg-alert--error" style={{ marginBottom: '0.75rem' }}>{error}</div>}
      {ok    && <div className="pg-alert pg-alert--success" style={{ marginBottom: '0.75rem' }}>{ok}</div>}

      {convocatorias.length === 0 ? (
        <p style={{ fontSize: '0.84rem', color: '#6b7280' }}>No hay convocatorias habilitadas en este momento.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b7280', marginBottom: 4 }}>
                Convocatoria *
              </label>
              <select name="convocatoria_id" value={form.convocatoria_id} onChange={handleChange} required style={sel}>
                <option value="">-- Seleccionar --</option>
                {convocatorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b7280', marginBottom: 4 }}>
                1ª Carrera *
              </label>
              <select name="carrera_opcion1_id" value={form.carrera_opcion1_id} onChange={handleChange} required style={sel}>
                <option value="">-- Seleccionar --</option>
                {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre_carrera}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b7280', marginBottom: 4 }}>
                2ª Carrera (opcional)
              </label>
              <select name="carrera_opcion2_id" value={form.carrera_opcion2_id} onChange={handleChange} style={sel}>
                <option value="">Ninguna</option>
                {carreras.filter(c => c.id !== form.carrera_opcion1_id).map(c => <option key={c.id} value={c.id}>{c.nombre_carrera}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="pg-btn pg-btn--primary" disabled={saving}>
            {saving ? 'Registrando...' : 'Confirmar Inscripción'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function MiInscripcionPostulante({ usuario }) {
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');

  const cargar = () => {
    const ci = usuario?.CI;
    if (!ci) { setLoading(false); return; }
    setLoading(true);
    client.get(`/inscripciones/postulante/${ci}`)
      .then(r => setInscripciones(r.data))
      .catch(() => setError('No se pudo cargar tu inscripción.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [usuario]);

  const ci = usuario?.CI;

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU10</p>
          <h1 className="pg-title">Mi Inscripción</h1>
          <p className="pg-subtitle">Postulación al Curso Pre-universitario CUP — FICCT</p>
        </div>
      </div>

      {error && <div className="pg-alert pg-alert--error">{error}</div>}

      {/* Formulario de nueva inscripción */}
      {ci && <NuevaInscripcionForm ci={ci} onExito={cargar} />}

      {/* Historial de inscripciones */}
      <div style={{ marginBottom: '0.75rem' }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280' }}>
          Historial de inscripciones
        </p>
      </div>

      {loading ? <div className="pg-loading">Cargando...</div> : inscripciones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
          <p style={{ fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Sin inscripciones anteriores</p>
          <p style={{ fontSize: '0.82rem' }}>Usa el formulario de arriba para postularte.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[...inscripciones].sort((a, b) => new Date(b.fecha_registro) - new Date(a.fecha_registro)).map((ins, i) => (
            <div key={ins.id ?? i} style={{
              background: 'white', border: '1px solid #e5e7eb', borderRadius: 10,
              padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#004B8D', marginBottom: 2 }}>
                    Inscripción #{ins.id}
                  </p>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
                    {ins.convocatoria?.nombre ?? ins.convocatoria_id}
                  </h3>
                </div>
                <span className={`pg-badge ${BADGE[ins.estado_admision] ?? ''}`}>
                  {ins.estado_admision}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                {[
                  { label: '1ª Carrera',       value: ins.carrera_opcion1?.nombre_carrera ?? '—' },
                  { label: '2ª Carrera',        value: ins.carrera_opcion2?.nombre_carrera ?? 'Ninguna' },
                  { label: 'Fecha de registro', value: ins.fecha_registro
                      ? new Date(ins.fecha_registro).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—' },
                  { label: 'Estado convocatoria', value: ins.convocatoria?.estado ?? '—' },
                ].map(f => (
                  <div key={f.label} style={{ background: '#f9fafb', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{f.value}</div>
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
