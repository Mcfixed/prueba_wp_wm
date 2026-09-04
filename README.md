# WhatsApp Manager

Plataforma SaaS autohospedada para administración de múltiples sesiones de WhatsApp basada en Baileys.

## 🚀 Características

- **Multi-Sesión**: Administra cientos de sesiones WhatsApp simultáneas
- **QR Dinámico**: Conexión fácil mediante código QR
- **Reconexión Automática**: Reconexión inteligente con backoff exponencial
- **Alertas**: Sistema completo de notificaciones (Webhook, Email, Socket.io)
- **Webhooks**: Integración con servicios externos y Node-RED
- **Dashboard**: Estadísticas en tiempo real con gráficos
- **Multiusuario**: Roles y permisos (Admin, Operador, Visualizador)
- **API REST**: Documentación OpenAPI completa
- **Tiempo Real**: Actualizaciones vía WebSocket

## 🛠️ Stack Tecnológico

### Backend
- Node.js 22 + Express
- Baileys (WhatsApp Web)
- PostgreSQL + Prisma ORM
- Socket.io
- JWT + Refresh Tokens

### Frontend
- React 18 + Vite
- Tailwind CSS v4
- TanStack Query
- Zustand
- Recharts
- Socket.io Client

### Infraestructura
- Docker Compose
- GitHub Actions (CI/CD)
- Prometheus Metrics
- Nginx

## 📋 Prerequisitos

- Node.js 22+
- Docker & Docker Compose
- PostgreSQL 16

## 🔧 Instalación Rápida

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd whatsapp-manager

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 3. Iniciar con Docker
docker compose up -d

# 4. Ejecutar migraciones
npx prisma migrate dev --schema=apps/api/prisma/schema.prisma

# 5. Seed de datos iniciales
npx prisma db seed --schema=apps/api/prisma/schema.prisma
```

## 🖥️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Asegúrate de tener PostgreSQL corriendo en tu máquina
# y configura las credenciales en .env
cp .env.example .env
# Edita .env con los datos de tu PostgreSQL local

# Iniciar backend y frontend
npm run dev
```

## 🔑 Credenciales por Defecto

| Rol | Email | Contraseña |
|---|---|---|
| **Admin** | admin@whatsappmanager.com | admin123 |
| **Operador** | operator@whatsappmanager.com | operator123 |
| **Visualizador** | viewer@whatsappmanager.com | viewer123 |

## 📚 API Endpoints

### Autenticación
| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/v1/auth/login` | Iniciar sesión |
| POST | `/api/v1/auth/logout` | Cerrar sesión |
| POST | `/api/v1/auth/refresh` | Refrescar token |
| GET | `/api/v1/auth/me` | Perfil actual |

### Sesiones
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/v1/sessions` | Listar sesiones |
| POST | `/api/v1/sessions` | Crear sesión |
| GET | `/api/v1/sessions/:id` | Obtener sesión |
| PUT | `/api/v1/sessions/:id` | Actualizar sesión |
| DELETE | `/api/v1/sessions/:id` | Eliminar sesión |
| POST | `/api/v1/sessions/:id/connect` | Conectar sesión |
| POST | `/api/v1/sessions/:id/disconnect` | Desconectar sesión |
| POST | `/api/v1/sessions/:id/restart` | Reiniciar sesión |

### Alertas
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/v1/alerts` | Listar reglas |
| POST | `/api/v1/alerts` | Crear regla |
| PUT | `/api/v1/alerts/:id` | Actualizar regla |
| DELETE | `/api/v1/alerts/:id` | Eliminar regla |

### Webhooks
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/v1/webhooks/config` | Listar webhooks |
| POST | `/api/v1/webhooks/config` | Crear webhook |

### Node-RED
| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/v1/webhooks/session-events` | Eventos para Node-RED |

### Mensajes (entrega garantizada con outbox)
El envío **ya no bloquea**: al llamar a `/send` el mensaje se guarda en una cola
(outbox) y se responde `202` de inmediato. Un worker por sesión lo envía con
espaciado (anti-ráfaga) y **reintentos con backoff**; si la sesión está caída,
espera a que reconecte y lo envía entonces. Esto hace que los mensajes **no se
pierdan** aunque haya llamadas simultáneas de varios servicios o errores durante
el envío.

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/v1/messages` | Historial (outbox) paginado y filtrable: `page`, `limit`, `status` (coma = varios), `sessionId`, `q`, `from`/`to`. |
| GET | `/api/v1/messages/stats` | Contadores: `total`, `pending`, `processing`, `sent`, `delivered`, `failed`. |
| POST | `/api/v1/messages/:sessionId/send` | Encola un mensaje. Body: `{ to, text, type?, idempotencyKey? }`. Respuesta `202`: `{ success, messageId, status, queued }`. |
| GET | `/api/v1/messages/outbox/:messageId` | Estado real: `PENDING`/`PROCESSING`/`SENT`/`FAILED`, `attempts`, `lastError`, `waMessageId`, `deliveredAt`. |

> **Nota para integradores**: el `messageId` que devuelve `/send` es el **id del
> outbox** (no el id de WhatsApp). Consulta `GET /outbox/:id` para conocer el
> estado final y el `waMessageId`. Usa un `idempotencyKey` (única) para que los
> reintentos del lado del llamante no generen duplicados. `SENT` = escrito al
> socket de WhatsApp; `deliveredAt` se rellena cuando WhatsApp confirma la
> entrega (recibo). Un mensaje pasa a `FAILED` solo tras agotar los reintentos.

## 📊 Estados de Sesión

```
CREATED → WAITING_QR → CONNECTING → CONNECTED
                                      ↓
                                 DISCONNECTED → RECONNECTING → CONNECTED
                                      ↓
                                 LOGGED_OUT
                                      ↓
                                 ERROR
```

## 🔐 Seguridad

- JWT con Refresh Tokens rotativos
- Encriptación AES-256-GCM de credenciales WhatsApp
- Rate limiting por IP
- Helmet headers de seguridad
- CORS configurable
- Auditoría de acciones
- Roles y permisos

## 📦 Estructura del Proyecto

```
whatsapp-manager/
├── apps/
│   ├── api/                    # Backend API
│   │   ├── prisma/             # Schema y migraciones
│   │   ├── src/
│   │   │   ├── config/         # Configuración
│   │   │   ├── domain/         # Entidades de dominio
│   │   │   ├── application/    # Casos de uso
│   │   │   ├── infrastructure/ # Implementaciones
│   │   │   │   ├── baileys/    # WhatsApp engine
│   │   │   │   ├── auth/       # JWT
│   │   │   │   ├── alerts/     # Sistema de alertas
│   │   │   │   ├── email/      # SMTP
│   │   │   │   └── websocket/  # Tiempo real
│   │   │   └── presentation/   # API REST
│   │   └── workers/            # BullMQ workers
│   └── web/                    # Frontend React
├── docker/                     # Dockerfiles
├── node-red-examples/          # Ejemplos Node-RED
├── scripts/                    # Scripts útiles
└── packages/shared/            # Tipos compartidos
```

## 🤝 Integración Node-RED

El proyecto incluye ejemplos listos para importar en Node-RED:

- Flujo completo con enrutamiento por eventos
- Envío de alertas a Telegram
- Integración con Email
- Documentación en `node-red-examples/README.md`

## 📈 Monitoreo

- Health Check: `GET /health`
- Métricas Prometheus disponibles
- Logs estructurados con Pino
- Dashboard en tiempo real

## 📄 Licencia

MIT
