// ============================================================
// CU8 — Gestionar Postulantes
// Listado, visualización y actualización de datos personales.
// ============================================================
import { useState, useEffect } from 'react';
import client from '../api/client';
import './pages.css';

export default function Postulantes() {
  const [data, setData]         = useState([]);
  const [meta, setMeta]         = useState({});
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [estado, setEstado]     = useState('');
  const [page, setPage]         = useState(1);
  const [modal, setModal]       = useState(null);  // null | { tipo:'ver'|'editar', item }
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [carreras, setCarreras] = useState([]);

  const cargar = async (p = 1, over = null) => {
    setLoading(true);
    const s = over?.search ?? search;
    const e = over?.estado ?? estado;
    try {
      const params = { page: p };
      if (s) params.search = s;
      if (e) params.estado = e;
      const { data: res } = await client.get('/postulantes', { params });
      setData(res.data); setMeta({ total: res.total, lastPage: res.last_page }); setPage(p);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); client.get('/carreras').then(r => setCarreras(r.data)).catch(() => {}); }, []);

  const abrirVer   = (item) => { setModal({ tipo:'ver', item }); };
  const abrirEditar = (item) => {
    setForm({
      nombre_completo: item.usuario?.nombre_completo ?? '',
      email: item.usuario?.email ?? '',
      estado: item.usuario?.estado ?? 'ACTIVO',
      fecha_nacimiento: item.fecha_nacimiento ?? '',
      sexo: item.sexo ?? '',
      direccion: item.direccion ?? '',
      telefono: item.telefono ?? '',
      ciudad: item.ciudad ?? '',
      carrera_opcion1_id: item.carrera_opcion1_id ?? '',
      carrera_opcion2_id: item.carrera_opcion2_id ?? '',
    });
    setError('');
    setModal({ tipo:'editar', item });
  };
  const cerrar = () => { setModal(null); setError(''); };

  const guardar = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await client.put(`/postulantes/${modal.item.CI}`, form);
      cargar(page); cerrar();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(' · ') : err.response?.data?.mensaje ?? 'Error al guardar.');
    } finally { setSaving(false); }
  };

  const eliminar = async (ci, nombre) => {
    if (!confirm(`¿Eliminar permanentemente al postulante ${nombre}?`)) return;
    try { await client.delete(`/postulantes/${ci}`); cargar(page); }
    catch (err) { alert(err.response?.data?.mensaje ?? 'Error al eliminar.'); }
  };

  const estadoBadge = (e) => {
    const map = { ACTIVO:'activo', INACTIVO:'inactivo', BLOQUEADO:'bloqueado' };
    return `pg-badge pg-badge--${map[e] ?? 'inactivo'}`;
  };

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU8</p>
          <h1 className="pg-title">Gestionar Postulantes</h1>
          <p className="pg-subtitle">Total: {meta.total ?? '—'} postulantes registrados</p>
        </div>
      </div>

      <div className="pg-filters">
        <input placeholder="Buscar por nombre, email o CI..."
          value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && cargar(1)} />
        <select value={estado} onChange={e => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
          <option value="BLOQUEADO">Bloqueado</option>
        </select>
        <button className="pg-btn pg-btn--primary" onClick={() => cargar(1)}>Buscar</button>
        <button className="pg-btn pg-btn--ghost" onClick={() => { setSearch(''); setEstado(''); cargar(1, { search: '', estado: '' }); }}>Limpiar</button>
      </div>

      <div className="pg-table-wrap">
        {loading ? <div className="pg-loading">Cargando...</div> : (
          <>
            <table className="pg-table">
              <thead>
                <tr>
                  <th>CI</th><th>Nombre completo</th><th>Correo</th>
                  <th>Carrera 1ª opción</th><th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0
                  ? <tr><td colSpan={6} className="pg-empty">Sin postulantes</td></tr>
                  : data.map(p => (
                    <tr key={p.CI}>
                      <td style={{ fontFamily:'monospace', fontWeight:600 }}>{p.CI}</td>
                      <td>{p.usuario?.nombre_completo ?? <span style={{color:'#9ca3af'}}>Sin completar</span>}</td>
                      <td style={{ fontSize:'0.78rem', color:'#6b7280' }}>{p.usuario?.email ?? '—'}</td>
                      <td style={{ fontSize:'0.78rem' }}>{p.carrera_opcion1?.nombre_carrera ?? '—'}</td>
                      <td><span className={estadoBadge(p.usuario?.estado)}>{p.usuario?.estado ?? '—'}</span></td>
                      <td>
                        <div className="pg-actions">
                          <button className="pg-act-btn pg-act-btn--view" onClick={() => abrirVer(p)} title="Ver detalle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                          <button className="pg-act-btn pg-act-btn--edit" onClick={() => abrirEditar(p)} title="Editar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="pg-act-btn pg-act-btn--delete" onClick={() => eliminar(p.CI, p.usuario?.nombre_completo)} title="Eliminar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
            {meta.lastPage > 1 && (
              <div className="pg-pagination">
                <span>Página {page} de {meta.lastPage}</span>
                <div className="pg-pagination__btns">
                  <button disabled={page===1} onClick={()=>cargar(page-1)}>Anterior</button>
                  <button disabled={page===meta.lastPage} onClick={()=>cargar(page+1)}>Siguiente</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal VER */}
      {modal?.tipo === 'ver' && (
        <div className="pg-overlay" onClick={cerrar}>
          <div className="pg-modal" onClick={e => e.stopPropagation()}>
            <div className="pg-modal__header">
              <h3>Detalle del Postulante — CI {modal.item.CI}</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <div className="pg-modal__body">
              {[
                ['CI', modal.item.CI],
                ['Nombre', modal.item.usuario?.nombre_completo],
                ['Email', modal.item.usuario?.email],
                ['Estado', modal.item.usuario?.estado],
                ['Fecha nacimiento', modal.item.fecha_nacimiento],
                ['Sexo', modal.item.sexo === 'M' ? 'Masculino' : modal.item.sexo === 'F' ? 'Femenino' : '—'],
                ['Dirección', modal.item.direccion],
                ['Teléfono', modal.item.telefono],
                ['Ciudad', modal.item.ciudad],
                ['1ª carrera', modal.item.carrera_opcion1?.nombre_carrera],
                ['2ª carrera', modal.item.carrera_opcion2?.nombre_carrera],
                ['Colegio procedencia', modal.item.colegio_procedencia],
                ['Año de egreso', modal.item.anio_egreso],
                ['Título de bachiller', modal.item.titulo_bachiller],
              ].map(([k, v]) => (
                <div key={k} style={{ display:'flex', padding:'8px 0', borderBottom:'1px solid #f3f4f6', gap:'1rem' }}>
                  <span style={{ width:140, fontSize:'0.75rem', fontWeight:700, color:'#6b7280', textTransform:'uppercase', flexShrink:0 }}>{k}</span>
                  <span style={{ fontSize:'0.85rem', color: v ? '#1a1a1a' : '#9ca3af' }}>{v ?? '—'}</span>
                </div>
              ))}
            </div>
            <div className="pg-modal__footer">
              <button className="pg-btn pg-btn--ghost" onClick={cerrar}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal EDITAR */}
      {modal?.tipo === 'editar' && (
        <div className="pg-overlay" onClick={cerrar}>
          <div className="pg-modal pg-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="pg-modal__header">
              <h3>Editar Postulante — CI {modal.item.CI}</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <form onSubmit={guardar}>
              <div className="pg-modal__body">
                {error && <div className="pg-alert pg-alert--error">{error}</div>}
                <div className="pg-form-grid pg-form-grid-2">
                  {[
                    { key:'nombre_completo', label:'Nombre completo', type:'text' },
                    { key:'email', label:'Correo electrónico', type:'email' },
                    { key:'fecha_nacimiento', label:'Fecha de nacimiento', type:'date' },
                    { key:'telefono', label:'Teléfono', type:'text' },
                    { key:'direccion', label:'Dirección', type:'text' },
                    { key:'ciudad', label:'Ciudad', type:'text' },
                  ].map(f => (
                    <div className="pg-field" key={f.key}>
                      <label>{f.label}</label>
                      <input type={f.type} value={form[f.key] ?? ''}
                        onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))} />
                    </div>
                  ))}
                  <div className="pg-field">
                    <label>Sexo</label>
                    <select value={form.sexo} onChange={e => setForm(p => ({...p, sexo: e.target.value}))}>
                      <option value="">Seleccionar</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                  </div>
                  <div className="pg-field">
                    <label>Estado de cuenta</label>
                    <select value={form.estado} onChange={e => setForm(p => ({...p, estado: e.target.value}))}>
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="INACTIVO">INACTIVO</option>
                      <option value="BLOQUEADO">BLOQUEADO</option>
                    </select>
                  </div>
                  <div className="pg-field">
                    <label>1ª opción de carrera</label>
                    <select value={form.carrera_opcion1_id} onChange={e => setForm(p => ({...p, carrera_opcion1_id: e.target.value}))}>
                      <option value="">Seleccionar</option>
                      {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre_carrera}</option>)}
                    </select>
                  </div>
                  <div className="pg-field">
                    <label>2ª opción de carrera</label>
                    <select value={form.carrera_opcion2_id} onChange={e => setForm(p => ({...p, carrera_opcion2_id: e.target.value}))}>
                      <option value="">Ninguna</option>
                      {carreras.filter(c => c.id !== form.carrera_opcion1_id).map(c => <option key={c.id} value={c.id}>{c.nombre_carrera}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="pg-modal__footer">
                <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="pg-btn pg-btn--primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
