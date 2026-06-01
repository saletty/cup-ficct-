// ============================================================
// CU14 — Gestionar Grupos
// PK compuesta: (id, convocatoria_id) — ej: 'M001', '1-2026'
// Incluye sub-recursos:
//   - Horarios (CU14): agregar/quitar con detección de colisiones
//   - Asignaciones de docente (CU13): asignar docente+materia a un grupo
// ============================================================
import { useState, useEffect } from 'react';
import client from '../api/client';
import './pages.css';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const EMPTY_GRP = { id: '', convocatoria_id: '', cupo_maximo: 30, estado: 'activo' };
const EMPTY_HOR = { dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00', aula_nro: '' };
const EMPTY_ASIG = { docente_ci: '', materia_id: '', grupo_id: '', convocatoria_id: '' };

const IcoPlus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoEdit = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoDel  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IcoView = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;

export default function Grupos() {
  /* ── Datos maestros ────────────────────────────────────── */
  const [grupos, setGrupos]           = useState([]);
  const [convocatorias, setConvs]     = useState([]);
  const [carreras, setCarreras]       = useState([]);
  const [aulas, setAulas]             = useState([]);
  const [docentes, setDocentes]       = useState([]);
  const [materias, setMaterias]       = useState([]);
  const [loading, setLoading]         = useState(true);

  /* ── Filtro activo ─────────────────────────────────────── */
  const [filtroConv, setFiltroConv]   = useState('');

  /* ── Modal grupo (crear/editar) ───────────────────────── */
  const [modalGrp, setModalGrp]       = useState(null); // null | 'crear' | 'editar'
  const [formGrp, setFormGrp]         = useState(EMPTY_GRP);
  const [errGrp, setErrGrp]           = useState('');
  const [savingGrp, setSavingGrp]     = useState(false);

  /* ── Panel de detalle del grupo ───────────────────────── */
  const [grupoActivo, setGrupoActivo] = useState(null); // grupo seleccionado
  const [tab, setTab]                 = useState('horarios'); // 'horarios' | 'asignaciones'

  /* ── Horarios ──────────────────────────────────────────── */
  const [horarios, setHorarios]       = useState([]);
  const [formHor, setFormHor]         = useState(EMPTY_HOR);
  const [errHor, setErrHor]           = useState('');
  const [savingHor, setSavingHor]     = useState(false);

  /* ── Asignaciones (CU13) ───────────────────────────────── */
  const [asignaciones, setAsignaciones] = useState([]);
  const [formAsig, setFormAsig]         = useState(EMPTY_ASIG);
  const [errAsig, setErrAsig]           = useState('');
  const [savingAsig, setSavingAsig]     = useState(false);

  /* ── Carga inicial ─────────────────────────────────────── */
  const cargar = async () => {
    setLoading(true);
    try {
      const params = filtroConv ? { params: { convocatoria_id: filtroConv } } : {};
      const [g, c, ca, a, d, m] = await Promise.all([
        client.get('/grupos', params),
        client.get('/convocatorias'),
        client.get('/carreras'),
        client.get('/aulas'),
        client.get('/docentes'),
        client.get('/materias'),
      ]);
      setGrupos(g.data);
      setConvs(c.data);
      setCarreras(ca.data);
      setAulas(a.data);
      setDocentes(d.data);
      setMaterias(m.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [filtroConv]);

  /* ── Helpers ───────────────────────────────────────────── */
  const setG  = (f) => (e) => setFormGrp(p => ({ ...p, [f]: e.target.value }));
  const setH  = (f) => (e) => setFormHor(p => ({ ...p, [f]: e.target.value }));
  const setA  = (f) => (e) => setFormAsig(p => ({ ...p, [f]: e.target.value }));

  /* ── CRUD Grupos ───────────────────────────────────────── */
  const abrirCrear  = () => { setFormGrp(EMPTY_GRP); setErrGrp(''); setModalGrp('crear'); };
  const abrirEditar = (g) => {
    setFormGrp({ id: g.id, convocatoria_id: g.convocatoria_id, cupo_maximo: g.cupo_maximo, estado: g.estado });
    setErrGrp(''); setModalGrp('editar');
  };
  const cerrarGrp   = () => { setModalGrp(null); setErrGrp(''); };

  const guardarGrp = async (e) => {
    e.preventDefault(); setSavingGrp(true); setErrGrp('');
    try {
      modalGrp === 'crear'
        ? await client.post('/grupos', formGrp)
        : await client.put(`/grupos/${formGrp.id}/${formGrp.convocatoria_id}`, formGrp);
      cargar(); cerrarGrp();
    } catch (err) {
      const d = err.response?.data;
      setErrGrp(d?.errors ? Object.values(d.errors).flat().join(' · ') : d?.mensaje ?? 'Error.');
    } finally { setSavingGrp(false); }
  };

  const eliminarGrp = async (g) => {
    if (!confirm(`¿Eliminar grupo "${g.id}" de la conv. "${g.convocatoria_id}"?`)) return;
    try { await client.delete(`/grupos/${g.id}/${g.convocatoria_id}`); cargar(); setGrupoActivo(null); }
    catch (err) { alert(err.response?.data?.mensaje ?? 'No se pudo eliminar.'); }
  };

  /* ── Abrir panel de detalle ─────────────────────────────── */
  const abrirDetalle = async (g) => {
    setGrupoActivo(g); setTab('horarios');
    setFormHor(EMPTY_HOR); setErrHor('');
    setFormAsig({ ...EMPTY_ASIG, grupo_id: g.id, convocatoria_id: g.convocatoria_id });
    setErrAsig('');
    await recargarDetalle(g);
  };

  const recargarDetalle = async (g) => {
    try {
      const [h, a] = await Promise.all([
        client.get(`/grupos/${g.id}/${g.convocatoria_id}/horarios`),
        client.get('/asignaciones', { params: { convocatoria_id: g.convocatoria_id } }),
      ]);
      setHorarios(h.data);
      setAsignaciones(a.data.filter(x => x.grupo_id === g.id && x.convocatoria_id === g.convocatoria_id));
    } catch {}
  };

  /* ── Horarios ──────────────────────────────────────────── */
  const agregarHorario = async (e) => {
    e.preventDefault(); setSavingHor(true); setErrHor('');
    try {
      await client.post(`/grupos/${grupoActivo.id}/${grupoActivo.convocatoria_id}/horarios`, formHor);
      setFormHor(EMPTY_HOR);
      await recargarDetalle(grupoActivo);
    } catch (err) {
      const d = err.response?.data;
      setErrHor(d?.errors ? Object.values(d.errors).flat().join(' · ') : d?.mensaje ?? 'Error al guardar horario.');
    } finally { setSavingHor(false); }
  };

  const quitarHorario = async (id) => {
    if (!confirm('¿Eliminar este horario?')) return;
    try {
      await client.delete(`/grupos/${grupoActivo.id}/${grupoActivo.convocatoria_id}/horarios/${id}`);
      await recargarDetalle(grupoActivo);
    } catch (err) { alert(err.response?.data?.mensaje ?? 'No se pudo eliminar.'); }
  };

  /* ── Asignaciones (CU13) ────────────────────────────────── */
  const asignarDocente = async (e) => {
    e.preventDefault(); setSavingAsig(true); setErrAsig('');
    try {
      await client.post('/asignaciones', formAsig);
      setFormAsig(p => ({ ...p, docente_ci: '', materia_id: '' }));
      await recargarDetalle(grupoActivo);
    } catch (err) {
      const d = err.response?.data;
      setErrAsig(d?.errors ? Object.values(d.errors).flat().join(' · ') : d?.mensaje ?? 'Error al asignar.');
    } finally { setSavingAsig(false); }
  };

  const quitarAsignacion = async (id) => {
    if (!confirm('¿Quitar esta asignación?')) return;
    try { await client.delete(`/asignaciones/${id}`); await recargarDetalle(grupoActivo); }
    catch (err) { alert(err.response?.data?.mensaje ?? 'No se pudo quitar.'); }
  };

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU14</p>
          <h1 className="pg-title">Gestionar Grupos</h1>
          <p className="pg-subtitle">{grupos.length} grupo(s) registrado(s)</p>
        </div>
        <button className="pg-btn pg-btn--primary" onClick={abrirCrear}><IcoPlus /> Nuevo Grupo</button>
      </div>

      {/* Filtro por convocatoria */}
      <div className="pg-filters">
        <select value={filtroConv} onChange={e => setFiltroConv(e.target.value)}>
          <option value="">Todas las convocatorias</option>
          {convocatorias.map(c => <option key={c.id} value={c.id}>{c.id} — {c.nombre}</option>)}
        </select>
      </div>

      {/* Tabla + panel detalle */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>

        {/* ── Tabla de grupos ─────────────────────────────── */}
        <div className="pg-table-wrap" style={{ flex: grupoActivo ? '0 0 45%' : 1 }}>
          {loading ? <div className="pg-loading">Cargando...</div> : (
            <table className="pg-table">
              <thead><tr><th>Grupo</th><th>Convocatoria</th><th>Modalidad</th><th>Cupo</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {grupos.length === 0
                  ? <tr><td colSpan={6} className="pg-empty">No hay grupos registrados</td></tr>
                  : grupos.map(g => (
                    <tr key={`${g.id}-${g.convocatoria_id}`}
                      style={{ background: grupoActivo?.id === g.id && grupoActivo?.convocatoria_id === g.convocatoria_id ? '#eff6ff' : '' }}>
                      <td><span className="pg-badge pg-badge--activa">{g.id}</span></td>
                      <td style={{ fontSize: '0.78rem' }}>{g.convocatoria_id}</td>
                      <td><span className={`pg-badge pg-badge--${g.modalidad === 'virtual' ? 'pendiente' : 'activo'}`}>{g.modalidad}</span></td>
                      <td>{g.cupo_maximo}</td>
                      <td><span className={`pg-badge pg-badge--${g.estado}`}>{g.estado}</span></td>
                      <td>
                        <div className="pg-actions">
                          <button className="pg-act-btn pg-act-btn--view" onClick={() => abrirDetalle(g)} title="Horarios y docentes"><IcoView /></button>
                          <button className="pg-act-btn pg-act-btn--edit" onClick={() => abrirEditar(g)} title="Editar"><IcoEdit /></button>
                          <button className="pg-act-btn pg-act-btn--delete" onClick={() => eliminarGrp(g)} title="Eliminar"><IcoDel /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Panel de detalle (horarios + asignaciones) ───── */}
        {grupoActivo && (
          <div style={{ flex: 1, background: '#fff', borderRadius: 8, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            {/* Cabecera del panel */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>Grupo {grupoActivo.id}</span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 8 }}>{grupoActivo.convocatoria_id} · {grupoActivo.modalidad} · cupo {grupoActivo.cupo_maximo}</span>
              </div>
              <button onClick={() => setGrupoActivo(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem' }}>✕ Cerrar</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6' }}>
              {[['horarios', 'Horarios (CU14)'], ['asignaciones', 'Docentes (CU13)']].map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)}
                  style={{ padding: '10px 18px', border: 'none', borderBottom: tab === k ? '2px solid #004B8D' : '2px solid transparent', background: 'none', fontWeight: tab === k ? 700 : 400, color: tab === k ? '#004B8D' : '#6b7280', cursor: 'pointer', fontSize: '0.82rem' }}>
                  {l}
                </button>
              ))}
            </div>

            <div style={{ padding: '1.25rem' }}>

              {/* ── TAB HORARIOS ─────────────────────────────── */}
              {tab === 'horarios' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Formulario agregar horario */}
                  <form onSubmit={agregarHorario} style={{ background: '#f9fafb', padding: '1rem', borderRadius: 6 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', color: '#374151' }}>Agregar Horario</p>
                    {errHor && <div className="pg-alert pg-alert--error" style={{ marginBottom: '0.75rem' }}>{errHor}</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="pg-field">
                        <label>Día *</label>
                        <select value={formHor.dia} onChange={setH('dia')}>
                          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="pg-field">
                        <label>Aula {grupoActivo.modalidad === 'presencial' ? '*' : '(opcional)'}</label>
                        <select value={formHor.aula_nro} onChange={setH('aula_nro')}
                          required={grupoActivo.modalidad === 'presencial'}>
                          <option value="">-- Sin aula --</option>
                          {aulas.map(a => <option key={a.nro} value={a.nro}>{a.nro} (cap. {a.capacidad})</option>)}
                        </select>
                      </div>
                      <div className="pg-field">
                        <label>Hora Inicio *</label>
                        <input type="time" value={formHor.hora_inicio} onChange={setH('hora_inicio')} required />
                      </div>
                      <div className="pg-field">
                        <label>Hora Fin * (debe ser posterior)</label>
                        <input type="time" value={formHor.hora_fin} onChange={setH('hora_fin')}
                          min={formHor.hora_inicio} required />
                      </div>
                    </div>
                    <button type="submit" className="pg-btn pg-btn--primary" style={{ marginTop: '0.75rem' }} disabled={savingHor}>
                      {savingHor ? 'Guardando...' : '+ Agregar Horario'}
                    </button>
                  </form>

                  {/* Lista de horarios */}
                  {horarios.length === 0
                    ? <div className="pg-empty" style={{ padding: '1.5rem' }}>Sin horarios registrados</div>
                    : (
                      <table className="pg-table">
                        <thead><tr><th>Día</th><th>Inicio</th><th>Fin</th><th>Aula</th><th></th></tr></thead>
                        <tbody>
                          {horarios.map(h => (
                            <tr key={h.id}>
                              <td><span className="pg-badge pg-badge--activa">{h.dia}</span></td>
                              <td>{h.hora_inicio}</td>
                              <td>{h.hora_fin}</td>
                              <td>{h.aula ? `${h.aula.nro} (cap. ${h.aula.capacidad})` : <span style={{ color: '#9ca3af' }}>Virtual</span>}</td>
                              <td>
                                <button className="pg-act-btn pg-act-btn--delete" onClick={() => quitarHorario(h.id)} title="Quitar"><IcoDel /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                </div>
              )}

              {/* ── TAB ASIGNACIONES (CU13) ──────────────────── */}
              {tab === 'asignaciones' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Formulario asignar docente */}
                  <form onSubmit={asignarDocente} style={{ background: '#f9fafb', padding: '1rem', borderRadius: 6 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', color: '#374151' }}>
                      Asignar Docente — máx. 4 grupos por docente
                    </p>
                    {errAsig && <div className="pg-alert pg-alert--error" style={{ marginBottom: '0.75rem' }}>{errAsig}</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="pg-field">
                        <label>Docente *</label>
                        <select value={formAsig.docente_ci} onChange={setA('docente_ci')} required>
                          <option value="">Seleccionar docente...</option>
                          {docentes.map(d => (
                            <option key={d.CI} value={d.CI}>
                              {d.usuario?.nombre_completo ?? `CI ${d.CI}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="pg-field">
                        <label>Materia *</label>
                        <select value={formAsig.materia_id} onChange={setA('materia_id')} required>
                          <option value="">Seleccionar materia...</option>
                          {materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="pg-btn pg-btn--primary" style={{ marginTop: '0.75rem' }} disabled={savingAsig}>
                      {savingAsig ? 'Asignando...' : '+ Asignar Docente'}
                    </button>
                  </form>

                  {/* Lista de asignaciones */}
                  {asignaciones.length === 0
                    ? <div className="pg-empty" style={{ padding: '1.5rem' }}>Sin docentes asignados</div>
                    : (
                      <table className="pg-table">
                        <thead><tr><th>Docente</th><th>Materia</th><th></th></tr></thead>
                        <tbody>
                          {asignaciones.map(a => (
                            <tr key={a.id}>
                              <td style={{ fontWeight: 600 }}>{a.docente?.usuario?.nombre_completo ?? `CI ${a.docente_ci}`}</td>
                              <td>{a.materia?.nombre}</td>
                              <td>
                                <button className="pg-act-btn pg-act-btn--delete" onClick={() => quitarAsignacion(a.id)} title="Quitar"><IcoDel /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal crear / editar grupo ────────────────────── */}
      {modalGrp && (
        <div className="pg-overlay" onClick={cerrarGrp}>
          <div className="pg-modal" onClick={e => e.stopPropagation()}>
            <div className="pg-modal__header">
              <h3>{modalGrp === 'crear' ? 'Nuevo Grupo' : `Editar — Grupo ${formGrp.id}`}</h3>
              <button className="pg-modal__close" onClick={cerrarGrp}>✕</button>
            </div>
            <form onSubmit={guardarGrp}>
              <div className="pg-modal__body">
                {errGrp && <div className="pg-alert pg-alert--error">{errGrp}</div>}
                <div className="pg-form-grid">
                  <div className="pg-form-grid pg-form-grid-2">
                    <div className="pg-field">
                      <label>ID del Grupo *</label>
                      <input value={formGrp.id} onChange={setG('id')}
                        placeholder="Ej: M001, T002" maxLength={10}
                        required readOnly={modalGrp === 'editar'} />
                    </div>
                    <div className="pg-field">
                      <label>Convocatoria *</label>
                      <select value={formGrp.convocatoria_id} onChange={setG('convocatoria_id')}
                        required disabled={modalGrp === 'editar'}>
                        <option value="">Seleccionar...</option>
                        {convocatorias.map(c => <option key={c.id} value={c.id}>{c.id} — {c.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="pg-form-grid pg-form-grid-2">
                    <div className="pg-field">
                      <label>Cupo Máximo * (máx. 70)</label>
                      <input type="number" value={formGrp.cupo_maximo} onChange={setG('cupo_maximo')}
                        min={1} max={70} required />
                    </div>
                    <div className="pg-field">
                      <label>Estado</label>
                      <select value={formGrp.estado} onChange={setG('estado')}>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pg-modal__footer">
                <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrarGrp}>Cancelar</button>
                <button type="submit" className="pg-btn pg-btn--primary" disabled={savingGrp}>{savingGrp ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
