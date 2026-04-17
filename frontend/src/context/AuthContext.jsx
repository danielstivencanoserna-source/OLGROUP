// context/AuthContext.jsx
//
// El Context de React es un mecanismo para compartir datos entre componentes
// sin tener que pasar props manualmente por cada nivel del árbol.
//
// Imagínalo como una variable global pero controlada:
// cualquier componente puede leer el usuario actual o llamar a login/logout
// sin importar qué tan profundo esté en el árbol de componentes.
//
// Sin Context:  App → Layout → Sidebar → UserMenu (pasar usuario 3 niveles)
// Con Context:  UserMenu accede directamente sin que Layout ni Sidebar sepan

import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import api from '../services/api';

// 1. Crear el contexto — es como el "canal de comunicación"
const AuthContext = createContext(null);

// 2. Crear el Provider — es el componente que envuelve la app
//    y hace los datos disponibles para todos sus hijos
export function AuthProvider({ children }) {

  // Estado del usuario autenticado — null significa "no hay sesión"
  const [usuario, setUsuario] = useState(null);

  // Access token guardado en memoria (no en localStorage)
  // Se pierde al recargar la página, lo que es seguro
  const [accessToken, setAccessToken] = useState(null);

  // Estado de carga inicial — mientras verificamos la sesión guardada
  // mostramos un spinner en lugar de redirigir al login prematuramente
  const [cargando, setCargando] = useState(true);

  // ── Al cargar la app, intentar restaurar la sesión ─────────────
  // Intentamos llamar a /auth/me para ver si el refresh token
  // en la cookie sigue siendo válido.
  // Si funciona, el servidor nos devolverá el usuario y podemos revalidar.
  useEffect(() => {
    const verificarSesion = async () => {
      try {
        // Llamamos a /auth/me — este endpoint necesita accessToken
        // Pero como no tenemos uno en memoria, el backend debería permitir
        // que el cliente pida un refresh usando la cookie del refresh token.
        // Para eso, ajustaremos el endpoint o crearemos uno nuevo.
        // Por ahora, si no hay token en memoria, simplemente no verificamos.
        // El usuario tendrá que hacer login de nuevo después de recargar.
      } catch {
        // Si falla o no hay sesión guardada, es correcto — el usuario hace login
      }

      // Ya terminamos de verificar — podemos mostrar la app
      setCargando(false);
    };

    verificarSesion();
  }, []); // [] significa que solo se ejecuta una vez al montar el componente

  // ── Función login ───────────────────────────────────────────────
  // La llamamos desde la página Login.jsx cuando el usuario envía el form
  const login = async (email, password) => {
    // Llamamos al service — este llama a la API
    const data = await authService.login(email, password);

    // Guardamos el access token SOLO en memoria (estado React)
    // El refresh token viaja en la cookie httpOnly automáticamente
    setAccessToken(data.accessToken);
    api.setAccessToken(data.accessToken); // también en el servicio de api

    // Actualizamos el estado del usuario — esto hace que toda la app
    // sepa que hay un usuario autenticado
    setUsuario(data.usuario);

    return data.usuario;
  };

  // ── Función logout ──────────────────────────────────────────────
  const logout = async () => {
    try {
      // Le decimos al servidor que limpie la cookie del refresh token
      await authService.logout();
    } finally {
      // Aunque falle la petición, limpiamos el estado local
      // (no hay localStorage que limpiar)
      setAccessToken(null);
      setUsuario(null);
      api.limpiarAccessToken(); // limpiar también en el servicio de api
    }
  };

  // ── Valor del contexto ─────────────────────────────────────────
  // Esto es lo que todos los componentes pueden leer con useAuth()
  const valor = {
    usuario,    // objeto con id, nombre, email, rol — o null
    accessToken, // token JWT guardado en memoria — solo disponible mientras la sesión está activa
    cargando,   // true mientras verificamos la sesión inicial
    login,      // función para iniciar sesión
    logout,     // función para cerrar sesión
    estaAutenticado: !!usuario,  // true si hay usuario, false si es null
  };

  return (
    <AuthContext.Provider value={valor}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. Hook personalizado — para consumir el contexto de forma limpia
// En lugar de escribir useContext(AuthContext) en cada componente,
// escribimos simplemente useAuth()
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}