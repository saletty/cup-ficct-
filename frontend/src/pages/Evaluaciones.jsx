// ============================================================
// CU18 — Gestionar Resultados de Admisión
// Registro y cálculo de notas con regla de nota mínima (≥60).
// nota_examen1 = Computación · nota_examen2 = Matemáticas · nota_examen3 = Inglés · nota_examen4 = Física
// ============================================================
import { useState, useEffect } from 'react';
import client from '../api/client';
import './pages.css';

const EMPTY = { postulante_ci: '', examen_id: '', nota_examen1: '', nota_examen2: '', nota_examen3: '', nota_examen4: '' };

const BADGE_ESTADO = {
  aprobado:  'pg-badge--aprobado',
  reprobado: 'pg-badge--bloqueado',
};

export default function Evaluaciones() {
  const [evals, setEvals]         = useState([]);
  const [examenes, setExamenes]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filtroExamen, setFiltro] = useState('');
  const [modal, setModal]         = useState(null); // null|'crear'|'editar'
  const [form, setForm]           = useState(EMPTY);
  const [evalSel, setEvalSel]     = useState(null);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const params = filtroExamen ? { examen_id: filtroExamen } : {};
      const { data } = await client.get('/evaluaciones', { params });
      setEvals(data);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  const cargarExamenes = async () => {
    try { const { data } = await client.get('/examenes'); setExamenes(data); }
    catch { /* silencioso */ }
  };

  useEffect(() => { cargar(); }, [filtroExamen]);
  useEffect(() => { cargarExamenes(); }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const cerrar = () => { setModal(null); setError(''); setEvalSel(null); };

  const abrirCrear = () => { setForm(EMPTY); setError(''); setModal('crear'); };
  const abrirEditar = (ev) => {
    setEvalSel(ev);
    setForm({ id: ev.id, nota_examen1: ev.nota_examen1, nota_examen2: ev.nota_examen2, nota_examen3: ev.nota_examen3, nota_examen4: ev.nota_examen4 });
    setError(''); setModal('editar');
  };

  // Vista previa del resultado calculado localmente
  const preview = () => {
    const n1 = Number(form.nota_examen1);
    const n2 = Number(form.nota_examen2);
    const n3 = Number(form.nota_examen3);
    const n4 = Number(form.nota_examen4);
    if (!form.nota_examen1 || !form.nota_examen2 || !form.nota_examen3 || !form.nota_examen4) return null;
    const reprobado = n1 < 60 || n2 < 60 || n3 < 60 || n4 < 60;
    const promedio  = ((n1 + n2 + n3 + n4) / 4).toFixed(2);
    return { promedio, estado: reprobado ? 'reprobado' : 'aprobado' };
  };

  const guardar = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (modal === 'crear') {
        await client.post('/evaluaciones', {
          postulante_ci: Number(form.postulante_ci),
          examen_id:     Number(form.examen_id),
          nota_examen1:  Number(form.nota_examen1),
          nota_examen2:  Number(form.nota_examen2),
          nota_examen3:  Number(form.nota_examen3),
          nota_examen4:  Number(form.nota_examen4),
        });
      } else {
        await client.put(`/evaluaciones/${evalSel.id}`, {
          nota_examen1: Number(form.nota_examen1),
          nota_examen2: Number(form.nota_examen2),
          nota_examen3: Number(form.nota_examen3),
          nota_examen4: Number(form.nota_examen4),
        });
      }
      cargar(); cerrar();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(' · ') : err.response?.data?.mensaje ?? 'Error al guardar.');
    } finally { setSaving(false); }
  };

  const eliminar = async (ev) => {
    if (!confirm(`¿Eliminar la evaluación del CI ${ev.postulante_ci}?`)) return;
    try { await client.delete(`/evaluaciones/${ev.id}`); cargar(); }
    catch (err) { alert(err.response?.data?.mensaje ?? 'No se pudo eliminar.'); }
  };

  const calculo = preview();

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU18</p>
          <h1 className="pg-title">Resultados de Admisión</h1>
          <p className="pg-subtitle">{evals.length} evaluación(es) registrada(s)</p>
        </div>
        <button className="pg-btn pg-btn--primary" onClick={abrirCrear}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Registrar Notas
        </button>
      </div>

      <div className="pg-filters">
        <select value={filtroExamen} onChange={e => setFiltro(e.target.value)}>
          <option value="">Todos los exámenes</option>
          {examenes.map(ex => <option key={ex.id} value={ex.id}>{ex.descripcion} — {ex.fecha}</option>)}
        </select>
      </div>

      <div className="pg-table-wrap">
        {loading ? <div className="pg-loading">Cargando...</div> : (
          <table className="pg-table">
            <thead>
              <tr>
                <th>Postulante</th><th>CI</th><th>Examen</th>
                <th>N1 Comp.</th><th>N2 Mat.</th><th>N3 Ing.</th><th>N4 Fís.</th>
                <th>Promedio</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {evals.length === 0
                ? <tr><td colSpan={10} className="pg-empty">No hay evaluaciones registradas</td></tr>
                : evals.map(ev => (
                  <tr key={ev.id}>
                    <td style={{ fontWeight: 600 }}>{ev.postulante?.usuario?.nombre_completo ?? '—'}</td>
                    <td>{ev.postulante_ci}</td>
                    <td style={{ fontSize: '0.78rem', color: '#6b7280' }}>{ev.examen?.descripcion ?? '—'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: ev.nota_examen1 < 60 ? '#dc2626' : '#166534' }}>
                      {ev.nota_examen1}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: ev.nota_examen2 < 60 ? '#dc2626' : '#166534' }}>
                      {ev.nota_examen2}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: ev.nota_examen3 < 60 ? '#dc2626' : '#166534' }}>
                      {ev.nota_examen3}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: ev.nota_examen4 < 60 ? '#dc2626' : '#166534' }}>
                      {ev.nota_examen4}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{ev.promedio_final}</td>
                    <td>
                      <span className={`pg-badge ${BADGE_ESTADO[ev.estado_resultado] ?? ''}`}>
                        {ev.estado_resultado ?? '—'}
                      </span>
                    </td>
                    <td>
                      <div className="pg-actions">
                        <button className="pg-act-btn pg-act-btn--edit" onClick={() => abrirEditar(ev)} title="Editar notas">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="pg-act-btn pg-act-btn--delete" onClick={() => eliminar(ev)} title="Eliminar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        )}
      </div>

      {/* Modal crear / editar */}
      {modal && (
        <div className="pg-overlay" onClick={cerrar}>
          <div className="pg-modal" onClick={e => e.stopPropagation()}>
            <div className="pg-modal__header">
              <h3>{modal === 'crear' ? 'Registrar Notas' : `Editar Notas — CI ${evalSel?.postulante_ci}`}</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <form onSubmit={guardar}>
              <div className="pg-modal__body">
                {error && <div className="pg-alert pg-alert--error">{error}</div>}
                <div className="pg-form-grid">
                  {modal === 'crear' && (
                    <>
                      <div className="pg-field">
                        <label>CI del Postulante *</label>
                        <input type="number" value={form.postulante_ci}
                          onChange={e => set('postulante_ci', e.target.value)}
                          placeholder="Número de carnet" required />
                      </div>
                      <div className="pg-field">
                        <label>Examen *</label>
                        <select value={form.examen_id} onChange={e => set('examen_id', e.target.value)} required>
                          <option value="">— Seleccionar examen —</option>
                          {examenes.map(ex => <option key={ex.id} value={ex.id}>{ex.descripcion} — {ex.fecha}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '8px 12px', fontSize: '0.78rem', color: '#1e40af' }}>
                    Regla: si alguna nota es inferior a 60 → reprobado automáticamente
                  </div>

                  <div className="pg-form-grid pg-form-grid-2">
                    <div className="pg-field">
                      <label>Computación *</label>
                      <input type="number" min="0" max="100" step="0.01" value={form.nota_examen1}
                        onChange={e => set('nota_examen1', e.target.value)} placeholder="0 – 100" required />
                    </div>
                    <div className="pg-field">
                      <label>Matemáticas *</label>
                      <input type="number" min="0" max="100" step="0.01" value={form.nota_examen2}
                        onChange={e => set('nota_examen2', e.target.value)} placeholder="0 – 100" required />
                    </div>
                    <div className="pg-field">
                      <label>Inglés *</label>
                      <input type="number" min="0" max="100" step="0.01" value={form.nota_examen3}
                        onChange={e => set('nota_examen3', e.target.value)} placeholder="0 – 100" required />
                    </div>
                    <div className="pg-field">
                      <label>Física *</label>
                      <input type="number" min="0" max="100" step="0.01" value={form.nota_examen4}
                        onChange={e => set('nota_examen4', e.target.value)} placeholder="0 – 100" required />
                    </div>
                  </div>
                  {calculo && (
                    <div style={{
                      border: `2px solid ${calculo.estado === 'aprobado' ? '#86efac' : '#fca5a5'}`,
                      borderRadius: 6, padding: '10px 12px',
                      background: calculo.estado === 'aprobado' ? '#f0fdf4' : '#fff1f2',
                    }}>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vista previa</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: calculo.estado === 'aprobado' ? '#15803d' : '#dc2626' }}>
                        {calculo.promedio} — {calculo.estado}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="pg-modal__footer">
                <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="pg-btn pg-btn--primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Notas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
