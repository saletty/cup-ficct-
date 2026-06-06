// ============================================================
// CU17 — Gestionar Exámenes de Admisión
// Programación, asignación de postulantes a aulas, publicación.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import './pages.css';

const EMPTY_EXAMEN = { descripcion: '', fecha: '', hora_inicio: '', hora_fin: '' };

const BADGE_ESTADO = {
  borrador:   'pg-badge--pendiente',
  programado: 'pg-badge--aprobado',
  finalizado: 'pg-badge--finalizada',
};

export default function Examenes() {
  const [examenes, setExamenes]     = useState([]);
  const [aulas, setAulas]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null); // null|'crear'|'editar'|'asignar'|'ver'
  const [examenSel, setExamenSel]   = useState(null);
  const [form, setForm]             = useState(EMPTY_EXAMEN);
  const [asignaciones, setAsig]     = useState(null);
  const [formAsig, setFormAsig]     = useState({ postulante_ci: '', aula_nro: '' });
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);

  const cargar = async () => {
    setLoading(true);
    try { const { data } = await client.get('/examenes'); setExamenes(data); }
    catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  const cargarAulas = async () => {
    try { const { data } = await client.get('/aulas'); setAulas(data.filter(a => a.estado === 'activo')); }
    catch { /* silencioso */ }
  };

  useEffect(() => { cargar(); cargarAulas(); }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const abrirCrear = () => { setForm(EMPTY_EXAMEN); setError(''); setModal('crear'); };
  const abrirEditar = (e) => {
    setForm({ id: e.id, descripcion: e.descripcion, fecha: e.fecha, hora_inicio: e.hora_inicio.slice(0,5), hora_fin: e.hora_fin.slice(0,5) });
    setError(''); setModal('editar');
  };
  const cerrar = () => { setModal(null); setError(''); setExamenSel(null); setAsig(null); };

  const guardar = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (modal === 'crear') await client.post('/examenes', form);
      else await client.put(`/examenes/${form.id}`, form);
      cargar(); cerrar();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(' · ') : err.response?.data?.mensaje ?? 'Error al guardar.');
    } finally { setSaving(false); }
  };

  const eliminar = async (ex) => {
    if (!confirm(`¿Eliminar el examen "${ex.descripcion}"?`)) return;
    try { await client.delete(`/examenes/${ex.id}`); cargar(); }
    catch (err) { alert(err.response?.data?.mensaje ?? 'No se pudo eliminar.'); }
  };

  const publicar = async (ex) => {
    if (!confirm(`¿Publicar "${ex.descripcion}"? Los postulantes podrán ver su rol.`)) return;
    try { await client.post(`/examenes/${ex.id}/publicar`); cargar(); }
    catch (err) { alert(err.response?.data?.mensaje ?? 'No se pudo publicar.'); }
  };

  const abrirAsignar = async (ex) => {
    setExamenSel(ex);
    setFormAsig({ postulante_ci: '', aula_nro: '' });
    setError('');
    try {
      const { data } = await client.get(`/examenes/${ex.id}/asignaciones`);
      setAsig(data);
    } catch { setAsig({ total: 0, por_aula: [], asignaciones: [] }); }
    setModal('asignar');
  };

  const asignar = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await client.post(`/examenes/${examenSel.id}/asignaciones`, {
        postulante_ci: Number(formAsig.postulante_ci),
        aula_nro: formAsig.aula_nro,
      });
      setFormAsig({ postulante_ci: '', aula_nro: '' });
      const { data } = await client.get(`/examenes/${examenSel.id}/asignaciones`);
      setAsig(data); cargar();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(' · ') : err.response?.data?.mensaje ?? 'Error al asignar.');
    } finally { setSaving(false); }
  };

  const quitarAsig = async (asignId) => {
    if (!confirm('¿Quitar esta asignación?')) return;
    try {
      await client.delete(`/examenes/${examenSel.id}/asignaciones/${asignId}`);
      const { data } = await client.get(`/examenes/${examenSel.id}/asignaciones`);
      setAsig(data); cargar();
    } catch (err) { alert(err.response?.data?.mensaje ?? 'Error.'); }
  };

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU17</p>
          <h1 className="pg-title">Exámenes de Admisión</h1>
          <p className="pg-subtitle">{examenes.length} examen(es) registrado(s)</p>
        </div>
        <button className="pg-btn pg-btn--primary" onClick={abrirCrear}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo Examen
        </button>
      </div>

      <div className="pg-table-wrap">
        {loading ? <div className="pg-loading">Cargando...</div> : (
          <table className="pg-table">
            <thead>
              <tr>
                <th>#</th><th>Descripción</th><th>Fecha</th>
                <th>Horario</th><th>Asignados</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {examenes.length === 0
                ? <tr><td colSpan={7} className="pg-empty">No hay exámenes registrados</td></tr>
                : examenes.map(ex => (
                  <tr key={ex.id}>
                    <td style={{ color: '#9ca3af', fontSize: '0.78rem' }}>{ex.id}</td>
                    <td style={{ fontWeight: 600 }}>{ex.descripcion}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(ex.fecha + 'T12:00:00').toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' })}</td>
                    <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{ex.hora_inicio?.slice(0,5)} – {ex.hora_fin?.slice(0,5)}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{ex.asignaciones_count ?? 0}</td>
                    <td><span className={`pg-badge ${BADGE_ESTADO[ex.estado] ?? ''}`}>{ex.estado}</span></td>
                    <td>
                      <div className="pg-actions">
                        <button className="pg-act-btn pg-act-btn--view" onClick={() => abrirAsignar(ex)} title="Asignar postulantes">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                          </svg>
                        </button>
                        {ex.estado === 'borrador' && (
                          <>
                            <button className="pg-act-btn pg-act-btn--edit" onClick={() => abrirEditar(ex)} title="Editar">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button className="pg-act-btn" style={{ background: '#f0fdf4', color: '#15803d', width: 30, height: 30, border: 'none', borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => publicar(ex)} title="Publicar">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                              </svg>
                            </button>
                            <button className="pg-act-btn pg-act-btn--delete" onClick={() => eliminar(ex)} title="Eliminar">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                              </svg>
                            </button>
                          </>
                        )}
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
      {(modal === 'crear' || modal === 'editar') && (
        <div className="pg-overlay" onClick={cerrar}>
          <div className="pg-modal" onClick={e => e.stopPropagation()}>
            <div className="pg-modal__header">
              <h3>{modal === 'crear' ? 'Nuevo Examen' : 'Editar Examen'}</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <form onSubmit={guardar}>
              <div className="pg-modal__body">
                {error && <div className="pg-alert pg-alert--error">{error}</div>}
                <div className="pg-form-grid">
                  <div className="pg-field">
                    <label>Descripción *</label>
                    <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                      placeholder="Ej: Examen Parcial 1 — CUP 2026-I" maxLength={200} required />
                  </div>
                  <div className="pg-form-grid pg-form-grid-2">
                    <div className="pg-field">
                      <label>Fecha *</label>
                      <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} required />
                    </div>
                  </div>
                  <div className="pg-form-grid pg-form-grid-2">
                    <div className="pg-field">
                      <label>Hora Inicio *</label>
                      <input type="time" value={form.hora_inicio} onChange={e => set('hora_inicio', e.target.value)} required />
                    </div>
                    <div className="pg-field">
                      <label>Hora Fin *</label>
                      <input type="time" value={form.hora_fin} onChange={e => set('hora_fin', e.target.value)} required />
                    </div>
                  </div>
                </div>
              </div>
              <div className="pg-modal__footer">
                <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="pg-btn pg-btn--primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal asignaciones */}
      {modal === 'asignar' && examenSel && (
        <div className="pg-overlay" onClick={cerrar}>
          <div className="pg-modal pg-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="pg-modal__header">
              <h3>Asignaciones — {examenSel.descripcion}</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <div className="pg-modal__body">
              {error && <div className="pg-alert pg-alert--error">{error}</div>}

              {/* Formulario de asignación */}
              {examenSel.estado === 'borrador' && (
                <form onSubmit={asignar} style={{ marginBottom: '1.5rem' }}>
                  <div className="pg-form-grid pg-form-grid-2" style={{ marginBottom: '0.75rem' }}>
                    <div className="pg-field">
                      <label>CI del Postulante *</label>
                      <input type="number" value={formAsig.postulante_ci}
                        onChange={e => setFormAsig(p => ({ ...p, postulante_ci: e.target.value }))}
                        placeholder="Carnet de identidad" required />
                    </div>
                    <div className="pg-field">
                      <label>Aula *</label>
                      <select value={formAsig.aula_nro}
                        onChange={e => setFormAsig(p => ({ ...p, aula_nro: e.target.value }))} required>
                        <option value="">— Seleccionar aula —</option>
                        {aulas.map(a => {
                          const ocupados = asignaciones?.por_aula?.find(x => x.aula_nro === a.nro)?.ocupados ?? 0;
                          return (
                            <option key={a.nro} value={a.nro} disabled={ocupados >= a.capacidad}>
                              {a.nro} — {a.descripcion} ({ocupados}/{a.capacidad} lugares)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="pg-btn pg-btn--primary" disabled={saving} style={{ width: '100%' }}>
                    {saving ? 'Asignando...' : 'Asignar Postulante'}
                  </button>
                </form>
              )}

              {/* Lista de asignaciones por aula */}
              {asignaciones && (
                <div>
                  <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                    Total asignados: <strong>{asignaciones.total}</strong>
                  </p>
                  {asignaciones.por_aula?.map(grupo => (
                    <div key={grupo.aula_nro} style={{ marginBottom: '1rem', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                      <div style={{ padding: '8px 14px', background: '#f8f9fa', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Aula {grupo.aula_nro}</span>
                        <span style={{ color: grupo.ocupados >= grupo.capacidad ? '#dc2626' : '#166534' }}>
                          {grupo.ocupados} / {grupo.capacidad} lugares
                        </span>
                      </div>
                      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                        {grupo.postulantes?.map(p => (
                          <div key={p.id} style={{ padding: '7px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', borderBottom: '1px solid #f3f4f6' }}>
                            <span><strong>CI {p.postulante_ci}</strong> — {p.nombre ?? '—'}</span>
                            {examenSel.estado === 'borrador' && (
                              <button className="pg-act-btn pg-act-btn--delete" onClick={() => quitarAsig(p.id)} title="Quitar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 12, height: 12 }}>
                                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {asignaciones.por_aula?.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', padding: '1rem' }}>
                      Sin postulantes asignados aún.
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="pg-modal__footer">
              <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrar}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
