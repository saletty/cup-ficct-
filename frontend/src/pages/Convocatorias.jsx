// ============================================================
// CU11 — Gestionar Convocatorias
// CRUD de períodos de admisión.
// Estados: habilitada | finalizada
// Restricción: fecha_fin > fecha_inicio (validado en backend)
// ============================================================
import { useState, useEffect } from 'react';
import client from '../api/client';
import './pages.css';

const EMPTY = { id: '', nombre: '', fecha_inicio: '', fecha_fin: '', cupo_maximo: 100, estado: 'habilitada' };

const IcoPlus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoEdit = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoDel  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>;

export default function Convocatorias() {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(null);   // null | 'crear' | 'editar'
  const [form, setForm]     = useState(EMPTY);
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try { const { data } = await client.get('/convocatorias'); setRows(data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const abrirCrear  = () => { setForm(EMPTY); setError(''); setModal('crear'); };
  const abrirEditar = (r) => { setForm({ ...r }); setError(''); setModal('editar'); };
  const cerrar      = () => { setModal(null); setError(''); };

  const guardar = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      modal === 'crear'
        ? await client.post('/convocatorias', form)
        : await client.put(`/convocatorias/${form.id}`, form);
      cargar(); cerrar();
    } catch (err) {
      const d = err.response?.data;
      setError(d?.errors ? Object.values(d.errors).flat().join(' · ') : d?.mensaje ?? 'Error al guardar.');
    } finally { setSaving(false); }
  };

  const eliminar = async (id) => {
    if (!confirm(`¿Eliminar convocatoria "${id}"?`)) return;
    try { await client.delete(`/convocatorias/${id}`); cargar(); }
    catch (err) { alert(err.response?.data?.mensaje ?? 'No se pudo eliminar.'); }
  };

  const badge = (e) => e === 'habilitada' ? 'activa' : 'cerrada';

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU11</p>
          <h1 className="pg-title">Gestionar Convocatorias</h1>
          <p className="pg-subtitle">{rows.length} período(s) de admisión</p>
        </div>
        <button className="pg-btn pg-btn--primary" onClick={abrirCrear}><IcoPlus /> Nueva Convocatoria</button>
      </div>

      <div className="pg-table-wrap">
        {loading ? <div className="pg-loading">Cargando...</div> : (
          <table className="pg-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Inicio</th><th>Fin</th><th>Cupo Máx.</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {rows.length === 0
                ? <tr><td colSpan={7} className="pg-empty">No hay convocatorias registradas</td></tr>
                : rows.map(r => (
                  <tr key={r.id}>
                    <td><span className="pg-badge pg-badge--activa">{r.id}</span></td>
                    <td style={{ fontWeight: 600 }}>{r.nombre}</td>
                    <td>{r.fecha_inicio}</td>
                    <td>{r.fecha_fin}</td>
                    <td>{r.cupo_maximo}</td>
                    <td><span className={`pg-badge pg-badge--${badge(r.estado)}`}>{r.estado}</span></td>
                    <td>
                      <div className="pg-actions">
                        <button className="pg-act-btn pg-act-btn--edit" onClick={() => abrirEditar(r)} title="Editar"><IcoEdit /></button>
                        <button className="pg-act-btn pg-act-btn--delete" onClick={() => eliminar(r.id)} title="Eliminar"><IcoDel /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="pg-overlay" onClick={cerrar}>
          <div className="pg-modal" onClick={e => e.stopPropagation()}>
            <div className="pg-modal__header">
              <h3>{modal === 'crear' ? 'Nueva Convocatoria' : `Editar — ${form.id}`}</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <form onSubmit={guardar}>
              <div className="pg-modal__body">
                {error && <div className="pg-alert pg-alert--error">{error}</div>}
                <div className="pg-form-grid">
                  <div className="pg-form-grid pg-form-grid-2">
                    <div className="pg-field">
                      <label>ID *</label>
                      <input value={form.id} onChange={set('id')} placeholder="Ej: 1-2026" maxLength={10} required readOnly={modal === 'editar'} />
                    </div>
                    <div className="pg-field">
                      <label>Cupo Máximo *</label>
                      <input type="number" value={form.cupo_maximo} onChange={set('cupo_maximo')} min={1} required />
                    </div>
                  </div>
                  <div className="pg-field">
                    <label>Nombre *</label>
                    <input value={form.nombre} onChange={set('nombre')} placeholder="Ej: Primer Semestre 2026" required />
                  </div>
                  <div className="pg-form-grid pg-form-grid-2">
                    <div className="pg-field">
                      <label>Fecha Inicio *</label>
                      <input type="date" value={form.fecha_inicio} onChange={set('fecha_inicio')} required />
                    </div>
                    <div className="pg-field">
                      <label>Fecha Fin * (debe ser posterior al inicio)</label>
                      <input type="date" value={form.fecha_fin} onChange={set('fecha_fin')} min={form.fecha_inicio || ''} required />
                    </div>
                  </div>
                  <div className="pg-field">
                    <label>Estado</label>
                    <select value={form.estado} onChange={set('estado')}>
                      <option value="habilitada">Habilitada</option>
                      <option value="finalizada">Finalizada</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="pg-modal__footer">
                <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="pg-btn pg-btn--primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
