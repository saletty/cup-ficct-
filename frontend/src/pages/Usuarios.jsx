// ============================================================
// CU3 — Gestionar Usuarios
// CRUD de usuarios del sistema, asignación de roles, cambio de estado.
// ============================================================
import { useState, useEffect } from 'react';
import client from '../api/client';
import './pages.css';

const EMPTY_FORM = { CI: '', nombre_completo: '', email: '', password: '', estado: 'ACTIVO', rol_id: '' };

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingCI, setEditingCI] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/usuarios');
      setUsuarios(data);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    cargar();
    client.get('/roles').then(r => setRoles(r.data)).catch(() => {});
  }, []);

  const abrirCrear = () => {
    setForm(EMPTY_FORM);
    setEditingCI(null);
    setError('');
    setSuccess('');
    setModal(true);
  };

  const abrirEditar = async (usuario) => {
    const { data } = await client.get(`/usuarios/${usuario.CI}`);
    setForm({
      CI: data.CI,
      nombre_completo: data.nombre_completo,
      email: data.email,
      password: '',
      estado: data.estado,
      rol_id: data.rol_id,
    });
    setEditingCI(usuario.CI);
    setError('');
    setSuccess('');
    setModal(true);
  };

  const cerrar = () => {
    setModal(false);
    setError('');
    setSuccess('');
    setEditingCI(null);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingCI) {
        const payload = { nombre_completo: form.nombre_completo, email: form.email, estado: form.estado, rol_id: form.rol_id };
        if (form.password) payload.password = form.password;
        await client.put(`/usuarios/${editingCI}`, payload);
        setSuccess('Usuario actualizado correctamente.');
      } else {
        await client.post('/usuarios', form);
        setSuccess('Usuario registrado correctamente.');
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

  const cambiarEstado = async (ci, nuevoEstado) => {
    try {
      await client.put(`/usuarios/${ci}`, { estado: nuevoEstado });
      cargar();
    } catch (err) {
      alert(err.response?.data?.mensaje ?? 'Error al actualizar.');
    }
  };

  const desactivar = async (ci, nombre) => {
    if (!confirm(`¿Desactivar al usuario ${nombre}?`)) return;
    try {
      await client.delete(`/usuarios/${ci}`);
      cargar();
    } catch (err) {
      alert(err.response?.data?.mensaje ?? 'Error al desactivar.');
    }
  };

  const estadoBadge = (e) => {
    const map = { ACTIVO: 'activo', INACTIVO: 'inactivo', BLOQUEADO: 'bloqueado' };
    return `pg-badge pg-badge--${map[e] ?? 'inactivo'}`;
  };

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU3</p>
          <h1 className="pg-title">Gestionar Usuarios</h1>
          <p className="pg-subtitle">Administración de usuarios del sistema</p>
        </div>
        <button className="pg-btn pg-btn--primary" onClick={abrirCrear}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo Usuario
        </button>
      </div>

      <div className="pg-filters">
        <input placeholder="Buscar por CI, nombre o email..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 250 }} />
        <button className="pg-btn pg-btn--ghost" onClick={() => setSearch('')}>Limpiar</button>
      </div>

      <div className="pg-table-wrap">
        {loading ? <div className="pg-loading">Cargando...</div> : (
          <table className="pg-table">
            <thead>
              <tr><th>CI</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {usuarios.filter(u =>
                search === '' ||
                u.CI.toString().includes(search) ||
                u.nombre_completo?.toLowerCase().includes(search.toLowerCase()) ||
                u.email?.toLowerCase().includes(search.toLowerCase())
              ).length === 0
                ? <tr><td colSpan={6} className="pg-empty">Sin usuarios</td></tr>
                : usuarios.filter(u =>
                  search === '' ||
                  u.CI.toString().includes(search) ||
                  u.nombre_completo?.toLowerCase().includes(search.toLowerCase()) ||
                  u.email?.toLowerCase().includes(search.toLowerCase())
                ).map(u => (
                  <tr key={u.CI}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{u.CI}</td>
                    <td>{u.nombre_completo ?? <span style={{ color: '#9ca3af' }}>—</span>}</td>
                    <td style={{ fontSize: '0.78rem', color: '#6b7280' }}>{u.email}</td>
                    <td><span className="pg-badge pg-badge--activa">{u.rol?.nombre ?? '—'}</span></td>
                    <td><span className={estadoBadge(u.estado)}>{u.estado}</span></td>
                    <td>
                      <div className="pg-actions">
                        <button className="pg-act-btn pg-act-btn--edit" onClick={() => abrirEditar(u)} title="Editar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="pg-act-btn pg-act-btn--delete" onClick={() => desactivar(u.CI, u.nombre_completo)} title="Desactivar">
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
          <div className="pg-modal pg-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="pg-modal__header">
              <h3>{editingCI ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <form onSubmit={guardar}>
              <div className="pg-modal__body">
                {error && <div className="pg-alert pg-alert--error">{error}</div>}
                {success && <div className="pg-alert pg-alert--success">{success}</div>}
                <div className="pg-form-grid pg-form-grid-2">
                  <div className="pg-field">
                    <label>CI *</label>
                    <input type="number" value={form.CI}
                      onChange={e => setForm(p => ({ ...p, CI: e.target.value }))}
                      disabled={editingCI}
                      placeholder="Ej: 10000001" required />
                  </div>
                  <div className="pg-field">
                    <label>Nombre Completo *</label>
                    <input value={form.nombre_completo}
                      onChange={e => setForm(p => ({ ...p, nombre_completo: e.target.value }))}
                      placeholder="Ej: Juan Pérez" required />
                  </div>
                  <div className="pg-field">
                    <label>Email *</label>
                    <input type="email" value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="Ej: usuario@ficct.edu.bo" required />
                  </div>
                  <div className="pg-field">
                    <label>Rol *</label>
                    <select value={form.rol_id} onChange={e => setForm(p => ({ ...p, rol_id: e.target.value }))} required>
                      <option value="">Seleccionar rol...</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                  </div>
                  <div className="pg-field">
                    <label>{editingCI ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}</label>
                    <input type="password" value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="••••••••" required={!editingCI} />
                  </div>
                  <div className="pg-field">
                    <label>Estado *</label>
                    <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} required>
                      <option value="ACTIVO">Activo</option>
                      <option value="INACTIVO">Inactivo</option>
                      <option value="BLOQUEADO">Bloqueado</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="pg-modal__footer">
                <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="pg-btn pg-btn--primary" disabled={saving}>
                  {saving ? 'Guardando...' : (editingCI ? 'Actualizar Usuario' : 'Registrar Usuario')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
