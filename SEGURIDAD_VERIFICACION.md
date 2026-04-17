# Verificación de Corrección de Vulnerabilidad de Token

## Cambios Realizados

### Frontend

#### AuthContext.jsx
- ✅ Agregado estado `accessToken` en memoria (no persiste en localStorage)
- ✅ Eliminado `localStorage.getItem('accessToken')` y `localStorage.getItem('usuario')` en verificarSesion
- ✅ Eliminado `localStorage.setItem()` en la función login
- ✅ Eliminado `localStorage.removeItem()` en la función logout
- ✅ Agregadas llamadas a `api.setAccessToken()` y `api.limpiarAccessToken()`

#### api.js (services/api.js)
- ✅ Removido acceso a `localStorage.getItem('accessToken')` en request interceptor
- ✅ Implementado sistema de token en memoria: `tokenEnMemoria` con métodos `setAccessToken()` y `limpiarAccessToken()`
- ✅ Actualizado response interceptor para usar `tokenEnMemoria` en lugar de `localStorage`
- ✅ Removido `localStorage.removeItem()` del catch block en refresh

### Backend (Verificado - No requería cambios)
- ✅ Cookies httpOnly bien configuradas para refresh token
- ✅ Secure flag configurado según NODE_ENV
- ✅ sameSite: 'strict' para protección CSRF
- ✅ Queries con parámetros preparados (no hay SQL injection)
- ✅ Endpoint /auth/me protegido con middleware de autenticación

## Pasos de Verificación

### 1. Verificar que localStorage no contiene tokens

**Prueba Manual en DevTools:**
1. Abrir Chrome DevTools (F12)
2. Navegar a Application > Local Storage
3. Hacer login en la aplicación
4. Confirmar que NO hay `accessToken` ni `usuario` en localStorage
5. Confirmar que hay una cookie `refreshToken` en Application > Cookies (con banderas httpOnly, secure, sameSite visible)

### 2. Verificar que las peticiones autenticadas funcionan

**Prueba:**
1. Hacer login correctamente
2. Navegar a una página que requiera autenticación (ej: Dashboard, Reactivos)
3. Confirmar que las peticiones llegan al backend con el header `Authorization: Bearer <token>`

**Verificación en DevTools:**
- Abrir Network
- Hacer cualquier petición autenticada
- Confirmar que en la pestaña "Headers" aparece `Authorization: Bearer <token>`

### 3. Verificar que el refresh token se usa correctamente

**Prueba:**
1. Hacer login
2. Esperar a que expire el access token (15 minutos, o ajustar env para pruebas)
3. Hacer una petición autenticada
4. Confirmar que:
   - El interceptor detecta el error 401 con code 'TOKEN_EXPIRED'
   - Se llama automáticamente a /auth/refresh
   - Se obtiene un nuevo access token
   - La petición original se reintenta y funciona
   - El usuario no ve redirección al login

**Verificación en Network:**
- POST /auth/refresh debe responder 200 con nuevo accessToken

### 4. Verificar que el logout limpia todo correctamente

**Prueba:**
1. Después de hacer login, hacer logout
2. Verificar que:
   - localStorage está vacío (No hay accessToken ni usuario)
   - La cookie refreshToken fue eliminada
   - El usuario es redirigido al login

**Verificación en DevTools:**
- Application > Local Storage: debe estar vacío
- Application > Cookies: refreshToken no debe existir (o estar vacío con Max-Age=0)

### 5. Verificar que recargar la página requiere login

**Prueba:**
1. Hacer login
2. Abrir el sitio en una pestaña nueva y verificar que pide login (porque accessToken no está persistido)
3. Confirmar que el usuario no puede acceder a rutas protegidas sin hacer login

**Comportamiento esperado:**
- Al recargar después de login, el usuario es redirigido al login
- El refresh token en la cookie permite una futura sesión si se implementa un endpoint de "revalidación" en el backend

## Consideraciones de Seguridad

### ✅ XSS Mitigado
- El token NO está en localStorage
- Un ataque XSS NO puede extraer el token (solo está en memoria de la sesión actual)
- Si hay XSS, el atacante solo tiene acceso al usuario actual, no a datos históricos

### ✅ CSRF Protegido
- El refresh token está en cookie httpOnly + sameSite: strict
- El access token no está persistido, requiere un login activo

### ⚠️ Nota sobre recargas
- Al recargar la página, el access token se pierde (esto es intencional y seguro)
- Si implementas un endpoint que permita renovación sin access token (ej: GET /auth/me usando solo refresh token en cookie), el usuario no perderá la sesión
- Por ahora, el usuario debe hacer login cada vez que recarga (trade-off seguridad-conveniencia)

## Implementación Alternativa: Sesión Persistente (Opcional)

Si deseas que el usuario NO perda la sesión al recargar, crea un endpoint `/auth/restore`:

```javascript
// backend/routes/auth.routes.js
router.post('/restore', AuthController.restore);

// backend/controllers/auth.controller.js
async restore(req, res) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const usuario = await UsuarioModel.findById(decoded.id);
    
    if (!usuario) {
      return res.status(401).json({ error: 'User not found' });
    }

    const nuevoAccessToken = generarAccessToken(usuario);
    res.json({
      accessToken: nuevoAccessToken,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}
```

Luego en `frontend/src/context/AuthContext.jsx`:

```javascript
useEffect(() => {
  const restaurarSesion = async () => {
    try {
      // Intentar restaurar sesión usando refresh token en cookie
      const { data } = await api.post('/auth/restore');
      setAccessToken(data.accessToken);
      setUsuario(data.usuario);
      api.setAccessToken(data.accessToken);
    } catch {
      // No hay sesión válida, usuario debe hacer login
    } finally {
      setCargando(false);
    }
  };

  restaurarSesion();
}, []);
```

## Resumen de Seguridad

| Aspecto | Anterior | Ahora | Mejoría |
|--------|----------|-------|--------|
| Token en localStorage | ❌ Vulnerable a XSS | ✅ En memoria | Alto |
| Refresh Token | ✅ En cookie httpOnly | ✅ En cookie httpOnly | Mantiene |
| Persistencia al recargar | ✅ Sí (pero insegura) | ⚠️ No (más segura pero menos conveniente) | Requiere decisión |
| Protección CSRF | ✅ sameSite + Referer | ✅ sameSite + Referer | Mantiene |
| SQL Injection | ✅ Parámetros preparados | ✅ Parámetros preparados | Mantiene |
