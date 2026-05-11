# SICOQ - Sistema de Gestión de Reactivos y Control de Sustancias

Este proyecto es una solución integral para laboratorios, diseñada para automatizar el inventario de reactivos químicos y cumplir con la normativa de control de sustancias (SICOQ).

## 1. Características Principales
* **Gestión de Inventario:** Registro detallado de reactivos (CAS, fórmula, concentración).
* **Control SICOQ:** Marcado y seguimiento de sustancias controladas.
* **Seguridad:** Almacenamiento y visualización de Fichas de Datos de Seguridad (MSDS) en PDF.
* **Pictogramas GHS:** Identificación visual de peligrosidad mediante UUIDs vinculados.

## 2. Stack Tecnológico
* **Backend:** Node.js con Express.
* **Base de Datos:** PostgreSQL (Relacional) para trazabilidad robusta.
* **Validación:** Joi para asegurar la integridad de los datos químicos.
* **Autenticación:** JWT (JSON Web Tokens) y Cookies HttpOnly.

## 3. Instalación y Configuración

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/danielstivencanoserna-source/proyecto-de-grado.git
   ```
2. Instalar dependencias:
   ```bash
   cd backend
   npm install
   ```
3. Crear un archivo `.env` basado en `.env.example` y configurar las credenciales.
4. Ejecutar el servidor:
   ```bash
   npm run dev
   ```
