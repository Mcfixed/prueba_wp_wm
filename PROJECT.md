# Proyecto: Plataforma Multi-Sesión WhatsApp basada en Baileys

Actúa como un arquitecto senior de software, experto en Node.js, React, PostgreSQL, Docker, WebSockets, sistemas de mensajería y WhatsApp Web utilizando Baileys.

Quiero desarrollar una plataforma SaaS autohospedada similar a OpenWA, WPPConnect Server o Evolution API, enfocada en la administración de múltiples sesiones de WhatsApp.
Admin:    admin@whatsappmanager.com / admin123
Operator: operator@whatsappmanager.com / operator123
Viewer:   viewer@whatsappmanager.com / viewer123
## Stack Tecnológico Obligatorio

### Backend

* Node.js (última versión LTS)
* Express o Fastify
* Baileys como librería principal para WhatsApp
* PostgreSQL
* Prisma ORM
* Redis para caché y colas
* WebSockets (Socket.io)
* JWT Authentication
* Docker
* Docker Compose

### Frontend

* React
* Vite
* Tailwind CSS v4
* TanStack Query
* React Router
* Zustand para estado global
* Recharts para gráficos
* Diseño moderno estilo SaaS

### Infraestructura

* Docker Compose completo
* PostgreSQL
* Redis
* Backend API
* Frontend
* Sistema preparado para Kubernetes en el futuro

---

# Objetivo General

Crear una plataforma centralizada que permita administrar múltiples sesiones de WhatsApp desde una interfaz web.

Cada sesión debe ser independiente.

Debe permitir:

* Crear sesión
* Eliminar sesión
* Reiniciar sesión
* Reconectar sesión
* Escanear QR
* Ver estado
* Ver historial
* Configurar alertas
* Configurar webhooks

---

# Arquitectura

Generar:

* Arquitectura completa
* Estructura de carpetas
* Diagrama de módulos
* Diagrama entidad-relación
* Flujo de eventos
* Flujo de autenticación
* Flujo de conexión Baileys

Aplicar principios:

* SOLID
* Clean Architecture
* Repository Pattern
* Service Layer
* Event Driven Architecture

---

# Gestión de Sesiones WhatsApp

Cada sesión debe almacenar:

* ID
* Nombre
* Descripción
* Estado
* Fecha creación
* Fecha última conexión
* Fecha última actividad

Estados posibles:

* CREATED
* WAITING_QR
* CONNECTING
* CONNECTED
* DISCONNECTED
* RECONNECTING
* LOGGED_OUT
* ERROR

Cada sesión debe soportar:

* QR dinámico
* Reconexión automática
* Reintentos configurables
* Persistencia de credenciales
* Recuperación tras reinicio del servidor

---

# Eventos WhatsApp

Capturar todos los eventos relevantes de Baileys:

* connection.update
* creds.update
* messages.upsert
* messages.update
* messages.delete
* chats.update
* contacts.update
* presence.update
* groups.update

Registrar cada evento en la base de datos.

---

# Sistema de Alertas

Crear un módulo completo de alertas.

Permitir configurar reglas por sesión.

Ejemplos:

* Sesión desconectada
* Sesión conectada
* Error de autenticación
* QR generado
* QR expirado
* Mensaje recibido
* Mensaje fallido
* Reintentos agotados

Cada alerta debe poder enviarse mediante:

* Webhook HTTP
* Correo electrónico
* Socket.io
* Registro interno

---

# Integración con Node-RED

Diseñar un módulo específico para Node-RED.

Objetivo:

Permitir que Node-RED reciba eventos del sistema.

Implementar:

POST /webhooks/session-events

Payload ejemplo:

{
"sessionId": "123",
"sessionName": "Sucursal Norte",
"event": "SESSION_DISCONNECTED",
"timestamp": "2026-06-20T12:00:00Z",
"details": {
"reason": "connection_lost"
}
}

Crear documentación completa para Node-RED:

* Configuración del nodo HTTP In
* Ejemplos de flujos
* Ejemplos de alertas
* Integración con Telegram
* Integración con Email
* Integración con MQTT

Generar ejemplos JSON importables en Node-RED.

---

# Sistema de Correos

Permitir configurar SMTP.

Campos:

* Host
* Puerto
* SSL
* Usuario
* Contraseña

Permitir definir destinatarios.

Ejemplo:

Alerta:
SESSION_DISCONNECTED

Enviar a:

* [soporte@empresa.com](mailto:soporte@empresa.com)
* [operaciones@empresa.com](mailto:operaciones@empresa.com)

Plantillas HTML para:

* Conexión exitosa
* Desconexión
* Error
* QR generado

---

# Dashboard

Crear dashboard moderno estilo SaaS.

Secciones:

## Dashboard Principal

Mostrar:

* Total sesiones
* Sesiones conectadas
* Sesiones desconectadas
* Mensajes enviados hoy
* Mensajes recibidos hoy
* Eventos recientes

---

## Gestión de Sesiones

Tabla con:

* Nombre
* Estado
* Última actividad
* Fecha conexión
* Acciones

Acciones:

* Abrir
* Reiniciar
* Eliminar
* Ver QR
* Ver logs

---

## Centro de Alertas

Visualización de:

* Alertas activas
* Alertas históricas
* Configuración de reglas
* Destinatarios

---

## Logs

Visualización filtrable por:

* Fecha
* Sesión
* Tipo evento
* Severidad

---

## Configuración SMTP

Gestión completa.

---

## Configuración de Webhooks

Gestión completa.

---

# API REST

Crear documentación Swagger/OpenAPI.

Endpoints:

## Auth

POST /auth/login
POST /auth/logout
POST /auth/refresh

## Sessions

GET /sessions
POST /sessions
GET /sessions/:id
PUT /sessions/:id
DELETE /sessions/:id

POST /sessions/:id/connect
POST /sessions/:id/disconnect
POST /sessions/:id/restart

## Alerts

GET /alerts
POST /alerts

## Webhooks

GET /webhooks
POST /webhooks

## Logs

GET /logs

---

# Seguridad

Implementar:

* JWT
* Refresh Tokens
* Rate Limiting
* Helmet
* CORS
* Auditoría
* Registro de acciones
* Encriptación de credenciales sensibles

---

# Base de Datos

Generar:

* Esquema PostgreSQL completo
* Migraciones Prisma
* Seeders iniciales

Tablas mínimas:

users
roles
permissions
sessions
session_credentials
events
alerts
alert_rules
email_configs
webhook_configs
logs
audit_logs

Generar relaciones correctamente.

---

# Funcionalidades Avanzadas

Agregar:

* Multiusuario
* Roles y permisos
* Dashboard en tiempo real
* Estadísticas
* Exportación CSV
* Exportación Excel
* API Keys
* Monitoreo de salud del sistema
* Health Checks
* Métricas Prometheus
* Logs estructurados
* Sistema de backups
* Dark Mode
* Multi idioma

---

# Escalabilidad

Diseñar para soportar:

* 1.000 sesiones simultáneas
* Balanceo futuro
* Workers independientes
* Procesamiento asíncrono
* Redis Queue

---

# Entregables Esperados

Generar paso a paso:

1. Arquitectura completa.
2. Estructura de carpetas.
3. Modelo de datos.
4. Prisma Schema.
5. Migraciones.
6. Seeders.
7. Backend completo.
8. Frontend completo.
9. Docker Compose.
10. Documentación.
11. Integración Node-RED.
12. Sistema de alertas.
13. Sistema de correos.
14. Webhooks.
15. Panel administrativo.

No simplificar la solución. Actuar como si se estuviera construyendo un producto comercial listo para producción.
