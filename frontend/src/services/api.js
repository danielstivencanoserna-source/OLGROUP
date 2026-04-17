// services/api.js
//
// Este archivo crea una instancia de Axios configurada para nuestro proyecto.
// En lugar de escribir la URL completa en cada petición, configuramos
// la baseURL aquí una sola vez.
//
// Lo más importante de este archivo son los INTERCEPTORS:
// Son funciones que se ejecutan automáticamente ANTES de cada petición
// (request interceptor) o DESPUÉS de cada respuesta (response interceptor).
//
// Esto nos permite:
//   - Agregar el token JWT a cada petición automáticamente
//   - Detectar cuando el token expiró (error 401) y renovarlo sin
//     que el usuario tenga que volver a hacer login

import axios from 'axios';

// Creamos una instancia con configuración base
// Así todas las peticiones del proyecto usan la misma configuración
const api = axios.create({
    baseURL: 'http://localhost:3001/api',  // apunta a nuestro backend Express
    withCredentials: true,  // necesario para enviar las cookies httpOnly
    // (el refresh token vive en una cookie)
});

// ── ALMACENAMIENTO SEGURO DE TOKEN ────────────────────────────────
// Token guardado SOLO en memoria (no en localStorage)
// Se pierde al recargar la página, lo que es intencional y seguro
let tokenEnMemoria = null;

// Métodos públicos para que AuthContext pueda actualizar el token
api.setAccessToken = (token) => {
    tokenEnMemoria = token;
};

api.limpiarAccessToken = () => {
    tokenEnMemoria = null;
};

// ── REQUEST INTERCEPTOR ──────────────────────────────────────────
// Se ejecuta ANTES de cada petición que hagamos con esta instancia.
// Su trabajo: agregar el token JWT al header Authorization.

api.interceptors.request.use(
    (config) => {
        // Obtenemos el token desde memoria (no localStorage)
        const token = tokenEnMemoria;

        if (token) {
            // Agregamos el token al header de la petición
            // El backend lee este header en el middleware autenticar
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config; // devolvemos la config modificada para que continúe
    },
    (error) => Promise.reject(error)
);

// ── RESPONSE INTERCEPTOR ─────────────────────────────────────────
// Se ejecuta DESPUÉS de cada respuesta del servidor.
// Su trabajo principal: detectar tokens expirados y renovarlos.

api.interceptors.response.use(
    // Si la respuesta es exitosa (2xx), simplemente la devolvemos
    (response) => response,

    // Si hay un error, lo analizamos
    async (error) => {
        const originalRequest = error.config;

        // ¿El error es 401 (no autorizado) y aún no hemos intentado renovar?
        // _retry es una bandera que ponemos en la petición original para
        // evitar un bucle infinito de renovaciones
        if (
            error.response?.status === 401 &&
            error.response?.data?.code === 'TOKEN_EXPIRED' &&
            !originalRequest._retry
        ) {
            originalRequest._retry = true; // marcamos que ya intentamos renovar

            try {
                // Pedimos un nuevo access token usando el refresh token
                // (el refresh token viaja automáticamente en la cookie httpOnly)
                const { data } = await api.post('/auth/refresh');

                // Guardamos el nuevo access token EN MEMORIA (no en localStorage)
                tokenEnMemoria = data.accessToken;

                // Actualizamos el header y reintentamos la petición original
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return api(originalRequest);

            } catch (refreshError) {
                // Si el refresh también falla, la sesión expiró completamente
                // Limpiamos todo y mandamos al usuario al login
                tokenEnMemoria = null;
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;