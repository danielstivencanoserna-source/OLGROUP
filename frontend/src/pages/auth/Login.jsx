// pages/auth/Login.jsx
// Página de login con el estilo OL Group Lab.
// Diseño dividido: panel izquierdo oscuro (branding) + panel derecho (formulario).
// Las animaciones de entrada escalonadas crean una primera impresión profesional.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';

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

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      await login(data.email, data.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo — Branding oscuro ────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{
          background: 'linear-gradient(160deg, #05101a 0%, #1a2530 60%, #0d2318 100%)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src="/src/assets/logo-transparente.png" alt="OL Group Lab Logo" className="w-8 h-8" />
          <span className="font-display font-black text-white text-xl tracking-tight">
            Olgroup
          </span>
        </div>

        {/* Texto central */}
        <div className="stagger-children">
          <h1
            className="font-display font-black leading-tight mb-6"
            style={{
              fontSize: 'clamp(2.5rem, 5.5vw, 4rem)',
              background: 'linear-gradient(135deg, #41D2C9 0%, #4DD0C1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 2px 8px rgba(65, 210, 201, 0.3)',
              filter: 'drop-shadow(0 2px 8px rgba(65, 210, 201, 0.2))'
            }}
          >
            Measurelab<br />
            <span style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              color: 'white',
              textShadow: 'none',
              filter: 'none'
            }}>Control total <span style={{ color: '#41D2C9' }}>de tu laboratorio</span></span>
          </h1>
          <p style={{ color: 'white' }} className="text-base leading-relaxed max-w-md">
            Gestiona reactivos, trazabilidad SICOQ y preparación de soluciones
            con precisión y cumplimiento regulatorio.
          </p>
        </div>

        {/* Módulos disponibles */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: 'science', label: 'Reactivos', desc: 'Inventario GHS' },
            { icon: 'gavel', label: 'SICOQ', desc: 'Trazabilidad' },
            { icon: 'fluid_balance', label: 'Soluciones', desc: 'Preparaciones' },
            { icon: 'analytics', label: 'Dashboard', desc: 'Métricas' },
          ].map(m => (
            <div key={m.label}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <span className="material-symbols-outlined text-accent text-lg">
                {m.icon}
              </span>
              <div>
                <p className="text-white text-xs font-bold font-display">{m.label}</p>
                <p className="text-[10px]" style={{ color: '#41D2C9' }}>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panel derecho — Formulario ────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center
                      p-8" style={{ background: T.bg }}>
        <div className="w-full max-w-md stagger-children">

          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <img src="/src/assets/logo-transparente.png" alt="OL Group Lab Logo" className="w-6 h-6" />
            <span className="font-display font-black text-lg" style={{ color: T.primary }}>
              Olgroup
            </span>
          </div>

          {/* Encabezado del form */}
          <div className="mb-8">
            <p style={{
              fontSize: '10px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: T.outline, fontFamily: 'Manrope, sans-serif',
              marginBottom: '8px',
            }}>Acceso al sistema</p>
            <h2 className="font-display font-extrabold text-3xl" style={{ color: T.primary }}>
              Iniciar sesión
            </h2>
            <p style={{ color: T.muted }} className="text-sm mt-2">
              Ingresa tus credenciales para acceder al panel de laboratorio
            </p>
          </div>

          {/* Error global */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl mb-6"
              style={{ background: '#ffdad6', border: '1px solid #ba1a1a33' }}>
              <span className="material-symbols-outlined text-red-700 text-lg">
                error
              </span>
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Email */}
            <div className="relative">
              <label style={{
                fontSize: '10px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: T.outline, fontFamily: 'Manrope, sans-serif',
                marginBottom: '12px',
              }} className="block">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2
                                 -translate-y-1/2" style={{ color: T.outline }}>
                  alternate_email
                </span>
                <input
                  type="email"
                  placeholder="analista@laboratorio.com"
                  style={{
                    width: '100%', padding: '14px 16px 14px 48px',
                    background: 'rgba(222,233,248,0.3)',
                    border: 'none',
                    borderBottom: `2px solid ${errors.email ? T.error : T.border}`,
                    outline: 'none', fontSize: '14px',
                    fontFamily: 'Inter, sans-serif', color: T.primary,
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderBottomColor = T.accent}
                  onBlur={e => e.target.style.borderBottomColor = errors.email ? T.error : T.border}
                  {...register('email', {
                    required: 'El email es requerido',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Email inválido',
                    },
                  })}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">error</span>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Contraseña */}
            <div className="relative">
              <label style={{
                fontSize: '10px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: T.outline, fontFamily: 'Manrope, sans-serif',
                marginBottom: '12px',
              }} className="block">Contraseña</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2
                                 -translate-y-1/2" style={{ color: T.outline }}>
                  lock
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '14px 16px 14px 48px',
                    background: 'rgba(222,233,248,0.3)',
                    border: 'none',
                    borderBottom: `2px solid ${errors.password ? T.error : T.border}`,
                    outline: 'none', fontSize: '14px',
                    fontFamily: 'Inter, sans-serif', color: T.primary,
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderBottomColor = T.accent}
                  onBlur={e => e.target.style.borderBottomColor = errors.password ? T.error : T.border}
                  {...register('password', { required: 'La contraseña es requerida' })}
                />
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">error</span>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '16px', borderRadius: '10px',
                background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentDim} 100%)`,
                border: 'none', color: T.primary,
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 700, fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(65,210,201,0.3)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                marginTop: '8px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(65,210,201,0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(65,210,201,0.3)';
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40
                                  border-t-white rounded-full animate-spin" />
                  Verificando acceso...
                </>
              ) : (
                <>
                  Acceder al sistema
                  <span className="material-symbols-outlined text-base">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs mt-8" style={{ color: T.outline }}>
            Measurelab v1.0 — Sistema de Gestión de Laboratorio
          </p>
        </div>
      </div>
    </div>
  );
}