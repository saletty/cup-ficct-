// ============================================================
// CU21 — Visualizar Dashboard Administrativo
// Indicadores estadísticos en tiempo real consumiendo datos
// consolidados de las tablas físicas del sistema CUP.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import '../../shared/pages.css';

/* ── SVG Donut Chart ─────────────────────────────────────── */
function DonutChart({ value, total, color }) {
  const r    = 36;
  const circ = 2 * Math.PI * r;
  const pct  = total > 0 ? Math.min(value / total, 1) : 0;
  const dash = pct * circ;

  return (
    <svg width={96} height={96} viewBox="0 0 96 96">
      <circle cx={48} cy={48} r={r} fill="none" stroke="#e5e7eb" strokeWidth={10} />
      <circle
        cx={48} cy={48} r={r} fill="none"
        stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 48 48)"
      />
      <text x={48} y={54} textAnchor="middle" fontSize={14} fontWeight={700} fill={color}>
        {total > 0 ? `${Math.round(pct * 100)}%` : '—'}
      </text>
    </svg>
  );
}

/* ── Stat card ───────────────────────────────────────────── */
function StatCard({ label, value, sub, color, bg, icon }) {
  return (
    <div style={{
      background: bg, borderRadius: 12, padding: '1.5rem',
      display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: `1px solid ${color}22`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{
          fontSize: '0.68rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.09em', color,
        }}>{label}</span>
        <div style={{
          width: 34, height: 34, borderRadius: 8, background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{icon}</div>
      </div>
      <div style={{ fontSize: '2.8rem', fontWeight: 800, color, lineHeight: 1 }}>
        {value ?? <span style={{ fontSize: '1.8rem', opacity: 0.4 }}>—</span>}
      </div>
      {sub && (
        <div style={{ fontSize: '0.75rem', color, opacity: 0.65 }}>{sub}</div>
      )}
    </div>
  );
}

/* ── Horizontal bar for aprobados/reprobados ─────────────── */
function ResultBar({ aprobados, reprobados }) {
  const total = aprobados + reprobados;
  const pctAp = total > 0 ? (aprobados / total) * 100 : 0;
  const pctRe = total > 0 ? (reprobados / total) * 100 : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: 8 }}>
        <span style={{ color: '#15803d' }}>Aprobados {total > 0 ? `${Math.round(pctAp)}%` : ''}</span>
        <span style={{ color: '#b91c1c' }}>Reprobados {total > 0 ? `${Math.round(pctRe)}%` : ''}</span>
      </div>
      <div style={{ height: 14, borderRadius: 99, overflow: 'hidden', background: '#e5e7eb', display: 'flex' }}>
        {total > 0 ? (
          <>
            <div style={{ width: `${pctAp}%`, background: '#16a34a', transition: 'width 0.6s ease' }} />
            <div style={{ width: `${pctRe}%`, background: '#dc2626', transition: 'width 0.6s ease' }} />
          </>
        ) : (
          <div style={{ width: '100%', background: '#e5e7eb' }} />
        )}
      </div>
      {total === 0 && (
        <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 6, textAlign: 'center' }}>
          Sin evaluaciones finalizadas aún
        </p>
      )}
    </div>
  );
}

/* ── Íconos SVG ──────────────────────────────────────────── */
const IcoUsers  = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx={9} cy={7} r={4}/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
const IcoCheck  = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IcoX      = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><circle cx={12} cy={12} r={10}/><line x1={15} y1={9} x2={9} y2={15}/><line x1={9} y1={9} x2={15} y2={15}/></svg>;
const IcoGrupos = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><rect x={3} y={3} width={7} height={7}/><rect x={14} y={3} width={7} height={7}/><rect x={14} y={14} width={7} height={7}/><rect x={3} y={14} width={7} height={7}/></svg>;
const IcoRef    = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;

export default function DashboardAdmin() {
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [lastUpdate, setLast]   = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/dashboard/stats');
      setStats(data);
      setLast(new Date());
    } catch { /* silencioso — el usuario puede refrescar */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const totalEvals = stats ? stats.aprobados + stats.reprobados : 0;

  return (
    <div className="dash-wrap">
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', minWidth: 0 }}>
        <div>
          <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#004B8D', marginBottom: 4 }}>
            CU21
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.9rem', fontWeight: 700, color: '#1a1a1a', margin: 0, lineHeight: 1.2 }}>
            Panel Administrativo
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 6 }}>
            Estadísticas en tiempo real del proceso de admisión CUP — FICCT
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdate && !loading && (
            <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
              Actualizado {lastUpdate.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={cargar}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 6, border: '1.5px solid #004B8D',
              background: loading ? '#e5e7eb' : 'white', color: '#004B8D',
              fontSize: '0.78rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            <IcoRef /> {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af', fontSize: '0.9rem' }}>
          Cargando estadísticas...
        </div>
      ) : (
        <>
          {/* Stat cards — 4 columnas */}
          <div className="dash-stats">
            <StatCard
              label="Postulantes Inscritos"
              value={stats?.total_inscritos}
              sub="postulaciones no anuladas"
              color="#1e40af"
              bg="#eff6ff"
              icon={<IcoUsers />}
            />
            <StatCard
              label="Aprobados"
              value={stats?.aprobados}
              sub={totalEvals > 0 ? `${Math.round((stats.aprobados / totalEvals) * 100)}% del total evaluado` : 'sin evaluaciones aún'}
              color="#15803d"
              bg="#f0fdf4"
              icon={<IcoCheck />}
            />
            <StatCard
              label="Reprobados"
              value={stats?.reprobados}
              sub={totalEvals > 0 ? `${Math.round((stats.reprobados / totalEvals) * 100)}% del total evaluado` : 'sin evaluaciones aún'}
              color="#b91c1c"
              bg="#fef2f2"
              icon={<IcoX />}
            />
            <StatCard
              label="Grupos Activos"
              value={stats?.grupos_activos}
              sub="grupos con estado activo"
              color="#92400e"
              bg="#fffbeb"
              icon={<IcoGrupos />}
            />
          </div>

          {/* Fila inferior: donut + barra de resultados */}
          <div className="dash-bottom">

            {/* Distribución de resultados (donut) */}
            <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#6b7280', marginBottom: '1.25rem' }}>
                Distribución de Resultados
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <DonutChart value={stats?.aprobados ?? 0} total={totalEvals} color="#16a34a" />
                  <span style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aprobados</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <DonutChart value={stats?.reprobados ?? 0} total={totalEvals} color="#dc2626" />
                  <span style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reprobados</span>
                </div>
              </div>
            </div>

            {/* Resumen del proceso */}
            <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#6b7280', marginBottom: '1.25rem' }}>
                Resumen del Proceso
              </p>

              {/* Barra aprobados vs reprobados */}
              <div style={{ marginBottom: '1.5rem' }}>
                <ResultBar aprobados={stats?.aprobados ?? 0} reprobados={stats?.reprobados ?? 0} />
              </div>

              {/* Métricas de texto */}
              <div className="dash-metrics">
                {[
                  {
                    label: 'Total evaluados',
                    value: totalEvals,
                    color: '#374151',
                  },
                  {
                    label: 'Sin evaluar',
                    value: Math.max(0, (stats?.total_inscritos ?? 0) - totalEvals),
                    color: '#6b7280',
                  },
                  {
                    label: 'Grupos activos',
                    value: stats?.grupos_activos ?? 0,
                    color: '#92400e',
                  },
                ].map(m => (
                  <div key={m.label} style={{
                    background: '#f9fafb', borderRadius: 8, padding: '12px 14px',
                    border: '1px solid #e5e7eb',
                  }}>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: 4 }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: m.color }}>
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Fuentes de datos */}
              <div style={{ marginTop: '1.25rem', padding: '10px 12px', background: '#f8fafc', borderRadius: 6, fontSize: '0.7rem', color: '#94a3b8', borderLeft: '3px solid #cbd5e1' }}>
                Fuentes: <code style={{ fontFamily: 'monospace' }}>postulacion</code> · <code style={{ fontFamily: 'monospace' }}>evaluacion</code> · <code style={{ fontFamily: 'monospace' }}>grupo</code> — índice: <code style={{ fontFamily: 'monospace' }}>idx_postulacion_estado</code>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
