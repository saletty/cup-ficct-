// ============================================================
// CU9 — Gestionar Información de Bachillerato
// Colegio, promedio, año de egreso y título de bachiller.
// ============================================================
import { useState, useEffect } from 'react';
import client from '../api/client';
import './pages.css';

export default function Bachillerato() {
  const [postulantes, setPostulantes] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [modal, setModal]             = useState(null);  // { item, bachillerato }
  const [form, setForm]               = useState({});
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      const params = search ? { search } : {};
      const { data } = await client.get('/postulantes', { params });
      setPostulantes(data.data);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const abrirEditar = async (p) => {
    setError(''); setSuccess('');
    try {
      const { data } = await client.get(`/postulantes/${p.CI}/bachillerato`);
      setForm({
        colegio_procedencia: data.colegio_procedencia ?? '',
        promedio_bachiller:  data.promedio_bachiller  ?? '',
        anio_egreso:         data.anio_egreso         ?? '',
        titulo_bachiller:    data.titulo_bachiller     ?? '',
      });
      setModal({ item: p, bachillerato: data });
    } catch { setError('No se pudo cargar la información.'); }
  };

  const cerrar = () => { setModal(null); setError(''); setSuccess(''); };

  const guardar = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      await client.put(`/postulantes/${modal.item.CI}/bachillerato`, form);
      setSuccess('Información de bachillerato actualizada correctamente.');
      cargar();
      setTimeout(cerrar, 1800);
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(' · ') : err.response?.data?.mensaje ?? 'Error al guardar.');
    } finally { setSaving(false); }
  };

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU9</p>
          <h1 className="pg-title">Información de Bachillerato</h1>
          <p className="pg-subtitle">Gestión del historial educativo del bachillerato</p>
        </div>
      </div>

      <div className="pg-filters">
        <input placeholder="Buscar postulante por nombre, CI o email..."
          value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && cargar()} />
        <button className="pg-btn pg-btn--primary" onClick={cargar}>Buscar</button>
        <button className="pg-btn pg-btn--ghost" onClick={() => { setSearch(''); cargar(); }}>Limpiar</button>
      </div>

      <div className="pg-table-wrap">
        {loading ? <div className="pg-loading">Cargando...</div> : (
          <table className="pg-table">
            <thead>
              <tr><th>CI</th><th>Nombre</th><th>Colegio</th><th>Promedio</th><th>Año egreso</th><th>Título</th><th>Acción</th></tr>
            </thead>
            <tbody>
              {postulantes.length === 0
                ? <tr><td colSpan={7} className="pg-empty">Sin postulantes</td></tr>
                : postulantes.map(p => (
                  <tr key={p.CI}>
                    <td style={{ fontFamily:'monospace', fontWeight:600 }}>{p.CI}</td>
                    <td>{p.usuario?.nombre_completo ?? <span style={{color:'#9ca3af'}}>Sin completar</span>}</td>
                    <td style={{ fontSize:'0.78rem' }}>{p.colegio_procedencia ?? <span style={{color:'#9ca3af'}}>—</span>}</td>
                    <td>
                      {p.promedio_bachiller != null
                        ? <span className="pg-badge pg-badge--activo">{parseFloat(p.promedio_bachiller).toFixed(2)}</span>
                        : <span style={{color:'#9ca3af', fontSize:'0.78rem'}}>Sin dato</span>}
                    </td>
                    <td>{p.anio_egreso ?? '—'}</td>
                    <td style={{ fontSize:'0.78rem', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.titulo_bachiller ?? '—'}</td>
                    <td>
                      <button className="pg-act-btn pg-act-btn--edit" onClick={() => abrirEditar(p)} title="Editar bachillerato">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="pg-overlay" onClick={cerrar}>
          <div className="pg-modal" onClick={e => e.stopPropagation()}>
            <div className="pg-modal__header">
              <h3>Bachillerato — {modal.item.usuario?.nombre_completo ?? `CI ${modal.item.CI}`}</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <form onSubmit={guardar}>
              <div className="pg-modal__body">
                {error   && <div className="pg-alert pg-alert--error">{error}</div>}
                {success && <div className="pg-alert pg-alert--success">{success}</div>}
                <div className="pg-form-grid pg-form-grid-2">
                  <div className="pg-field" style={{ gridColumn:'1/-1' }}>
                    <label>Colegio de procedencia *</label>
                    <input value={form.colegio_procedencia} onChange={e => setForm(p => ({...p, colegio_procedencia: e.target.value}))} placeholder="Ej: U.E. Cristo Rey" required />
                  </div>
                  <div className="pg-field">
                    <label>Promedio de bachillerato *</label>
                    <input type="number" step="0.01" min="0" max="100"
                      value={form.promedio_bachiller} onChange={e => setForm(p => ({...p, promedio_bachiller: e.target.value}))}
                      placeholder="Ej: 78.50" required />
                  </div>
                  <div className="pg-field">
                    <label>Año de egreso *</label>
                    <input type="number" min="1990" max={new Date().getFullYear()}
                      value={form.anio_egreso} onChange={e => setForm(p => ({...p, anio_egreso: e.target.value}))}
                      placeholder={`Ej: ${new Date().getFullYear() - 1}`} required />
                  </div>
                  <div className="pg-field" style={{ gridColumn:'1/-1' }}>
                    <label>Título de bachiller *</label>
                    <input value={form.titulo_bachiller} onChange={e => setForm(p => ({...p, titulo_bachiller: e.target.value}))}
                      placeholder="Ej: Bachiller en Humanidades" required />
                  </div>
                </div>
              </div>
              <div className="pg-modal__footer">
                <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="pg-btn pg-btn--primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
