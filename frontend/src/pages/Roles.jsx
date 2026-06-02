// ============================================================
// CU4 — Gestionar Roles
// CRUD de roles: crear, editar, asignar permisos, eliminar.
// ============================================================
import { useState, useEffect } from 'react';
import client from '../api/client';
import './pages.css';

const EMPTY_FORM = { nombre: '', descripcion: '' };

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/roles');
      setRoles(data);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
    setSuccess('');
    setModal(true);
  };

  const abrirEditar = async (rol) => {
    setForm({ nombre: rol.nombre, descripcion: rol.descripcion ?? '' });
    setEditingId(rol.id);
    setError('');
    setSuccess('');
    setModal(true);
  };

  const cerrar = () => {
    setModal(false);
    setError('');
    setSuccess('');
    setEditingId(null);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingId) {
        await client.put(`/roles/${editingId}`, form);
        setSuccess('Rol actualizado correctamente.');
      } else {
        await client.post('/roles', form);
        setSuccess('Rol creado correctamente.');
      }
      cargar();
      setTimeout(cerrar, 1800);
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(' · ') : err.response?.data?.mensaje ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar el rol "${nombre}"?`)) return;
    try {
      await client.delete(`/roles/${id}`);
      cargar();
    } catch (err) {
      alert(err.response?.data?.mensaje ?? 'Error al eliminar.');
    }
  };

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU4</p>
          <h1 className="pg-title">Gestionar Roles</h1>
          <p className="pg-subtitle">Administración de roles del sistema</p>
        </div>
        <button className="pg-btn pg-btn--primary" onClick={abrirCrear}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo Rol
        </button>
      </div>

      <div className="pg-filters">
        <input placeholder="Buscar rol..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 250 }} />
        <button className="pg-btn pg-btn--ghost" onClick={() => setSearch('')}>Limpiar</button>
      </div>

      <div className="pg-table-wrap">
        {loading ? <div className="pg-loading">Cargando...</div> : (
          <table className="pg-table">
            <thead>
              <tr><th>ID</th><th>Nombre</th><th>Descripción</th><th>Permisos</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {roles.filter(r => search === '' || r.nombre.toLowerCase().includes(search.toLowerCase())).length === 0
                ? <tr><td colSpan={5} className="pg-empty">Sin roles</td></tr>
                : roles.filter(r => search === '' || r.nombre.toLowerCase().includes(search.toLowerCase())).map(r => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.id}</td>
                    <td>{r.nombre}</td>
                    <td style={{ fontSize: '0.78rem', color: '#6b7280', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.descripcion ?? '—'}</td>
                    <td><span className="pg-badge pg-badge--activo">{r.permisos?.length ?? 0} permisos</span></td>
                    <td>
                      <div className="pg-actions">
                        <button className="pg-act-btn pg-act-btn--edit" onClick={() => abrirEditar(r)} title="Editar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="pg-act-btn pg-act-btn--delete" onClick={() => eliminar(r.id, r.nombre)} title="Eliminar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M9 6V4h6v2" />
                          </svg>
                        </button>
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
              <h3>{editingId ? 'Editar Rol' : 'Nuevo Rol'}</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <form onSubmit={guardar}>
              <div className="pg-modal__body">
                {error && <div className="pg-alert pg-alert--error">{error}</div>}
                {success && <div className="pg-alert pg-alert--success">{success}</div>}
                <div className="pg-form-grid">
                  <div className="pg-field">
                    <label>Nombre del Rol *</label>
                    <input value={form.nombre}
                      onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                      placeholder="Ej: Supervisor" required />
                  </div>
                  <div className="pg-field">
                    <label>Descripción (opcional)</label>
                    <textarea value={form.descripcion}
                      onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                      placeholder="Ej: Supervisa operaciones del sistema"
                      style={{ resize: 'vertical', minHeight: 80 }} />
                  </div>
                </div>
              </div>
              <div className="pg-modal__footer">
                <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="pg-btn pg-btn--primary" disabled={saving}>
                  {saving ? 'Guardando...' : (editingId ? 'Actualizar Rol' : 'Crear Rol')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
