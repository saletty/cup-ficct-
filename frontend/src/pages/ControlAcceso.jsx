// CU5 — Control de Acceso: asignar permisos a cada rol
import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import './pages.css';

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

  const mostrar = (msg, tipo = 'success') => {
    setAlerta({ msg, tipo });
    setTimeout(() => setAlerta({ msg: '', tipo: '' }), 4000);
  };

  useEffect(() => {
    Promise.all([client.get('/roles'), client.get('/permisos')])
      .then(([r, p]) => { setRoles(r.data); setPermisos(p.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  const togglePermiso = (id) => {
    setActivos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const guardar = async () => {
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

  const hayCambios = rolSel && ([...activos].some(id => !original.has(id)) || [...original].some(id => !activos.has(id)));

  // Agrupar permisos por área (extraído del texto antes de ":")
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
          <p className="pg-tag">CU5</p>
          <h1 className="pg-title">Control de Acceso</h1>
          <p className="pg-subtitle">Asigna los permisos que tiene cada rol en el sistema</p>
        </div>
      </div>

      {alerta.msg && (
        <div className={`pg-alert ${alerta.tipo === 'error' ? 'pg-alert--error' : 'pg-alert--success'}`}>{alerta.msg}</div>
      )}

      {loading ? <div className="pg-loading">Cargando...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Panel izquierdo: roles */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ background: '#004B8D', padding: '10px 14px' }}>
              <p style={{ color: 'white', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Roles</p>
            </div>
            <div>
              {roles.map(r => (
                <button key={r.id} onClick={() => seleccionarRol(r)} style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                  background: rolSel?.id === r.id ? '#eff6ff' : 'white',
                  borderLeft: rolSel?.id === r.id ? '3px solid #2563eb' : '3px solid transparent',
                  border: 'none', borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer', fontSize: '0.84rem',
                  fontWeight: rolSel?.id === r.id ? 700 : 400,
                  color: rolSel?.id === r.id ? '#1e40af' : '#374151',
                  transition: 'all 0.15s',
                }}>
                  {r.nombre}
                  <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 2 }}>
                    {(r.permisos ?? []).length} permisos
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Panel derecho: permisos */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
            {!rolSel ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#9ca3af' }}>
                <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={1.5} strokeLinecap="round" style={{ marginBottom: 10 }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <p style={{ fontWeight: 600, color: '#6b7280' }}>Selecciona un rol</p>
                <p style={{ fontSize: '0.82rem' }}>para gestionar sus permisos</p>
              </div>
            ) : (
              <>
                <div style={{ background: '#f9fafb', padding: '12px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a', margin: 0 }}>{rolSel.nombre}</p>
                    <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: 0, marginTop: 2 }}>{activos.size} permiso(s) seleccionado(s)</p>
                  </div>
                  <button className="pg-btn pg-btn--primary" onClick={guardar} disabled={saving || !hayCambios} style={{ opacity: !hayCambios ? 0.5 : 1 }}>
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>

                {loadPerm ? <div className="pg-loading">Cargando permisos...</div> : (
                  <div style={{ padding: '1rem 1.25rem' }}>
                    {/* Botones de selección rápida */}
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
                      <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>No hay permisos definidos en el sistema.</p>
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
                                  <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: checked ? 600 : 400, color: checked ? '#1e40af' : '#374151', lineHeight: 1.2 }}>{p.descripcion}</div>
                                  </div>
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
    </div>
  );
}
