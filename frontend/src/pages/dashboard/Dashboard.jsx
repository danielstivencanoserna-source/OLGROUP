// pages/dashboard/Dashboard.jsx
// Dashboard con tarjetas métricas estilo bento, estética OL Group.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import reactivoService from '../../services/reactivoService';

// ── Tokens del sistema de diseño OL Group ─────────────────────────
// Colores del diseño Stitch traducidos a variables inline
const T = {
  bg: '#f7f9ff',
  surface: '#ffffff',
  surfaceLow: '#edf4ff',
  surfaceHigh: '#dee9f8',
  primary: '#05101a',
  primaryMid: '#1a2530',
  accent: '#41D2C9',
  accentDim: '#006a65',
  muted: '#44474b',
  outline: '#74777c',
  border: '#c4c6cc',
  borderSoft: '#e3effe',
  error: '#ba1a1a',
  errorBg: '#ffdad6',
  successBg: '#d3f0dc',
  success: '#1b873a',
};

// ── Componentes pequeños reutilizables ────────────────────────────

function Badge({ estado }) {
  const map = {
    activa: { bg: '#d3f0dc', color: '#1b873a', label: 'Activa' },
    vencida: { bg: '#ffdad6', color: '#ba1a1a', label: 'Vencida' },
    descartada: { bg: '#edf4ff', color: '#44474b', label: 'Descartada' },
  };
  const c = map[estado] || map.activa;
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: '10px', fontWeight: 700,
      fontFamily: 'Manrope, sans-serif',
      letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '3px 10px', borderRadius: '999px',
      display: 'inline-block',
    }}>
      {c.label}
    </span>
  );
}

// Label de campo al estilo Stitch — texto flotante pequeño en mayúsculas
function FieldLabel({ children }) {
  return (
    <p style={{
      fontSize: '10px', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      color: T.outline, fontFamily: 'Manrope, sans-serif',
      marginBottom: '8px',
    }}>
      {children}
    </p>
  );
}

// Input estilo Stitch — borde solo abajo, fondo sutil
function StitchInput({ error: hasError, ...props }) {
  return (
    <input
      style={{
        width: '100%',
        padding: '14px 16px',
        background: hasError ? '#fff5f5' : 'rgba(222,233,248,0.3)',
        border: 'none',
        borderBottom: `2px solid ${hasError ? T.error : T.border}`,
        outline: 'none',
        fontSize: '14px',
        fontFamily: 'Inter, sans-serif',
        color: T.primary,
        transition: 'border-color 0.2s',
      }}
      onFocus={e => e.target.style.borderBottomColor = T.accent}
      onBlur={e => e.target.style.borderBottomColor = hasError ? T.error : T.border}
      {...props}
    />
  );
}

// Select estilo Stitch
function StitchSelect({ children, ...props }) {
  return (
    <select
      style={{
        width: '100%',
        padding: '14px 16px',
        background: 'rgba(222,233,248,0.3)',
        border: 'none',
        borderBottom: `2px solid ${T.border}`,
        outline: 'none',
        fontSize: '14px',
        fontFamily: 'Inter, sans-serif',
        color: T.primary,
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2374777c'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        backgroundSize: '16px',
        paddingRight: '40px',
        cursor: 'pointer',
        transition: 'border-color 0.2s',
      }}
      onFocus={e => e.target.style.borderBottomColor = T.accent}
      onBlur={e => e.target.style.borderBottomColor = T.border}
      {...props}
    >
      {children}
    </select>
  );
}

// Número de paso circular — exactamente como en Stitch
function StepNumber({ n }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: T.primary, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px',
      flexShrink: 0,
    }}>
      {String(n).padStart(2, '0')}
    </div>
  );
}

// Sección de paso — tarjeta blanca con padding generoso como en Stitch
function StepCard({ children }) {
  return (
    <section style={{
      background: T.surface,
      borderRadius: '12px',
      padding: '32px',
      border: `1px solid ${T.borderSoft}`,
      transition: 'box-shadow 0.2s',
    }}>
      {children}
    </section>
  );
}

// Botón de acento — estilo OL Group
function AccentButton({ children, onClick, ...props }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 20px', borderRadius: '10px',
        background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentDim} 100%)`,
        border: 'none', color: T.primary,
        fontFamily: 'Manrope, sans-serif',
        fontWeight: 700, fontSize: '13px',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(65,210,201,0.3)',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(65,210,201,0.4)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(65,210,201,0.3)';
      }}
      {...props}
    >
      {children}
    </button>
  );
}

// Tarjeta métrica — diseño editorial con número grande
function MetricCard({ label, value, icon, accent, note, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`card p-6 flex flex-col gap-3 transition-all duration-200
                  ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lab-md' : ''}`}
    >
      <div className="flex items-start justify-between">
        <p className="field-label">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center`}
          style={accent ? {
            background: 'rgba(65,210,201,0.12)',
            border: '1px solid rgba(65,210,201,0.25)',
          } : {
            background: '#edf4ff',
            border: '1px solid #e3effe',
          }}>
          <span className={`material-symbols-outlined text-[18px]
                            ${accent ? 'text-accent' : 'text-primary-soft'}`}>
            {icon}
          </span>
        </div>
      </div>
      <p className="font-display font-black text-primary"
        style={{ fontSize: '2.25rem', lineHeight: 1.1 }}>
        {value}
      </p>
      {note && <p className="text-[11px] text-lab-muted">{note}</p>}
    </div>
  );
}

// Badge de estado
function StatusBadge({ estado }) {
  const cfg = {
    en_uso: { bg: '#d3f0dc', text: '#1b873a', label: 'En uso' },
    agotado: { bg: '#ffdad6', text: '#ba1a1a', label: 'Agotado' },
    en_compra: { bg: '#fef3c7', text: '#7c5c00', label: 'En compra' },
    en_inventario: { bg: '#edf4ff', text: '#1a56db', label: 'Inventario' },
  };
  const c = cfg[estado] || { bg: '#edf4ff', text: '#44474b', label: estado };
  return (
    <span className="badge"
      style={{ background: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [vencer, setVencer] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [r1, r2, r3] = await Promise.all([
          reactivoService.listar({ limite: 5 }),
          reactivoService.proximosVencer(90),
          reactivoService.listar({ limite: 1 }),
        ]);
        setData({ recientes: r1.datos, total: r3.total });
        setVencer(r2.reactivos?.slice(0, 5) || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-lab-border border-t-accent
                        rounded-full animate-spin mx-auto mb-3" />
        <p className="text-lab-muted text-sm">Cargando datos...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 stagger-children">

      {/* Encabezado */}
      <div>
        <p className="field-label mb-2">Panel de control</p>
        <h1 className="font-display font-extrabold text-primary text-3xl
                       tracking-tight">
          Bienvenido, {usuario?.nombre?.split(' ')[0]}
        </h1>
        <p className="text-lab-muted text-sm mt-1">
          Estado general del laboratorio al{' '}
          {new Date().toLocaleDateString('es-CO', {
            weekday: 'long', day: 'numeric', month: 'long'
          })}
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total reactivos"
          value={data?.total ?? 0}
          icon="science"
          note="En inventario"
          accent
          onClick={() => navigate('/reactivos')}
        />
        <MetricCard
          label="Por vencer"
          value={vencer.length}
          icon="schedule"
          note="Próximos 90 días"
          onClick={() => navigate('/reactivos')}
        />
        <MetricCard
          label="SICOQ"
          value="—"
          icon="gavel"
          note="Ver trazabilidad"
          onClick={() => navigate('/sicoq')}
        />
        <MetricCard
          label="Soluciones"
          value="—"
          icon="fluid_balance"
          note="Ver preparaciones"
          accent
          onClick={() => navigate('/preparaciones')}
        />
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Últimos reactivos — 7 columnas */}
        <div className="lg:col-span-7 card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4
                          border-b border-lab-border-soft">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-accent text-[18px]">
                inventory_2
              </span>
              <h2 className="font-display font-bold text-primary text-sm">
                Últimos reactivos registrados
              </h2>
            </div>
            <button
              onClick={() => navigate('/reactivos')}
              className="text-[11px] font-bold text-accent hover:underline
                         flex items-center gap-1 uppercase tracking-wider"
            >
              Ver todos
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <div className="divide-y divide-lab-border-soft">
            {data?.recientes?.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-lab-border">
                  science
                </span>
                <p className="text-lab-muted text-sm mt-2">
                  No hay reactivos registrados aún
                </p>
              </div>
            ) : (
              data?.recientes?.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-6 py-3.5
                             hover:bg-lab-low transition-colors cursor-pointer"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-lab-low
                                    flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-accent text-sm">
                        science
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary
                                    font-display">
                        {r.nombre}
                      </p>
                      <p className="text-[11px] text-lab-muted font-mono">
                        {r.codigo_interno}
                      </p>
                    </div>
                  </div>
                  <StatusBadge estado={r.estado} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Próximos a vencer — 5 columnas */}
        <div className="lg:col-span-5 space-y-4">

          {/* Alerta si hay vencimientos */}
          {vencer.length > 0 && (
            <div className="card-glass p-5 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full"
                style={{ background: 'rgba(186,26,26,0.08)', filter: 'blur(20px)' }} />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-red-600 text-sm
                                   material-symbols-filled">
                    warning
                  </span>
                  <p className="text-[10px] font-black uppercase tracking-widest
                                text-red-600">
                    Alerta de vencimiento
                  </p>
                </div>
                <p className="font-display font-extrabold text-primary text-lg">
                  {vencer.length} reactivo{vencer.length !== 1 ? 's' : ''} por vencer
                </p>
                <p className="text-lab-muted text-xs mt-1">
                  Próximos 90 días — requiere atención
                </p>
              </div>
            </div>
          )}

          {/* Lista de vencimientos */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4
                            border-b border-lab-border-soft">
              <span className="material-symbols-outlined text-[18px] text-lab-muted">
                schedule
              </span>
              <h2 className="font-display font-bold text-primary text-sm">
                Próximos a vencer
              </h2>
            </div>

            {vencer.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <span className="text-3xl">✅</span>
                <p className="text-lab-muted text-sm mt-2">
                  Sin vencimientos próximos
                </p>
              </div>
            ) : (
              <div className="divide-y divide-lab-border-soft">
                {vencer.map(r => (
                  <div key={r.id} className="flex items-center justify-between
                                             px-5 py-3.5 hover:bg-lab-low
                                             transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary truncate
                                    font-display">
                        {r.nombre}
                      </p>
                      <p className="text-[11px] text-lab-muted">
                        {new Date(r.fecha_vencimiento).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                    <span
                      className="badge flex-shrink-0 ml-3"
                      style={{
                        background: r.dias_restantes <= 30 ? '#ffdad6' : '#fef3c7',
                        color: r.dias_restantes <= 30 ? '#ba1a1a' : '#7c5c00',
                      }}
                    >
                      {r.dias_restantes}d
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}