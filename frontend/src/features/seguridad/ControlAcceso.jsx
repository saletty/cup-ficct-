// CU4 + CU5 — Gestionar Roles y Control de Acceso (fusionados)
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import '../../shared/pages.css';

function Modal({ titulo, onClose, children }) {
  return (
    <div className="pg-overlay">
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

const inpStyle = (error) => ({
  width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '0.88rem',
  border: `1.5px solid ${error ? '#dc2626' : '#d1d5db'}`, borderRadius: 5, outline: 'none',
});

export default function ControlAcceso() {
  const [roles,    setRoles]    = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [rolSel,   setRolSel]   = useState(null);
  const [activos,  setActivos]  = useState(new Set());
  const [original, setOriginal] = useState(new Set());
  const [loading,  setLoading]  = useState(true);
  const [loadPerm, setLoadPerm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [alerta,   setAlerta]   = useState({ msg: '', tipo: '' });

  // Modal de rol (crear / editar)
  const [modal,    setModal]    = useState(null); // null | 'crear' | 'editar'
  const [form,     setForm]     = useState({ nombre: '', descripcion: '' });
  const [errors,   setErrors]   = useState({});
  const [savingRol, setSavingRol] = useState(false);

  const mostrar = (msg, tipo = 'success') => {
    setAlerta({ msg, tipo });
    setTimeout(() => setAlerta({ msg: '', tipo: '' }), 4000);
  };

  const cargarRoles = () =>
    client.get('/roles').then(r => setRoles(r.data)).catch(() => {});

  useEffect(() => {
    Promise.all([client.get('/roles'), client.get('/permisos')])
      .then(([r, p]) => { setRoles(r.data); setPermisos(p.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ── Selección de rol ── */
  const seleccionarRol = useCallback((rol) => {
    setRolSel(rol); setLoadPerm(true);
    client.get(`/roles/${rol.id}/permisos`)
      .then(r => {
        const ids = new Set((r.data.permisos ?? []).map(p => p.id));
        setActivos(ids);
        setOriginal(new Set(ids));
      })
      .catch(() => {})
      .finally(() => setLoadPerm(false));
  }, []);

  /* ── Permisos ── */
  const togglePermiso = (id) => {
    setActivos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const guardarPermisos = async () => {
    if (!rolSel) return;
    setSaving(true);
    try {
      await client.post(`/roles/${rolSel.id}/permisos`, { permisos: [...activos] });
      setOriginal(new Set(activos));
      mostrar(`Permisos del rol "${rolSel.nombre}" guardados.`);
    } catch (err) {
      mostrar(err.response?.data?.mensaje || 'Error al guardar permisos.', 'error');
    } finally { setSaving(false); }
  };

  const hayCambios = rolSel && (
    [...activos].some(id => !original.has(id)) ||
    [...original].some(id => !activos.has(id))
  );

  /* ── CRUD de roles ── */
  const abrirCrear = () => {
    setForm({ nombre: '', descripcion: '' });
    setErrors({});
    setModal('crear');
  };

  const abrirEditar = (r) => {
    setForm({ nombre: r.nombre, descripcion: r.descripcion ?? '' });
    setErrors({});
    setModal('editar');
  };

  const cerrarModal = () => { setModal(null); setErrors({}); };

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setErrors(p => ({ ...p, [e.target.name]: null }));
  };

  const handleSubmitRol = async (e) => {
    e.preventDefault(); setSavingRol(true); setErrors({});
    try {
      if (modal === 'editar') {
        const { data } = await client.put(`/roles/${rolSel.id}`, form);
        mostrar('Rol actualizado correctamente.');
        const actualizado = { ...rolSel, ...form };
        setRolSel(actualizado);
        cerrarModal();
        await cargarRoles();
      } else {
        await client.post('/roles', form);
        mostrar('Rol creado correctamente.');
        cerrarModal();
        await cargarRoles();
      }
    } catch (err) {
      const d = err.response?.data;
      if (d?.errors) {
        const m = {};
        Object.entries(d.errors).forEach(([k, v]) => { m[k] = v[0]; });
        setErrors(m);
      } else {
        setErrors({ _general: d?.mensaje || d?.message || 'Error al guardar.' });
      }
    } finally { setSavingRol(false); }
  };

  const eliminarRol = async () => {
    if (!window.confirm(`¿Eliminar el rol "${rolSel.nombre}"? Solo es posible si no tiene usuarios asignados.`)) return;
    try {
      await client.delete(`/roles/${rolSel.id}`);
      mostrar('Rol eliminado.');
      setRolSel(null);
      setActivos(new Set());
      setOriginal(new Set());
      await cargarRoles();
    } catch (err) {
      mostrar(err.response?.data?.mensaje || 'No se pudo eliminar el rol.', 'error');
    }
  };

  // Agrupar permisos por área
  const grupos = permisos.reduce((acc, p) => {
    const key = p.descripcion.includes(':') ? p.descripcion.split(':')[0].trim() : 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU4 · CU5</p>
          <h1 className="pg-title">Control de Acceso</h1>
          <p className="pg-subtitle">Gestiona los roles del sistema y sus permisos</p>
        </div>
      </div>

      {alerta.msg && (
        <div className={`pg-alert ${alerta.tipo === 'error' ? 'pg-alert--error' : 'pg-alert--success'}`}>
          {alerta.msg}
        </div>
      )}

      {loading ? <div className="pg-loading">Cargando...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.25rem', alignItems: 'start' }}>

          {/* ── Panel izquierdo: lista de roles ── */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ background: '#004B8D', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ color: 'white', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                Roles
              </p>
              <button
                onClick={abrirCrear}
                title="Nuevo rol"
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
              >+</button>
            </div>
            <div>
              {roles.map(r => (
                <button
                  key={r.id}
                  onClick={() => seleccionarRol(r)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '11px 14px',
                    background: rolSel?.id === r.id ? '#eff6ff' : 'white',
                    borderLeft: rolSel?.id === r.id ? '3px solid #2563eb' : '3px solid transparent',
                    border: 'none', borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: rolSel?.id === r.id ? 700 : 500, fontSize: '0.85rem', color: rolSel?.id === r.id ? '#1e40af' : '#1f2937' }}>
                    {r.nombre}
                  </div>
                  {r.descripcion && (
                    <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2, lineHeight: 1.3 }}>
                      {r.descripcion}
                    </div>
                  )}
                  <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 3 }}>
                    {(r.permisos ?? []).length} permiso(s)
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Panel derecho: permisos del rol seleccionado ── */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
            {!rolSel ? (
              <div style={{ textAlign: 'center', padding: '5rem 2rem', color: '#9ca3af' }}>
                <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={1.5} strokeLinecap="round" style={{ marginBottom: 10 }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <p style={{ fontWeight: 600, color: '#6b7280' }}>Selecciona un rol</p>
                <p style={{ fontSize: '0.82rem' }}>para gestionar sus permisos</p>
              </div>
            ) : (
              <>
                {/* Header del panel derecho */}
                <div style={{ background: '#f9fafb', padding: '12px 18px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a', margin: 0 }}>{rolSel.nombre}</p>
                      {rolSel.descripcion && (
                        <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '3px 0 0', lineHeight: 1.4 }}>{rolSel.descripcion}</p>
                      )}
                      <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '4px 0 0' }}>{activos.size} permiso(s) seleccionado(s)</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                      <button
                        className="pg-btn pg-btn--ghost"
                        style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                        onClick={() => abrirEditar(rolSel)}
                      >Editar</button>
                      <button
                        style={{ padding: '5px 12px', fontSize: '0.78rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 5, cursor: 'pointer' }}
                        onClick={eliminarRol}
                      >Eliminar</button>
                      <button
                        className="pg-btn pg-btn--primary"
                        style={{ padding: '5px 14px', fontSize: '0.78rem', opacity: !hayCambios ? 0.5 : 1 }}
                        onClick={guardarPermisos}
                        disabled={saving || !hayCambios}
                      >{saving ? 'Guardando...' : 'Guardar permisos'}</button>
                    </div>
                  </div>
                </div>

                {/* Checkboxes de permisos */}
                {loadPerm ? <div className="pg-loading">Cargando permisos...</div> : (
                  <div style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
                      <button className="pg-btn pg-btn--ghost" style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                        onClick={() => setActivos(new Set(permisos.map(p => p.id)))}>
                        Seleccionar todos
                      </button>
                      <button className="pg-btn pg-btn--ghost" style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                        onClick={() => setActivos(new Set())}>
                        Quitar todos
                      </button>
                    </div>

                    {permisos.length === 0 ? (
                      <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>No hay permisos definidos.</p>
                    ) : (
                      Object.entries(grupos).map(([grupo, items]) => (
                        <div key={grupo} style={{ marginBottom: '1.25rem' }}>
                          <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: '0.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: 4 }}>
                            {grupo}
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                            {items.map(p => {
                              const checked = activos.has(p.id);
                              return (
                                <label key={p.id} style={{
                                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                                  border: `1.5px solid ${checked ? '#bfdbfe' : '#e5e7eb'}`,
                                  borderRadius: 6, cursor: 'pointer',
                                  background: checked ? '#eff6ff' : 'white',
                                  transition: 'all 0.15s',
                                }}>
                                  <input type="checkbox" checked={checked} onChange={() => togglePermiso(p.id)}
                                    style={{ accentColor: '#2563eb', width: 15, height: 15, flexShrink: 0 }} />
                                  <span style={{ fontSize: '0.8rem', fontWeight: checked ? 600 : 400, color: checked ? '#1e40af' : '#374151', lineHeight: 1.2 }}>
                                    {p.descripcion}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal crear / editar rol ── */}
      {modal && (
        <Modal
          titulo={modal === 'editar' ? `Editar: ${rolSel?.nombre}` : 'Nuevo Rol'}
          onClose={cerrarModal}
        >
          {errors._general && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 5, padding: '8px 12px', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
              {errors._general}
            </div>
          )}
          <form onSubmit={handleSubmitRol}>
            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b7280', marginBottom: 5 }}>
                Nombre del rol *
              </label>
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
                style={inpStyle(errors.nombre)}
                placeholder="Ej: Coordinador Académico"
              />
              {errors.nombre && <p style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 3 }}>{errors.nombre}</p>}
            </div>
            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b7280', marginBottom: 5 }}>
                Descripción
              </label>
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                rows={3}
                style={{ ...inpStyle(), resize: 'vertical' }}
                placeholder="Descripción del rol y sus responsabilidades..."
              />
              {errors.descripcion && <p style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 3 }}>{errors.descripcion}</p>}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrarModal}>Cancelar</button>
              <button type="submit" className="pg-btn pg-btn--primary" disabled={savingRol}>
                {savingRol ? 'Guardando...' : modal === 'editar' ? 'Guardar cambios' : 'Crear rol'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
