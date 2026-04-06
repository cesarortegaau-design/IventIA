# Booking Calendar — Calendario de Disponibilidad de Espacios (Admin)

## 1. Objetivo

Implementar un **Calendario de Reservas Gantt** en **IventIA Core (Admin)** que permita visualizar, de forma centralizada y cruzando todos los eventos, qué espacios y recursos están ocupados en qué fechas, detectar solapamientos y revisar la metadata completa de cada reserva con un hover interactivo.

La referencia visual es una vista tipo **Timeline / Gantt horizontal** donde:
- El eje **Y** (filas) representa los espacios/recursos disponibles.
- El eje **X** (columnas) representa los días del período seleccionado.
- Las **barras de color** representan reservas (órdenes con línea de servicio asociada a ese espacio), mostrando el nombre del cliente o evento.

---

## 2. Diferencia con el Calendario de Portal

| Característica | Portal (ya implementado) | Admin (este documento) |
|---|---|---|
| Scope de datos | Solo el evento del expositor | Todos los eventos del tenant |
| Reservas visibles | Órdenes del evento seleccionado | EventSpaces + Órdenes de todos los eventos |
| Solapamientos | No aplica (un solo evento) | Crítico — mostrar barras apiladas por espacio |
| Hover metadata | Nombre de cliente, N° orden | Evento completo, cliente, fechas, estado, fase |
| Filtros | Evento + mes | Tipo de recurso, evento, estado, rango de fechas |
| Fuente de datos | `Order.startDate / endDate` | `EventSpace` (setup/event/teardown) + `Order` |

---

## 3. Fuentes de Datos

### 3.1 EventSpace (fuente primaria para admin)

El modelo `EventSpace` ya existe y es la fuente más precisa de cuándo se usa un recurso en un evento:

```prisma
model EventSpace {
  id         String     @id @default(uuid())
  eventId    String
  resourceId String
  phase      EventPhase  // SETUP | EVENT | TEARDOWN
  startTime  DateTime
  endTime    DateTime
  notes      String?

  event    Event    @relation(...)
  resource Resource @relation(...)
}
```

```prisma
enum EventPhase {
  SETUP
  EVENT
  TEARDOWN
}
```

### 3.2 Order + OrderLineItem (fuente secundaria)

Cuando no hay `EventSpace` registrados, se usa `Order.startDate / endDate` con las líneas de servicio del pedido.

### 3.3 Resolución de prioridad

```
1. EventSpace → máxima precisión (fase a fase)
2. Order con startDate/endDate → nivel de orden
3. Event.eventStart / eventEnd → fallback si la orden no tiene fechas
```

---

## 4. Diseño Visual (basado en imagen de referencia)

### 4.1 Layout General

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  [Filtros: Tipo de recurso | Evento | Rango de fechas]    [Semana|Mes|2 Meses] ‹ › │
├────────────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────────┤
│                │ Lu  │ Ma  │ Mi  │ Ju  │ Vi  │ Sa  │ Do  │ Lu  │ ... │         │
│ Recurso / Espacio│  1  │  2  │  3  │  4  │  5  │  6  │  7  │  8  │     │         │
├────────────────┼─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────────┤
│ Sala Principal │     [══════ Expo Santa Fe 2025 ═══════]                         │
├────────────────┤         [══ Feria del Libro ══]                                 │
│ Sala Norte     │                   ↑ solapamiento apilado verticalmente           │
├────────────────┼────────────────────────────────────────────────────────────────┤
│ Stand A-1      │                         [═══ Expo Mascotas ═══════]             │
├────────────────┼────────────────────────────────────────────────────────────────┤
│ Estudio 2      │ [══ Seminario ══]                      [══ Congreso TI ══]      │
└────────────────┴────────────────────────────────────────────────────────────────┘
```

### 4.2 Ancho de columnas y alturas

```
Columna nombre recurso : 200 px (fija, sticky)
Ancho por día          : 40 px
Altura por fila        : 44 px (sin solapamiento)
                         44 × N px (con N solapamientos apilados)
```

### 4.3 Colores y codificación

| Elemento | Color |
|---|---|
| Fase SETUP | Amarillo `#fadb14` — borde punteado |
| Fase EVENT | Azul `#1677ff` — sólido |
| Fase TEARDOWN | Naranja `#fa8c16` — borde punteado |
| Órdenes sin fase | Color por estatus (igual que el resto del sistema) |
| Días de fin de semana | Fondo sutil `#fafafa` + texto gris |
| Día de hoy | Línea vertical destacada `#531dab` |
| Solapamiento | Barras apiladas, borde rojo `#ff4d4f` en el encabezado del recurso |

### 4.4 Encabezado de semanas (como en la imagen de referencia)

```
│        │  29 May, 2025          │  02 Jun, 2025          │  09 Jun, 2025    │
│        │ Fr │ Sa │ Su │ Mo │ Tu │ We │ Th │ Fr │ Sa │ Su │ Mo │ Tu │ We │ Th │
│        │ 29 │ 30 │ 31 │  1 │  2 │  3 │  4 │  5 │  6 │  7 │  8 │  9 │ 10 │ 11 │
```

---

## 5. Solapamientos

### 5.1 Definición

Hay **solapamiento** cuando dos o más `EventSpace` (o reservas) referencian el mismo `resourceId` y sus rangos de tiempo se intersectan:

```
Recurso A: [────── Evento X ──────]
                   [──── Evento Y ────]
                   ↑ solapamiento
```

### 5.2 Renderizado de solapamientos

**Opción elegida: apilamiento vertical dentro de la misma fila**

```
┌──────────────────────────────────────────────────────┐
│ Sala Norte     │ [══ Expo Santa Fe (SETUP) ══════]   │  ← fila 1
│                │     [══ Feria del Libro ═══]         │  ← fila 2 (solapada)
└──────────────────────────────────────────────────────┘
```

- La fila del recurso se **expande** dinámicamente para acomodar N niveles de solapamiento.
- Cada nivel usa 44 px de altura adicional.
- Un **badge de alerta rojo** `⚠` aparece en el nombre del recurso si hay solapamientos.

### 5.3 Algoritmo de detección

```
Para cada recurso:
  1. Ordenar todas las reservas por startTime ASC
  2. Asignar "nivel" (lane) usando greedy interval scheduling:
     - lane 0: primera reserva disponible
     - lane 1: si overlap con lane 0, siguiente slot libre
     - etc.
  3. Número de lanes = altura de la fila
  4. Si lanes > 1 → marcar recurso como "conflicto"
```

---

## 6. Hover Tooltip (Metadata del Evento)

Al pasar el cursor sobre cualquier barra, aparece un **Tooltip enriquecido** con la siguiente información:

```
┌─────────────────────────────────────────────┐
│ 🗓 Expo Santa Fe 2025                        │
│ ─────────────────────────────────────────── │
│ Recurso   : Sala Principal                  │
│ Fase       : Evento principal               │
│ Fechas     : 01 Jun → 07 Jun, 2025          │
│ Cliente    : Cámara de Comercio de Jalisco  │
│ Estatus    : Confirmado                     │
│ Notas      : Montaje incluye bodega lateral │
│ ─────────────────────────────────────────── │
│ Órdenes vinculadas : 3  (Total: $48,500)    │
│ [Ver Evento →]  [Ver Orden →]               │
└─────────────────────────────────────────────┘
```

### 6.1 Campos del tooltip por tipo de barra

**Barra de EventSpace:**
- Nombre del evento (`event.name`)
- Código del evento (`event.code`)
- Fase (`SETUP` → Montaje / `EVENT` → Evento / `TEARDOWN` → Desmontaje)
- Fechas exactas (`startTime` → `endTime`)
- Cliente principal (`event.primaryClient`)
- Estatus del evento
- Notas del EventSpace
- Link directo al evento

**Barra de Orden:**
- Número de orden (`orderNumber`)
- Nombre del cliente (`client.companyName` o nombre + apellido)
- RFC del cliente
- Servicios contratados (lista de líneas de ítem)
- Total de la orden
- Estatus de la orden
- Link directo a la orden

---

## 7. Filtros y Controles

```
┌─────────────────────────────────────────────────────────────────┐
│ [Tipo de recurso ▼] [Evento específico ▼] [Rango de fechas 📅]  │
│ [Estado evento ▼]   [Buscar recurso 🔍]    [Limpiar filtros ✕]  │
│                                                                  │
│ Vista: [Semana] [Mes] [2 Meses] [Personalizado]    ‹‹ ‹ Hoy › ›› │
└─────────────────────────────────────────────────────────────────┘
```

| Filtro | Valores |
|---|---|
| Tipo de recurso | STAND, SALA, EQUIPO, SERVICIO, etc. (`ResourceType`) |
| Evento | Lista de todos los eventos del tenant |
| Rango de fechas | DatePicker rango |
| Estado del evento | QUOTED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED |
| Vista temporal | Semana (7d) · Mes (30d) · 2 Meses (60d) · Personalizado |

---

## 8. Endpoint API Requerido

### `GET /api/v1/bookings/calendar`

**Query params:**

```
dateFrom      : ISO date (required)
dateTo        : ISO date (required)
resourceType  : ResourceType (optional)
eventId       : string (optional)
eventStatus   : EventStatus (optional)
```

**Response:**

```json
{
  "success": true,
  "data": {
    "resources": [
      {
        "id": "uuid",
        "code": "SALA-1",
        "name": "Sala Principal",
        "type": "ROOM",
        "hasConflict": true
      }
    ],
    "bookings": [
      {
        "id": "uuid",
        "resourceId": "uuid",
        "type": "EVENT_SPACE",
        "phase": "EVENT",
        "startTime": "2025-06-01T08:00:00Z",
        "endTime":   "2025-06-07T22:00:00Z",
        "lane": 0,
        "event": {
          "id": "uuid",
          "code": "ESF-2025",
          "name": "Expo Santa Fe 2025",
          "status": "CONFIRMED",
          "primaryClient": { "companyName": "Cámara de Comercio" }
        },
        "notes": "Montaje incluye bodega lateral",
        "ordersCount": 3,
        "ordersTotal": 48500
      },
      {
        "id": "uuid",
        "resourceId": "uuid",
        "type": "ORDER",
        "startTime": "2025-06-03T00:00:00Z",
        "endTime":   "2025-06-05T23:59:59Z",
        "lane": 1,
        "order": {
          "id": "uuid",
          "orderNumber": "ORD-2025-0047",
          "status": "CONFIRMED",
          "total": 12500,
          "client": { "companyName": "Distribuidora XYZ", "rfc": "DXY900101ABC" },
          "lineItems": ["Servicio de limpieza", "Montacargas"]
        }
      }
    ],
    "meta": {
      "dateFrom": "2025-06-01",
      "dateTo":   "2025-06-30",
      "totalResources": 24,
      "totalBookings": 67,
      "conflictsCount": 3
    }
  }
}
```

---

## 9. Ruta y Menú

```
Ruta frontend : /booking-calendar
Menú admin    : Reportes → Calendario de Espacios
Ícono         : CalendarOutlined (Ant Design)
```

---

## 10. Implementación — Plan por Fases

### Fase 1 — Visualización base (MVP)

- [ ] Endpoint `GET /bookings/calendar` — retorna EventSpaces + Órdenes para el rango
- [ ] Cálculo de lanes (solapamientos) en el backend
- [ ] `BookingCalendarPage.tsx` — grid Gantt con scroll horizontal
- [ ] Columna fija de recursos (sticky left)
- [ ] Barras coloreadas por fase (SETUP / EVENT / TEARDOWN)
- [ ] Navegación mes/semana con flechas
- [ ] Encabezado de fechas con grupos de semana (estilo imagen referencia)
- [ ] Fin de semana destacado

### Fase 2 — Interactividad

- [ ] Tooltip hover con metadata completa (evento, cliente, fechas, notas)
- [ ] Badge `⚠` en recursos con solapamientos
- [ ] Filtros: tipo de recurso, evento, estado, rango de fechas
- [ ] Link directo al evento / orden desde el tooltip
- [ ] Indicador de "Hoy" (línea vertical)

### Fase 3 — UX avanzado

- [ ] Zoom: vistas Día / Semana / Mes / 2 Meses
- [ ] Barra de resumen superior (total recursos ocupados, % ocupación, conflictos)
- [ ] Exportar a PDF o imagen (captura de pantalla del calendario)
- [ ] Click en barra abre modal de detalle (sin salir del calendario)
- [ ] Drag-and-drop para mover reservas (Fase 4)

---

## 11. Consideraciones Técnicas

### Scroll horizontal

El grid puede volverse muy ancho (40px × 60 días = 2,400px). Solución:
- `overflow-x: auto` en el contenedor
- La columna de nombres de recursos es **sticky** (`position: sticky; left: 0`)
- El encabezado de fechas también es sticky (`position: sticky; top: 0`)
- Ambos sticky se intersectan correctamente con `z-index` diferenciado

### Rendimiento

- El endpoint filtra por rango de fechas en la DB (índice en `start_time`)
- El cálculo de lanes se hace en el backend, no en el frontend
- El frontend recibe el array ya con la propiedad `lane` asignada
- Para calendarios de más de 90 días considerar paginación por semana

### Diferenciación visual SETUP / EVENT / TEARDOWN

```
SETUP      → barra con borde punteado (border-style: dashed), fondo amarillo claro
EVENT      → barra sólida, color según estatus del evento
TEARDOWN   → barra con borde punteado, fondo naranja claro
```

---

## 12. Relación con el Modelo de Datos Existente

```
Resource (espacio físico)
  └── EventSpace[] (cuándo se usa en cada evento, por fase)
        └── Event (nombre, cliente, fechas, estatus)
  └── OrderLineItem[] (qué órdenes contratan ese recurso)
        └── Order (cliente, monto, estatus, fechas)
```

El calendario admin **cruza ambas fuentes** para dar la visión completa de ocupación.

---

## 13. Notas

- El modelo `EventSpace` ya existe con `phase`, `startTime`, `endTime` — no requiere migración.
- El `ResourceType` enum ya está definido en el schema.
- La librería de UI es Ant Design (sin dependencias adicionales de calendario).
- El patrón de grid Gantt ya fue implementado para el portal (`CalendarPage.tsx`) y puede servir como base, expandiéndolo con solapamientos y fuentes de datos múltiples.
