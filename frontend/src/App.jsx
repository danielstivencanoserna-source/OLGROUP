// App.jsx
//
// Este es el componente raíz de la aplicación.
// Define las rutas disponibles y quién puede acceder a cada una.
//
// Hay dos tipos de rutas:
//   - Públicas: cualquiera puede acceder (Login)
//   - Privadas: solo usuarios autenticados (Dashboard, Reactivos, SICOQ)
//
// PrivateRoute es un componente guardián: si no hay sesión,
// redirige al login automáticamente.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Páginas
import Login from './pages/auth/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/dashboard/Dashboard';
import Reactivos from './pages/reactivos/Reactivos';
import Sicoq from './pages/sicoq/Sicoq';
import Preparaciones from './pages/preparaciones/Preparaciones';

// ── Componente guardián de rutas privadas ──────────────────────
// Si el usuario no está autenticado, redirige a /login
// Si está cargando (verificando sesión), muestra un spinner
// Si está autenticado, muestra el contenido solicitado
function PrivateRoute({ children }) {
  const { estaAutenticado, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent
                          rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Navigate reemplaza la URL actual sin agregar al historial del navegador
  return estaAutenticado ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    // AuthProvider envuelve TODA la app para que cualquier componente
    // pueda acceder al contexto de autenticación
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />

          {/* Rutas privadas — todas usan el DashboardLayout */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            {/* Rutas hijas — se renderizan dentro del DashboardLayout */}
            <Route index element={<Dashboard />} />
            <Route path="reactivos" element={<Reactivos />} />
            <Route path="sicoq" element={<Sicoq />} />
            <Route path="preparaciones" element={<Preparaciones />} />
          </Route>
          

          {/* Cualquier ruta desconocida → inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />


        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;