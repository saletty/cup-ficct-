// ============================================================
// CU12 — Gestionar Docentes
// La tabla docente hereda el CI de usuario.
// Requiere que el usuario exista con rol 'Docente'.
// Campos obligatorios: profesion, maestria, diplomado_educacion_superior
// ============================================================
import { useState, useEffect } from 'react';
import client from '../api/client';
import './pages.css';

const EMPTY_DOC = { CI: '', profesion: '', maestria: '', diplomado_educacion_superior: '' };

const IcoPlus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoEdit = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoDel  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IcoView = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;

export default function Docentes() {
  const [docentes, setDocentes]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);   // null | 'crear' | 'editar' | 'carga'
  const [form, setForm]           = useState(EMPTY_DOC);
  const [cargaHoraria, setCarga]  = useState(null);  // asignaciones del docente seleccionado
  const [docSelected, setDocSel]  = useState(null);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');

  const cargar = async () => {
    setLoading(true);
    try { const { data } = await client.get('/docentes'); setDocentes(data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  const abrirCrear  = () => { setForm(EMPTY_DOC); setError(''); setModal('crear'); };
  const abrirEditar = (d) => {
    setForm({ CI: d.CI, profesion: d.profesion, maestria: d.maestria, diplomado_educacion_superior: d.diplomado_educacion_superior });
    setError(''); setModal('editar');
  };
  const cerrar = () => { setModal(null); setError(''); setCarga(null); };

  const verCarga = async (d) => {
    setDocSel(d); setCarga(null); setModal('carga');
    try {
      const { data } = await client.get(`/docentes/${d.CI}/carga-horaria`);
      setCarga(data.asignaciones ?? []);
    } catch (err) {
      setCarga([]);
      if (err.response?.status === 403) setCarga('forbidden');
    }
  };

  const guardar = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      modal === 'crear'
        ? await client.post('/docentes', form)
        : await client.put(`/docentes/${form.CI}`, form);
      cargar(); cerrar();
    } catch (err) {
      const d = err.response?.data;
      setError(d?.errors ? Object.values(d.errors).flat().join(' · ') : d?.mensaje ?? 'Error al guardar.');
    } finally { setSaving(false); }
  };

  const eliminar = async (ci) => {
    if (!confirm(`¿Eliminar el docente CI=${ci}?`)) return;
    try { await client.delete(`/docentes/${ci}`); cargar(); }
    catch (err) { alert(err.response?.data?.mensaje ?? 'No se pudo eliminar.'); }
  };

  const filtrados = docentes.filter(d => {
    const q = search.toLowerCase();
    return !q
      || String(d.CI).includes(q)
      || d.usuario?.nombre_completo?.toLowerCase().includes(q)
      || d.profesion?.toLowerCase().includes(q);
  });

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU12</p>
          <h1 className="pg-title">Gestionar Docentes</h1>
          <p className="pg-subtitle">{docentes.length} docente(s) registrado(s)</p>
        </div>
        <button className="pg-btn pg-btn--primary" onClick={abrirCrear}><IcoPlus /> Registrar Docente</button>
      </div>

      <div className="pg-filters">
        <input placeholder="Buscar por CI, nombre o profesión..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ minWidth: 280 }} />
      </div>

      <div className="pg-table-wrap">
        {loading ? <div className="pg-loading">Cargando...</div> : (
          <table className="pg-table">
            <thead><tr><th>CI</th><th>Nombre</th><th>Profesión</th><th>Maestría</th><th>Diplomado Ed. Sup.</th><th>Acciones</th></tr></thead>
            <tbody>
              {filtrados.length === 0
                ? <tr><td colSpan={6} className="pg-empty">No hay docentes registrados</td></tr>
                : filtrados.map(d => (
                  <tr key={d.CI}>
                    <td><span className="pg-badge pg-badge--activa">{d.CI}</span></td>
                    <td style={{ fontWeight: 600 }}>{d.usuario?.nombre_completo ?? '—'}</td>
                    <td>{d.profesion}</td>
                    <td><span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{d.maestria}</span></td>
                    <td><span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{d.diplomado_educacion_superior}</span></td>
                    <td>
                      <div className="pg-actions">
                        <button className="pg-act-btn pg-act-btn--view" onClick={() => verCarga(d)} title="Ver carga horaria"><IcoView /></button>
                        <button className="pg-act-btn pg-act-btn--edit" onClick={() => abrirEditar(d)} title="Editar"><IcoEdit /></button>
                        <button className="pg-act-btn pg-act-btn--delete" onClick={() => eliminar(d.CI)} title="Eliminar"><IcoDel /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal Crear / Editar ──────────────────────────────── */}
      {(modal === 'crear' || modal === 'editar') && (
        <div className="pg-overlay" onClick={cerrar}>
          <div className="pg-modal" onClick={e => e.stopPropagation()}>
            <div className="pg-modal__header">
              <h3>{modal === 'crear' ? 'Registrar Docente' : `Editar — CI ${form.CI}`}</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <form onSubmit={guardar}>
              <div className="pg-modal__body">
                {error && <div className="pg-alert pg-alert--error">{error}</div>}
                {modal === 'crear' && (
                  <div className="pg-alert" style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#1e40af', fontSize:'0.78rem', marginBottom:'1rem', padding:'10px 14px', borderRadius:5 }}>
                    El CI debe pertenecer a un usuario existente con rol <strong>Docente</strong>.
                  </div>
                )}
                <div className="pg-form-grid">
                  <div className="pg-field">
                    <label>CI del Docente *</label>
                    <input type="number" value={form.CI} onChange={set('CI')}
                      placeholder="Ej: 10000005" required readOnly={modal === 'editar'} />
                  </div>
                  <div className="pg-field">
                    <label>Profesión *</label>
                    <input value={form.profesion} onChange={set('profesion')}
                      placeholder="Ej: Ingeniero en Sistemas" required />
                  </div>
                  <div className="pg-field">
                    <label>Maestría *</label>
                    <input value={form.maestria} onChange={set('maestria')}
                      placeholder="Ej: Maestría en Ingeniería de Software" required />
                  </div>
                  <div className="pg-field">
                    <label>Diplomado en Educación Superior *</label>
                    <input value={form.diplomado_educacion_superior}
                      onChange={set('diplomado_educacion_superior')}
                      placeholder="Ej: Diplomado en Didáctica Universitaria" required />
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

      {/* ── Modal Carga Horaria del Docente ───────────────────── */}
      {modal === 'carga' && docSelected && (
        <div className="pg-overlay" onClick={cerrar}>
          <div className="pg-modal pg-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="pg-modal__header">
              <h3>Carga Horaria — {docSelected.usuario?.nombre_completo ?? `CI ${docSelected.CI}`}</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <div className="pg-modal__body">
              {cargaHoraria === null && <div className="pg-loading">Cargando...</div>}
              {cargaHoraria === 'forbidden' && (
                <div className="pg-alert pg-alert--error">Sin permiso para ver esta información.</div>
              )}
              {Array.isArray(cargaHoraria) && cargaHoraria.length === 0 && (
                <div className="pg-empty">Este docente no tiene asignaciones en ningún grupo.</div>
              )}
              {Array.isArray(cargaHoraria) && cargaHoraria.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {cargaHoraria.map((a, i) => (
                    <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span className="pg-badge pg-badge--activa">{a.grupo?.id} / {a.convocatoria_id}</span>
                        <span style={{ fontWeight: 600 }}>{a.materia?.nombre}</span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{a.grupo?.carrera?.nombre_carrera}</span>
                      </div>
                      {a.grupo?.horarios?.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {a.grupo.horarios.map((h, j) => (
                            <span key={j} style={{ fontSize: '0.75rem', background: '#f3f4f6', padding: '3px 10px', borderRadius: 4 }}>
                              {h.dia} {h.hora_inicio}–{h.hora_fin}
                              {h.aula && ` · Aula ${h.aula.nro}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pg-modal__footer">
              <button className="pg-btn pg-btn--ghost" onClick={cerrar}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
