# Colabora — Chat en Tiempo Real entre Expositores y Administradores

## 1. Objetivo

Implementar un módulo de mensajería en tiempo real dentro de IventIA que permita a los usuarios del **Portal de Expositores** comunicarse directamente con los **Administradores de IventIA Core**, inspirado en la experiencia de Slack pero adaptado al contexto de la industria de eventos y exposiciones.

---

## 2. Análisis de Slack — Funcionalidades Relevantes

| Funcionalidad Slack | Relevancia para IventIA | Incluir |
|---|---|---|
| Canales por equipo/proyecto | Conversaciones por Evento | ✅ |
| Mensajes directos | Expositor → Administrador | ✅ |
| Historial de mensajes | Consultar conversaciones anteriores | ✅ |
| Hilos de respuesta (Threads) | Responder en contexto | ✅ |
| Notificaciones en tiempo real | Badge + alerta de nuevo mensaje | ✅ |
| Indicador de leído/no leído | Saber si el mensaje fue visto | ✅ |
| Compartir archivos | Adjuntar PDFs, imágenes, documentos | ✅ |
| Indicador de escritura (typing) | "Admin está escribiendo..." | ✅ |
| Búsqueda de mensajes | Buscar en el historial | 🔜 Fase 2 |
| Reacciones con emoji | No aplica en este contexto | ❌ |
| Videollamadas (Huddles) | No aplica en MVP | ❌ |
| IA para resúmenes | Posible en versión futura | 🔜 Fase 3 |

---

## 3. Arquitectura Propuesta

### 3.1 Modelo de Conversaciones

Las conversaciones se organizan de dos formas:

```
Tipo A — Por Evento
  Cada evento tiene su propio canal de comunicación.
  El expositor asociado al evento puede escribir ahí.
  Todos los admins con acceso al evento pueden ver y responder.

Tipo B — General
  Canal general entre un expositor y el equipo admin.
  No está atado a un evento específico.
```

### 3.2 Stack Técnico

```
Backend (API - apps/api):
  - WebSockets via socket.io
  - Mensajes persistidos en PostgreSQL (Prisma)
  - Notificaciones en tiempo real via socket.io rooms

Frontend Admin (apps/admin):
  - Panel de chat en sidebar o ventana flotante
  - Lista de conversaciones activas
  - Vista de mensajes con scroll infinito

Frontend Portal (apps/portal):
  - Botón/icono de chat siempre visible
  - Ventana de chat flotante o página dedicada
  - Indicador de mensajes no leídos
```

---

## 4. Modelo de Datos (Prisma)

```prisma
model Conversation {
  id          String    @id @default(cuid())
  tenantId    String
  eventId     String?   // null = conversación general
  portalUserId String
  subject     String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  event       Event?    @relation(fields: [eventId], references: [id])
  portalUser  PortalUser @relation(fields: [portalUserId], references: [id])
  messages    Message[]

  @@map("conversations")
}

model Message {
  id              String       @id @default(cuid())
  conversationId  String
  senderType      SenderType   // ADMIN | PORTAL_USER
  senderId        String       // userId or portalUserId
  senderName      String
  content         String
  fileUrl         String?
  fileName        String?
  readAt          DateTime?
  createdAt       DateTime     @default(now())

  conversation    Conversation @relation(fields: [conversationId], references: [id])

  @@map("messages")
}

enum SenderType {
  ADMIN
  PORTAL_USER
}
```

---

## 5. Endpoints API

```
# Conversaciones
GET    /api/v1/conversations              → Listar todas (admin)
GET    /api/v1/portal/conversations       → Listar las del expositor (portal)
POST   /api/v1/conversations              → Crear nueva conversación
GET    /api/v1/conversations/:id          → Obtener conversación + mensajes
PATCH  /api/v1/conversations/:id/read     → Marcar como leída

# Mensajes
POST   /api/v1/conversations/:id/messages → Enviar mensaje (texto o archivo)

# WebSocket events (socket.io)
join_conversation  → Unirse a sala
new_message        → Mensaje nuevo en tiempo real
typing             → "Usuario está escribiendo..."
message_read       → Confirmación de lectura
```

---

## 6. Experiencia de Usuario

### Portal de Expositores

1. Ícono de chat flotante en la esquina inferior derecha (con badge de mensajes no leídos)
2. Al hacer clic → ventana de chat con lista de conversaciones
3. El expositor puede iniciar una conversación general o una vinculada a un evento específico
4. Indicador visual cuando el admin está escribiendo
5. Historial completo de mensajes previos
6. Posibilidad de adjuntar un archivo (PDF, imagen)

### IventIA Core (Admin)

1. Ícono de chat en el header con badge de mensajes no leídos
2. Panel lateral o página dedicada `/chat`
3. Lista de todas las conversaciones abiertas, ordenadas por actividad reciente
4. Vista de conversación individual con scroll hacia arriba para ver historial
5. Posibilidad de responder y adjuntar archivos
6. Filtro: ver conversaciones por evento o por expositor

---

## 7. Fases de Implementación

### Fase 1 — MVP (Mensajería Básica)
- [ ] Migraciones de base de datos (Conversation + Message)
- [ ] Endpoints REST para crear conversaciones y enviar mensajes
- [ ] Integración de socket.io en el backend
- [ ] UI de chat en el Portal (ventana flotante)
- [ ] UI de chat en Admin (panel de conversaciones)
- [ ] Notificación en tiempo real de nuevo mensaje
- [ ] Indicador de mensajes no leídos (badge)

### Fase 2 — Mejoras
- [ ] Adjuntar archivos
- [ ] Indicador de escritura (typing indicator)
- [ ] Marcar como leído automáticamente al abrir
- [ ] Notificaciones push (browser notifications)
- [ ] Buscar en historial de mensajes

### Fase 3 — Avanzado
- [ ] Resumen automático de conversación con IA
- [ ] Respuestas sugeridas para el admin
- [ ] Integración con eventos y órdenes (vincular mensaje a una orden específica)

---

## 8. Dependencias a Instalar

```bash
# Backend
pnpm add socket.io          # WebSockets
pnpm add socket.io-adapter-redis  # Escalar horizontalmente con Redis (ya tenemos ioredis)

# Frontend (admin + portal)
pnpm add socket.io-client
```

---

## 9. Consideraciones de Seguridad

- Los WebSocket se autentican con el mismo JWT del login
- Un expositor solo puede ver SUS conversaciones (filtro por portalUserId)
- Un admin puede ver todas las conversaciones del tenant
- Los archivos adjuntos pasan por el mismo sistema de uploads existente

---

## 10. Notas

- La infraestructura de Redis ya está disponible en el proyecto (ioredis, bullmq)
- El sistema de uploads (multer) ya existe y puede reutilizarse para archivos adjuntos
- La autenticación JWT ya está implementada en ambas apps
