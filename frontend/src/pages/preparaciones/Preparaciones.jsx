import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import preparacionService from '../../services/preparacionService';
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

// ── Modal de detalle ──────────────────────────────────────────────
function ModalDetalle({ prep, onClose, onEdit, onDelete, esAdmin, puedeEditar }) {
  if (!prep) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        background: 'rgba(5,16,26,0.65)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: T.surface, borderRadius: '16px',
          width: '100%', maxWidth: '680px',
          maxHeight: '88vh', overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(5,16,26,0.2)',
        }}
      >
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0,
          background: T.surface,
          borderBottom: `1px solid ${T.borderSoft}`,
          padding: '20px 24px',
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between',
          borderRadius: '16px 16px 0 0',
        }}>
          <div>
            <p style={{
              fontSize: '10px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: T.accentDim, fontFamily: 'Manrope, sans-serif',
              marginBottom: '4px',
            }}>
              Preparación de solución
            </p>
            <h2 style={{
              fontSize: '20px', fontWeight: 800,
              fontFamily: 'Manrope, sans-serif',
              color: T.primary, lineHeight: 1.2,
            }}>
              {prep.nombre}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <Badge estado={prep.estado} />
              <span style={{ fontSize: '11px', color: T.outline }}>
                {new Date(prep.fecha_preparacion).toLocaleDateString('es-CO', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {puedeEditar && (
              <button onClick={onEdit} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '8px',
                border: `1px solid ${T.border}`, background: 'transparent',
                color: T.muted, fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                Editar
              </button>
            )}
            {esAdmin && (
              <button onClick={onDelete} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 10px', borderRadius: '8px',
                border: '1px solid #fecaca', background: 'transparent',
                color: T.error, fontSize: '12px', cursor: 'pointer',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
              </button>
            )}
            <button onClick={onClose} style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: T.surfaceLow, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: T.outline,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          </div>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Info cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              {
                label: 'Volumen final', icon: 'water_drop',
                value: prep.volumen_final
                  ? `${prep.volumen_final} ${prep.unidad_volumen}` : '—'
              },
              {
                label: 'Responsable', icon: 'person',
                value: prep.responsable_nombre || '—'
              },
              {
                label: 'Vencimiento', icon: 'schedule',
                value: prep.fecha_vencimiento
                  ? new Date(prep.fecha_vencimiento).toLocaleDateString('es-CO') : '—'
              },
            ].map(f => (
              <div key={f.label} style={{
                background: T.surfaceLow, borderRadius: '12px', padding: '14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span className="material-symbols-outlined"
                    style={{ fontSize: '16px', color: T.accent }}>
                    {f.icon}
                  </span>
                  <p style={{
                    fontSize: '10px', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    color: T.outline, fontFamily: 'Manrope, sans-serif',
                  }}>
                    {f.label}
                  </p>
                </div>
                <p style={{
                  fontSize: '14px', fontWeight: 600,
                  fontFamily: 'Manrope, sans-serif', color: T.primary
                }}>
                  {f.value}
                </p>
              </div>
            ))}
          </div>

          {/* Reactivos */}
          {prep.reactivos?.length > 0 && (
            <div>
              <p style={{
                fontSize: '10px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: T.outline, fontFamily: 'Manrope, sans-serif',
                marginBottom: '12px',
              }}>
                Reactivos utilizados ({prep.reactivos.length})
              </p>
              <div style={{
                borderRadius: '12px', overflow: 'hidden',
                border: `1px solid ${T.borderSoft}`,
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: T.surfaceLow }}>
                      {['Reactivo', 'Cantidad', 'Concentración'].map(h => (
                        <th key={h} style={{
                          textAlign: 'left', padding: '10px 16px',
                          fontSize: '10px', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.07em',
                          color: T.outline, fontFamily: 'Manrope, sans-serif',
                          borderBottom: `1px solid ${T.borderSoft}`,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {prep.reactivos.map((r, i) => (
                      <tr key={r.id || i} style={{
                        borderBottom: i < prep.reactivos.length - 1
                          ? `1px solid ${T.borderSoft}` : 'none',
                      }}>
                        <td style={{ padding: '12px 16px' }}>
                          <p style={{
                            fontWeight: 600, color: T.primary,
                            fontFamily: 'Manrope, sans-serif', fontSize: '13px'
                          }}>
                            {r.reactivo_nombre}
                          </p>
                          <p style={{
                            fontSize: '11px', color: T.outline,
                            fontFamily: 'monospace'
                          }}>
                            {r.reactivo_codigo}
                          </p>
                        </td>
                        <td style={{
                          padding: '12px 16px', fontFamily: 'monospace',
                          fontSize: '13px', color: T.primary
                        }}>
                          {r.cantidad} {r.unidad}
                        </td>
                        <td style={{
                          padding: '12px 16px', fontSize: '13px',
                          color: T.outline
                        }}>
                          {r.concentracion || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Procedimiento */}
          {prep.procedimiento && (
            <div>
              <p style={{
                fontSize: '10px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: T.outline, fontFamily: 'Manrope, sans-serif',
                marginBottom: '10px',
              }}>
                Procedimiento
              </p>
              <div style={{
                background: T.surfaceLow, borderRadius: '10px',
                padding: '16px 20px',
                borderLeft: `4px solid ${T.accent}`,
              }}>
                <p style={{
                  fontSize: '13px', color: T.primary,
                  lineHeight: 1.7, whiteSpace: 'pre-line'
                }}>
                  {prep.procedimiento}
                </p>
              </div>
            </div>
          )}

          {prep.observaciones && (
            <div>
              <p style={{
                fontSize: '10px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: T.outline, fontFamily: 'Manrope, sans-serif',
                marginBottom: '8px',
              }}>
                Observaciones
              </p>
              <p style={{ fontSize: '13px', color: T.muted, lineHeight: 1.6 }}>
                {prep.observaciones}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Columna derecha — Bento cards del diseño Stitch ───────────────
// Esta columna siempre está visible sin importar la vista activa
function RightColumn({ preps }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* SICOQ Alert Card — glassmorphism de Stitch */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        padding: '32px', borderRadius: '12px',
        background: 'rgba(222,233,248,0.45)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.25)',
      }}>
        {/* Decoración de fondo */}
        <div style={{
          position: 'absolute', right: -48, top: -48,
          width: 192, height: 192, borderRadius: '50%',
          background: 'rgba(186,26,26,0.10)',
          filter: 'blur(32px)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span className="material-symbols-outlined"
              style={{
                fontSize: '20px', color: T.error,
                fontVariationSettings: "'FILL' 1",
              }}>
              warning
            </span>
            <span style={{
              fontSize: '10px', fontWeight: 900,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: T.error, fontFamily: 'Manrope, sans-serif',
            }}>
              SICOQ Control Alert
            </span>
          </div>
          <h3 style={{
            fontSize: '22px', fontWeight: 800,
            fontFamily: 'Manrope, sans-serif',
            color: T.primary, marginBottom: '12px', lineHeight: 1.2,
          }}>
            Controlled Substance Protocols
          </h3>
          <p style={{
            fontSize: '13px', lineHeight: 1.7,
            color: T.muted, marginBottom: '20px',
          }}>
            Si el reactivo está bajo{' '}
            <strong style={{ color: T.primary }}>SICOQ Controlado</strong>,
            debes registrar el consumo en el módulo SICOQ antes de usar
            el reactivo en esta preparación.
          </p>
          <Link to="/sicoq" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            color: T.primary, fontWeight: 700, fontSize: '13px',
            textDecoration: 'none', fontFamily: 'Manrope, sans-serif',
            transition: 'color 0.15s',
          }}>
            Ver reactivos controlados
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              arrow_forward
            </span>
          </Link>
        </div>
      </div>

      {/* Recent Formulations — estilo editorial de Stitch */}
      <div style={{
        background: T.surfaceLow, borderRadius: '12px', padding: '32px',
        border: `1px solid ${T.borderSoft}`,
      }}>
        <h3 style={{
          fontSize: '18px', fontWeight: 700,
          fontFamily: 'Manrope, sans-serif',
          color: T.primary, marginBottom: '24px',
        }}>
          Recent Formulations
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {preps.length === 0 ? (
            <p style={{
              fontSize: '13px', color: T.outline, textAlign: 'center',
              padding: '16px 0'
            }}>
              No hay preparaciones recientes
            </p>
          ) : (
            preps.slice(0, 3).map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '16px',
                opacity: i > 0 ? 0.7 : 1,
              }}>
                {/* Ícono de reactivo */}
                <div style={{
                  width: 40, height: 40,
                  borderRadius: '8px',
                  background: i === 0
                    ? 'rgba(65,210,201,0.15)'
                    : T.surfaceHigh,
                  border: i === 0
                    ? '1px solid rgba(65,210,201,0.3)'
                    : 'none',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: '20px',
                    color: i === 0 ? T.accent : T.outline,
                  }}>
                    science
                  </span>
                </div>

                {/* Info */}
                <div style={{
                  flex: 1,
                  borderBottom: i < Math.min(preps.length, 3) - 1
                    ? `1px solid rgba(196,198,204,0.2)` : 'none',
                  paddingBottom: i < Math.min(preps.length, 3) - 1 ? '16px' : 0,
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', gap: '8px'
                  }}>
                    <h4 style={{
                      fontWeight: 700, fontSize: '13px',
                      fontFamily: 'Manrope, sans-serif', color: T.primary,
                    }}>
                      {p.nombre}
                    </h4>
                    <span style={{
                      fontSize: '10px', fontWeight: 700,
                      color: T.outline, flexShrink: 0,
                      textTransform: 'uppercase',
                    }}>
                      {new Date(p.fecha_preparacion)
                        .toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
                        .toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: T.outline, marginTop: '2px' }}>
                    {p.total_reactivos || 0} reactivos
                    {p.volumen_final ? ` • ${p.volumen_final}${p.unidad_volumen}` : ''}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Visual anchor — exactamente como en Stitch */}
      <div style={{
        position: 'relative', height: '220px',
        borderRadius: '12px', overflow: 'hidden',
      }}>
        {/* Fondo con gradiente */}
        <div style={{
          width: '100%', height: '100%',
          background: `linear-gradient(135deg, ${T.surfaceHigh} 0%, ${T.surfaceLow} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-symbols-outlined"
            style={{ fontSize: '80px', color: T.border }}>
            fluid_balance
          </span>
        </div>
        {/* Overlay con texto */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(5,16,26,0.82) 0%, transparent 55%)',
          display: 'flex', alignItems: 'flex-end', padding: '20px',
        }}>
          <p style={{
            color: '#fff', fontSize: '12px',
            fontFamily: 'Inter, sans-serif', lineHeight: 1.6,
          }}>
            Calibra todos los matraces volumétricos a 20 °C antes del ajuste
            de volumen final para mantener la precisión analítica.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────
export default function Preparaciones() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'admin';
  const puedeEditar = ['admin', 'analista'].includes(usuario?.rol);

  // Estado general
  const [preps, setPreps] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [reactivos, setReactivos] = useState([]);

  // Vista activa: 'lista' | 'formulario'
  const [vista, setVista] = useState('lista');
  const [editando, setEditando] = useState(null);  // prep | null

  // Modales
  const [modalDetalle, setModalDetalle] = useState(null);
  const [confirmarElim, setConfirmarElim] = useState(null);

  // Mensajes
  const [msgExito, setMsgExito] = useState('');
  const [msgError, setMsgError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const LIMITE = 10;

  // Form
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: {
      estado: 'activa', unidad_volumen: 'mL', reactivos_usados: [],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control, name: 'reactivos_usados',
  });

  // Carga inicial
  useEffect(() => {
    reactivoService.listar({ limite: 200 })
      .then(d => setReactivos(d.datos))
      .catch(console.error);
  }, []);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await preparacionService.listar({
        pagina, limite: LIMITE,
        busqueda: busqueda || undefined,
      });
      setPreps(data.datos);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pagina, busqueda]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNuevo = () => {
    setEditando(null);
    reset({
      estado: 'activa', unidad_volumen: 'mL', reactivos_usados: [],
    });
    setMsgError('');
    setVista('formulario');
  };

  const abrirEditar = async (id) => {
    try {
      const data = await preparacionService.obtener(id);
      setEditando(data);
      reset({
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        volumen_final: data.volumen_final || '',
        unidad_volumen: data.unidad_volumen || 'mL',
        procedimiento: data.procedimiento || '',
        observaciones: data.observaciones || '',
        fecha_preparacion: data.fecha_preparacion?.split('T')[0] || '',
        fecha_vencimiento: data.fecha_vencimiento?.split('T')[0] || '',
        estado: data.estado || 'activa',
        reactivos_usados: data.reactivos?.map(r => ({
          reactivo_id: r.reactivo_id,
          cantidad: r.cantidad,
          unidad: r.unidad,
          concentracion: r.concentracion || '',
        })) || [],
      });
      setModalDetalle(null);
      setMsgError('');
      setVista('formulario');
    } catch (err) { console.error(err); }
  };

  const onSubmit = async (datos) => {
    setMsgError('');
    setEnviando(true);
    try {
      if (editando) {
        await preparacionService.actualizar(editando.id, datos);
        setMsgExito('Preparación actualizada correctamente');
      } else {
        await preparacionService.crear(datos);
        setMsgExito('Preparación registrada correctamente');
      }
      setVista('lista');
      setEditando(null);
      cargar();
      setTimeout(() => setMsgExito(''), 4000);
    } catch (err) {
      setMsgError(err.response?.data?.error || 'Error al guardar la preparación');
    } finally {
      setEnviando(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await preparacionService.eliminar(id);
      setConfirmarElim(null);
      setModalDetalle(null);
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const totalPaginas = Math.ceil(total / LIMITE);

  // ── RENDER ────────────────────────────────────────────────────
  // El contenedor raíz es un div simple — el DashboardLayout
  // maneja el scroll y el layout general
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ── Encabezado — exactamente como Stitch ──────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap',
        alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px',
      }}>
        <div>
          <span style={{
            display: 'block',
            fontSize: '10px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: T.accentDim, fontFamily: 'Manrope, sans-serif',
            marginBottom: '8px',
          }}>
            Quality Control Protocol
          </span>
          <h1 style={{
            fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
            fontWeight: 800, fontFamily: 'Manrope, sans-serif',
            color: T.primary, letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}>
            Solutions Preparation
          </h1>
          <p style={{
            fontSize: '14px', color: T.muted,
            marginTop: '8px', maxWidth: '480px', lineHeight: 1.6,
          }}>
            Registra nuevas formulaciones con precisión clínica.
            Todos los registros quedan en el sistema SICOQ.
          </p>
        </div>

        {/* Status badge + botón nueva preparación */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* System status — de Stitch */}
          <div style={{
            background: T.surfaceLow, borderRadius: '12px',
            padding: '12px 16px',
            border: `1px solid ${T.borderSoft}`,
          }}>
            <p style={{
              fontSize: '10px', fontWeight: 700,
              textTransform: 'uppercase', color: T.outline,
              fontFamily: 'Manrope, sans-serif', marginBottom: '2px',
            }}>
              System Status
            </p>
            <p style={{
              fontSize: '13px', fontWeight: 700,
              color: T.accentDim, fontFamily: 'Manrope, sans-serif',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: T.accent, display: 'inline-block',
              }} />
              Compliance Active
            </p>
          </div>

          {/* Botón nueva preparación */}
          {puedeEditar && vista === 'lista' && (
            <AccentButton onClick={abrirNuevo}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                add
              </span>
              Nueva preparación
            </AccentButton>
          )}

          {/* Botón volver (en vista formulario) */}
          {vista === 'formulario' && (
            <button
              onClick={() => { setVista('lista'); setEditando(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 16px', borderRadius: '10px',
                background: 'transparent',
                border: `1px solid ${T.border}`,
                color: T.muted, fontFamily: 'Manrope, sans-serif',
                fontWeight: 600, fontSize: '13px', cursor: 'pointer',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_back
              </span>
              Volver
            </button>
          )}
        </div>
      </div>

      {/* Mensaje de éxito global */}
      {msgExito && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 16px', borderRadius: '10px',
          background: T.successBg,
          border: `1px solid rgba(27,135,58,0.2)`,
        }}>
          <span className="material-symbols-outlined"
            style={{ color: T.success, fontSize: '18px' }}>
            check_circle
          </span>
          <p style={{ color: T.success, fontSize: '14px', fontWeight: 600 }}>
            {msgExito}
          </p>
        </div>
      )}

      {/* ── Layout asimétrico 7/5 — IGUAL AL DISEÑO STITCH ──────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '32px',
      }}>

        {/* Columna izquierda 7/12 */}
        <div style={{
          gridColumn: 'span 12',
          // En pantallas grandes: 7 columnas
        }}
          className="lg:col-span-7"
        >

          {vista === 'lista' ? (
            /* ── VISTA LISTA ─────────────────────────────────── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

              {/* Búsqueda */}
              <div style={{
                background: T.surface, borderRadius: '12px 12px 0 0',
                padding: '16px',
                border: `1px solid ${T.borderSoft}`,
                borderBottom: 'none',
              }}>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', left: '12px', top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '18px', color: T.outline,
                  }}>
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar preparación por nombre..."
                    value={busqueda}
                    onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
                    style={{
                      width: '100%', padding: '10px 12px 10px 40px',
                      border: `1px solid ${T.borderSoft}`,
                      borderRadius: '8px', fontSize: '13px',
                      outline: 'none', background: T.surfaceLow,
                      color: T.primary, fontFamily: 'Inter, sans-serif',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Tabla */}
              <div style={{
                background: T.surface,
                border: `1px solid ${T.borderSoft}`,
                borderRadius: '0 0 12px 12px',
                overflow: 'hidden',
              }}>
                {loading ? (
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', height: '200px',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      border: `2px solid ${T.borderSoft}`,
                      borderTopColor: T.accent,
                      animation: 'spin 0.8s linear infinite',
                    }} />
                  </div>
                ) : preps.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '64px 24px',
                    color: T.outline,
                  }}>
                    <span className="material-symbols-outlined"
                      style={{ fontSize: '56px', color: T.borderSoft, display: 'block' }}>
                      fluid_balance
                    </span>
                    <p style={{
                      fontFamily: 'Manrope, sans-serif', fontWeight: 600,
                      fontSize: '14px', marginTop: '12px', color: T.muted,
                    }}>
                      {busqueda ? 'Sin resultados para esa búsqueda'
                        : 'No hay preparaciones registradas'}
                    </p>
                    {!busqueda && puedeEditar && (
                      <button onClick={abrirNuevo} style={{
                        marginTop: '16px', padding: '10px 20px',
                        background: T.primary, color: '#fff',
                        border: 'none', borderRadius: '10px',
                        fontFamily: 'Manrope, sans-serif', fontWeight: 700,
                        fontSize: '13px', cursor: 'pointer',
                      }}>
                        Registrar primera preparación
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%', borderCollapse: 'collapse',
                        fontSize: '13px',
                      }}>
                        <thead>
                          <tr style={{ background: T.surfaceLow }}>
                            {['Nombre', 'Volumen', 'Reactivos', 'Responsable',
                              'Fecha', 'Estado', ''].map(h => (
                                <th key={h} style={{
                                  textAlign: 'left', padding: '12px 16px',
                                  fontSize: '10px', fontWeight: 700,
                                  textTransform: 'uppercase', letterSpacing: '0.07em',
                                  color: T.outline,
                                  fontFamily: 'Manrope, sans-serif',
                                  borderBottom: `1px solid ${T.borderSoft}`,
                                  whiteSpace: 'nowrap',
                                }}>
                                  {h}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preps.map((p, i) => (
                            <tr
                              key={p.id}
                              onClick={() => preparacionService.obtener(p.id)
                                .then(d => setModalDetalle(d))
                                .catch(console.error)
                              }
                              style={{
                                borderBottom: i < preps.length - 1
                                  ? `1px solid ${T.borderSoft}` : 'none',
                                cursor: 'pointer',
                                transition: 'background 0.12s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = T.surfaceLow}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={{ padding: '14px 16px' }}>
                                <p style={{
                                  fontWeight: 700, color: T.primary,
                                  fontFamily: 'Manrope, sans-serif', fontSize: '13px',
                                }}>
                                  {p.nombre}
                                </p>
                                {p.descripcion && (
                                  <p style={{
                                    fontSize: '11px', color: T.outline,
                                    marginTop: '2px',
                                    maxWidth: '180px',
                                    whiteSpace: 'nowrap', overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}>
                                    {p.descripcion}
                                  </p>
                                )}
                              </td>
                              <td style={{
                                padding: '14px 16px',
                                fontFamily: 'monospace', fontSize: '12px',
                                color: T.muted, whiteSpace: 'nowrap'
                              }}>
                                {p.volumen_final
                                  ? `${p.volumen_final} ${p.unidad_volumen}` : '—'}
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                {p.total_reactivos > 0 ? (
                                  <span style={{
                                    fontSize: '12px', fontWeight: 600,
                                    color: T.accent,
                                  }}>
                                    {p.total_reactivos} reactivo
                                    {p.total_reactivos !== 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span style={{ color: T.outline, fontSize: '12px' }}>—</span>
                                )}
                              </td>
                              <td style={{
                                padding: '14px 16px',
                                fontSize: '12px', color: T.muted
                              }}>
                                {p.responsable_nombre || '—'}
                              </td>
                              <td style={{
                                padding: '14px 16px',
                                fontSize: '12px', color: T.muted,
                                whiteSpace: 'nowrap'
                              }}>
                                {new Date(p.fecha_preparacion)
                                  .toLocaleDateString('es-CO')}
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <Badge estado={p.estado} />
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <span style={{
                                  fontSize: '11px', fontWeight: 700,
                                  color: T.accent, textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  fontFamily: 'Manrope, sans-serif',
                                }}>
                                  Ver →
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginación */}
                    {totalPaginas > 1 && (
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderTop: `1px solid ${T.borderSoft}`,
                      }}>
                        <p style={{ fontSize: '12px', color: T.outline }}>
                          Página {pagina} de {totalPaginas} — {total} resultados
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {[
                            {
                              label: '← Anterior', disabled: pagina === 1,
                              onClick: () => setPagina(p => p - 1)
                            },
                            {
                              label: 'Siguiente →', disabled: pagina === totalPaginas,
                              onClick: () => setPagina(p => p + 1)
                            },
                          ].map(btn => (
                            <button key={btn.label} onClick={btn.onClick}
                              disabled={btn.disabled} style={{
                                padding: '6px 14px', borderRadius: '8px',
                                border: `1px solid ${T.border}`,
                                background: 'transparent', color: T.muted,
                                fontSize: '12px', cursor: btn.disabled ? 'not-allowed' : 'pointer',
                                opacity: btn.disabled ? 0.4 : 1,
                                fontFamily: 'Inter, sans-serif',
                              }}>
                              {btn.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

          ) : (
            /* ── VISTA FORMULARIO — diseño Stitch ────────────── */
            <form onSubmit={handleSubmit(onSubmit)}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {msgError && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '14px 16px', borderRadius: '10px',
                  background: T.errorBg, border: `1px solid rgba(186,26,26,0.2)`,
                }}>
                  <span className="material-symbols-outlined"
                    style={{ color: T.error, fontSize: '18px' }}>
                    error
                  </span>
                  <p style={{ color: T.error, fontSize: '13px' }}>{msgError}</p>
                </div>
              )}

              {/* ── PASO 1: Reagent Selection ─────────────────── */}
              <StepCard>
                <div style={{
                  display: 'flex', alignItems: 'flex-start',
                  gap: '16px', marginBottom: '32px',
                }}>
                  <StepNumber n={1} />
                  <div>
                    <h2 style={{
                      fontSize: '20px', fontWeight: 700,
                      fontFamily: 'Manrope, sans-serif', color: T.primary,
                    }}>
                      Identificación del reactivo
                    </h2>
                    <p style={{ fontSize: '13px', color: T.muted, marginTop: '4px' }}>
                      Identifica la solución y el reactivo soluto principal.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Nombre */}
                  <div>
                    <FieldLabel>Nombre de la preparación *</FieldLabel>
                    <StitchInput
                      placeholder="Ej: Solución NaOH 1.0 N • HCl 0.1 M"
                      error={!!errors.nombre}
                      {...register('nombre', { required: 'El nombre es requerido' })}
                    />
                    {errors.nombre && (
                      <p style={{ color: T.error, fontSize: '11px', marginTop: '4px' }}>
                        {errors.nombre.message}
                      </p>
                    )}
                  </div>

                  {/* CAS ref + Grado */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div>
                      <FieldLabel>Reactivo principal</FieldLabel>
                      <StitchSelect {...register('reactivo_principal_id')}>
                        <option value="">Seleccionar reactivo...</option>
                        {reactivos.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.nombre} {r.cas ? `(CAS: ${r.cas})` : ''}
                          </option>
                        ))}
                      </StitchSelect>
                    </div>
                    <div>
                      <FieldLabel>Estado de la preparación</FieldLabel>
                      <StitchSelect {...register('estado')}>
                        <option value="activa">Activa</option>
                        <option value="vencida">Vencida</option>
                        <option value="descartada">Descartada</option>
                      </StitchSelect>
                    </div>
                  </div>

                  {/* Descripción */}
                  <div>
                    <FieldLabel>Descripción</FieldLabel>
                    <StitchInput
                      placeholder="Propósito o aplicación de esta solución..."
                      {...register('descripcion')}
                    />
                  </div>
                </div>
              </StepCard>

              {/* ── PASO 2: Concentration & Volume ───────────── */}
              <StepCard>
                <div style={{
                  display: 'flex', alignItems: 'flex-start',
                  gap: '16px', marginBottom: '32px',
                }}>
                  <StepNumber n={2} />
                  <div>
                    <h2 style={{
                      fontSize: '20px', fontWeight: 700,
                      fontFamily: 'Manrope, sans-serif', color: T.primary,
                    }}>
                      Concentración y volumen
                    </h2>
                    <p style={{ fontSize: '13px', color: T.muted, marginTop: '4px' }}>
                      Parámetros cuantitativos de la solución preparada.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                  {/* Columna izquierda */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <FieldLabel>Volumen final objetivo</FieldLabel>
                      <div style={{ display: 'flex' }}>
                        <input
                          type="number" step="any" placeholder="0"
                          style={{
                            flex: 1, padding: '14px 16px',
                            background: 'rgba(222,233,248,0.3)',
                            border: 'none', borderBottom: `2px solid ${T.border}`,
                            outline: 'none', fontSize: '14px',
                            fontFamily: 'Inter, sans-serif', color: T.primary,
                            transition: 'border-color 0.2s',
                          }}
                          onFocus={e => e.target.style.borderBottomColor = T.accent}
                          onBlur={e => e.target.style.borderBottomColor = T.border}
                          {...register('volumen_final', { valueAsNumber: true })}
                        />
                        <select
                          style={{
                            background: T.surfaceHigh,
                            borderBottom: `2px solid ${T.border}`,
                            border: 'none', padding: '0 12px',
                            fontWeight: 700, fontSize: '11px',
                            textTransform: 'uppercase', color: T.primary,
                            cursor: 'pointer',
                            fontFamily: 'Manrope, sans-serif',
                          }}
                          {...register('unidad_volumen')}
                        >
                          <option value="mL">mL</option>
                          <option value="L">L</option>
                          <option value="µL">µL</option>
                        </select>
                      </div>
                    </div>

                    {/* Reactivos adicionales */}
                    <div>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: '12px',
                      }}>
                        <FieldLabel>Reactivos adicionales</FieldLabel>
                        <button type="button" onClick={() => append({
                          reactivo_id: '', cantidad: '', unidad: 'mL',
                          concentracion: '',
                        })} style={{
                          fontSize: '11px', fontWeight: 700,
                          color: T.accentDim, background: 'none',
                          border: 'none', cursor: 'pointer',
                          fontFamily: 'Manrope, sans-serif',
                          textDecoration: 'underline',
                        }}>
                          + Agregar
                        </button>
                      </div>

                      {fields.length === 0 ? (
                        <div style={{
                          border: `2px dashed ${T.border}`,
                          borderRadius: '8px', padding: '20px',
                          textAlign: 'center', color: T.outline,
                          fontSize: '12px',
                        }}>
                          Sin reactivos adicionales
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex', flexDirection: 'column', gap: '8px',
                        }}>
                          {fields.map((field, idx) => (
                            <div key={field.id} style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 1fr 1fr auto',
                              gap: '8px', alignItems: 'end',
                              background: T.surfaceLow,
                              borderRadius: '8px', padding: '10px',
                            }}>
                              <select
                                style={{
                                  border: `1px solid ${T.borderSoft}`,
                                  borderRadius: '6px', padding: '8px 10px',
                                  fontSize: '12px', background: T.surface,
                                  color: T.primary, outline: 'none',
                                  fontFamily: 'Inter, sans-serif',
                                }}
                                {...register(`reactivos_usados.${idx}.reactivo_id`,
                                  { required: true })}
                              >
                                <option value="">Seleccionar...</option>
                                {reactivos.map(r => (
                                  <option key={r.id} value={r.id}>{r.nombre}</option>
                                ))}
                              </select>
                              <input
                                type="number" step="any" placeholder="Cant."
                                style={{
                                  border: `1px solid ${T.borderSoft}`,
                                  borderRadius: '6px', padding: '8px 10px',
                                  fontSize: '12px', outline: 'none',
                                  fontFamily: 'Inter, sans-serif',
                                }}
                                {...register(`reactivos_usados.${idx}.cantidad`,
                                  { required: true, valueAsNumber: true })}
                              />
                              <select
                                style={{
                                  border: `1px solid ${T.borderSoft}`,
                                  borderRadius: '6px', padding: '8px 8px',
                                  fontSize: '12px', background: T.surface,
                                  outline: 'none',
                                  fontFamily: 'Inter, sans-serif',
                                }}
                                {...register(`reactivos_usados.${idx}.unidad`)}
                              >
                                <option value="mL">mL</option>
                                <option value="L">L</option>
                                <option value="g">g</option>
                                <option value="mg">mg</option>
                                <option value="µL">µL</option>
                                <option value="µg">µg</option>
                              </select>
                              <button type="button" onClick={() => remove(idx)}
                                style={{
                                  width: 28, height: 28,
                                  borderRadius: '6px',
                                  background: '#fff1f1',
                                  border: 'none',
                                  display: 'flex', alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer', color: T.error,
                                }}>
                                <span className="material-symbols-outlined"
                                  style={{ fontSize: '14px' }}>
                                  close
                                </span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Columna derecha — panel de masa calculada (decorativo por ahora) */}
                  <div style={{
                    background: T.surfaceLow,
                    padding: '24px', borderRadius: '8px',
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'center',
                    borderLeft: `4px solid rgba(65,210,201,0.3)`,
                  }}>
                    <p style={{
                      fontSize: '10px', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      color: T.accentDim, fontFamily: 'Manrope, sans-serif',
                      marginBottom: '6px',
                    }}>
                      Reactivos en esta preparación
                    </p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{
                        fontSize: '40px', fontWeight: 800,
                        fontFamily: 'Manrope, sans-serif', color: T.primary,
                        lineHeight: 1,
                      }}>
                        {1 + fields.length}
                      </span>
                      <span style={{
                        fontSize: '16px', fontWeight: 700,
                        color: T.muted, fontFamily: 'Manrope, sans-serif',
                      }}>
                        total
                      </span>
                    </div>
                    <p style={{
                      fontSize: '11px', color: T.outline,
                      marginTop: '12px', fontStyle: 'italic', lineHeight: 1.5,
                    }}>
                      Principal + {fields.length} adicional
                      {fields.length !== 1 ? 'es' : ''} especificado
                      {fields.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </StepCard>

              {/* ── PASO 3: Validation & Signature ───────────── */}
              <StepCard>
                <div style={{
                  display: 'flex', alignItems: 'flex-start',
                  gap: '16px', marginBottom: '32px',
                }}>
                  <StepNumber n={3} />
                  <div>
                    <h2 style={{
                      fontSize: '20px', fontWeight: 700,
                      fontFamily: 'Manrope, sans-serif', color: T.primary,
                    }}>
                      Validación y firma
                    </h2>
                    <p style={{ fontSize: '13px', color: T.muted, marginTop: '4px' }}>
                      Metadatos de auditoría para el registro de trazabilidad.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Fechas */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px',
                  }}>
                    <div>
                      <FieldLabel>Fecha / hora de preparación</FieldLabel>
                      <StitchInput
                        type="date"
                        {...register('fecha_preparacion')}
                      />
                    </div>
                    <div>
                      <FieldLabel>Analista responsable</FieldLabel>
                      <StitchInput
                        placeholder="Nombre del analista"
                        defaultValue={usuario?.nombre || ''}
                        style={{ background: '#edf4ff', cursor: 'default' }}
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Procedimiento */}
                  <div>
                    <FieldLabel>Procedimiento de preparación</FieldLabel>
                    <textarea
                      rows={4}
                      placeholder="Describe los pasos de preparación siguiendo el SOP correspondiente..."
                      style={{
                        width: '100%', padding: '14px 16px',
                        background: 'rgba(222,233,248,0.3)',
                        border: 'none',
                        borderBottom: `2px solid ${T.border}`,
                        outline: 'none', fontSize: '14px',
                        fontFamily: 'Inter, sans-serif', color: T.primary,
                        resize: 'vertical', boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => e.target.style.borderBottomColor = T.accent}
                      onBlur={e => e.target.style.borderBottomColor = T.border}
                      {...register('procedimiento')}
                    />
                  </div>

                  {/* Vencimiento + checkbox certificación — como en Stitch */}
                  <div style={{
                    border: `2px dashed ${T.border}`,
                    borderRadius: '12px',
                    padding: '24px',
                    background: T.bg,
                  }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: '16px',
                    }}>
                      <FieldLabel>Fecha de vencimiento de la solución</FieldLabel>
                    </div>
                    <StitchInput
                      type="date"
                      {...register('fecha_vencimiento')}
                    />
                    <div style={{
                      marginTop: '20px', display: 'flex', alignItems: 'center',
                      gap: '12px',
                    }}>
                      <input
                        type="checkbox"
                        id="cert-check"
                        style={{ width: 18, height: 18, accentColor: T.accentDim }}
                      />
                      <label htmlFor="cert-check" style={{
                        fontSize: '12px', color: T.primary,
                        fontFamily: 'Inter, sans-serif', lineHeight: 1.5,
                        cursor: 'pointer',
                      }}>
                        Certifico que la solución fue preparada siguiendo
                        los procedimientos SOP del laboratorio.
                      </label>
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div>
                    <FieldLabel>Observaciones adicionales</FieldLabel>
                    <textarea
                      rows={2}
                      style={{
                        width: '100%', padding: '14px 16px',
                        background: 'rgba(222,233,248,0.3)',
                        border: 'none',
                        borderBottom: `2px solid ${T.border}`,
                        outline: 'none', fontSize: '14px',
                        fontFamily: 'Inter, sans-serif', color: T.primary,
                        resize: 'vertical', boxSizing: 'border-box',
                      }}
                      {...register('observaciones')}
                    />
                  </div>
                </div>
              </StepCard>

              {/* Botón final — exactamente como Stitch */}
              <div style={{ paddingTop: '8px' }}>
                <button
                  type="submit"
                  disabled={enviando}
                  style={{
                    width: '100%', padding: '20px',
                    background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryMid} 100%)`,
                    color: '#fff', border: 'none', borderRadius: '12px',
                    fontFamily: 'Manrope, sans-serif', fontWeight: 700,
                    fontSize: '16px', cursor: enviando ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '12px',
                    opacity: enviando ? 0.7 : 1,
                    boxShadow: '0 16px 48px rgba(5,16,26,0.2)',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => !enviando && (
                    e.currentTarget.style.transform = 'scale(1.005)',
                    e.currentTarget.style.boxShadow = '0 20px 56px rgba(5,16,26,0.28)'
                  )}
                  onMouseLeave={e => (
                    e.currentTarget.style.transform = '',
                    e.currentTarget.style.boxShadow = '0 16px 48px rgba(5,16,26,0.2)'
                  )}
                >
                  {enviando ? (
                    <>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      Registrando preparación...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined"
                        style={{ fontSize: '22px' }}>
                        check_circle
                      </span>
                      {editando
                        ? 'Guardar cambios'
                        : 'Finalizar preparación y registrar'}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Columna derecha 5/12 — Bento cards de Stitch ─── */}
        {/* Siempre visible, tanto en lista como en formulario */}
        <div style={{ gridColumn: 'span 12' }}
          className="lg:col-span-5">
          <RightColumn preps={preps} />
        </div>
      </div>

      {/* ── Modales ────────────────────────────────────────────── */}

      {modalDetalle && (
        <ModalDetalle
          prep={modalDetalle}
          esAdmin={esAdmin}
          puedeEditar={puedeEditar}
          onClose={() => setModalDetalle(null)}
          onEdit={() => abrirEditar(modalDetalle.id)}
          onDelete={() => setConfirmarElim(modalDetalle.id)}
        />
      )}

      {confirmarElim && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
            background: 'rgba(5,16,26,0.65)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{
            background: T.surface, borderRadius: '16px',
            padding: '32px', maxWidth: '380px', width: '100%',
            boxShadow: '0 24px 64px rgba(5,16,26,0.2)',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '12px',
              background: T.errorBg,
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: '16px',
            }}>
              <span className="material-symbols-outlined"
                style={{ color: T.error, fontSize: '24px' }}>
                delete_forever
              </span>
            </div>
            <h3 style={{
              fontSize: '20px', fontWeight: 800,
              fontFamily: 'Manrope, sans-serif', color: T.primary,
              marginBottom: '8px',
            }}>
              ¿Eliminar preparación?
            </h3>
            <p style={{
              fontSize: '13px', color: T.muted,
              lineHeight: 1.6, marginBottom: '24px',
            }}>
              Esta acción eliminará permanentemente la preparación y
              todos sus reactivos asociados. No se puede deshacer.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setConfirmarElim(null)} style={{
                padding: '10px 20px', borderRadius: '10px',
                border: `1px solid ${T.border}`, background: 'transparent',
                color: T.muted, fontFamily: 'Manrope, sans-serif',
                fontWeight: 600, fontSize: '13px', cursor: 'pointer',
              }}>
                Cancelar
              </button>
              <button onClick={() => handleEliminar(confirmarElim)} style={{
                padding: '10px 20px', borderRadius: '10px',
                background: T.error, border: 'none',
                color: '#fff', fontFamily: 'Manrope, sans-serif',
                fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  delete
                </span>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animación del spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .lg\\:col-span-7 {
          grid-column: span 12;
        }
        .lg\\:col-span-5 {
          grid-column: span 12;
        }
        @media (min-width: 1024px) {
          .lg\\:col-span-7 { grid-column: span 7; }
          .lg\\:col-span-5 { grid-column: span 5; }
        }
      `}</style>
    </div>
  );
}