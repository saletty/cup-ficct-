// ============================================================
// CU17 — Gestionar Exámenes de Admisión
// Cronograma por grupo: 1 hora de examen + 20 min de pausa.
// Dos grupos pueden compartir el mismo horario (distinto lab).
// ============================================================
import { useState, useEffect } from 'react';
import client from '../api/client';
import './pages.css';

const BADGE_ESTADO = {
  borrador:   'pg-badge--pendiente',
  programado: 'pg-badge--aprobado',
  finalizado: 'pg-badge--finalizada',
};

const ORDINAL = { 1: '1er', 2: '2do', 3: '3er' };

// Suma minutos a "HH:MM" y devuelve "HH:MM"
function sumarMin(hora, min) {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + min;
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
}

const IcoPlus    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoEdit    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoDel     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>;
const IcoCron    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoPublish = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>;

const EMPTY_FORM = { convocatoria_id: '', numero_examen: '', descripcion: '', fecha: '' };

export default function Examenes() {
  const [examenes, setExamenes]       = useState([]);
  const [convocatorias, setConvs]     = useState([]);
  const [labs, setLabs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null); // null|'crear'|'editar'|'cronograma'
  const [examenSel, setExamenSel]     = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [cronograma, setCronograma]   = useState([]);
  const [cronLoading, setCronLoading] = useState(false);
  // Horas de inicio por turno para auto-generar
  const [iniciosTurno, setInicios]    = useState({ mañana: '07:30', tarde: '14:10', noche: '18:10' });
  const [error, setError]             = useState('');
  const [saving, setSaving]           = useState(false);

  const cargar = async () => {
    setLoading(true);
    try { const { data } = await client.get('/examenes'); setExamenes(data); }
    catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    cargar();
    client.get('/convocatorias').then(r => setConvs(r.data)).catch(() => {});
    client.get('/aulas').then(r =>
      setLabs(r.data.filter(a => a.nro.startsWith('Lab-') && a.estado === 'activo'))
    ).catch(() => {});
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const cerrar = () => { setModal(null); setError(''); setExamenSel(null); setCronograma([]); };

  /* ── Crear / Editar ─────────────────────────────────────── */
  const abrirCrear  = () => { setForm(EMPTY_FORM); setError(''); setModal('crear'); };
  const abrirEditar = (ex) => {
    setForm({ id: ex.id, convocatoria_id: ex.convocatoria_id ?? '', numero_examen: ex.numero_examen ?? '', descripcion: ex.descripcion, fecha: ex.fecha });
    setError(''); setModal('editar');
  };

  const guardar = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      modal === 'crear'
        ? await client.post('/examenes', form)
        : await client.put(`/examenes/${form.id}`, form);
      cargar(); cerrar();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(' · ') : err.response?.data?.mensaje ?? 'Error al guardar.');
    } finally { setSaving(false); }
  };

  const eliminar = async (ex) => {
    if (!confirm(`¿Eliminar "${ex.descripcion}"?`)) return;
    try { await client.delete(`/examenes/${ex.id}`); cargar(); }
    catch (err) { alert(err.response?.data?.mensaje ?? 'No se pudo eliminar.'); }
  };

  const publicar = async (ex) => {
    if (!confirm(`¿Publicar "${ex.descripcion}"?`)) return;
    try { await client.post(`/examenes/${ex.id}/publicar`); cargar(); }
    catch (err) { alert(err.response?.data?.mensaje ?? 'No se pudo publicar.'); }
  };

  /* ── Cronograma ─────────────────────────────────────────── */
  const abrirCronograma = async (ex) => {
    setExamenSel(ex); setCronograma([]); setError(''); setModal('cronograma');
    setCronLoading(true);
    try {
      const { data } = await client.get(`/examenes/${ex.id}/cronograma`);
      setCronograma(data.cronograma.map(g => ({
        grupo_id:        g.grupo_id,
        convocatoria_id: g.convocatoria_id,
        turno:           g.turno,
        cupo:            g.cupo,
        hora_inicio:     g.hora_inicio ? g.hora_inicio.slice(0,5) : '',
        hora_fin:        g.hora_fin    ? g.hora_fin.slice(0,5)    : '',
        aula_nro:        g.aula_nro ?? '',
      })));
    } catch { /* silencioso */ }
    finally { setCronLoading(false); }
  };

  // Auto-generar: por turno, cada grupo +80 min respecto al anterior del mismo turno.
  // Dos grupos de distinto turno pueden coincidir en horario (ej: T004 y N002).
  const autoHorarios = () => {
    const contadores = { mañana: 0, tarde: 0, noche: 0 };
    setCronograma(prev => prev.map(g => {
      const idx = contadores[g.turno] ?? 0;
      contadores[g.turno] = idx + 1;
      const ini = sumarMin(iniciosTurno[g.turno] ?? '07:30', idx * 80);
      return { ...g, hora_inicio: ini, hora_fin: sumarMin(ini, 60) };
    }));
  };

  // Al cambiar hora_inicio de un grupo, hora_fin se recalcula automáticamente (+60 min)
  const setCronRow = (idx, key, val) =>
    setCronograma(prev => prev.map((r, i) => i === idx
      ? { ...r, [key]: val, ...(key === 'hora_inicio' && val ? { hora_fin: sumarMin(val, 60) } : {}) }
      : r
    ));

  const guardarCronograma = async () => {
    const incompletos = cronograma.filter(r => !r.hora_inicio || !r.hora_fin || !r.aula_nro);
    if (incompletos.length) { setError('Completa horario y aula para todos los grupos.'); return; }
    setSaving(true); setError('');
    try {
      await client.post(`/examenes/${examenSel.id}/cronograma`, { slots: cronograma });
      cargar(); cerrar();
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al guardar cronograma.');
    } finally { setSaving(false); }
  };

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU17</p>
          <h1 className="pg-title">Exámenes de Admisión</h1>
          <p className="pg-subtitle">{examenes.length} examen(es) registrado(s)</p>
        </div>
        <button className="pg-btn pg-btn--primary" onClick={abrirCrear}><IcoPlus /> Nuevo Examen</button>
      </div>

      <div className="pg-table-wrap">
        {loading ? <div className="pg-loading">Cargando...</div> : (
          <table className="pg-table">
            <thead>
              <tr><th>#</th><th>Examen</th><th>Convocatoria</th><th>Fecha</th><th>Grupos</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {examenes.length === 0
                ? <tr><td colSpan={7} className="pg-empty">No hay exámenes registrados</td></tr>
                : examenes.map(ex => (
                  <tr key={ex.id}>
                    <td style={{ color:'#9ca3af', fontSize:'0.78rem' }}>{ex.id}</td>
                    <td>
                      <div style={{ fontWeight:600 }}>{ex.descripcion}</div>
                      {ex.numero_examen && (
                        <span style={{ fontSize:'0.72rem', background:'#eff6ff', color:'#1e40af', padding:'1px 7px', borderRadius:99, fontWeight:700 }}>
                          {ORDINAL[ex.numero_examen]} Examen
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize:'0.82rem' }}>{ex.convocatoria?.nombre ?? ex.convocatoria_id ?? '—'}</td>
                    <td style={{ whiteSpace:'nowrap' }}>
                      {ex.fecha ? new Date(ex.fecha+'T12:00:00').toLocaleDateString('es-BO',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                    </td>
                    <td style={{ textAlign:'center', fontWeight:700 }}>{ex.cronograma_count ?? 0}</td>
                    <td><span className={`pg-badge ${BADGE_ESTADO[ex.estado]??''}`}>{ex.estado}</span></td>
                    <td>
                      <div className="pg-actions">
                        <button className="pg-act-btn pg-act-btn--view" onClick={() => abrirCronograma(ex)} title="Ver/editar cronograma"><IcoCron /></button>
                        {ex.estado === 'borrador' && (
                          <>
                            <button className="pg-act-btn pg-act-btn--edit" onClick={() => abrirEditar(ex)} title="Editar"><IcoEdit /></button>
                            <button className="pg-act-btn" style={{background:'#f0fdf4',color:'#15803d',width:30,height:30,border:'none',borderRadius:5,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}} onClick={() => publicar(ex)} title="Publicar"><IcoPublish /></button>
                            <button className="pg-act-btn pg-act-btn--delete" onClick={() => eliminar(ex)} title="Eliminar"><IcoDel /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal Crear / Editar ─────────────────────────────── */}
      {(modal === 'crear' || modal === 'editar') && (
        <div className="pg-overlay" onClick={cerrar}>
          <div className="pg-modal" onClick={e => e.stopPropagation()}>
            <div className="pg-modal__header">
              <h3>{modal === 'crear' ? 'Nuevo Examen' : 'Editar Examen'}</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <form onSubmit={guardar}>
              <div className="pg-modal__body">
                {error && <div className="pg-alert pg-alert--error">{error}</div>}
                <div className="pg-form-grid">
                  <div className="pg-field">
                    <label>Convocatoria *</label>
                    <select value={form.convocatoria_id} onChange={e => set('convocatoria_id', e.target.value)} required disabled={modal === 'editar'}>
                      <option value="">— Seleccionar —</option>
                      {convocatorias.filter(c => c.estado === 'finalizada').map(c => (
                        <option key={c.id} value={c.id}>{c.nombre} ({c.id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="pg-field">
                    <label>Número de Examen *</label>
                    <select value={form.numero_examen} onChange={e => set('numero_examen', e.target.value)} required>
                      <option value="">— Seleccionar —</option>
                      <option value="1">1er Examen — Computación</option>
                      <option value="2">2do Examen — Matemáticas / Inglés</option>
                      <option value="3">3er Examen — Física</option>
                    </select>
                  </div>
                  <div className="pg-field">
                    <label>Descripción *</label>
                    <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                      placeholder="Ej: 1er Examen CUP — Primer Semestre 2026" maxLength={200} required />
                  </div>
                  <div className="pg-field">
                    <label>Fecha del Examen *</label>
                    <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} required />
                  </div>
                </div>
              </div>
              <div className="pg-modal__footer">
                <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="pg-btn pg-btn--primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Crear Examen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Cronograma ─────────────────────────────────── */}
      {modal === 'cronograma' && examenSel && (
        <div className="pg-overlay" onClick={cerrar}>
          <div className="pg-modal pg-modal--wide" style={{ maxWidth:900 }} onClick={e => e.stopPropagation()}>
            <div className="pg-modal__header">
              <div>
                <h3 style={{ margin:0 }}>
                  CRONOGRAMA — {examenSel.descripcion}
                  {examenSel.numero_examen && (
                    <span style={{ marginLeft:8, fontSize:'0.75rem', background:'#eff6ff', color:'#1e40af', padding:'2px 8px', borderRadius:99, fontWeight:700 }}>
                      {ORDINAL[examenSel.numero_examen]} Examen
                    </span>
                  )}
                </h3>
                <p style={{ margin:'2px 0 0', fontSize:'0.78rem', color:'#6b7280' }}>
                  {examenSel.convocatoria?.nombre ?? examenSel.convocatoria_id}
                  {examenSel.fecha && ` · ${new Date(examenSel.fecha+'T12:00:00').toLocaleDateString('es-BO',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}`}
                </p>
              </div>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>

            <div className="pg-modal__body">
              {error && <div className="pg-alert pg-alert--error">{error}</div>}

              {cronLoading ? <div className="pg-loading">Cargando grupos...</div>
              : cronograma.length === 0 ? <div className="pg-empty">Esta convocatoria no tiene grupos generados.</div>
              : (
                <>
                  {/* Panel auto-generar (solo borrador) */}
                  {examenSel.estado === 'borrador' && (
                    <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'12px 16px', marginBottom:'1rem' }}>
                      <p style={{ margin:'0 0 8px', fontSize:'0.8rem', fontWeight:600, color:'#374151' }}>
                        ⚡ Auto-generar — 1h examen · 20 min pausa · grupos del mismo turno en secuencia
                      </p>
                      <div style={{ display:'flex', gap:'1rem', alignItems:'flex-end', flexWrap:'wrap' }}>
                        {['mañana','tarde','noche'].map(t => (
                          <div key={t} style={{ display:'flex', flexDirection:'column', gap:3 }}>
                            <label style={{ fontSize:'0.72rem', color:'#6b7280', textTransform:'capitalize' }}>
                              Inicio {t}
                            </label>
                            <input type="time" value={iniciosTurno[t]}
                              onChange={e => setInicios(p => ({ ...p, [t]: e.target.value }))}
                              style={{ border:'1px solid #d1d5db', borderRadius:4, padding:'4px 8px', fontSize:'0.82rem', width:100 }}
                            />
                          </div>
                        ))}
                        <button type="button" className="pg-btn pg-btn--ghost" style={{ fontSize:'0.8rem', height:32 }} onClick={autoHorarios}>
                          Generar
                        </button>
                      </div>
                      <p style={{ margin:'6px 0 0', fontSize:'0.72rem', color:'#9ca3af' }}>
                        Grupos de distinto turno pueden compartir el mismo horario (cada uno en su propio lab).
                      </p>
                    </div>
                  )}

                  {/* Tabla cronograma */}
                  <table className="pg-table" style={{ fontSize:'0.82rem' }}>
                    <thead>
                      <tr>
                        <th>HORARIO</th>
                        <th>GRUPO</th>
                        <th>TURNO</th>
                        <th>AULA (Lab)</th>
                        <th>CUPO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cronograma.map((row, idx) => (
                        <tr key={row.grupo_id}>
                          <td style={{ whiteSpace:'nowrap' }}>
                            {examenSel.estado === 'borrador' ? (
                              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                                <input type="time" value={row.hora_inicio}
                                  onChange={e => setCronRow(idx,'hora_inicio',e.target.value)}
                                  style={{ border:'1px solid #d1d5db', borderRadius:4, padding:'2px 5px', fontSize:'0.8rem', width:88 }}
                                />
                                <span style={{ color:'#9ca3af' }}>–</span>
                                <input type="time" value={row.hora_fin}
                                  onChange={e => setCronRow(idx,'hora_fin',e.target.value)}
                                  style={{ border:'1px solid #d1d5db', borderRadius:4, padding:'2px 5px', fontSize:'0.8rem', width:88 }}
                                />
                              </div>
                            ) : (
                              <strong>{row.hora_inicio ?? '—'} – {row.hora_fin ?? '—'}</strong>
                            )}
                          </td>
                          <td>
                            <span style={{ fontWeight:700, background:'#f0f9ff', color:'#0369a1', padding:'2px 10px', borderRadius:99, fontSize:'0.78rem' }}>
                              {row.grupo_id}
                            </span>
                          </td>
                          <td style={{ textTransform:'capitalize', color:'#6b7280' }}>{row.turno}</td>
                          <td>
                            {examenSel.estado === 'borrador' ? (
                              <select value={row.aula_nro} onChange={e => setCronRow(idx,'aula_nro',e.target.value)}
                                style={{ border:'1px solid #d1d5db', borderRadius:4, padding:'3px 6px', fontSize:'0.82rem' }}>
                                <option value="">— Lab —</option>
                                {labs.map(l => <option key={l.nro} value={l.nro}>{l.nro}</option>)}
                              </select>
                            ) : (
                              <span style={{ fontWeight:600 }}>{row.aula_nro ?? '—'}</span>
                            )}
                          </td>
                          <td style={{ textAlign:'center', color:'#6b7280' }}>{row.cupo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            <div className="pg-modal__footer">
              <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrar}>Cerrar</button>
              {examenSel.estado === 'borrador' && cronograma.length > 0 && (
                <button type="button" className="pg-btn pg-btn--primary" onClick={guardarCronograma} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Cronograma'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
