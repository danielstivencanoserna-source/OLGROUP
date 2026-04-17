// pages/reactivos/Reactivos.jsx
//
// Vista completa del inventario de reactivos.
// Incluye:
//  - Tabla con búsqueda, filtros y paginación
//  - Modal de detalle con TODA la información del reactivo
//  - Botón de descarga de ficha de seguridad PDF
//  - Formulario de creación / edición
//  - Eliminación solo para admin

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import reactivoService from '../../services/reactivoService';
import api from '../../services/api';

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

// ── Badge de estado ───────────────────────────────────────────────
function BadgeEstado({ estado }) {
  const cfg = {
    en_uso: { bg: 'bg-green-100', text: 'text-green-700', label: 'En uso' },
    agotado: { bg: 'bg-red-100', text: 'text-red-700', label: 'Agotado' },
    en_compra: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En compra' },
    en_inventario: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En inventario' },
  };
  const c = cfg[estado] || { bg: 'bg-gray-100', text: 'text-gray-600', label: estado };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ── Fila de detalle (label + valor) ──────────────────────────────
function FilaDetalle({ label, valor }) {
  if (!valor && valor !== 0) return null;
  return (
    <div className="py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 block">{label}</span>
      <span className="text-sm text-gray-800">{valor}</span>
    </div>
  );
}

// ── Modal de detalle completo ─────────────────────────────────────
function ModalDetalle({ reactivo, onCerrar, onEditar, onEliminar, esAdmin }) {
  if (!reactivo) return null;

  // Los nombres de los pictogramas GHS para mostrar
  const PICTOGRAMA_ICONOS = {
    GHS01: '💥', GHS02: '🔥', GHS03: '⭕',
    GHS04: '🫧', GHS05: '⚗️', GHS06: '☠️',
    GHS07: '⚠️', GHS08: '🫁', GHS09: '🌿',
  };

  return (
    // Overlay oscuro detrás del modal
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50
                 flex items-center justify-center p-4"
      onClick={onCerrar}
    >
      {/* Contenedor del modal — stopPropagation evita que
          el clic dentro cierre el modal */}
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh]
                   overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6
                        border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {reactivo.nombre}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs text-gray-400">
                {reactivo.codigo_interno}
              </span>
              <BadgeEstado estado={reactivo.estado} />
              {reactivo.es_controlado && (
                <span className="text-xs bg-purple-100 text-purple-700
                                 px-2 py-0.5 rounded-full font-medium">
                  SICOQ Controlado
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Botón descargar ficha PDF */}
            {reactivo.ficha_seguridad_url && (
              <a
                href={reactivo.ficha_seguridad_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm
                           bg-blue-50 hover:bg-blue-100 text-blue-700
                           px-3 py-1.5 rounded-lg transition-colors"
              >
                📄 Ficha PDF
              </a>
            )}
            <button
              onClick={onEditar}
              className="text-sm bg-gray-100 hover:bg-gray-200
                         text-gray-700 px-3 py-1.5 rounded-lg
                         transition-colors"
            >
              ✏️ Editar
            </button>
            {esAdmin && (
              <button
                onClick={onEliminar}
                className="text-sm bg-red-50 hover:bg-red-100
                           text-red-600 px-3 py-1.5 rounded-lg
                           transition-colors"
              >
                🗑️ Eliminar
              </button>
            )}
            <button
              onClick={onCerrar}
              className="text-gray-400 hover:text-gray-600 text-xl
                         leading-none px-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* Contenido en grid de dos columnas */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Columna 1 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500
                           uppercase tracking-wider mb-3">
              Identificación
            </h3>
            <div className="space-y-0">
              <FilaDetalle label="Nombre" valor={reactivo.nombre} />
              <FilaDetalle label="Sinónimos" valor={reactivo.sinonimos} />
              <FilaDetalle label="Número CAS" valor={reactivo.cas} />
              <FilaDetalle label="Fórmula molecular" valor={reactivo.formula_molecular} />
              <FilaDetalle label="Concentración" valor={reactivo.concentracion} />
              <FilaDetalle label="Marca" valor={reactivo.marca} />
              <FilaDetalle label="Proveedor" valor={reactivo.proveedor_nombre} />
            </div>

            <h3 className="text-sm font-semibold text-gray-500
                           uppercase tracking-wider mb-3 mt-5">
              Inventario
            </h3>
            <div className="space-y-0">
              <FilaDetalle label="Cantidad inicial"
                valor={`${reactivo.cantidad_inicial} ${reactivo.unidad_medida}`} />
              <FilaDetalle label="Cantidad actual"
                valor={`${reactivo.cantidad_actual} ${reactivo.unidad_medida}`} />
              <FilaDetalle label="Presentación" valor={reactivo.presentacion} />
              <FilaDetalle label="Lote" valor={reactivo.lote} />
              <FilaDetalle label="Precio"
                valor={reactivo.precio
                  ? `$${Number(reactivo.precio).toLocaleString('es-CO')}`
                  : null} />
            </div>
          </div>

          {/* Columna 2 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500
                           uppercase tracking-wider mb-3">
              Fechas y ubicación
            </h3>
            <div className="space-y-0">
              <FilaDetalle label="Fecha de ingreso"
                valor={reactivo.fecha_ingreso
                  ? new Date(reactivo.fecha_ingreso).toLocaleDateString('es-CO')
                  : null} />
              <FilaDetalle label="Fecha de apertura"
                valor={reactivo.fecha_apertura
                  ? new Date(reactivo.fecha_apertura).toLocaleDateString('es-CO')
                  : null} />
              <FilaDetalle label="Analista apertura" valor={reactivo.analista_apertura} />
              <FilaDetalle label="Fecha vencimiento"
                valor={reactivo.fecha_vencimiento
                  ? new Date(reactivo.fecha_vencimiento).toLocaleDateString('es-CO')
                  : null} />
              <FilaDetalle label="Ubicación" valor={reactivo.ubicacion} />
              <FilaDetalle label="Almacenamiento" valor={reactivo.almacenamiento} />
            </div>

            <h3 className="text-sm font-semibold text-gray-500
                           uppercase tracking-wider mb-3 mt-5">
              Seguridad
            </h3>
            <div className="space-y-0">
              <FilaDetalle label="Peligrosidad" valor={reactivo.peligrosidad} />
              <FilaDetalle label="Número UN" valor={reactivo.numero_un} />
              <FilaDetalle label="Tipo de residuo" valor={reactivo.tipo_residuo} />
            </div>

            {/* Pictogramas GHS */}
            {reactivo.pictogramas?.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-gray-500
                               uppercase tracking-wider mb-3">
                  Pictogramas GHS
                </h3>
                <div className="flex flex-wrap gap-2">
                  {reactivo.pictogramas.map(p => (
                    <div key={p.id}
                      className="flex flex-col items-center bg-orange-50
                                    border border-orange-200 rounded-lg
                                    px-3 py-2 text-center">
                      <span className="text-2xl">
                        {PICTOGRAMA_ICONOS[p.codigo_ghs] || '⚠️'}
                      </span>
                      <span className="text-xs text-orange-700 mt-1
                                       font-medium leading-tight">
                        {p.nombre}
                      </span>
                      <span className="text-xs text-orange-400">
                        {p.codigo_ghs}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Modal de formulario (crear / editar) ──────────────────────────
function ModalFormulario({ reactivo, pictogramas, onCerrar, onGuardado }) {
  const esEdicion = !!reactivo;
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: esEdicion ? {
      codigo_interno: reactivo.codigo_interno,
      nombre: reactivo.nombre,
      sinonimos: reactivo.sinonimos || '',
      cas: reactivo.cas || '',
      formula_molecular: reactivo.formula_molecular || '',
      concentracion: reactivo.concentracion || '',
      marca: reactivo.marca || '',
      lote: reactivo.lote || '',
      cantidad_inicial: reactivo.cantidad_inicial,
      unidad_medida: reactivo.unidad_medida,
      estado: reactivo.estado,
      ubicacion: reactivo.ubicacion || '',
      almacenamiento: reactivo.almacenamiento || '',
      peligrosidad: reactivo.peligrosidad || '',
      numero_un: reactivo.numero_un || '',
      tipo_residuo: reactivo.tipo_residuo || '',
      es_controlado: reactivo.es_controlado,
      precio: reactivo.precio || '',
    } : { estado: 'en_inventario', es_controlado: false },
  });

  const onSubmit = async (datos) => {
    setError('');
    setEnviando(true);
    try {
      // Usamos FormData para poder adjuntar el PDF opcionalmente
      const formData = new FormData();

      // Agregamos todos los campos de texto
      Object.entries(datos).forEach(([key, val]) => {
        if (key !== 'ficha_seguridad' && val !== '' && val != null) {
          formData.append(key, val);
        }
      });

      // Si hay pictogramas seleccionados, los agregamos como JSON
      const picSeleccionados = Array.from(
        document.querySelectorAll('input[name="pictograma_ids"]:checked')
      ).map(el => el.value);
      formData.append('pictograma_ids', JSON.stringify(picSeleccionados));

      // Si hay un PDF adjuntado, lo agregamos
      const archivoPDF = datos.ficha_seguridad?.[0];
      if (archivoPDF) {
        formData.append('ficha_seguridad', archivoPDF);
      }

      if (esEdicion) {
        await reactivoService.actualizar(reactivo.id, formData);
      } else {
        await reactivoService.crear(formData);
      }

      onGuardado();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar el reactivo');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50
                 flex items-center justify-center p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh]
                   overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6
                        border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-800">
            {esEdicion ? 'Editar reactivo' : 'Nuevo reactivo'}
          </h2>
          <button onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700
                            rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Grid de campos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Código interno */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código interno *
              </label>
              <input
                className={`w-full border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           ${errors.codigo_interno ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="LAB-001"
                {...register('codigo_interno', { required: 'Requerido' })}
              />
              {errors.codigo_interno && (
                <p className="text-red-500 text-xs mt-1">{errors.codigo_interno.message}</p>
              )}
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                className={`w-full border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           ${errors.nombre ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="Ácido Clorhídrico"
                {...register('nombre', { required: 'Requerido' })}
              />
              {errors.nombre && (
                <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CAS</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="7647-01-0" {...register('cas')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fórmula molecular</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="HCl" {...register('formula_molecular')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Concentración</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="37%" {...register('concentracion')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Merck" {...register('marca')} />
            </div>

            {/* Cantidad y unidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad inicial *
              </label>
              <input type="number" step="any"
                className={`w-full border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           ${errors.cantidad_inicial ? 'border-red-400' : 'border-gray-300'}`}
                {...register('cantidad_inicial', {
                  required: 'Requerido',
                  valueAsNumber: true,
                  min: { value: 0.001, message: 'Debe ser mayor a 0' }
                })}
              />
              {errors.cantidad_inicial && (
                <p className="text-red-500 text-xs mt-1">{errors.cantidad_inicial.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidad de medida *
              </label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                {...register('unidad_medida', { required: true })}>
                <option value="L">L (Litros)</option>
                <option value="mL">mL (Mililitros)</option>
                <option value="g">g (Gramos)</option>
                <option value="kg">kg (Kilogramos)</option>
                <option value="mg">mg (Miligramos)</option>
                <option value="µg">µg (Microgramos)</option>
                <option value="µL">µL (Microlitros)</option>
                <option value="unidad">Unidad</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                {...register('estado')}>
                <option value="en_inventario">En inventario</option>
                <option value="en_uso">En uso</option>
                <option value="en_compra">En proceso de compra</option>
                <option value="agotado">Agotado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de residuo</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                {...register('tipo_residuo')}>
                <option value="">Sin clasificar</option>
                <option value="acido">Ácido</option>
                <option value="base">Base</option>
                <option value="halogenado">Halogenado</option>
                <option value="organico">Orgánico</option>
                <option value="inorganico">Inorgánico</option>
                <option value="especial">Especial</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número UN</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="UN1789" {...register('numero_un')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lote</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('lote')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha vencimiento</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('fecha_vencimiento')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
              <input type="number" step="any" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="85000" {...register('precio')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Estante A - Nivel 2" {...register('ubicacion')} />
            </div>

          </div>

          {/* Campos de texto largo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Almacenamiento</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Condiciones especiales de almacenamiento..."
              {...register('almacenamiento')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sinónimos</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ácido muriático, Clorhídrico..." {...register('sinonimos')} />
          </div>

          {/* Pictogramas GHS */}
          {pictogramas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pictogramas GHS
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {pictogramas.map(p => {
                  const estaSeleccionado = reactivo?.pictogramas
                    ?.some(rp => rp.id === p.id);
                  return (
                    <label key={p.id}
                      className="flex flex-col items-center cursor-pointer
                                      border border-gray-200 rounded-lg p-2
                                      hover:bg-orange-50 hover:border-orange-300
                                      transition-colors has-[:checked]:bg-orange-50
                                      has-[:checked]:border-orange-400">
                      <input
                        type="checkbox"
                        name="pictograma_ids"
                        value={p.id}
                        defaultChecked={estaSeleccionado}
                        className="sr-only"
                      />
                      <span className="text-xl">⚠️</span>
                      <span className="text-xs text-center text-gray-600 mt-1 leading-tight">
                        {p.nombre}
                      </span>
                      <span className="text-xs text-gray-400">{p.codigo_ghs}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ficha de seguridad PDF */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ficha de seguridad (PDF)
              <span className="text-gray-400 font-normal ml-1">(opcional)</span>
            </label>
            {reactivo?.ficha_seguridad_url && (
              <p className="text-xs text-blue-600 mb-2">
                Ya tiene ficha adjunta — sube un nuevo PDF para reemplazarla
              </p>
            )}
            <input
              type="file"
              accept="application/pdf"
              className="w-full text-sm text-gray-500 border border-gray-300
                         rounded-lg px-3 py-2 file:mr-3 file:py-1 file:px-3
                         file:rounded file:border-0 file:text-xs
                         file:bg-blue-50 file:text-blue-700
                         hover:file:bg-blue-100"
              {...register('ficha_seguridad')}
            />
          </div>

          {/* Es controlado */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded"
              {...register('es_controlado')}
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                Reactivo controlado SICOQ
              </span>
              <p className="text-xs text-gray-400">
                Activa el seguimiento de consumo para auditorías SICOQ
              </p>
            </div>
          </label>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCerrar}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300
                               rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={enviando}
              className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700
                               disabled:bg-blue-400 text-white font-medium
                               rounded-lg transition-colors flex items-center gap-2">
              {enviando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent
                                  rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (esEdicion ? 'Guardar cambios' : 'Crear reactivo')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────
export default function Reactivos() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'admin';
  const puedeEditar = ['admin', 'analista'].includes(usuario?.rol);

  const [reactivos, setReactivos] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [pictogramas, setPictogramas] = useState([]);

  // Control de modales
  const [modalDetalle, setModalDetalle] = useState(null); // reactivo seleccionado
  const [modalFormulario, setModalFormulario] = useState(null); // null | 'nuevo' | reactivo
  const [confirmarElim, setConfirmarElim] = useState(null); // id a eliminar

  const LIMITE = 10;

  // Cargar pictogramas una sola vez al montar
  useEffect(() => {
    api.get('/pictogramas').then(r => setPictogramas(r.data)).catch(console.error);
  }, []);

  const cargarReactivos = useCallback(async () => {
    try {
      setCargando(true);
      const data = await reactivoService.listar({
        pagina, limite: LIMITE,
        busqueda: busqueda || undefined,
        estado: filtroEstado || undefined,
      });
      setReactivos(data.datos);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, [pagina, busqueda, filtroEstado]);

  useEffect(() => { cargarReactivos(); }, [cargarReactivos]);

  // Abrir detalle completo del reactivo
  const abrirDetalle = async (id) => {
    try {
      const data = await reactivoService.obtener(id);
      setModalDetalle(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGuardado = () => {
    setModalFormulario(null);
    setModalDetalle(null);
    cargarReactivos();
  };

  const handleEliminar = async (id) => {
    try {
      await reactivoService.eliminar(id);
      setConfirmarElim(null);
      setModalDetalle(null);
      cargarReactivos();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const totalPaginas = Math.ceil(total / LIMITE);

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Inventario de reactivos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} reactivos registrados</p>
        </div>
        {puedeEditar && (
          <AccentButton onClick={() => setModalFormulario('nuevo')}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              add
            </span>
            Nuevo reactivo
          </AccentButton>
        )}
      </div>

      {/* Filtros */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        padding: '32px', borderRadius: '12px',
        background: 'rgba(222,233,248,0.45)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
        className="sm:flex-row">
        <input type="text" placeholder="Buscar por nombre, CAS, código..."
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
        <select value={filtroEstado}
          onChange={e => { setFiltroEstado(e.target.value); setPagina(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Todos los estados</option>
          <option value="en_uso">En uso</option>
          <option value="en_inventario">En inventario</option>
          <option value="agotado">Agotado</option>
          <option value="en_compra">En compra</option>
        </select>
      </div>

      {/* Tabla */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        padding: '32px', borderRadius: '12px',
        background: 'rgba(222,233,248,0.45)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.25)',
      }}>
        {cargando ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent
                            rounded-full animate-spin" />
          </div>
        ) : reactivos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🧬</p>
            <p className="font-medium">No se encontraron reactivos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Código', 'Nombre', 'CAS', 'Cantidad', 'Estado', 'Vence', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium
                                          text-gray-500 uppercase tracking-wider
                                          whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reactivos.map(r => (
                  <tr key={r.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => abrirDetalle(r.id)}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {r.codigo_interno}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{r.nombre}</p>
                      {r.marca && <p className="text-xs text-gray-400">{r.marca}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.cas || '—'}</td>
                    <td className="px-4 py-3">
                      {r.cantidad_actual != null
                        ? `${r.cantidad_actual} ${r.unidad_medida}` : '—'}
                    </td>
                    <td className="px-4 py-3"><BadgeEstado estado={r.estado} /></td>
                    <td className="px-4 py-3 text-gray-500">
                      {r.fecha_vencimiento
                        ? new Date(r.fecha_vencimiento).toLocaleDateString('es-CO')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-blue-500 text-xs hover:underline">
                        Ver detalle →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3
                          border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Página {pagina} de {totalPaginas} — {total} resultados
            </p>
            <div className="flex gap-2">
              <button disabled={pagina === 1}
                onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1.5 text-xs border border-gray-300
                                 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                ← Anterior
              </button>
              <button disabled={pagina === totalPaginas}
                onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1.5 text-xs border border-gray-300
                                 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal detalle */}
      {modalDetalle && (
        <ModalDetalle
          reactivo={modalDetalle}
          esAdmin={esAdmin}
          onCerrar={() => setModalDetalle(null)}
          onEditar={() => { setModalFormulario(modalDetalle); setModalDetalle(null); }}
          onEliminar={() => setConfirmarElim(modalDetalle.id)}
        />
      )}

      {/* Modal formulario crear/editar */}
      {modalFormulario && (
        <ModalFormulario
          reactivo={modalFormulario === 'nuevo' ? null : modalFormulario}
          pictogramas={pictogramas}
          onCerrar={() => setModalFormulario(null)}
          onGuardado={handleGuardado}
        />
      )}

      {/* Confirmación de eliminación */}
      {confirmarElim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50
                        flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              ¿Eliminar reactivo?
            </h3>
            <p className="text-gray-500 text-sm mb-5">
              Esta acción no se puede deshacer. El reactivo y su ficha
              de seguridad serán eliminados permanentemente.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmarElim(null)}
                className="px-4 py-2 text-sm border border-gray-300
                                 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => handleEliminar(confirmarElim)}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700
                                 text-white rounded-lg">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}