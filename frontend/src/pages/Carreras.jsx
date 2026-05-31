// ============================================================
// CU7 — Gestionar Carreras
// CRUD de carreras disponibles para admisión.
// ============================================================
import { useState, useEffect } from 'react';
import client from '../api/client';
import './pages.css';

const EMPTY = { id: '', nombre_carrera: '' };

export default function Carreras() {
  const [carreras, setCarreras] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);   // null | 'crear' | 'editar'
  const [form, setForm]         = useState(EMPTY);
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);

  const cargar = async () => {
    setLoading(true);
    try { const { data } = await client.get('/carreras'); setCarreras(data); }
    catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => { setForm(EMPTY); setError(''); setModal('crear'); };
  const abrirEditar = (c) => { setForm({ id: c.id, nombre_carrera: c.nombre_carrera }); setError(''); setModal('editar'); };
  const cerrar = () => { setModal(null); setError(''); };

  const guardar = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (modal === 'crear') {
        await client.post('/carreras', form);
      } else {
        await client.put(`/carreras/${form.id}`, { nombre_carrera: form.nombre_carrera });
      }
      cargar(); cerrar();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(' · ') : err.response?.data?.mensaje ?? 'Error al guardar.');
    } finally { setSaving(false); }
  };

  const eliminar = async (id) => {
    if (!confirm(`¿Eliminar la carrera "${id}"?`)) return;
    try { await client.delete(`/carreras/${id}`); cargar(); }
    catch (err) { alert(err.response?.data?.mensaje ?? 'No se pudo eliminar.'); }
  };

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU7</p>
          <h1 className="pg-title">Gestionar Carreras</h1>
          <p className="pg-subtitle">{carreras.length} carrera(s) disponibles para admisión</p>
        </div>
        <button className="pg-btn pg-btn--primary" onClick={abrirCrear}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva Carrera
        </button>
      </div>

      <div className="pg-table-wrap">
        {loading ? <div className="pg-loading">Cargando...</div> : (
          <table className="pg-table">
            <thead><tr><th>Código</th><th>Nombre de la Carrera</th><th>Acciones</th></tr></thead>
            <tbody>
              {carreras.length === 0
                ? <tr><td colSpan={3} className="pg-empty">No hay carreras registradas</td></tr>
                : carreras.map(c => (
                  <tr key={c.id}>
                    <td><span className="pg-badge pg-badge--activa">{c.id}</span></td>
                    <td style={{ fontWeight: 600 }}>{c.nombre_carrera}</td>
                    <td>
                      <div className="pg-actions">
                        <button className="pg-act-btn pg-act-btn--edit" onClick={() => abrirEditar(c)} title="Editar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="pg-act-btn pg-act-btn--delete" onClick={() => eliminar(c.id)} title="Eliminar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
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
              <h3>{modal === 'crear' ? 'Nueva Carrera' : 'Editar Carrera'}</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <form onSubmit={guardar}>
              <div className="pg-modal__body">
                {error && <div className="pg-alert pg-alert--error">{error}</div>}
                <div className="pg-form-grid">
                  <div className="pg-field">
                    <label>Código (ID) *</label>
                    <input value={form.id} onChange={e => setForm(p => ({...p, id: e.target.value.toUpperCase()}))}
                      placeholder="Ej: SIS, INF, TEL..." maxLength={10} required readOnly={modal === 'editar'} />
                  </div>
                  <div className="pg-field">
                    <label>Nombre de la carrera *</label>
                    <input value={form.nombre_carrera} onChange={e => setForm(p => ({...p, nombre_carrera: e.target.value}))}
                      placeholder="Ej: Ingeniería de Sistemas" required />
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
    </div>
  );
}
