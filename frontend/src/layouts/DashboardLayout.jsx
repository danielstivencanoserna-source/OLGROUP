// layouts/DashboardLayout.jsx
// Sidebar con el estilo OL Group: fondo oscuro primario, acento teal,
// tipografía Manrope, iconos Material Symbols.

import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const menuItems = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/reactivos', label: 'Reactivos', icon: 'science' },
  {
    to: '/sicoq', label: 'SICOQ', icon: 'gavel',
    roles: ['admin', 'analista']
  },
  {
    to: '/preparaciones', label: 'Soluciones', icon: 'fluid_balance',
    roles: ['admin', 'analista']
  },
];

export default function DashboardLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuFiltrado = menuItems.filter(item =>
    !item.roles || item.roles.includes(usuario?.rol)
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Iniciales del usuario para el avatar
  const initials = usuario?.nombre
    ?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <div className="flex h-screen bg-lab-bg overflow-hidden">

      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-primary/60 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ───────────────────────────────────────────────── */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 w-64
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: 'linear-gradient(180deg, #05101a 0%, #0d1c29 100%)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5
                        border-b border-white/10">
          <div className="w-8 h-8 rounded-lg flex items-center
                          justify-center text-base"
            style={{
              background: 'rgba(65,210,201,0.15)',
              border: '1px solid rgba(65,210,201,0.3)'
            }}>
            🧪
          </div>
          <div>
            <p className="font-display font-black text-white text-sm leading-tight">
             Olgroup
            </p>
            <p className="text-accent text-[10px] font-bold uppercase tracking-widest">
              v1.0
            </p>
          </div>
        </div>

        {/* Label de sección */}
        <div className="px-6 pt-5 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest
                        text-white/30">
            Módulos
          </p>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {menuFiltrado.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl
                transition-all duration-200 text-sm font-semibold
                ${isActive
                  ? 'text-primary'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                }
              `}
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(135deg, #41D2C9 0%, #00897b 100%)',
                boxShadow: '0 4px 16px rgba(65,210,201,0.3)',
              } : {}}
            >
              <span className={`material-symbols-outlined text-[18px]`}>
                {item.icon}
              </span>
              <span className="font-display">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Separador y estado del sistema */}
        <div className="mx-4 my-3 p-3 rounded-xl"
          style={{
            background: 'rgba(65,210,201,0.08)',
            border: '1px solid rgba(65,210,201,0.15)'
          }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent"
              style={{ animation: 'pulse-teal 2s ease infinite' }} />
            <p className="text-accent text-[10px] font-bold uppercase tracking-wider">
              Compliance Active
            </p>
          </div>
        </div>

        {/* Usuario */}
        <div className="px-4 pb-5 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center
                            font-display font-black text-sm text-primary flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #41D2C9, #00897b)' }}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate font-display">
                {usuario?.nombre}
              </p>
              <p className="text-accent text-[10px] font-bold uppercase capitalize">
                {usuario?.rol}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-white/40
                       hover:text-red-400 transition-colors text-xs
                       font-medium px-1 py-1"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── CONTENIDO PRINCIPAL ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-4
                           border-b border-lab-border-soft bg-lab-surface
                           flex-shrink-0"
          style={{ boxShadow: '0 1px 0 rgba(5,16,26,0.06)' }}>
          {/* Hamburguesa móvil */}
          <button
            className="lg:hidden text-lab-muted hover:text-primary"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="flex-1" />

          {/* Estado de sistema */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5
                          rounded-full"
            style={{
              background: 'rgba(65,210,201,0.1)',
              border: '1px solid rgba(65,210,201,0.2)'
            }}>
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-[10px] font-bold uppercase tracking-wider
                             text-accent">
              Sistema activo
            </span>
          </div>

          {/* Rol */}
          <div className="px-3 py-1.5 rounded-full bg-lab-low
                          border border-lab-border-soft">
            <span className="text-[11px] font-bold uppercase tracking-wider
                             text-primary-soft capitalize">
              {usuario?.rol}
            </span>
          </div>
        </header>

        {/* Área de contenido */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — móvil */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around
                      items-center px-4 pb-4 pt-2 lg:hidden border-t
                      border-lab-border-soft"
        style={{
          background: 'rgba(247,249,255,0.9)',
          backdropFilter: 'blur(16px)',
        }}>
        {menuFiltrado.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}
            className={({ isActive }) => `
                     flex flex-col items-center gap-0.5
                     ${isActive ? 'text-primary' : 'text-lab-outline'}
                   `}>
            {({ isActive }) => (
              <div className={`flex flex-col items-center gap-0.5 px-3 py-1
                               rounded-xl transition-all
                               ${isActive ? '' : ''}`}
                style={isActive ? {
                  background: 'rgba(65,210,201,0.12)',
                } : {}}>
                <span className={`material-symbols-outlined text-[22px]
                                  ${isActive ? 'text-accent' : ''}`}>
                  {item.icon}
                </span>
                <span className="font-display text-[9px] font-bold uppercase
                                 tracking-wider">
                  {item.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}