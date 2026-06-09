// ============================================================
// CU6 — Administrar Bitácora del Sistema
// Consulta y filtro de actividades registradas.
// ============================================================
import { useState, useEffect } from 'react';
import client from '../../api/client';
import '../../shared/pages.css';

export default function Bitacora() {
  const [registros, setRegistros] = useState([]);
  const [meta, setMeta]           = useState({});
  const [loading, setLoading]     = useState(true);
  const [filtros, setFiltros]     = useState({ accion: '', desde: '' });
  const [page, setPage]           = useState(1);

  const cargar = async (p = 1, filtrosBase = null) => {
    setLoading(true);
    const f = filtrosBase ?? filtros;
    try {
      const params = { page: p, ...Object.fromEntries(Object.entries(f).filter(([,v]) => v)) };
      const { data } = await client.get('/bitacora', { params });
      setRegistros(data.data);
      setMeta({ total: data.total, lastPage: data.last_page, perPage: data.per_page });
      setPage(p);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const handleFiltro = (e) => setFiltros(p => ({ ...p, [e.target.name]: e.target.value }));

  const estadoBadge = (accion) => {
    if (accion.toLowerCase().includes('eliminado') || accion.toLowerCase().includes('bloqueado'))
      return 'pg-badge--reprobado';
    if (accion.toLowerCase().includes('creado') || accion.toLowerCase().includes('registrado'))
      return 'pg-badge--aprobado';
    return 'pg-badge--pendiente';
  };

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU6</p>
          <h1 className="pg-title">Bitácora del Sistema</h1>
          <p className="pg-subtitle">Registro de todas las actividades realizadas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="pg-filters">
        <input name="accion" placeholder="Buscar acción..." value={filtros.accion} onChange={handleFiltro} />
        <input name="desde" type="date" value={filtros.desde} onChange={handleFiltro} title="Desde fecha" />
        <button className="pg-btn pg-btn--primary" onClick={() => cargar(1)}>Filtrar</button>
        <button className="pg-btn pg-btn--ghost" onClick={() => { const vacios = { accion: '', desde: '' }; setFiltros(vacios); cargar(1, vacios); }}>Limpiar</button>
      </div>

      <div className="pg-table-wrap">
        {loading ? <div className="pg-loading">Cargando...</div> : (
          <>
            <table className="pg-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Acción</th>
                  <th>Usuario</th>
                  <th>IP</th>
                  <th>Fecha y hora</th>
                </tr>
              </thead>
              <tbody>
                {registros.length === 0 ? (
                  <tr><td colSpan={5} className="pg-empty">Sin registros</td></tr>
                ) : registros.map(r => (
                  <tr key={r.id}>
                    <td style={{ color:'#9ca3af', fontSize:'0.75rem' }}>{r.id}</td>
                    <td><span className={`pg-badge ${estadoBadge(r.accion)}`}>{r.accion}</span></td>
                    <td>
                      {r.usuario ? (
                        <div>
                          <div style={{ fontWeight:600 }}>{r.usuario.nombre_completo ?? '—'}</div>
                          <div style={{ fontSize:'0.72rem', color:'#9ca3af' }}>{r.usuario.email}</div>
                        </div>
                      ) : <span style={{ color:'#9ca3af' }}>Sistema</span>}
                    </td>
                    <td style={{ fontFamily:'monospace', fontSize:'0.78rem' }}>{r.ip ?? '—'}</td>
                    <td style={{ fontSize:'0.78rem', whiteSpace:'nowrap' }}>
                      {new Date(r.fecha).toLocaleString('es-BO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta.lastPage > 1 && (
              <div className="pg-pagination">
                <span>Mostrando {registros.length} de {meta.total} registros</span>
                <div className="pg-pagination__btns">
                  <button disabled={page === 1} onClick={() => cargar(page - 1)}>Anterior</button>
                  <button disabled={page === meta.lastPage} onClick={() => cargar(page + 1)}>Siguiente</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
