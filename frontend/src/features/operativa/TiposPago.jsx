// ============================================================
// CU15 — Gestionar Tipos de Pago
// CRUD del catálogo de aranceles universitarios.
// ============================================================
import { useState, useEffect } from 'react';
import client from '../../api/client';
import '../../shared/pages.css';

const EMPTY = { descripcion: '', monto: '', estado: 'activo' };

export default function TiposPago() {
  const [tipos, setTipos]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'crear' | 'editar'
  const [form, setForm]       = useState(EMPTY);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);

  const cargar = async () => {
    setLoading(true);
    try { const { data } = await client.get('/tipos-pago'); setTipos(data); }
    catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => { setForm(EMPTY); setError(''); setModal('crear'); };
  const abrirEditar = (t) => {
    setForm({ id: t.id, descripcion: t.descripcion, monto: String(t.monto), estado: t.estado });
    setError('');
    setModal('editar');
  };
  const cerrar = () => { setModal(null); setError(''); };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (modal === 'crear') {
        await client.post('/tipos-pago', form);
      } else {
        await client.put(`/tipos-pago/${form.id}`, {
          descripcion: form.descripcion,
          monto: form.monto,
          estado: form.estado,
        });
      }
      cargar(); cerrar();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(' · ') : err.response?.data?.mensaje ?? 'Error al guardar.');
    } finally { setSaving(false); }
  };

  const eliminar = async (t) => {
    if (!confirm(`¿Eliminar "${t.descripcion}"?`)) return;
    try { await client.delete(`/tipos-pago/${t.id}`); cargar(); }
    catch (err) { alert(err.response?.data?.mensaje ?? 'No se pudo eliminar.'); }
  };

  const toggleEstado = async (t) => {
    const nuevoEstado = t.estado === 'activo' ? 'inactivo' : 'activo';
    try { await client.put(`/tipos-pago/${t.id}`, { estado: nuevoEstado }); cargar(); }
    catch (err) { alert(err.response?.data?.mensaje ?? 'No se pudo actualizar el estado.'); }
  };

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU15</p>
          <h1 className="pg-title">Tipos de Pago</h1>
          <p className="pg-subtitle">{tipos.length} arancel(es) configurado(s)</p>
        </div>
        <button className="pg-btn pg-btn--primary" onClick={abrirCrear}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo Tipo
        </button>
      </div>

      <div className="pg-table-wrap">
        {loading ? <div className="pg-loading">Cargando...</div> : (
          <table className="pg-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Descripción</th>
                <th>Monto (Bs)</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tipos.length === 0
                ? <tr><td colSpan={5} className="pg-empty">No hay tipos de pago registrados</td></tr>
                : tipos.map(t => (
                  <tr key={t.id}>
                    <td style={{ color: '#9ca3af', fontSize: '0.78rem' }}>{t.id}</td>
                    <td style={{ fontWeight: 600 }}>{t.descripcion}</td>
                    <td style={{ fontWeight: 700, color: '#004B8D' }}>
                      {Number(t.monto).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <button
                        className={`pg-badge pg-badge--${t.estado}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        onClick={() => toggleEstado(t)}
                        title="Clic para cambiar estado"
                      >
                        {t.estado}
                      </button>
                    </td>
                    <td>
                      <div className="pg-actions">
                        <button className="pg-act-btn pg-act-btn--edit" onClick={() => abrirEditar(t)} title="Editar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="pg-act-btn pg-act-btn--delete" onClick={() => eliminar(t)} title="Eliminar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
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
              <h3>{modal === 'crear' ? 'Nuevo Tipo de Pago' : 'Editar Tipo de Pago'}</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <form onSubmit={guardar}>
              <div className="pg-modal__body">
                {error && <div className="pg-alert pg-alert--error">{error}</div>}
                <div className="pg-form-grid">
                  <div className="pg-field">
                    <label>Descripción *</label>
                    <input
                      value={form.descripcion}
                      onChange={e => set('descripcion', e.target.value)}
                      placeholder="Ej: Inscripción Preuniversitario CUP"
                      maxLength={200}
                      required
                    />
                  </div>
                  <div className="pg-form-grid pg-form-grid-2">
                    <div className="pg-field">
                      <label>Monto (Bs) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.monto}
                        onChange={e => set('monto', e.target.value)}
                        placeholder="700.00"
                        required
                      />
                    </div>
                    <div className="pg-field">
                      <label>Estado</label>
                      <select value={form.estado} onChange={e => set('estado', e.target.value)}>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                      </select>
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
    </div>
  );
}
