# Integración Node-RED con WhatsApp Manager

## Descripción

Node-RED puede recibir eventos del sistema WhatsApp Manager a través del endpoint webhook `/api/v1/webhooks/session-events`.

## Configuración

### 1. HTTP In Node

Configura un nodo `http in` con:
- **Method:** POST
- **URL:** `/whatsapp-events`

### 2. Payload Recibido

```json
{
  "sessionId": "uuid-de-la-sesion",
  "sessionName": "Sucursal Norte",
  "event": "SESSION_DISCONNECTED",
  "timestamp": "2026-06-20T12:00:00Z",
  "details": {
    "reason": "connection_lost"
  }
}
```

### 3. Ejemplos de Flujo

Importa los archivos JSON en Node-RED (Menu → Import):

| Archivo | Descripción |
|---|---|
| `flow-example.json` | Recibir eventos de WhatsApp (desconexión, QR, etc.) |
| `send-with-apikey-flow.json` | **Enviar mensajes usando API Key** (recomendado) |
| `login-and-send-flow.json` | Enviar mensajes con login JWT (obsoleto) |

#### send-with-apikey-flow.json (recomendado)

Flujo más simple usando **API Key** en lugar de JWT:

```
[Inject] → [Configurar petición] → [HTTP POST a API] → [Debug]
```

### 4. Cómo conseguir la API Key

1. Inicia sesión en el Dashboard (`http://localhost:5173`)
2. Ve a **API Keys** en el menú lateral
3. Crea una nueva, asígnale un nombre (ej: "Node-RED")
4. **Copia la clave** (solo se muestra una vez). Empieza con `wm_...`
5. En el archivo `send-with-apikey-flow.json`, edita el nodo **"Configurar petición"** y pega la API Key donde dice `API_KEY`

La API Key no expira (a menos que le pongas fecha) y puedes desactivarla/eliminarla desde el Dashboard.

### 5. Variables de Entorno Requeridas

| Variable | Descripción |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram |
| `TELEGRAM_CHAT_ID` | ID del chat de Telegram |

#### sensor-mqtt-flow.json

Flujo para conectar un sensor MQTT a WhatsApp:

```
[MQTT Sensor] → [Evalúa umbral] → [Formatea mensaje] → [HTTP POST a API] → [Debug]
```

- Recibe de MQTT (topic configurable)
- Si el valor es ON/1 o supera 30°C → envía alerta por WhatsApp
- Si está OFF o dentro de rango → no envía nada

---

## Eventos Disponibles

| Evento | Descripción |
|---|---|
| `SESSION_CONNECTED` | Sesión conectada exitosamente |
| `SESSION_DISCONNECTED` | Sesión desconectada |
| `AUTH_ERROR` | Error de autenticación |
| `QR_GENERATED` | Nuevo código QR generado |
| `QR_EXPIRED` | QR expirado |
| `MESSAGE_RECEIVED` | Mensaje recibido |
| `MESSAGE_FAILED` | Mensaje fallido |
| `RETRIES_EXHAUSTED` | Reintentos de conexión agotados |

## Integración con MQTT

Para integrar con MQTT, agrega un nodo `mqtt out` después del router de eventos:

```json
{
  "id": "mqtt-out",
  "type": "mqtt out",
  "z": "flow1",
  "name": "WhatsApp MQTT",
  "topic": "whatsapp/events",
  "qos": "2",
  "broker": "localhost",
  "x": 600,
  "y": 500,
  "wires": []
}
```
