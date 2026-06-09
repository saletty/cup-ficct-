// ============================================================
// CU16 — Gestionar Pagos de Admisión
// El cajero registra pagos (700 Bs) y gestiona su estado.
// estados: pendiente → verificado | rechazado
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import client from '../api/client';
import './pages.css';

const ESTADOS = ['pendiente', 'verificado', 'rechazado'];

const BADGE_ESTADO = {
  pendiente:  'pg-badge--pendiente',
  verificado: 'pg-badge--aprobado',
  rechazado:  'pg-badge--bloqueado',
};

const EMPTY_FORM = { postulante_ci: '', tipopago_id: '', observacion: '' };

export default function Pagos() {
  const [pagos, setPagos]           = useState([]);
  const [tipos, setTipos]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filtroEstado, setFiltro]   = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroTipo, setFiltroTipo]   = useState('');
  const [modal, setModal]           = useState(null); // null | 'crear' | 'estado'
  const [form, setForm]             = useState(EMPTY_FORM);
  const [pagoSel, setPagoSel]       = useState(null);
  const [nuevoEstado, setNvoEstado] = useState('');
  const [observacion, setObserv]    = useState('');
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [pollingPagoId, setPolling] = useState(null);   // ID del pago QR en espera
  const [pollingTick, setTick]      = useState(0);      // cuenta de intentos visibles
  const pollingRef                  = useRef(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/pagos');
      setPagos(data);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  const cargarTipos = async () => {
    try { const { data } = await client.get('/tipos-pago'); setTipos(data.filter(t => t.estado === 'activo')); }
    catch { /* silencioso */ }
  };

  useEffect(() => { cargar(); }, []);
  useEffect(() => { cargarTipos(); }, []);

  // Polling: verifica cada 3s si el pago QR fue confirmado por Libélula
  useEffect(() => {
    if (!pollingPagoId) return;

    let intentos = 0;
    const MAX    = 60; // 3 min máximo

    pollingRef.current = setInterval(async () => {
      intentos++;
      setTick(intentos);

      if (intentos > MAX) {
        clearInterval(pollingRef.current);
        setPolling(null);
        alert('Tiempo de espera agotado. El pago QR no fue confirmado en 3 minutos.');
        return;
      }

      try {
        const { data } = await client.get(`/pagos/${pollingPagoId}/estado`);
        if (data.estado_pago === 'verificado') {
          clearInterval(pollingRef.current);
          setPolling(null);
          cargar();
          mostrarExito();
        }
      } catch { /* silencioso */ }
    }, 3000);

    return () => clearInterval(pollingRef.current);
  }, [pollingPagoId]);

  const mostrarExito = () => {
    // Alerta estética usando un div temporal
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;z-index:9999;
    `;
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:2.5rem 3rem;text-align:center;
                  box-shadow:0 20px 60px rgba(0,0,0,0.3);max-width:360px;">
        <div style="font-size:3rem;margin-bottom:1rem;">✓</div>
        <div style="font-size:1.4rem;font-weight:800;color:#15803d;margin-bottom:0.5rem;">
          ¡Pago Confirmado!
        </div>
        <div style="color:#6b7280;font-size:0.9rem;margin-bottom:1.5rem;">
          Libélula confirmó el pago de <strong>Bs 700.00</strong>.
        </div>
        <button onclick="this.closest('div[style]').parentElement.remove()"
          style="background:#15803d;color:#fff;border:none;padding:10px 28px;
                 border-radius:8px;font-size:0.95rem;font-weight:600;cursor:pointer;">
          Aceptar
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 8000);
  };

  const hoy = new Date().toISOString().slice(0, 10);

  const pagosFiltrados = pagos.filter(p => {
    if (filtroEstado && p.estado_pago !== filtroEstado) return false;
    if (filtroTipo   && String(p.tipopago_id) !== filtroTipo) return false;
    if (filtroFecha) {
      const fechaPago = p.fecha_pago ? p.fecha_pago.slice(0, 10) : null;
      if (fechaPago !== filtroFecha) return false;
    }
    return true;
  });

  const abrirCrear = () => { setForm(EMPTY_FORM); setError(''); setModal('crear'); };
  const cerrar = () => { setModal(null); setError(''); setPagoSel(null); };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const registrar = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    const esQR = Number(form.tipopago_id) === 2;
    try {
      if (esQR) {
        // Usar endpoint dedicado para QR — inicia polling automáticamente
        const { data } = await client.post('/pagos/iniciar-qr', {
          postulante_ci: Number(form.postulante_ci),
        });
        cerrar();
        setTick(0);
        setPolling(data.pago_id);
      } else {
        await client.post('/pagos', {
          postulante_ci: Number(form.postulante_ci),
          tipopago_id:   Number(form.tipopago_id),
          observacion:   form.observacion || null,
        });
        cargar(); cerrar();
      }
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(' · ') : err.response?.data?.mensaje ?? 'Error al registrar el pago.');
    } finally { setSaving(false); }
  };

  const abrirCambioEstado = (p) => {
    setPagoSel(p);
    setNvoEstado(p.estado_pago);
    setObserv(p.observacion ?? '');
    setError('');
    setModal('estado');
  };

  const actualizarEstado = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await client.put(`/pagos/${pagoSel.id}`, { estado_pago: nuevoEstado, observacion: observacion || null });
      cargar(); cerrar();
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al actualizar el estado.');
    } finally { setSaving(false); }
  };

  const eliminar = async (p) => {
    if (!confirm(`¿Eliminar pago #${p.id} de CI ${p.postulante_ci}?`)) return;
    try { await client.delete(`/pagos/${p.id}`); cargar(); }
    catch (err) { alert(err.response?.data?.mensaje ?? 'No se pudo eliminar.'); }
  };

  const nombrePostulante = (p) =>
    p.postulante?.usuario?.nombre_completo ?? `CI ${p.postulante_ci}`;

  const tipoSeleccionado = tipos.find(t => String(t.id) === String(form.tipopago_id));

  return (
    <div className="pg">
      <div className="pg-header">
        <div className="pg-header__left">
          <p className="pg-tag">CU16</p>
          <h1 className="pg-title">Pagos de Admisión</h1>
          <p className="pg-subtitle">{pagosFiltrados.length} pago(s) encontrado(s)</p>
        </div>
        <button className="pg-btn pg-btn--primary" onClick={abrirCrear}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Registrar Pago
        </button>
      </div>

      {/* Filtros */}
      <div className="pg-filters" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <select value={filtroEstado} onChange={e => setFiltro(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => (
            <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
          ))}
        </select>

        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {tipos.map(t => (
            <option key={t.id} value={String(t.id)}>{t.descripcion}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="date"
            value={filtroFecha}
            onChange={e => setFiltroFecha(e.target.value)}
            style={{ padding: '7px 10px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '0.85rem', color: '#374151' }}
          />
          <button
            onClick={() => setFiltroFecha(hoy)}
            style={{
              padding: '7px 12px', borderRadius: 6, border: '1.5px solid #e5e7eb',
              background: filtroFecha === hoy ? '#004B8D' : '#fff',
              color: filtroFecha === hoy ? '#fff' : '#374151',
              fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap',
            }}
          >
            Hoy
          </button>
          {filtroFecha && (
            <button
              onClick={() => setFiltroFecha('')}
              style={{ padding: '7px 10px', borderRadius: 6, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="pg-table-wrap">
        {loading ? <div className="pg-loading">Cargando...</div> : (
          <table className="pg-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Postulante</th>
                <th>CI</th>
                <th>Tipo de Pago</th>
                <th>Monto (Bs)</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Cajero</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagosFiltrados.length === 0
                ? <tr><td colSpan={9} className="pg-empty">No hay pagos para los filtros seleccionados</td></tr>
                : pagosFiltrados.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: '#9ca3af', fontSize: '0.78rem' }}>{p.id}</td>
                    <td style={{ fontWeight: 600 }}>{nombrePostulante(p)}</td>
                    <td>{p.postulante_ci}</td>
                    <td style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                      {p.tipo_pago?.descripcion ?? '—'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#004B8D' }}>
                      {Number(p.monto).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`pg-badge ${BADGE_ESTADO[p.estado_pago] ?? ''}`}>
                        {p.estado_pago}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {p.fecha_pago ? new Date(p.fecha_pago).toLocaleString('es-BO', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      }) : '—'}
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>
                      {p.cajero?.nombre_completo?.split(' ')[0] ?? '—'}
                    </td>
                    <td>
                      <div className="pg-actions">
                        <button
                          className="pg-act-btn pg-act-btn--edit"
                          onClick={() => abrirCambioEstado(p)}
                          title="Cambiar estado"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                        </button>
                        {p.estado_pago !== 'verificado' && (
                          <button
                            className="pg-act-btn pg-act-btn--delete"
                            onClick={() => eliminar(p)}
                            title="Eliminar"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14H6L5 6"/>
                              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                            </svg>
                          </button>
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

      {/* Modal: Registrar nuevo pago */}
      {modal === 'crear' && (
        <div className="pg-overlay" onClick={cerrar}>
          <div className="pg-modal" onClick={e => e.stopPropagation()}>
            <div className="pg-modal__header">
              <h3>Registrar Pago</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <form onSubmit={registrar}>
              <div className="pg-modal__body">
                {error && <div className="pg-alert pg-alert--error">{error}</div>}
                <div className="pg-form-grid">
                  <div className="pg-field">
                    <label>CI del Postulante *</label>
                    <input
                      type="number"
                      value={form.postulante_ci}
                      onChange={e => set('postulante_ci', e.target.value)}
                      placeholder="Número de carnet de identidad"
                      required
                    />
                  </div>
                  <div className="pg-field">
                    <label>Tipo de Pago *</label>
                    <select
                      value={form.tipopago_id}
                      onChange={e => set('tipopago_id', e.target.value)}
                      required
                    >
                      <option value="">— Seleccionar arancel —</option>
                      {tipos.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.descripcion} — Bs {Number(t.monto).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {tipoSeleccionado && (
                    <div style={{
                      background: '#eff6ff', border: '1px solid #bfdbfe',
                      borderRadius: 6, padding: '10px 14px',
                      fontSize: '0.82rem', color: '#1e40af',
                    }}>
                      Monto a cobrar: <strong>Bs {Number(tipoSeleccionado.monto).toFixed(2)}</strong>
                    </div>
                  )}
                  <div className="pg-field">
                    <label>Observación (opcional)</label>
                    <textarea
                      rows={2}
                      value={form.observacion}
                      onChange={e => set('observacion', e.target.value)}
                      placeholder="Notas adicionales..."
                      maxLength={500}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>
              <div className="pg-modal__footer">
                <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="pg-btn pg-btn--primary" disabled={saving}>
                  {saving ? 'Registrando...' : 'Registrar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Esperando confirmación QR de Libélula */}
      {pollingPagoId && (
        <div className="pg-overlay">
          <div className="pg-modal" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div className="pg-modal__header" style={{ justifyContent: 'center' }}>
              <h3>Esperando Pago QR</h3>
            </div>
            <div className="pg-modal__body" style={{ padding: '2rem 1.5rem' }}>
              {/* QR Code */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ padding: 12, background: '#fff', border: '2px solid #e5e7eb', borderRadius: 12, marginBottom: '0.75rem', position: 'relative' }}>
                  <QRCodeSVG
                    value={`libelula://pago?id=${pollingPagoId}&monto=700&moneda=BOB&ref=CUP-${pollingPagoId}`}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#004B8D"
                    level="M"
                  />
                  {/* Spinner de "verificando" sobre el QR */}
                  <div style={{ position: 'absolute', bottom: -10, right: -10,
                    background: '#fff', borderRadius: '50%', padding: 3,
                    border: '1.5px solid #e5e7eb', lineHeight: 0 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#004B8D" strokeWidth="2.5"
                      style={{ width: 20, height: 20, animation: 'spin 1.2s linear infinite' }}>
                      <path strokeLinecap="round" d="M12 2a10 10 0 0 1 0 20A10 10 0 0 1 12 2" opacity=".2"/>
                      <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10"/>
                    </svg>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1a1a1a' }}>Bs 700.00</div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>
                  Pago ID: <strong>#{pollingPagoId}</strong>
                </div>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
                            padding: '10px 14px', fontSize: '0.78rem', color: '#1e40af', marginBottom: '1rem' }}>
                El sistema verifica automáticamente cada 3 segundos.<br/>
                Intento {pollingTick} / 60
              </div>
              <button
                onClick={async () => {
                  try {
                    await client.post('/pagos/webhook', {
                      pago_id: pollingPagoId,
                      estado:  'COMPLETED',
                    }, {
                      headers: { 'X-Libelula-Token': 'libelula_sandbox_2026' },
                    });
                  } catch { /* el polling detecta el cambio igual */ }
                }}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8, cursor: 'pointer',
                  background: '#f0fdf4', border: '1.5px solid #86efac',
                  color: '#15803d', fontWeight: 600, fontSize: '0.85rem',
                }}
              >
                Simular pago exitoso (sandbox)
              </button>
            </div>
            <div className="pg-modal__footer" style={{ justifyContent: 'center' }}>
              <button className="pg-btn pg-btn--ghost" onClick={() => {
                clearInterval(pollingRef.current); setPolling(null); cargar();
              }}>
                Cancelar espera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cambiar estado del pago */}
      {modal === 'estado' && pagoSel && (
        <div className="pg-overlay" onClick={cerrar}>
          <div className="pg-modal" onClick={e => e.stopPropagation()}>
            <div className="pg-modal__header">
              <h3>Actualizar Estado — Pago #{pagoSel.id}</h3>
              <button className="pg-modal__close" onClick={cerrar}>✕</button>
            </div>
            <form onSubmit={actualizarEstado}>
              <div className="pg-modal__body">
                {error && <div className="pg-alert pg-alert--error">{error}</div>}
                <div className="pg-form-grid">
                  <div style={{
                    background: '#f9fafb', border: '1px solid #e5e7eb',
                    borderRadius: 6, padding: '10px 14px', fontSize: '0.82rem',
                  }}>
                    <div><strong>Postulante:</strong> {nombrePostulante(pagoSel)} (CI {pagoSel.postulante_ci})</div>
                    <div><strong>Tipo:</strong> {pagoSel.tipo_pago?.descripcion ?? '—'}</div>
                    <div><strong>Monto:</strong> Bs {Number(pagoSel.monto).toFixed(2)}</div>
                  </div>
                  <div className="pg-field">
                    <label>Nuevo Estado *</label>
                    <select value={nuevoEstado} onChange={e => setNvoEstado(e.target.value)} required>
                      {ESTADOS.map(e => (
                        <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="pg-field">
                    <label>Observación</label>
                    <textarea
                      rows={2}
                      value={observacion}
                      onChange={e => setObserv(e.target.value)}
                      placeholder="Motivo de rechazo, verificación, etc."
                      maxLength={500}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>
              <div className="pg-modal__footer">
                <button type="button" className="pg-btn pg-btn--ghost" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="pg-btn pg-btn--primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Actualizar Estado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
