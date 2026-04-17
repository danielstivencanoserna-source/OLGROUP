// pages/sicoq/Sicoq.jsx
//
// Página de trazabilidad SICOQ.
// Muestra el formulario de registro de consumo y el historial.

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import sicoqService from '../../services/sicoqService';

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

export default function Sicoq() {
  const { usuario } = useAuth();
  const [consumos, setConsumos] = useState([]);
  const [reactivos, setReactivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // {tipo, texto}
  const [busqReact, setBusqReact] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { nombre_responsable: usuario?.nombre || '' },
  });

  // Cargar historial y reactivos controlados al montar
  useEffect(() => {
    const cargar = async () => {
      try {
        const [resConsumos, resReactivos] = await Promise.all([
          sicoqService.listarConsumos({ limite: 20 }),
          sicoqService.listarReactivosControlados(),
        ]);
        setConsumos(resConsumos.datos);
        setReactivos(resReactivos);
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  // Buscar reactivos controlados mientras el usuario escribe
  useEffect(() => {
    const buscar = async () => {
      const data = await sicoqService.listarReactivosControlados(busqReact);
      setReactivos(data);
    };
    const timer = setTimeout(buscar, 300); // esperar 300ms tras cada tecla
    return () => clearTimeout(timer);      // cancelar si el usuario sigue escribiendo
  }, [busqReact]);

  const onSubmit = async (datos) => {
    setEnviando(true);
    setMensaje(null);
    try {
      await sicoqService.registrarConsumo(datos);
      setMensaje({ tipo: 'exito', texto: 'Consumo registrado correctamente' });
      reset({ nombre_responsable: usuario?.nombre || '' });
      // Recargar historial
      const res = await sicoqService.listarConsumos({ limite: 20 });
      setConsumos(res.datos);
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al registrar el consumo',
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Módulo SICOQ
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Registro y trazabilidad de reactivos controlados
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Formulario de registro */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          padding: '32px', borderRadius: '12px',
          background: 'rgba(222,233,248,0.45)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.25)',
        }}>
          <h2 className="font-medium text-gray-700 mb-5">
            Registrar consumo
          </h2>

          {/* Mensaje de éxito o error */}
          {mensaje && (
            <div className={`rounded-lg px-4 py-3 mb-5 text-sm
              ${mensaje.tipo === 'exito'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
              {mensaje.texto}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Buscador de reactivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reactivo controlado
              </label>
              <input
                type="text"
                placeholder="Buscar reactivo controlado..."
                value={busqReact}
                onChange={e => setBusqReact(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3
                           py-2 text-sm focus:outline-none focus:ring-2
                           focus:ring-blue-500 mb-2"
              />
              <select
                className="w-full border border-gray-300 rounded-lg px-3
                           py-2 text-sm focus:outline-none focus:ring-2
                           focus:ring-blue-500 bg-white"
                {...register('reactivo_id', {
                  required: 'Selecciona un reactivo'
                })}
              >
                <option value="">-- Selecciona un reactivo --</option>
                {reactivos.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.codigo_interno} — {r.nombre}
                    ({r.cantidad_actual} {r.unidad_medida} disponibles)
                  </option>
                ))}
              </select>
              {errors.reactivo_id && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.reactivo_id.message}
                </p>
              )}
            </div>

            {/* Nombre responsable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del responsable
              </label>
              <input
                type="text"
                placeholder="Nombre completo"
                className={`w-full border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           ${errors.nombre_responsable
                    ? 'border-red-400' : 'border-gray-300'}`}
                {...register('nombre_responsable', {
                  required: 'El nombre del responsable es requerido'
                })}
              />
              {errors.nombre_responsable && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.nombre_responsable.message}
                </p>
              )}
            </div>

            {/* Cantidad y unidad */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  className={`w-full border rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             ${errors.cantidad
                      ? 'border-red-400' : 'border-gray-300'}`}
                  {...register('cantidad', {
                    required: 'Ingresa la cantidad',
                    min: { value: 0.001, message: 'Debe ser mayor a 0' },
                    valueAsNumber: true,
                  })}
                />
                {errors.cantidad && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.cantidad.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3
                             py-2 text-sm focus:outline-none focus:ring-2
                             focus:ring-blue-500 bg-white"
                  {...register('unidad', { required: true })}
                >
                  <option value="mL">mL</option>
                  <option value="L">L</option>
                  <option value="µL">µL</option>
                  <option value="g">g</option>
                  <option value="mg">mg</option>
                  <option value="µg">µg</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>

            {/* Descripción del uso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción del uso
              </label>
              <textarea
                rows={3}
                placeholder="Describe para qué se utilizó el reactivo..."
                className={`w-full border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           resize-none
                           ${errors.uso_descripcion
                    ? 'border-red-400' : 'border-gray-300'}`}
                {...register('uso_descripcion', {
                  required: 'Describe el uso del reactivo',
                  minLength: { value: 5, message: 'Mínimo 5 caracteres' },
                })}
              />
              {errors.uso_descripcion && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.uso_descripcion.message}
                </p>
              )}
            </div>

            {/* Número de acta (opcional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de acta
                <span className="text-gray-400 font-normal ml-1">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="ACTA-2026-001"
                className="w-full border border-gray-300 rounded-lg px-3
                           py-2 text-sm focus:outline-none focus:ring-2
                           focus:ring-blue-500"
                {...register('numero_acta')}
              />
            </div>

            <AccentButton
              type="submit"
              disabled={enviando}
              className="w-full bg-blue-600 hover:bg-blue-700
                         disabled:bg-blue-400 text-white font-medium
                         py-2.5 rounded-lg text-sm transition-colors
                         flex items-center justify-center gap-2"
            >
              {enviando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registrando...
                </>
              ) : 'Registrar consumo'}
            </AccentButton>

          </form>
        </div>

        {/* Historial de consumos */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          padding: '32px', borderRadius: '12px',
          background: 'rgba(222,233,248,0.45)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.25)',
        }}>
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-700 text-sm">
              Historial de trazabilidad
            </h2>
          </div>

          {cargando ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-blue-500
                              border-t-transparent rounded-full animate-spin" />
            </div>
          ) : consumos.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">No hay registros de consumo aún</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 overflow-y-auto max-h-96">
              {consumos.map((c) => (
                <div key={c.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {c.reactivo_nombre}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {c.cantidad} {c.unidad} · {c.nombre_responsable}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                        {c.uso_descripcion}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(c.fecha_consumo)
                        .toLocaleDateString('es-CO')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}