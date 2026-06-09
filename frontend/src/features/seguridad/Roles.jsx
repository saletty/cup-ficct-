// CU4 — Gestionar Roles del sistema
import { useState, useEffect } from 'react';
import client from '../../api/client';
import '../../shared/pages.css';

function Modal({ titulo, onClose, children }) {
  return (
    <div className="pg-modal-backdrop">
      <div className="pg-modal" style={{ maxWidth: 460, width: '100%' }}>
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

export default function Roles() {
  const [roles,    setRoles]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editando, setEditando] = useState(null);
  const [form,     setForm]     = useState({ nombre: '', descripcion: '' });
  const [errors,   setErrors]   = useState({});
  const [saving,   setSaving]   = useState(false);
  const [alerta,   setAlerta]   = useState({ msg: '', tipo: '' });

  const cargar = () => {
    setLoading(true);
    client.get('/roles').then(r => setRoles(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const mostrar = (msg, tipo = 'success') => {
    setAlerta({ msg, tipo }); setTimeout(() => setAlerta({ msg: '', tipo: '' }), 4000);
  };

  const abrirCrear = () => { setForm({ nombre: '', descripcion: '' }); setErrors({}); setEditando(null); setModal(true); };
  const abrirEditar = (r) => { setEditando(r); setForm({ nombre: r.nombre, descripcion: r.descripcion ?? '' }); setErrors({}); setModal(true); };
  const cerrar = () => { setModal(false); setEditando(null); setErrors({}); };

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setErrors(p => ({ ...p, [e.target.name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setErrors({});
    try {
      if (editando) {
        await client.put(`/roles/${editando.id}`, form);
        mostrar('Rol actualizado correctamente.');
      } else {
        await client.post('/roles', form);
        mostrar('Rol creado correctamente.');
      }
      cerrar(); cargar();
    } catch (err) {
      const d = err.response?.data;
      if (d?.errors) {
        const m = {}; Object.entries(d.errors).forEach(([k, v]) => { m[k] = v[0]; }); setErrors(m);
      } else {
        setErrors({ _general: d?.mensaje || d?.message || 'Error al guardar.' });
      }
    } finally { setSaving(false); }
  };

  const eliminar = async (r) => {
    if (!window.confirm(`¿Eliminar el rol "${r.nombre}"? Solo es posible si no tiene usuarios asignados.`)) return;
    try {
      await client.delete(`/roles/${r.id}`);
      mostrar('Rol eliminado.'); cargar();
    } catch (err) {
      mostrar(err.response?.data?.mensaje || 'No se pudo eliminar el rol.', 'error');
    }
  };

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU4</p>
          <h1 className="pg-title">Gestión de Roles</h1>
          <p className="pg-subtitle">Crea y administra los roles del sistema</p>
        </div>
        <div className="pg-header__actions">
          <button className="pg-btn pg-btn--primary" onClick={abrirCrear}>+ Nuevo Rol</button>
        </div>
      </div>

      {alerta.msg && <div className={`pg-alert ${alerta.tipo === 'error' ? 'pg-alert--error' : 'pg-alert--success'}`}>{alerta.msg}</div>}

      <div className="pg-table-wrap">
        {loading ? <div className="pg-loading">Cargando...</div> : (
          <table className="pg-table">
            <thead>
              <tr><th>ID</th><th>Nombre</th><th>Descripción</th><th>Permisos asignados</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr><td colSpan={5} className="pg-empty">Sin roles</td></tr>
              ) : roles.map(r => (
                <tr key={r.id}>
                  <td style={{ color: '#9ca3af', fontSize: '0.75rem', fontFamily: 'monospace' }}>{r.id}</td>
                  <td style={{ fontWeight: 700 }}>{r.nombre}</td>
                  <td style={{ fontSize: '0.82rem', color: '#6b7280' }}>{r.descripcion ?? <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 380 }}>
                      {(r.permisos ?? []).length === 0 ? (
                        <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Sin permisos</span>
                      ) : (r.permisos ?? []).map(p => (
                        <span key={p.id} style={{ background: '#f3f4f6', color: '#374151', padding: '1px 7px', borderRadius: 99, fontSize: '0.68rem', border: '1px solid #e5e7eb' }}>{p.descripcion}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="pg-btn pg-btn--ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => abrirEditar(r)}>Editar</button>
                      <button style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 5, cursor: 'pointer' }} onClick={() => eliminar(r)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal titulo={editando ? `Editar Rol: ${editando.nombre}` : 'Nuevo Rol'} onClose={cerrar}>
          {errors._general && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 5, padding: '8px 12px', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{errors._general}</div>}
          <form onSubmit={handleSubmit}>
            {campo('Nombre del rol *', (
              <input name="nombre" value={form.nombre} onChange={handleChange} required style={inp(errors.nombre)} placeholder="Ej: Coordinador Académico" />
            ), errors.nombre)}
            {campo('Descripción', (
              <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={3} style={{ ...inp(), resize: 'vertical' }} placeholder="Descripción opcional del rol..." />
            ), errors.descripcion)}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrar}>Cancelar</button>
              <button type="submit" className="pg-btn pg-btn--primary" disabled={saving}>
                {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear rol'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
