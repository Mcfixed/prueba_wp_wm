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
| `send-message-flow.json` | **Enviar mensajes** desde un Inject manual |
| `sensor-mqtt-flow.json` | Enviar alerta cuando un sensor MQTT se activa |

#### send-message-flow.json

- Enrutamiento por tipo de evento
- Envío de alertas a Telegram
- Envío de correos electrónicos
- Logging de eventos

### 4. Variables de Entorno Requeridas

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
