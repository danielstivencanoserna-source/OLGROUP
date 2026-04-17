// services/authService.js
//
// Cada service encapsula las llamadas a la API de un módulo específico.
// Las páginas y componentes llaman a estos services — nunca llaman
// a Axios directamente. Esto significa que si cambia la URL de la API,
// solo hay que cambiar UN archivo, no buscar en todo el proyecto.

import api from './api';

const authService = {

  // Iniciar sesión — retorna accessToken y datos del usuario
  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  // Registrar un nuevo usuario
  registro: async (datos) => {
    const { data } = await api.post('/auth/registro', datos);
    return data;
  },

  // Cerrar sesión — limpia la cookie del refresh token en el servidor
  logout: async () => {
    await api.post('/auth/logout');
  },

  // Obtener los datos del usuario actual (útil para verificar la sesión)
  me: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },
};

export default authService;