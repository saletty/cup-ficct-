// CU3 — Gestionar Usuarios del sistema
import { useState, useEffect, useRef } from 'react';
import client from '../../api/client';
import '../../shared/pages.css';

const ESTADO_BADGE = {
  ACTIVO:   'pg-badge--aprobado',
  INACTIVO: 'pg-badge--bloqueado',
};

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

const ESTADO_COLOR = { creado: '#16a34a', omitido: '#d97706', error: '#dc2626' };
const ESTADO_LABEL = { creado: 'Creado', omitido: 'Omitido', error: 'Error' };

export default function Usuarios() {
  const [usuarios,       setUsuarios]       = useState([]);
  const [roles,          setRoles]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [modal,          setModal]          = useState(null);
  const [editando,       setEditando]       = useState(null);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [errors,         setErrors]         = useState({});
  const [saving,         setSaving]         = useState(false);
  const [alerta,         setAlerta]         = useState('');
  const [busqueda,       setBusqueda]       = useState('');
  const [importando,     setImportando]     = useState(false);
  const [resultImport,   setResultImport]   = useState(null);
  const [dropdownImport, setDropdownImport] = useState(false);
  const fileInputPostRef = useRef(null);
  const fileInputDocRef  = useRef(null);

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
        // [CU3·A02] registrarUsuario(datos) POST /api/v1/usuarios — envía los datos del nuevo usuario
        await client.post('/usuarios', { ...form, CI: Number(form.CI), rol_id: Number(form.rol_id) });
        // [CU3·A05] respuestaOK — "Usuario registrado correctamente."
        setAlerta('Usuario creado correctamente.');
      } else {
        const payload = { nombre_completo: form.nombre_completo, email: form.email, estado: form.estado, rol_id: Number(form.rol_id) };
        if (form.password) payload.password = form.password;
        // [CU3·B09] actualizarUsuario(ci, datos) PUT /api/v1/usuarios/:ci
        await client.put(`/usuarios/${editando.CI}`, payload);
        // [CU3·B12] respuestaOK — "Usuario actualizado correctamente."
        setAlerta('Usuario actualizado correctamente.');
      }
      cerrar(); cargar(); setTimeout(() => setAlerta(''), 4000);
    } catch (err) {
      // [CU3·A06 / CU3·B13] respuestaError — CI duplicado u otro error de validación
      const d = err.response?.data;
      if (d?.errors) {
        const m = {}; Object.entries(d.errors).forEach(([k, v]) => { m[k] = v[0]; }); setErrors(m);
      } else {
        setErrors({ _general: d?.mensaje || d?.message || 'Error al guardar.' });
      }
    } finally { setSaving(false); }
  };

  const PLANTILLAS = {
    postulantes: 'CI,nombre_completo,email,fecha_nacimiento,sexo,direccion,telefono,ciudad,colegio_procedencia,anio_egreso,titulo_bachiller,carrera_opcion1_id,carrera_opcion2_id\n12345678,Juan Pérez,juan@ejemplo.com,2000-05-15,M,Av. Principal 123,70012345,Santa Cruz,Colegio Nacional,2018,Bachiller en Ciencias,ING-SIS,ING-ELEC',
    docentes:    'CI,nombre_completo,email,profesion,maestria,diplomado_educacion_superior,materia\n12345678,Ana García,ana@ejemplo.com,Ing. Sistemas,Maestría en Educación,Diplomado en Docencia Universitaria,Matemáticas',
  };

  const descargarPlantilla = (tipo) => {
    const csv  = PLANTILLAS[tipo];
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `plantilla_${tipo}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportar = async (e, endpoint) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportando(true);
    setDropdownImport(false);
    const formData = new FormData();
    formData.append('archivo', file);
    try {
      const res = await client.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResultImport(res.data);
      cargar();
    } catch (err) {
      const msg = err.response?.data?.mensaje || err.response?.data?.message || 'Error en la importación.';
      setAlerta(msg); setTimeout(() => setAlerta(''), 6000);
    } finally {
      setImportando(false);
      e.target.value = '';
    }
  };

  const desactivar = async (u) => {
    // [CU3·C15] cambiarEstadoUsuario(ci, 'INACTIVO') — usuario presiona "Desactivar"
    if (!window.confirm(`¿Desactivar al usuario "${u.nombre_completo ?? u.CI}"?`)) return;
    try {
      // [CU3·C16] cambiarEstado(ci) DELETE /api/v1/usuarios/:ci (soft-delete → INACTIVO)
      await client.delete(`/usuarios/${u.CI}`);
      // [CU3·C20] mostrarMensaje(resultado)
      setAlerta('Usuario desactivado.'); cargar(); setTimeout(() => setAlerta(''), 4000);
    } catch (err) {
      setAlerta(err.response?.data?.mensaje || 'No se pudo desactivar.'); setTimeout(() => setAlerta(''), 4000);
    }
  };

  const activar = async (u) => {
    // [CU3·C15] cambiarEstadoUsuario(ci, 'ACTIVO') — usuario presiona "Activar"
    if (!window.confirm(`¿Activar al usuario "${u.nombre_completo ?? u.CI}"?`)) return;
    try {
      // [CU3·C16] cambiarEstado(ci, 'ACTIVO') PUT /api/v1/usuarios/:ci { estado: 'ACTIVO' }
      await client.put(`/usuarios/${u.CI}`, { estado: 'ACTIVO' });
      // [CU3·C20] mostrarMensaje(resultado)
      setAlerta('Usuario activado.'); cargar(); setTimeout(() => setAlerta(''), 4000);
    } catch (err) {
      setAlerta(err.response?.data?.manera || 'No se pudo activar.'); setTimeout(() => setAlerta(''), 4000);
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
          {/* Dropdown de importación */}
          <div style={{ position: 'relative' }}>
            <button
              className="pg-btn pg-btn--ghost"
              onClick={() => setDropdownImport(v => !v)}
              disabled={importando}
            >
              {importando ? 'Importando...' : 'Importar Excel/CSV ▾'}
            </button>

            {dropdownImport && (
              <div style={{
                position: 'absolute', top: '110%', right: 0, zIndex: 100,
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,.1)', minWidth: 240, padding: '6px 0',
              }}>
                {[
                  { label: 'Postulantes', endpoint: '/usuarios/importar-postulantes', ref: fileInputPostRef, tipo: 'postulantes' },
                  { label: 'Docentes',    endpoint: '/usuarios/importar-docentes',    ref: fileInputDocRef,  tipo: 'docentes'    },
                ].map(({ label, endpoint, ref, tipo }) => (
                  <div key={tipo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', gap: 8 }}>
                    <button
                      style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#1f2937', fontWeight: 500 }}
                      onClick={() => ref.current?.click()}
                    >
                      📂 {label}
                    </button>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}
                      onClick={() => descargarPlantilla(tipo)}
                      title={`Descargar plantilla ${label}`}
                    >
                      ⬇ plantilla
                    </button>
                    <input ref={ref} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => handleImportar(e, endpoint)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="pg-btn pg-btn--primary" onClick={abrirCrear}>+ Nuevo Usuario</button>
        </div>
      </div>

      {/* [CU3·A07 / CU3·B14 / CU3·C20] mostrarMensaje(resultado) — feedback al administrador */}
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
                      {u.estado === 'INACTIVO' ? (
                        <button style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: 5, cursor: 'pointer' }} onClick={() => activar(u)}>Activar</button>
                      ) : (
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

      {resultImport && (
        <Modal titulo="Resultado de importación" onClose={() => setResultImport(null)}>
          <div style={{ display: 'flex', gap: 12, marginBottom: '1rem' }}>
            {[['creados', '#dcfce7', '#16a34a'], ['omitidos', '#fef9c3', '#ca8a04'], ['error', '#fee2e2', '#dc2626']].map(([k, bg, color]) => (
              <div key={k} style={{ flex: 1, background: bg, borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{resultImport.resumen[k === 'error' ? 'errores' : k]}</div>
                <div style={{ fontSize: '0.7rem', color, fontWeight: 600, textTransform: 'uppercase' }}>{k}</div>
              </div>
            ))}
          </div>
          {resultImport.detalle.length > 0 && (
            <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Fila</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>CI</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Resultado</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {resultImport.detalle.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '5px 10px', color: '#6b7280' }}>{r.fila}</td>
                      <td style={{ padding: '5px 10px', fontFamily: 'monospace' }}>{r.ci ?? '—'}</td>
                      <td style={{ padding: '5px 10px' }}>
                        <span style={{ background: ESTADO_COLOR[r.estado] + '22', color: ESTADO_COLOR[r.estado], padding: '2px 8px', borderRadius: 99, fontWeight: 700, fontSize: '0.7rem' }}>
                          {ESTADO_LABEL[r.estado]}
                        </span>
                      </td>
                      <td style={{ padding: '5px 10px', color: '#6b7280' }}>{r.motivo ?? r.nombre ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="pg-btn pg-btn--primary" onClick={() => setResultImport(null)}>Cerrar</button>
          </div>
        </Modal>
      )}

      {/* [CU3·A01] enviarDatosUsuario(datos) — formulario de creación / [CU3·B08] enviarDatosActualizados */}
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

            <div className="pg-form-grid pg-form-grid-2">
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
