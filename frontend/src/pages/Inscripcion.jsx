// ============================================================
// CU10 — Registrar Inscripción al CUP
// Inscribe a un postulante en una convocatoria y carrera.
// ============================================================
import { useState, useEffect } from 'react';
import client from '../api/client';
import './pages.css';

const EMPTY_FORM = { postulante_ci: '', convocatoria_id: '', carrera_opcion1_id: '', carrera_opcion2_id: '' };

export default function Inscripcion() {
  const [inscripciones, setInscripciones] = useState([]);
  const [meta, setMeta]                   = useState({});
  const [loading, setLoading]             = useState(true);
  const [convocatorias, setConvocatorias] = useState([]);
  const [carreras, setCarreras]           = useState([]);
  const [filtroConv, setFiltroConv]       = useState('');
  const [filtroEst, setFiltroEst]         = useState('');
  const [filtroCi, setFiltroCi]           = useState('');
  const [page, setPage]                   = useState(1);
  const [modal, setModal]                 = useState(false);
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');

  const cargar = async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p };
      if (filtroConv) params.convocatoria_id = filtroConv;
      if (filtroEst)  params.estado = filtroEst;
      if (filtroCi)   params.ci = filtroCi;
      const { data } = await client.get('/inscripciones', { params });
      setInscripciones(data.data); setMeta({ total: data.total, lastPage: data.last_page }); setPage(p);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    cargar();
    client.get('/inscripciones/convocatorias').then(r => setConvocatorias(r.data)).catch(() => {});
    client.get('/carreras').then(r => setCarreras(r.data)).catch(() => {});
  }, []);

  const abrirModal = () => { setForm(EMPTY_FORM); setError(''); setSuccess(''); setModal(true); };
  const cerrar = () => { setModal(false); setError(''); setSuccess(''); };

  const guardar = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      await client.post('/inscripciones', form);
      setSuccess('Inscripción registrada. El postulante quedó inscrito en la convocatoria.');
      cargar(1);
      setTimeout(cerrar, 2000);
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(' · ') : err.response?.data?.mensaje ?? 'Error al inscribir.');
    } finally { setSaving(false); }
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      await client.put(`/inscripciones/${id}`, { estado_admision: nuevoEstado });
      cargar(page);
    } catch (err) { alert(err.response?.data?.mensaje ?? 'Error al actualizar.'); }
  };

  const estadoBadge = (e) => {
    const map = { pendiente:'pendiente', aprobado:'aprobado', reprobado:'reprobado', anulado:'bloqueado' };
    return `pg-badge pg-badge--${map[e] ?? 'inactivo'}`;
  };

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU10</p>
          <h1 className="pg-title">Inscripciones al CUP</h1>
          <p className="pg-subtitle">Total: {meta.total ?? '—'} inscripciones registradas</p>
        </div>
        <button className="pg-btn pg-btn--primary" onClick={abrirModal}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva Inscripción
        </button>
      </div>

      <div className="pg-filters">
        <input placeholder="CI del postulante..." value={filtroCi}
          onChange={e => setFiltroCi(e.target.value)} style={{ maxWidth:160 }} />
        <select value={filtroConv} onChange={e => setFiltroConv(e.target.value)}>
          <option value="">Todas las convocatorias</option>
          {convocatorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select value={filtroEst} onChange={e => setFiltroEst(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobado">Aprobado</option>
          <option value="reprobado">Reprobado</option>
          <option value="anulado">Anulado</option>
        </select>
        <button className="pg-btn pg-btn--primary" onClick={() => cargar(1)}>Filtrar</button>
        <button className="pg-btn pg-btn--ghost" onClick={() => { setFiltroCi(''); setFiltroConv(''); setFiltroEst(''); cargar(1); }}>Limpiar</button>
      </div>

      <div className="pg-table-wrap">
        {loading ? <div className="pg-loading">Cargando...</div> : (
          <>
            <table className="pg-table">
              <thead>
                <tr><th>CI</th><th>Postulante</th><th>Convocatoria</th><th>1ª Carrera</th><th>2ª Carrera</th><th>Estado</th><th>Fecha</th><th>Cambiar estado</th></tr>
              </thead>
              <tbody>
                {inscripciones.length === 0
                  ? <tr><td colSpan={8} className="pg-empty">Sin inscripciones</td></tr>
                  : inscripciones.map(i => (
                    <tr key={i.id}>
                      <td style={{ fontFamily:'monospace', fontWeight:600 }}>{i.postulante_ci}</td>
                      <td style={{ fontSize:'0.78rem' }}>{i.postulante?.usuario?.nombre_completo ?? '—'}</td>
                      <td><span className="pg-badge pg-badge--activa">{i.convocatoria?.nombre ?? i.convocatoria_id}</span></td>
                      <td style={{ fontSize:'0.78rem' }}>{i.carrera_opcion1?.nombre_carrera ?? '—'}</td>
                      <td style={{ fontSize:'0.78rem', color:'#9ca3af' }}>{i.carrera_opcion2?.nombre_carrera ?? '—'}</td>
                      <td><span className={estadoBadge(i.estado_admision)}>{i.estado_admision}</span></td>
                      <td style={{ fontSize:'0.72rem', color:'#9ca3af', whiteSpace:'nowrap' }}>
                        {new Date(i.fecha_registro).toLocaleDateString('es-BO')}
                      </td>
                      <td>
                        <select
                          value={i.estado_admision}
                          onChange={e => cambiarEstado(i.id, e.target.value)}
                          style={{ fontSize:'0.75rem', padding:'4px 8px', border:'1px solid #e5e7eb', borderRadius:4, cursor:'pointer' }}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="aprobado">Aprobado</option>
                          <option value="reprobado">Reprobado</option>
                          <option value="anulado">Anulado</option>
                        </select>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
            {meta.lastPage > 1 && (
              <div className="pg-pagination">
                <span>Página {page} de {meta.lastPage}</span>
                <div className="pg-pagination__btns">
                  <button disabled={page===1} onClick={()=>cargar(page-1)}>Anterior</button>
                  <button disabled={page===meta.lastPage} onClick={()=>cargar(page+1)}>Siguiente</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal nueva inscripción */}
      {modal && (
        <div className="pg-overlay" onClick={cerrar}>
          <div className="pg-modal" onClick={e => e.stopPropagation()}>
            <div className="pg-modal__header">
              <h3>Nueva Inscripción al CUP</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <form onSubmit={guardar}>
              <div className="pg-modal__body">
                {error   && <div className="pg-alert pg-alert--error">{error}</div>}
                {success && <div className="pg-alert pg-alert--success">{success}</div>}
                <div className="pg-form-grid">
                  <div className="pg-field">
                    <label>CI del postulante *</label>
                    <input type="number" value={form.postulante_ci}
                      onChange={e => setForm(p => ({...p, postulante_ci: e.target.value}))}
                      placeholder="Ej: 12345678" required />
                  </div>
                  <div className="pg-field">
                    <label>Convocatoria *</label>
                    <select value={form.convocatoria_id}
                      onChange={e => setForm(p => ({...p, convocatoria_id: e.target.value}))} required>
                      <option value="">Seleccionar convocatoria...</option>
                      {convocatorias.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.estado})</option>)}
                    </select>
                  </div>
                  <div className="pg-field">
                    <label>1ª opción de carrera *</label>
                    <select value={form.carrera_opcion1_id}
                      onChange={e => setForm(p => ({...p, carrera_opcion1_id: e.target.value}))} required>
                      <option value="">Seleccionar carrera...</option>
                      {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre_carrera}</option>)}
                    </select>
                  </div>
                  <div className="pg-field">
                    <label>2ª opción de carrera (opcional)</label>
                    <select value={form.carrera_opcion2_id}
                      onChange={e => setForm(p => ({...p, carrera_opcion2_id: e.target.value}))}>
                      <option value="">Ninguna</option>
                      {carreras.filter(c => c.id !== form.carrera_opcion1_id).map(c =>
                        <option key={c.id} value={c.id}>{c.nombre_carrera}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="pg-modal__footer">
                <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="pg-btn pg-btn--primary" disabled={saving}>{saving ? 'Inscribiendo...' : 'Registrar Inscripción'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
