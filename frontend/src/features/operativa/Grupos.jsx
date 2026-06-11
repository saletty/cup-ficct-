// ============================================================
// CU14 — Gestionar Grupos
// PK compuesta: (id, convocatoria_id) — ej: 'M001', '1-2026'
// Incluye sub-recursos:
//   - Horarios (CU14): agregar/quitar con detección de colisiones
//   - Asignaciones de docente (CU13): asignar docente+materia a un grupo
// ============================================================
import { useState, useEffect } from 'react';
import client from '../../api/client';
import '../../shared/pages.css';

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
  const [turnoSelec, setTurnoSelec]   = useState('');
  const [aplicandoTurno, setAplicando] = useState(false);
  const [msgTurno, setMsgTurno]       = useState('');

  /* ── Asignaciones (CU13) ───────────────────────────────── */
  const [asignaciones, setAsignaciones] = useState([]);
  const [formAsig, setFormAsig]         = useState(EMPTY_ASIG);
  const [errAsig, setErrAsig]           = useState('');
  const [savingAsig, setSavingAsig]     = useState(false);

  /* ── Generación automática de grupos ──────────────────── */
  const [modalGen, setModalGen]         = useState(null); // null | 'calculo' | 'distribucion'
  const [genConv, setGenConv]           = useState(null); // convocatoria seleccionada
  const [calculo, setCalculo]           = useState(null); // resultado del cálculo
  const [turnos, setTurnos]             = useState({ mañana: 0, tarde: 0, noche: 0 });
  const [generando, setGenerando]       = useState(false);
  const [errGen, setErrGen]             = useState('');
  const [msgGen, setMsgGen]             = useState('');

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
    setFormHor(EMPTY_HOR); setErrHor(''); setTurnoSelec(''); setMsgTurno('');
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

  /* ── Aplicar turno completo ─────────────────────────────── */
  const aplicarTurno = async () => {
    if (!turnoSelec) return;
    if (!confirm(`¿Aplicar turno "${turnoSelec}" al grupo ${grupoActivo.id}? Esto reemplazará los horarios actuales.`)) return;
    setAplicando(true); setMsgTurno(''); setErrHor('');
    try {
      const { data } = await client.post(
        `/grupos/${grupoActivo.id}/${grupoActivo.convocatoria_id}/aplicar-turno`,
        { turno: turnoSelec }
      );
      setMsgTurno(data.mensaje);
      await recargarDetalle(grupoActivo);
      setTimeout(() => setMsgTurno(''), 4000);
    } catch (err) {
      setErrHor(err.response?.data?.mensaje ?? 'Error al aplicar turno.');
    } finally { setAplicando(false); }
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

  /* ── Generación automática ─────────────────────────────── */
  const abrirGenerador = async () => {
    setErrGen(''); setMsgGen('');
    // Buscar convocatorias finalizadas sin grupos aún
    const todosGrupos = await client.get('/grupos').then(r => r.data).catch(() => []);
    const convsConGrupos = new Set(todosGrupos.map(g => g.convocatoria_id));
    const candidatas = convocatorias.filter(
      c => c.estado === 'finalizada' && !convsConGrupos.has(c.id)
    );
    if (candidatas.length === 0) {
      setMsgGen('No hay convocatorias finalizadas sin grupos pendientes.');
      setModalGen('calculo');
      setCalculo(null);
      setGenConv(null);
      return;
    }
    const conv = candidatas[0]; // más reciente (ya vienen ordenadas desc)
    setGenConv(conv);
    try {
      const { data } = await client.get(`/convocatorias/${conv.id}/calcular-grupos`);
      setCalculo(data);
      setTurnos({ mañana: 0, tarde: 0, noche: 0 });
      setModalGen('calculo');
    } catch { setErrGen('Error al calcular grupos.'); }
  };

  const irADistribucion = () => { setModalGen('distribucion'); setErrGen(''); };

  const setTurno = (t) => (e) => {
    const v = Math.max(0, parseInt(e.target.value) || 0);
    setTurnos(p => ({ ...p, [t]: v }));
  };

  const totalTurnos = turnos.mañana + turnos.tarde + turnos.noche;

  const generarGrupos = async () => {
    setGenerando(true); setErrGen('');
    try {
      const { data } = await client.post('/grupos/generar', {
        convocatoria_id: genConv.id,
        turnos,
      });
      setModalGen(null);
      setMsgGen(data.mensaje);
      cargar();
      setTimeout(() => setMsgGen(''), 5000);
    } catch (err) {
      setErrGen(err.response?.data?.mensaje || 'Error al generar grupos.');
    } finally { setGenerando(false); }
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="pg-btn pg-btn--ghost" onClick={abrirGenerador} style={{ fontSize: '0.82rem' }}>
            ⚡ Generar grupos automáticamente
          </button>
          <button className="pg-btn pg-btn--primary" onClick={abrirCrear}><IcoPlus /> Nuevo Grupo</button>
        </div>
      </div>

      {msgGen && <div className="pg-alert pg-alert--success">{msgGen}</div>}

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
              <thead><tr><th>Grupo</th><th>Convocatoria</th><th>Modalidad</th><th>Turno</th><th>Cupo</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {grupos.length === 0
                  ? <tr><td colSpan={7} className="pg-empty">No hay grupos registrados</td></tr>
                  : grupos.map(g => (
                    <tr key={`${g.id}-${g.convocatoria_id}`}
                      style={{ background: grupoActivo?.id === g.id && grupoActivo?.convocatoria_id === g.convocatoria_id ? '#eff6ff' : '' }}>
                      <td><span className="pg-badge pg-badge--activa">{g.id}</span></td>
                      <td style={{ fontSize: '0.78rem' }}>{g.convocatoria_id}</td>
                      <td><span className={`pg-badge pg-badge--${g.modalidad === 'virtual' ? 'pendiente' : 'activo'}`}>{g.modalidad?.toUpperCase()}</span></td>
                      <td>
                        {g.turno
                          ? <span className={`pg-badge pg-badge--${g.turno === 'mañana' ? 'pendiente' : g.turno === 'tarde' ? 'aprobado' : 'virtual'}`}>{g.turno.toUpperCase()}</span>
                          : <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>—</span>}
                      </td>
                      <td>{g.cupo_maximo}</td>
                      <td><span className={`pg-badge pg-badge--${g.estado}`}>{g.estado?.toUpperCase()}</span></td>
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

                  {/* Lista de horarios */}
                  {horarios.length === 0
                    ? <div className="pg-empty" style={{ padding: '1.5rem' }}>Sin horarios asignados</div>
                    : (
                      <table className="pg-table">
                        <thead><tr><th>Turno</th><th>Día</th><th>Inicio</th><th>Fin</th><th>Aula</th></tr></thead>
                        <tbody>
                          {horarios.map(h => (
                            <tr key={h.id}>
                              <td>
                                {h.turno && (
                                  <span className={`pg-badge pg-badge--${h.turno === 'mañana' ? 'pendiente' : h.turno === 'tarde' ? 'aprobado' : 'virtual'}`}>
                                    {h.turno.toUpperCase()}
                                  </span>
                                )}
                              </td>
                              <td><span className="pg-badge pg-badge--activa">{h.dia}</span></td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{h.hora_inicio}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{h.hora_fin}</td>
                              <td style={{ fontSize: '0.78rem' }}>{h.aula ? h.aula.nro : <span style={{ color: '#9ca3af' }}>Virtual</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                </div>
              )}

              {/* ── TAB DOCENTES (CU13) ──────────────────────── */}
              {tab === 'asignaciones' && (
                <div>
                  {asignaciones.length === 0
                    ? <div className="pg-empty" style={{ padding: '1.5rem' }}>Sin docentes asignados</div>
                    : (
                      <table className="pg-table">
                        <thead><tr><th>Docente</th><th>Materia</th></tr></thead>
                        <tbody>
                          {asignaciones.map(a => (
                            <tr key={a.id}>
                              <td style={{ fontWeight: 600 }}>{a.docente?.usuario?.nombre_completo ?? `CI ${a.docente_ci}`}</td>
                              <td>{a.materia?.nombre}</td>
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
      {/* ── Modal generación automática ──────────────────────── */}
      {modalGen && (
        <div className="pg-overlay">
          <div className="pg-modal" style={{ maxWidth: 560, width: '100%' }}>
            <div className="pg-modal__header">
              <h3 className="pg-modal__title">
                {modalGen === 'calculo' ? '⚡ Generar grupos automáticamente' : '📅 Distribución por turno'}
              </h3>
              <button className="pg-modal__close" onClick={() => setModalGen(null)}>×</button>
            </div>
            <div className="pg-modal__body">
              {errGen && <div className="pg-alert pg-alert--error" style={{ marginBottom: '1rem' }}>{errGen}</div>}

              {/* PASO 1 — Cálculo */}
              {modalGen === 'calculo' && (
                <>
                  {!calculo ? (
                    <p style={{ color: '#6b7280', textAlign: 'center', padding: '1rem' }}>
                      {msgGen || 'No hay convocatorias finalizadas sin grupos pendientes.'}
                    </p>
                  ) : (
                    <>
                      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem', marginBottom: '1.25rem' }}>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8 }}>Convocatoria</p>
                        <p style={{ fontWeight: 700, fontSize: '1rem', color: '#1f2937' }}>{calculo.convocatoria.nombre}</p>
                        <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>ID: {calculo.convocatoria.id}</p>
                      </div>
                      <div className="pg-grid-3" style={{ marginBottom: '1.25rem' }}>
                        {[
                          { label: 'Postulantes inscritos', value: calculo.total_inscritos, color: '#1e40af', bg: '#eff6ff' },
                          { label: 'Límite por grupo', value: calculo.limite_por_grupo, color: '#065f46', bg: '#ecfdf5' },
                          { label: 'Grupos necesarios', value: calculo.grupos_necesarios, color: '#7c3aed', bg: '#f5f3ff' },
                        ].map(({ label, value, color, bg }) => (
                          <div key={label} style={{ background: bg, borderRadius: 8, padding: '0.85rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '1.6rem', fontWeight: 800, color, margin: 0 }}>{value}</p>
                            <p style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: 4 }}>{label}</p>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 6, padding: '0.6rem 1rem', fontSize: '0.8rem', color: '#92400e', marginBottom: '1rem' }}>
                        <strong>Fórmula:</strong> {calculo.formula}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* PASO 2 — Distribución de turnos */}
              {modalGen === 'distribucion' && calculo && (
                <>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.25rem' }}>
                    Distribuye los <strong>{calculo.grupos_necesarios}</strong> grupos entre los turnos disponibles.
                    La suma debe ser igual a <strong>{calculo.grupos_necesarios}</strong>.
                  </p>
                  <div className="pg-grid-3" style={{ marginBottom: '1rem' }}>
                    {[
                      { key: 'mañana', label: '🌅 Mañana', sub: '7:00 am – 1:00 pm', color: '#d97706', bg: '#fffbeb' },
                      { key: 'tarde',  label: '☀️ Tarde',  sub: '1:00 pm – 7:00 pm', color: '#0284c7', bg: '#f0f9ff' },
                      { key: 'noche',  label: '🌙 Noche',  sub: '5:30 pm – 10:30 pm', color: '#7c3aed', bg: '#f5f3ff' },
                    ].map(({ key, label, sub, color, bg }) => (
                      <div key={key} style={{ background: bg, borderRadius: 8, padding: '0.9rem', border: `1.5px solid ${turnos[key] > 0 ? color : '#e5e7eb'}` }}>
                        <p style={{ fontWeight: 700, fontSize: '0.82rem', color, marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: '0.68rem', color: '#9ca3af', marginBottom: 8 }}>{sub}</p>
                        <input type="number" min={0} max={calculo.grupos_necesarios} value={turnos[key]}
                          onChange={setTurno(key)}
                          style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, padding: '6px', border: '1.5px solid #d1d5db', borderRadius: 5 }}
                        />
                        <p style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>
                          {turnos[key] > 0 ? `→ ${Array.from({length: turnos[key]}, (_, i) => `${key[0].toUpperCase()}${String(i+1).padStart(3,'0')}`).join(', ')}` : 'Sin grupos'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Indicador de suma */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.6rem 1rem', borderRadius: 6,
                    background: totalTurnos === calculo.grupos_necesarios ? '#ecfdf5' : '#fef2f2',
                    border: `1px solid ${totalTurnos === calculo.grupos_necesarios ? '#86efac' : '#fca5a5'}`,
                    marginBottom: '1rem', fontSize: '0.85rem',
                  }}>
                    <span style={{ color: totalTurnos === calculo.grupos_necesarios ? '#065f46' : '#b91c1c', fontWeight: 600 }}>
                      {totalTurnos === calculo.grupos_necesarios
                        ? `✓ Distribución correcta: ${totalTurnos} grupos`
                        : `${totalTurnos} de ${calculo.grupos_necesarios} grupos asignados`}
                    </span>
                    {totalTurnos !== calculo.grupos_necesarios && (
                      <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                        Faltan {calculo.grupos_necesarios - totalTurnos} grupo(s)
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="pg-modal__footer">
              <button className="pg-btn pg-btn--ghost" onClick={() => setModalGen(null)}>Cancelar</button>
              {modalGen === 'calculo' && calculo && calculo.grupos_necesarios > 0 && (
                <button className="pg-btn pg-btn--primary" onClick={irADistribucion}>
                  Siguiente: Distribuir turnos →
                </button>
              )}
              {modalGen === 'distribucion' && (
                <>
                  <button className="pg-btn pg-btn--ghost" onClick={() => setModalGen('calculo')}>← Atrás</button>
                  <button
                    className="pg-btn pg-btn--primary"
                    onClick={generarGrupos}
                    disabled={generando || totalTurnos !== calculo.grupos_necesarios}
                  >
                    {generando ? 'Generando...' : '⚡ Generar grupos'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
