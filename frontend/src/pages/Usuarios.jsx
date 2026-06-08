// CU3 — Gestionar Usuarios del sistema
import { useState, useEffect } from 'react';
import client from '../api/client';
import './pages.css';

const ESTADO_BADGE = {
  ACTIVO:   'pg-badge--aprobado',
  INACTIVO: 'pg-badge--bloqueado',
};

function Modal({ titulo, onClose, children }) {
  return (
    <div className="pg-modal-backdrop">
      <div className="pg-modal" style={{ maxWidth: 520, width: '100%' }}>
        <div className="pg-modal__header">
          <h3 className="pg-modal__title">{titulo}</h3>
          <button className="pg-modal__close" onClick={onClose}>×</button>
        </div>
        <div className="pg-modal__body">{children}</div>
      </div>
    </div>
  );
}

function campo(label, children, error) {
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b7280', marginBottom: 5 }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 3 }}>{error}</p>}
    </div>
  );
}

const inp = (error) => ({
  width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '0.88rem',
  border: `1.5px solid ${error ? '#dc2626' : '#d1d5db'}`, borderRadius: 5, outline: 'none',
});

const EMPTY_FORM = { CI: '', nombre_completo: '', email: '', password: '', estado: 'ACTIVO', rol_id: '' };

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles,    setRoles]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [editando, setEditando] = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [errors,   setErrors]   = useState({});
  const [saving,   setSaving]   = useState(false);
  const [alerta,   setAlerta]   = useState('');
  const [busqueda, setBusqueda] = useState('');

  const cargar = () => {
    setLoading(true);
    Promise.all([client.get('/usuarios'), client.get('/roles')])
      .then(([u, r]) => { setUsuarios(u.data); setRoles(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => { setForm(EMPTY_FORM); setErrors({}); setModal('crear'); };
  const abrirEditar = (u) => {
    setEditando(u);
    setForm({ CI: u.CI, nombre_completo: u.nombre_completo ?? '', email: u.email ?? '', password: '', estado: u.estado ?? 'ACTIVO', rol_id: u.rol_id ?? '' });
    setErrors({}); setModal('editar');
  };
  const cerrar = () => { setModal(null); setEditando(null); setErrors({}); };

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setErrors(p => ({ ...p, [e.target.name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setErrors({});
    try {
      if (modal === 'crear') {
        await client.post('/usuarios', { ...form, CI: Number(form.CI), rol_id: Number(form.rol_id) });
        setAlerta('Usuario creado correctamente.');
      } else {
        const payload = { nombre_completo: form.nombre_completo, email: form.email, estado: form.estado, rol_id: Number(form.rol_id) };
        if (form.password) payload.password = form.password;
        await client.put(`/usuarios/${editando.CI}`, payload);
        setAlerta('Usuario actualizado correctamente.');
      }
      cerrar(); cargar(); setTimeout(() => setAlerta(''), 4000);
    } catch (err) {
      const d = err.response?.data;
      if (d?.errors) {
        const m = {}; Object.entries(d.errors).forEach(([k, v]) => { m[k] = v[0]; }); setErrors(m);
      } else {
        setErrors({ _general: d?.mensaje || d?.message || 'Error al guardar.' });
      }
    } finally { setSaving(false); }
  };

  const desactivar = async (u) => {
    if (!window.confirm(`¿Desactivar al usuario "${u.nombre_completo ?? u.CI}"?`)) return;
    try {
      await client.delete(`/usuarios/${u.CI}`);
      setAlerta('Usuario desactivado.'); cargar(); setTimeout(() => setAlerta(''), 4000);
    } catch (err) {
      setAlerta(err.response?.data?.mensaje || 'No se pudo desactivar.'); setTimeout(() => setAlerta(''), 4000);
    }
  };

  const filtrados = usuarios.filter(u => {
    const q = busqueda.toLowerCase();
    return !q || String(u.CI).includes(q) || (u.nombre_completo ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q) || (u.rol?.nombre ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU3</p>
          <h1 className="pg-title">Gestión de Usuarios</h1>
          <p className="pg-subtitle">Administra los accesos al sistema</p>
        </div>
        <div className="pg-header__actions">
          <button className="pg-btn pg-btn--primary" onClick={abrirCrear}>+ Nuevo Usuario</button>
        </div>
      </div>

      {alerta && <div className="pg-alert pg-alert--success">{alerta}</div>}

      <div className="pg-filters">
        <input placeholder="Buscar por CI, nombre, email o rol..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ minWidth: 280 }} />
        <span style={{ fontSize: '0.78rem', color: '#9ca3af', alignSelf: 'center' }}>{filtrados.length} usuario(s)</span>
      </div>

      <div className="pg-table-wrap">
        {loading ? <div className="pg-loading">Cargando...</div> : (
          <table className="pg-table">
            <thead>
              <tr><th>CI</th><th>Nombre completo</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={6} className="pg-empty">Sin usuarios</td></tr>
              ) : filtrados.map(u => (
                <tr key={u.CI}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>{u.CI}</td>
                  <td style={{ fontWeight: 500 }}>{u.nombre_completo ?? <span style={{ color: '#9ca3af' }}>—</span>}</td>
                  <td style={{ fontSize: '0.82rem', color: '#6b7280' }}>{u.email ?? '—'}</td>
                  <td>
                    {u.rol ? (
                      <span style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 9px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700 }}>{u.rol.nombre}</span>
                    ) : '—'}
                  </td>
                  <td><span className={`pg-badge ${ESTADO_BADGE[(u.estado ?? '').toUpperCase()] ?? ''}`}>{u.estado}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="pg-btn pg-btn--ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => abrirEditar(u)}>Editar</button>
                      {u.estado !== 'INACTIVO' && (
                        <button style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 5, cursor: 'pointer' }} onClick={() => desactivar(u)}>Desactivar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal titulo={modal === 'crear' ? 'Nuevo Usuario' : 'Editar Usuario'} onClose={cerrar}>
          {errors._general && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 5, padding: '8px 12px', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{errors._general}</div>}
          <form onSubmit={handleSubmit}>
            {modal === 'crear' && campo('CI (carnet de identidad)', (
              <input name="CI" type="number" value={form.CI} onChange={handleChange} required style={inp(errors.CI)} placeholder="Ej: 13705874" />
            ), errors.CI)}

            {campo('Nombre completo', (
              <input name="nombre_completo" value={form.nombre_completo} onChange={handleChange} required style={inp(errors.nombre_completo)} placeholder="Ej: Juan Pérez López" />
            ), errors.nombre_completo)}

            {campo('Correo electrónico', (
              <input name="email" type="email" value={form.email} onChange={handleChange} required style={inp(errors.email)} placeholder="correo@ejemplo.com" />
            ), errors.email)}

            {campo(modal === 'crear' ? 'Contraseña inicial' : 'Nueva contraseña (vacío = sin cambio)', (
              <input name="password" type="password" value={form.password} onChange={handleChange} required={modal === 'crear'} style={inp(errors.password)} placeholder={modal === 'crear' ? 'Mínimo 8 caracteres' : 'Dejar vacío para no cambiar'} />
            ), errors.password)}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {campo('Rol', (
                <select name="rol_id" value={form.rol_id} onChange={handleChange} required style={inp(errors.rol_id)}>
                  <option value="">-- Seleccionar --</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              ), errors.rol_id)}

              {campo('Estado', (
                <select name="estado" value={form.estado} onChange={handleChange} style={inp()}>
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                </select>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrar}>Cancelar</button>
              <button type="submit" className="pg-btn pg-btn--primary" disabled={saving}>
                {saving ? 'Guardando...' : modal === 'crear' ? 'Crear usuario' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
