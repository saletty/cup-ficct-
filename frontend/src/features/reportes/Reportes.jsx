// ============================================================
// CU22 — Generar Reportes Estadísticos Obligatorios
// Exportación en CSV (Excel) y PDF (ventana de impresión).
// ============================================================
import { useState, useEffect, useRef } from 'react';
import client from '../../api/client';
import '../../shared/pages.css';

/* ── Exportar CSV ──────────────────────────────────────────── */
function exportarCSV(rows, filename) {
  if (!rows.length) return;
  const keys   = Object.keys(rows[0]);
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => escape(r[k])).join(','))].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename + '.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── Exportar PDF (ventana de impresión) ───────────────────── */
function exportarPDF(titulo, tableHtml) {
  const win = window.open('', '_blank', 'width=1050,height=750');
  if (!win) { alert('Habilite las ventanas emergentes (pop-ups) para exportar PDF.'); return; }
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>${titulo} — CUP FICCT</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;padding:2rem;color:#111}
      h2{color:#004B8D;font-size:15px;border-bottom:2px solid #004B8D;padding-bottom:6px;margin-bottom:.5rem}
      p.meta{color:#888;font-size:9px;margin-bottom:1rem}
      table{width:100%;border-collapse:collapse}
      th{background:#004B8D;color:#fff;padding:6px 10px;font-size:10px;text-align:left;white-space:nowrap}
      td{padding:5px 10px;font-size:10px;border-bottom:1px solid #e5e7eb;vertical-align:top}
      tr:nth-child(even) td{background:#f9fafb}
      .aprobado{color:#15803d;font-weight:700}
      .reprobado{color:#b91c1c;font-weight:700}
      .sin-evaluar{color:#92400e}
      .activo{color:#15803d}.inactivo{color:#9ca3af}
    </style></head><body>
    <h2>${titulo}</h2>
    <p class="meta">Sistema de Admisión CUP — FICCT &nbsp;·&nbsp; ${new Date().toLocaleString('es-BO')}</p>
    ${tableHtml}
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

/* ── Barra visual de porcentaje ────────────────────────────── */
function PctBar({ value, max = 100, color = '#004B8D' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color, minWidth: 36, textAlign: 'right' }}>
        {value?.toFixed(1) ?? '—'}
      </span>
    </div>
  );
}

/* ── Stat card mini ────────────────────────────────────────── */
function Mini({ label, value, color = '#1e40af', bg = '#eff6ff' }) {
  return (
    <div style={{ background: bg, borderRadius: 8, padding: '12px 16px', border: `1px solid ${color}22` }}>
      <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color, fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color, lineHeight: 1 }}>{value ?? '—'}</div>
    </div>
  );
}

/* ── Iconos ────────────────────────────────────────────────── */
const IcoCSV    = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1={8} y1={13} x2={16} y2={13}/><line x1={8} y1={17} x2={16} y2={17}/><polyline points="10 9 9 9 8 9"/></svg>;
const IcoPDF    = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1={8} y1={12} x2={8} y2={12}/></svg>;
const IcoRef    = () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;

/* ═══════════════════════════════════════════════════════════ */

const ORDEN_OPTS = [
  { value: 'aprobados',   label: 'Más aprobados' },
  { value: 'reprobados',  label: 'Más reprobados' },
  { value: 'promedio',    label: 'Mejor promedio' },
  { value: 'tasa',        label: 'Mayor tasa de aprobación' },
];

export default function Reportes() {
  const [tab, setTab]       = useState('postulantes');
  const [data, setData]     = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [filtro, setFiltro] = useState('');

  // Rankings
  const [rankFiltros, setRankFiltros] = useState({
    tipo: 'docentes', ordenar: 'aprobados',
    convocatoria_id: '', carrera_id: '', grupo_id: '', docente_ci: '', limite: 20,
  });
  const [rankData,    setRankData]    = useState([]);
  const [rankLoading, setRankLoading] = useState(false);

  const cargar = async (t) => {
    setLoading(true); setError('');
    try {
      const { data: res } = await client.get(`/reportes/${t}`);
      setData(p => ({ ...p, [t]: res }));
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al cargar el reporte.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    setError('');         // siempre limpia el error al cambiar de tab
    setFiltro('');
    if (tab !== 'ranking' && !data[tab]) cargar(tab); // ranking se carga manualmente
  }, [tab]);

  /* ── Reporte 1: Postulantes ── */
  const postulantes = (() => {
    const rows = data.postulantes ?? [];
    if (!filtro) return rows;
    return rows.filter(r => r.estado_resultado === filtro);
  })();

  const csvPostulantes = () => exportarCSV(postulantes.map(r => ({
    CI:               r.ci,
    Nombre:           r.nombre,
    Email:            r.email,
    Convocatoria:     r.convocatoria,
    Carrera:          r.carrera_opcion1,
    Estado_Admision:  r.estado_admision,
    Computacion:      r.nota1_computacion ?? '',
    Matematicas:      r.nota2_matematicas ?? '',
    Ingles_Fisica:    r.nota3_ingles_fisica ?? '',
    Promedio:         r.promedio_final ?? '',
    Resultado:        r.estado_resultado,
  })), 'reporte_postulantes_CUP');

  const pdfPostulantes = () => {
    const rows = postulantes.map(r => `
      <tr>
        <td>${r.ci}</td>
        <td>${r.nombre}</td>
        <td>${r.convocatoria}</td>
        <td>${r.carrera_opcion1}</td>
        <td style="text-align:center">${r.nota1_computacion ?? '—'}</td>
        <td style="text-align:center">${r.nota2_matematicas ?? '—'}</td>
        <td style="text-align:center">${r.nota3_ingles ?? '—'}</td>
        <td style="text-align:center">${r.nota4_fisica ?? '—'}</td>
        <td style="text-align:center;font-weight:700">${r.promedio_final ?? '—'}</td>
        <td class="${r.estado_resultado}">${r.estado_resultado}</td>
      </tr>`).join('');
    exportarPDF('Lista General de Postulantes — CU22', `
      <table>
        <thead><tr>
          <th>CI</th><th>Nombre</th><th>Convocatoria</th><th>Carrera</th>
          <th>Computación</th><th>Matemáticas</th><th>Inglés</th><th>Física</th>
          <th>Promedio</th><th>Resultado</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`);
  };

  /* ── Reporte 2: Estadísticas ── */
  const stats = data.estadisticas;

  const csvEstadisticas = () => {
    if (!stats) return;
    exportarCSV([{
      Total_Inscritos:    stats.total_inscritos,
      Total_Evaluados:    stats.total_evaluados,
      Aprobados:          stats.aprobados,
      Reprobados:         stats.reprobados,
      Tasa_Aprobacion_Pct: stats.tasa_aprobacion,
      Promedio_General:   stats.promedio_general,
      Promedio_Computacion: stats.promedio_nota1,
      Promedio_Matematicas: stats.promedio_nota2,
      Promedio_Ingles:      stats.promedio_nota3,
      Promedio_Fisica:      stats.promedio_nota4,
      Min_Promedio:       stats.min_promedio,
      Max_Promedio:       stats.max_promedio,
    }], 'reporte_estadisticas_CUP');
  };

  /* ── Rankings ── */
  const cargarRanking = async () => {
    setRankLoading(true); setError('');
    try {
      const params = {};
      Object.entries(rankFiltros).forEach(([k, v]) => { if (v !== '') params[k] = v; });
      const { data: res } = await client.get('/reportes/ranking', { params });
      setRankData(res);
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al cargar el ranking.');
    } finally { setRankLoading(false); }
  };

  const setRF = (k, v) => setRankFiltros(p => ({ ...p, [k]: v }));

  const csvRanking = () => {
    if (!rankData.length) return;
    exportarCSV(rankData, 'reporte_ranking_CUP');
  };

  const pdfEstadisticas = () => {
    if (!stats) return;
    exportarPDF('Estadísticas Generales — CU21', `
      <table>
        <thead><tr><th>Indicador</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>
          <tr><td>Total inscritos</td>   <td style="text-align:right;font-weight:700">${stats.total_inscritos}</td></tr>
          <tr><td>Total evaluados</td>   <td style="text-align:right;font-weight:700">${stats.total_evaluados}</td></tr>
          <tr><td>Aprobados</td>         <td style="text-align:right;font-weight:700" class="aprobado">${stats.aprobados}</td></tr>
          <tr><td>Reprobados</td>        <td style="text-align:right;font-weight:700" class="reprobado">${stats.reprobados}</td></tr>
          <tr><td>Tasa de aprobación</td><td style="text-align:right;font-weight:700">${stats.tasa_aprobacion}%</td></tr>
          <tr><td>Promedio general</td>  <td style="text-align:right;font-weight:700">${stats.promedio_general ?? '—'}</td></tr>
          <tr><td>Promedio Computación</td><td style="text-align:right">${stats.promedio_nota1 ?? '—'}</td></tr>
          <tr><td>Promedio Matemáticas</td><td style="text-align:right">${stats.promedio_nota2 ?? '—'}</td></tr>
          <tr><td>Promedio Inglés</td>   <td style="text-align:right">${stats.promedio_nota3 ?? '—'}</td></tr>
          <tr><td>Promedio Física</td>   <td style="text-align:right">${stats.promedio_nota4 ?? '—'}</td></tr>
          <tr><td>Mínimo promedio</td>   <td style="text-align:right">${stats.min_promedio ?? '—'}</td></tr>
          <tr><td>Máximo promedio</td>   <td style="text-align:right">${stats.max_promedio ?? '—'}</td></tr>
        </tbody>
      </table>`);
  };

  /* ── Reporte 3: Docentes ── */
  const grupos     = data.docentes?.grupos ?? [];
  const resumenDoc = data.docentes?.resumen;

  const csvDocentes = () => {
    const rows = grupos.flatMap(g =>
      g.docentes.length > 0
        ? g.docentes.map(d => ({
            Grupo:        g.grupo_id,
            Convocatoria: g.convocatoria,
            Carrera:      g.carrera,
            Modalidad:    g.modalidad,
            Cupo_Maximo:  g.cupo_maximo,
            Estado:       g.estado,
            Docente_CI:   d.ci,
            Docente_Nombre: d.nombre,
            Materia:      d.materia,
          }))
        : [{
            Grupo:        g.grupo_id,
            Convocatoria: g.convocatoria,
            Carrera:      g.carrera,
            Modalidad:    g.modalidad,
            Cupo_Maximo:  g.cupo_maximo,
            Estado:       g.estado,
            Docente_CI:   '',
            Docente_Nombre: 'Sin docentes asignados',
            Materia:      '',
          }]
    );
    exportarCSV(rows, 'reporte_docentes_CUP');
  };

  const pdfDocentes = () => {
    const rows = grupos.map(g => `
      <tr>
        <td>${g.grupo_id}</td>
        <td>${g.convocatoria}</td>
        <td>${g.carrera}</td>
        <td>${g.modalidad ?? '—'}</td>
        <td style="text-align:center">${g.cupo_maximo}</td>
        <td class="${g.estado}">${g.estado}</td>
        <td>${g.docentes.map(d => `${d.nombre} (${d.materia})`).join('<br>') || '<em>Sin asignar</em>'}</td>
      </tr>`).join('');
    exportarPDF('Relación de Docentes por Grupo — CU22', `
      <table>
        <thead><tr>
          <th>Grupo</th><th>Convocatoria</th><th>Carrera</th>
          <th>Modalidad</th><th>Cupo</th><th>Estado</th><th>Docentes / Materia</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`);
  };

  /* ── Tabs config ── */
  const TABS = [
    { key: 'postulantes',  label: 'Postulantes' },
    { key: 'estadisticas', label: 'Estadísticas' },
    { key: 'docentes',     label: 'Docentes por Grupo' },
    { key: 'ranking',      label: 'Rankings' },
  ];

  const BADGE_R = { aprobado: 'pg-badge--aprobado', reprobado: 'pg-badge--bloqueado', 'sin evaluar': 'pg-badge--pendiente' };

  return (
    <div className="pg">
      {/* Header */}
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU22</p>
          <h1 className="pg-title">Reportes Estadísticos</h1>
          <p className="pg-subtitle">Listados e informes de control del proceso de admisión CUP</p>
        </div>
        <button className="pg-btn pg-btn--ghost" onClick={() => cargar(tab)} disabled={loading}>
          <IcoRef /> {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', borderBottom: '2px solid #e5e7eb', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '0.82rem', fontWeight: tab === t.key ? 700 : 500,
            color: tab === t.key ? '#004B8D' : '#6b7280',
            borderBottom: tab === t.key ? '2px solid #004B8D' : '2px solid transparent',
            marginBottom: -2, transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {error && <div className="pg-alert pg-alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* ── TAB: POSTULANTES ─────────────────────────────────── */}
      {tab === 'postulantes' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
                style={{ padding: '7px 12px', border: '1.5px solid #e5e7eb', borderRadius: 5, fontSize: '0.82rem' }}
              >
                <option value="">Todos los resultados</option>
                <option value="aprobado">Aprobados</option>
                <option value="reprobado">Reprobados</option>
                <option value="sin evaluar">Sin evaluar</option>
              </select>
              <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{postulantes.length} registro(s)</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="pg-btn pg-btn--ghost" onClick={csvPostulantes} style={{ gap: 6 }}>
                <IcoCSV /> Exportar CSV
              </button>
              <button className="pg-btn pg-btn--primary" onClick={pdfPostulantes} style={{ gap: 6 }}>
                <IcoPDF /> Exportar PDF
              </button>
            </div>
          </div>

          <div className="pg-table-wrap">
            {loading ? <div className="pg-loading">Cargando...</div> : (
              <table className="pg-table">
                <thead>
                  <tr>
                    <th>CI</th><th>Nombre</th><th>Convocatoria</th><th>Carrera</th>
                    <th>Computación</th><th>Matemáticas</th><th>Inglés</th><th>Física</th>
                    <th>Promedio</th><th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {postulantes.length === 0
                    ? <tr><td colSpan={10} className="pg-empty">No hay registros</td></tr>
                    : postulantes.map(r => (
                      <tr key={r.ci}>
                        <td style={{ color: '#6b7280', fontSize: '0.78rem' }}>{r.ci}</td>
                        <td style={{ fontWeight: 600 }}>{r.nombre}</td>
                        <td style={{ fontSize: '0.78rem' }}>{r.convocatoria}</td>
                        <td style={{ fontSize: '0.78rem' }}>{r.carrera_opcion1}</td>
                        {[r.nota1_computacion, r.nota2_matematicas, r.nota3_ingles, r.nota4_fisica].map((n, i) => (
                          <td key={i} style={{
                            textAlign: 'center', fontWeight: 600,
                            color: n == null ? '#9ca3af' : n < 60 ? '#b91c1c' : '#15803d',
                          }}>
                            {n ?? '—'}
                          </td>
                        ))}
                        <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', color: '#004B8D' }}>
                          {r.promedio_final ?? '—'}
                        </td>
                        <td>
                          <span className={`pg-badge ${BADGE_R[r.estado_resultado] ?? ''}`}>
                            {r.estado_resultado}
                          </span>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── TAB: ESTADÍSTICAS ───────────────────────────────── */}
      {tab === 'estadisticas' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: '1rem' }}>
            <button className="pg-btn pg-btn--ghost" onClick={csvEstadisticas} style={{ gap: 6 }}>
              <IcoCSV /> Exportar CSV
            </button>
            <button className="pg-btn pg-btn--primary" onClick={pdfEstadisticas} disabled={!stats} style={{ gap: 6 }}>
              <IcoPDF /> Exportar PDF
            </button>
          </div>

          {loading ? <div className="pg-loading">Cargando...</div> : stats ? (
            <>
              {/* Cards de resumen */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <Mini label="Inscritos totales" value={stats.total_inscritos} color="#1e40af" bg="#eff6ff" />
                <Mini label="Evaluados"          value={stats.total_evaluados} color="#374151" bg="#f9fafb" />
                <Mini label="Aprobados"          value={stats.aprobados}      color="#15803d" bg="#f0fdf4" />
                <Mini label="Reprobados"         value={stats.reprobados}     color="#b91c1c" bg="#fef2f2" />
                <Mini label="Tasa de aprobación" value={`${stats.tasa_aprobacion}%`} color="#92400e" bg="#fffbeb" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {/* Promedios por área */}
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.5rem' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#6b7280', marginBottom: '1.25rem' }}>
                    Promedio por Área de Evaluación (sobre 100)
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {stats.areas.map(a => (
                      <div key={a.nombre}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>
                          <span>{a.nombre}</span>
                        </div>
                        <PctBar value={a.promedio} max={100} color={a.promedio >= 60 ? '#16a34a' : '#dc2626'} />
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: '#004B8D' }}>
                        Promedio General
                      </div>
                      <PctBar value={stats.promedio_general} max={100} color="#004B8D" />
                    </div>
                  </div>
                </div>

                {/* Estadísticas descriptivas */}
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.5rem' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#6b7280', marginBottom: '1.25rem' }}>
                    Estadísticas Descriptivas
                  </p>
                  <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                    <tbody>
                      {[
                        { label: 'Promedio general',    value: stats.promedio_general,  color: '#004B8D' },
                        { label: 'Mínimo registrado',   value: stats.min_promedio,      color: '#b91c1c' },
                        { label: 'Máximo registrado',   value: stats.max_promedio,      color: '#15803d' },
                        { label: 'Promedio Computación',value: stats.promedio_nota1,    color: '#374151' },
                        { label: 'Promedio Matemáticas',value: stats.promedio_nota2,    color: '#374151' },
                        { label: 'Promedio Inglés',     value: stats.promedio_nota3,    color: '#374151' },
                        { label: 'Promedio Física',     value: stats.promedio_nota4,    color: '#374151' },
                      ].map(item => (
                        <tr key={item.label} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '8px 0', color: '#6b7280' }}>{item.label}</td>
                          <td style={{ padding: '8px 0', fontWeight: 800, color: item.color, textAlign: 'right', fontSize: '1rem' }}>
                            {item.value ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </>
      )}

      {/* ── TAB: RANKINGS ───────────────────────────────────── */}
      {tab === 'ranking' && (
        <>
          {/* Panel de filtros */}
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#6b7280', marginBottom: '0.75rem' }}>
              Filtros de Ranking
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
              {/* Tipo */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Ver por</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['docentes', 'grupos'].map(t => (
                    <button key={t} onClick={() => { setRF('tipo', t); setRankData([]); }} style={{
                      padding: '6px 14px', border: '1.5px solid', borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s',
                      background: rankFiltros.tipo === t ? '#004B8D' : 'white',
                      borderColor: rankFiltros.tipo === t ? '#004B8D' : '#d1d5db',
                      color: rankFiltros.tipo === t ? 'white' : '#374151',
                    }}>
                      {t === 'docentes' ? 'Docentes' : 'Grupos'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ordenar */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Ordenar por</label>
                <select value={rankFiltros.ordenar} onChange={e => setRF('ordenar', e.target.value)}
                  style={{ padding: '6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '0.8rem' }}>
                  {ORDEN_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Convocatoria ID */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>ID Convocatoria</label>
                <input type="number" value={rankFiltros.convocatoria_id} onChange={e => setRF('convocatoria_id', e.target.value)}
                  placeholder="Todas" style={{ width: 110, padding: '6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '0.8rem' }} />
              </div>

              {/* Carrera ID */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>ID Carrera</label>
                <input type="number" value={rankFiltros.carrera_id} onChange={e => setRF('carrera_id', e.target.value)}
                  placeholder="Todas" style={{ width: 100, padding: '6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '0.8rem' }} />
              </div>

              {/* Docente CI — solo para tipo=docentes */}
              {rankFiltros.tipo === 'docentes' && (
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>CI Docente</label>
                  <input type="number" value={rankFiltros.docente_ci} onChange={e => setRF('docente_ci', e.target.value)}
                    placeholder="Todos" style={{ width: 120, padding: '6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '0.8rem' }} />
                </div>
              )}

              {/* Grupo ID — solo para tipo=docentes */}
              {rankFiltros.tipo === 'docentes' && (
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>ID Grupo</label>
                  <input type="number" value={rankFiltros.grupo_id} onChange={e => setRF('grupo_id', e.target.value)}
                    placeholder="Todos" style={{ width: 100, padding: '6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '0.8rem' }} />
                </div>
              )}

              {/* Límite */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Top</label>
                <select value={rankFiltros.limite} onChange={e => setRF('limite', Number(e.target.value))}
                  style={{ padding: '6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '0.8rem' }}>
                  {[10, 20, 50, 100].map(n => <option key={n} value={n}>Top {n}</option>)}
                </select>
              </div>

              <button className="pg-btn pg-btn--primary" onClick={cargarRanking} disabled={rankLoading}
                style={{ alignSelf: 'flex-end', minWidth: 100 }}>
                {rankLoading ? 'Cargando...' : 'Generar'}
              </button>
            </div>
          </div>

          {/* Acciones y conteo */}
          {rankData.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{rankData.length} resultado(s)</span>
              <button className="pg-btn pg-btn--ghost" onClick={csvRanking} style={{ gap: 6 }}>
                <IcoCSV /> Exportar CSV
              </button>
            </div>
          )}

          {/* Tabla resultados */}
          <div className="pg-table-wrap">
            {rankLoading ? <div className="pg-loading">Cargando...</div> : rankData.length === 0 ? (
              <div className="pg-empty" style={{ padding: '2.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
                Configura los filtros y presiona <strong>Generar</strong> para ver el ranking.
              </div>
            ) : rankFiltros.tipo === 'docentes' ? (
              /* ── Tabla docentes ── */
              <table className="pg-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Docente</th>
                    <th>CI</th>
                    <th style={{ textAlign: 'center' }}>Grupos</th>
                    <th style={{ textAlign: 'center' }}>Estudiantes</th>
                    <th style={{ textAlign: 'center', color: '#15803d' }}>Aprobados</th>
                    <th style={{ textAlign: 'center', color: '#b91c1c' }}>Reprobados</th>
                    <th style={{ textAlign: 'center' }}>Promedio</th>
                    <th style={{ textAlign: 'center' }}>Tasa aprobación</th>
                  </tr>
                </thead>
                <tbody>
                  {rankData.map((r, i) => (
                    <tr key={r.docente_ci}>
                      <td style={{ fontWeight: 800, color: i < 3 ? '#004B8D' : '#9ca3af', fontSize: i < 3 ? '1rem' : '0.85rem', textAlign: 'center' }}>
                        {i + 1}
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.docente_nombre}</td>
                      <td style={{ color: '#6b7280', fontSize: '0.78rem' }}>{r.docente_ci}</td>
                      <td style={{ textAlign: 'center' }}>{r.total_grupos}</td>
                      <td style={{ textAlign: 'center' }}>{r.total_estudiantes}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#15803d' }}>{r.aprobados}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#b91c1c' }}>{r.reprobados}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#004B8D' }}>
                        {r.promedio_grupo ?? '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {r.tasa_aprobacion != null ? (
                          <span style={{ fontWeight: 700, color: r.tasa_aprobacion >= 60 ? '#15803d' : '#b91c1c' }}>
                            {r.tasa_aprobacion}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              /* ── Tabla grupos ── */
              <table className="pg-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th style={{ textAlign: 'center' }}>Grupo</th>
                    <th style={{ textAlign: 'center' }}>Convocatoria</th>
                    <th>Carrera</th>
                    <th style={{ textAlign: 'center' }}>Cupo</th>
                    <th style={{ textAlign: 'center' }}>Estudiantes</th>
                    <th style={{ textAlign: 'center', color: '#15803d' }}>Aprobados</th>
                    <th style={{ textAlign: 'center', color: '#b91c1c' }}>Reprobados</th>
                    <th style={{ textAlign: 'center' }}>Promedio</th>
                    <th style={{ textAlign: 'center' }}>Tasa aprobación</th>
                  </tr>
                </thead>
                <tbody>
                  {rankData.map((r, i) => (
                    <tr key={`${r.grupo_id}-${r.convocatoria_id}`}>
                      <td style={{ fontWeight: 800, color: i < 3 ? '#004B8D' : '#9ca3af', fontSize: i < 3 ? '1rem' : '0.85rem', textAlign: 'center' }}>
                        {i + 1}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.grupo_id}</td>
                      <td style={{ textAlign: 'center', fontSize: '0.78rem' }}>{r.convocatoria_id}</td>
                      <td style={{ fontSize: '0.78rem' }}>{r.carrera ?? '—'}</td>
                      <td style={{ textAlign: 'center' }}>{r.cupo_maximo ?? '—'}</td>
                      <td style={{ textAlign: 'center' }}>{r.total_estudiantes}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#15803d' }}>{r.aprobados}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#b91c1c' }}>{r.reprobados}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#004B8D' }}>
                        {r.promedio_grupo ?? '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {r.tasa_aprobacion != null ? (
                          <span style={{ fontWeight: 700, color: r.tasa_aprobacion >= 60 ? '#15803d' : '#b91c1c' }}>
                            {r.tasa_aprobacion}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── TAB: DOCENTES ────────────────────────────────────── */}
      {tab === 'docentes' && (
        <>
          {/* Resumen global */}
          {!loading && resumenDoc && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <Mini label="Total grupos"     value={resumenDoc.total_grupos}     color="#1e40af" bg="#eff6ff" />
              <Mini label="Grupos activos"   value={resumenDoc.grupos_activos}   color="#15803d" bg="#f0fdf4" />
              <Mini label="Aprobados global" value={resumenDoc.aprobados_global} color="#15803d" bg="#f0fdf4" />
              <Mini label="Reprobados global"value={resumenDoc.reprobados_global}color="#b91c1c" bg="#fef2f2" />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: '1rem' }}>
            <button className="pg-btn pg-btn--ghost" onClick={csvDocentes} style={{ gap: 6 }}><IcoCSV /> Exportar CSV</button>
            <button className="pg-btn pg-btn--primary" onClick={pdfDocentes} style={{ gap: 6 }}><IcoPDF /> Exportar PDF</button>
          </div>

          <div className="pg-table-wrap">
            {loading ? <div className="pg-loading">Cargando...</div> : (
              <table className="pg-table">
                <thead>
                  <tr>
                    <th>Grupo</th><th>Convocatoria</th><th>Carrera</th>
                    <th>Modalidad</th><th>Cupo</th><th>Estado</th>
                    <th>Docentes asignados</th>
                  </tr>
                </thead>
                <tbody>
                  {grupos.length === 0
                    ? <tr><td colSpan={7} className="pg-empty">No hay grupos registrados</td></tr>
                    : grupos.map(g => (
                      <tr key={g.grupo_id + g.convocatoria}>
                        <td style={{ fontWeight: 700 }}>{g.grupo_id}</td>
                        <td style={{ fontSize: '0.78rem' }}>{g.convocatoria}</td>
                        <td style={{ fontSize: '0.78rem' }}>{g.carrera}</td>
                        <td style={{ fontSize: '0.78rem', textTransform: 'capitalize' }}>{g.modalidad ?? '—'}</td>
                        <td style={{ textAlign: 'center' }}>{g.cupo_maximo}</td>
                        <td>
                          <span className={`pg-badge pg-badge--${g.estado === 'activo' ? 'activa' : 'cerrada'}`}>
                            {g.estado}
                          </span>
                        </td>
                        <td>
                          {g.docentes.length === 0
                            ? <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Sin docentes asignados</span>
                            : g.docentes.map((d, i) => (
                              <div key={i} style={{ fontSize: '0.78rem', padding: '2px 0' }}>
                                <strong>{d.nombre}</strong>
                                {d.materia && d.materia !== '—' && (
                                  <span style={{ color: '#6b7280' }}> — {d.materia}</span>
                                )}
                              </div>
                            ))
                          }
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
