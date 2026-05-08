# Handoff: Rediseño completo de Detalle de Evento (Variante C)

> **Repo objetivo:** `cesarortegaau-design/IventIA` · branch `master`
> **Archivo a modificar:** `apps/admin/src/pages/events/EventDetailPage.tsx`
> **Stack del repo:** React 18 + TypeScript + React Router + TanStack Query + Ant Design 5 + dayjs

---

## Overview

`MainLayout.tsx` ya tiene aplicada la Variante C del shell (top-nav + sidebar contextual). Este handoff cubre el **siguiente paso pendiente**: rediseñar la página de **detalle de evento** (`/eventos/:id`) para que coincida con el mockup `VC_EventDetail` mostrado en `IventIA Admin Shell C.html`.

El estado actual de la página es funcionalmente completa pero estéticamente desalineada con la Variante C: usa componentes Antd planos (`Card` + `Statistic` + `Tabs`) sin breadcrumbs, sin header rediseñado y con la primera tab siendo una tabla de "Espacios" en lugar de un "Resumen ejecutivo".

## About the Design Files

Los archivos en `reference/` son **mockups creados en HTML/JSX** (con React + Babel inline) usados como prototipo visual de alta fidelidad. **No son código de producción para copiar tal cual** — están construidos sobre `design-canvas.jsx` (un canvas de presentación) y un set custom de íconos (`shell-icons.jsx`).

Tu tarea es **recrear el diseño en el codebase real** (`apps/admin`) usando los patrones existentes:
- Ant Design 5 para componentes (`Tabs`, `Tag`, `Button`, `Card`, `Tooltip`, `Modal`, etc.)
- `@ant-design/icons` (no copies los íconos custom del mockup)
- TanStack Query (`useQuery`/`useMutation`) para datos
- dayjs para fechas
- TypeScript con tipos reales del API (`event.orders`, `event.stands`, etc.)

## Fidelity

**Alta fidelidad.** Colores, tipografías, spacings y radios están especificados con valores exactos. Reprodúcelos pixel-perfect adaptándolos a Antd:
- Para reemplazar Antd `Statistic` por las tarjetas KPI rediseñadas, usa `<Card>` con estilos inline o un wrapper styled.
- Para mantener el comportamiento de Antd `Tabs`, sobreescribe estilos con `tabBarStyle` y `tabBarGutter`, o usa el prop `items` con `label` JSX customizado.
- Mantén toda la lógica existente de mutations, queries y modals — **solo cambia la presentación**.

---

## Diseño objetivo: Detalle de Evento

### Layout general

Página con tres regiones verticales dentro del `<main>` que provee `MainLayout`:

```
┌─────────────────────────────────────────────────────────┐
│ HEADER (white card, 14px 24px padding)                  │
│  ↳ Breadcrumbs                                          │
│  ↳ Hero row: ícono + título + chips meta + acciones     │
│  ↳ Tabs bar (Resumen | Boletos | Mapa | Órdenes | …)    │
├─────────────────────────────────────────────────────────┤
│ BODY (24px padding, bg #f5f7fa)                         │
│  ↳ Contenido específico de cada tab                     │
└─────────────────────────────────────────────────────────┘
```

El padding de `MainLayout` ya aplica 24px al `<main>`. **Quita ese padding cuando estés en `EventDetailPage`** o ajusta el header para que ocupe full-width — el mockup muestra el header pegado al borde superior y al sidebar, sin gutter exterior. Una opción limpia: envuelve la página en un `<div style={{ margin: -24 }}>` para anular el padding del shell solo en esta ruta.

---

### 1. Header rediseñado

#### 1.1 Breadcrumbs (fila superior)

```
Eventos  ›  Activos  ›  Vive Latino 2026
```

- Tipografía: `12px / weight 400`
- Color de los segmentos no-activos: `#64748b`
- Color del segmento final (activo): `#1f2937`
- Separador: ícono chevron-right de Antd `<RightOutlined />` a `9px`, color `#94a3b8`
- Margin-bottom: `8px`
- Los segmentos no-finales son `<Link>` de react-router (clickeables hacia `/eventos` y `/eventos?status=ACTIVE` respectivamente)

#### 1.2 Hero row

Flex con `justify-content: space-between, align-items: center`:

**Lado izquierdo** (flex con gap `14px`):

- **Ícono de evento**: cuadrado de `52×52px`, `border-radius: 10px`, gradiente `linear-gradient(135deg, #3b82f6, #1e4d7b)`, ícono `<CalendarOutlined />` de Antd a `22px` color blanco, centrado.
- **Bloque de texto** (flex column):
  - **Título**: `<h1>` con el `event.name` — `font-size: 22px`, `font-weight: 700`, color `#1a3a5c` (navy), `margin: 0`, `line-height: 1.2`. A la derecha del título, en la misma línea, va el chip de status:
    - **Status chip**: `font-size: 11px`, `padding: 3px 10px`, `border-radius: 12px`, `font-weight: 600`. Fondo y color según estado:
      | Status | Background | Color |
      |---|---|---|
      | QUOTED | `#2e7fc118` | `#2e7fc1` |
      | CONFIRMED | `#2e7fc118` | `#2e7fc1` |
      | IN_EXECUTION | `#10b98118` | `#10b981` |
      | CLOSED | `#94a3b818` | `#94a3b8` |
      | CANCELLED | `#ef444418` | `#ef4444` |
      Mantén los labels actuales (`Cotizado`, `Confirmado`, `En Ejecución`, `Cerrado`, `Cancelado`).
  - **Línea meta** (debajo del título, `margin-top: 4px`): flex con `gap: 14px`, `font-size: 12px`, color `#64748b`. Cada chip lleva un emoji o ícono Antd seguido de texto:
    - 📅 `dayjs(event.eventStart).format('DD MMM YYYY')` – `dayjs(event.eventEnd).format('DD MMM YYYY')`
    - 📍 `event.venue?.name ?? '—'` (campo del API, si no existe omite el chip)
    - 👤 `event.primaryClient?.companyName || nombre completo`
    - 🎟 `event.expectedAttendance?.toLocaleString() + ' asistentes'` (si existe)

  > Nota: si el codebase no tiene `expectedAttendance` o `venue`, omite esos chips y pide al backend agregarlos. **No inventes data.**

**Lado derecho** (flex con gap `8px`):

- Botón secundario **"Compartir"**: `padding: 7px 12px`, `background: white`, `border: 1px solid #e5e9f0`, `border-radius: 6px`, `font-size: 13px`, color `#1f2937`. Acción: copiar URL al clipboard + `message.success('URL copiada')`.
- Botón secundario **"Generar Word"**: mismos estilos. Mantiene la lógica actual (`setGenerateDocOpen(true)`).
- Botón secundario **"Auditoría"**: mismos estilos. Abre el `<AuditDrawer>` actual.
- **Selector de status** (Antd `Select`): width `160px`, mismo comportamiento que ya existe (`updateStatusMutation.mutate`).
- Botón primario **"Editar"**: `padding: 7px 14px`, `background: #1a3a5c` (navy), `color: white`, `border: none`, `border-radius: 6px`, `font-size: 13px`, `font-weight: 500`. Navega a `/eventos/:id/editar`.
- Botón primario **"Nueva OS"**: mismo estilo + ícono `<PlusOutlined />` a `12px` con gap `6px`. Navega a `/eventos/:id/ordenes/nueva`.

#### 1.3 Tabs bar

Flex de tabs sin underline propio (lo dibujas tú con `border-bottom`). Padding `10px 14px` por tab, gap `2px`. Margin-top del bloque: `14px`. Margin-bottom negativo para que el border-bottom de la tab activa pegue con el border-bottom del header (`margin-bottom: -14px`).

| Estado | font-weight | color | border-bottom |
|---|---|---|---|
| Activa | 600 | `#1a3a5c` | `2px solid #2e7fc1` |
| Inactiva | 500 | `#64748b` | `2px solid transparent` |

Hover en inactivas: color `#1f2937`.

**Las 8 tabs en orden estricto:**

1. **Resumen** ← NUEVA, default
2. **Boletos** (existente como `TicketEventTab`)
3. **Mapa del Venue** (existente, basado en `DxfViewer` + floor plans + stands geo)
4. **Órdenes** (renombrar de "Órdenes de Servicio" — el contador `(N)` queda al lado: `Órdenes (12)`)
5. **Contratos** (existente, condicional a `eventContracts.length > 0`)
6. **Producción** (NUEVA o renombre — ver §6)
7. **Documentos** (existente)
8. **Auditoría** (existente, mover el contenido de `<AuditDrawer>` a tab dedicada O mantener el drawer y omitir esta tab — ver §8)

**Tabs que se eliminan/refactorizan:**
- ~~Espacios~~ → mover su contenido al **Mapa del Venue** como sub-sección, o a **Resumen** como widget compacto. La tabla detallada se conserva pero accesible desde "Mapa del Venue → ver tabla".
- ~~Información~~ → su contenido (`Descriptions`) se mueve a **Resumen** como card lateral.
- ~~Stands~~ → mover a **Mapa del Venue** como sub-sección colapsable. La importación CSV y plantilla se mantienen.
- ~~Portal~~ → mover a **Auditoría** como segunda sub-tab, O dejar como modal accesible desde header. **Decide con el usuario antes de moverlo.**

---

### 2. Tab "Resumen" (NUEVA — primera tab)

Layout de 2 columnas: **2fr / 1fr**, gap `16px`.

#### Columna izquierda (2fr)

##### 2.1 Grid de 4 KPIs

`display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;`

Cada KPI:
- Container: `background: white`, `border-radius: 10px`, `padding: 14px`, `border: 1px solid #e5e9f0`
- **Label** (`font-size: 11px`, color `#64748b`, `margin-bottom: 4px`)
- **Value** (`font-size: 22px`, `font-weight: 700`, color `#1a3a5c`)
- **Sub** (`font-size: 11px`, color según semántica, `margin-top: 2px`)

Los 4 KPIs (deriva todos de `event.orders`, `event.tickets`, `event.eventStart`):

| KPI | Cálculo | Sub | Color del sub |
|---|---|---|---|
| Boletos vendidos | `event.tickets.filter(t => t.status === 'PAID').length.toLocaleString()` | `${ocupacionPct}% ocupación` | `#10b981` (success) |
| Ingreso total | `$${(totalOrders / 1_000_000).toFixed(1)}M` | `+12% vs meta` o `−5% vs meta` según comparación | `#10b981` o `#ef4444` |
| OS activas | `event.orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'CLOSED').length` | `${pendientes} pendientes` | `#f59e0b` (warning) |
| Días al evento | `dayjs(event.eventStart).diff(dayjs(), 'day')` | `'on-track'` o `'retraso'` según hitos | `#8b5cf6` (purple) |

> Si tu API no expone `tickets` o `expectedAttendance`, deja la card con `—` y `N/A` antes de inventar números. Coordina con backend.

##### 2.2 Card "Línea de tiempo"

- Container: `background: white`, `border-radius: 10px`, `padding: 18px`, `border: 1px solid #e5e9f0`, `margin-bottom: 16px`
- Header del card: texto `"Línea de tiempo"`, `font-size: 14px`, `font-weight: 600`, color `#1a3a5c`, `margin-bottom: 14px`

Cada item del timeline (flex row, `gap: 12px`, `padding: 10px 0`, separador `1px solid #e5e9f0` excepto el último):

- **Avatar de ícono**: `32×32px`, `border-radius: 8px`, fondo `${color}18` (color con 18% opacidad), color del ícono = color base, ícono Antd centrado a `14px`
- **Bloque texto** (flex 1):
  - Título: `font-size: 13px`, `font-weight: 500`, color `#1a3a5c`
  - Descripción: `font-size: 12px`, color `#64748b`
- **Timestamp** (a la derecha): `font-size: 11px`, color `#94a3b8`

Fuente de datos: `auditApi.getLog('Event', id)` (ya hay query en la página). Mapea las acciones del audit log a iconos:

| Acción | Ícono | Color |
|---|---|---|
| `COMMENT` o `MESSAGE` | `<MessageOutlined />` | `#2e7fc1` |
| `CREATE` (orden) | `<DollarOutlined />` | `#10b981` |
| `CONTRACT_SIGNED` | `<FileProtectOutlined />` | `#f59e0b` |
| Otros `UPDATE` | `<EditOutlined />` | `#64748b` |

Mostrar **3 más recientes** + un link `"Ver todo el historial →"` que abre la tab Auditoría o el drawer.

##### 2.3 Card "Ocupación por sección"

Solo si el evento tiene `tickets` (es decir, está usando el módulo de Ticketing).

- Container: idéntico al timeline
- Header: `"Ocupación por sección"`

Por cada sección de boletos (`event.ticketSections` o equivalente):

```
Pista General             24,500 / 30,000
██████████████░░░░░░░░░░  (barra de progreso 6px)
```

- Fila label (flex row, `justify-content: space-between`, `font-size: 12px`, `margin-bottom: 4px`):
  - Nombre: color `#1f2937`, `font-weight: 500`
  - Conteo: color `#64748b` (`${sold.toLocaleString()} / ${total.toLocaleString()}`)
- Barra: `height: 6px`, `background: #f5f7fa`, `border-radius: 3px`, `overflow: hidden`
- Fill: `width: ${sold/total*100}%`, `height: 100%`, color según orden (rotar entre `#2e7fc1`, `#8b5cf6`, `#f59e0b`, `#10b981`)
- `margin-bottom: 10px` entre secciones

Si NO hay módulo de boletos para este evento, **oculta la card completa** (no muestres placeholder).

#### Columna derecha (1fr)

##### 2.4 Card "Equipo"

- Container: `background: white`, `border-radius: 10px`, `padding: 16px`, `border: 1px solid #e5e9f0`, `margin-bottom: 14px`
- Header: `"Equipo"`, `font-size: 13px`, `font-weight: 600`, color `#1a3a5c`, `margin-bottom: 12px`

Por cada miembro del equipo (`event.team` o derivado de los usuarios asignados a las OS del evento):

Flex row, `align-items: center`, `gap: 9px`, `padding: 6px 0`:
- Avatar: `28×28px`, `border-radius: 50%`, fondo color asignado al rol, color blanco, `font-size: 11px`, `font-weight: 600`. Iniciales (primera letra de nombre + primera de apellido).
- Texto: `font-size: 12px`, color `#1f2937`. Formato: `${nombre} · ${rol}`

Roles típicos en IventIA y sus colores:
- Producción → `#2e7fc1`
- Comercial → `#10b981`
- Logística → `#f59e0b`
- Coordinación → `#8b5cf6`

##### 2.5 Card "Próximos hitos"

- Container: idéntico
- Header: `"Próximos hitos"`

Hitos derivables del evento:
- `setupStart` → "Montaje inicia"
- `eventStart` → "Apertura"
- `eventEnd` → "Cierre"
- `teardownEnd` → "Desmontaje completa"

Cada hito (flex row, `gap: 10px`, `padding: 7px 0`, separador entre hitos):
- Fecha (left, `min-width: 56px`, `font-size: 11px`, color `#64748b`, `font-weight: 600`): `dayjs(date).format('DD MMM')`
- Label (`font-size: 12px`, color `#1f2937`)

Ordenar cronológicamente y filtrar los que ya pasaron (mostrar máximo 4 próximos).

---

### 3. Tab "Boletos"

**Conservar tal cual** el componente `TicketEventTab` existente. Solo asegúrate de que respete el padding `0` del contenedor de tab (la tab body no debe agregar margin extra; el padding `24px` lo provee el body de la página).

---

### 4. Tab "Mapa del Venue"

Combinar lo que hoy son tabs separadas (Espacios + Stands + lo que ya tenga el viewer) en un layout único:

```
┌──────────────────────────────────────────────────────────┐
│ Toolbar: [Subir DXF] [Selector de plano] [Acciones…]    │
├──────────────────────────┬───────────────────────────────┤
│                          │ Sidebar derecho:              │
│   DxfViewer / canvas     │  ▸ Stands (lista)             │
│                          │  ▸ Espacios reservados        │
│                          │  ▸ Conflictos                 │
└──────────────────────────┴───────────────────────────────┘
```

- El `<DxfViewer>` actual ocupa la columna izquierda (flex: 1, min-height: 600px)
- El sidebar derecho (`width: 320px`) tiene 3 secciones colapsables:
  - **Stands** (`event.stands`): muestra los items + acciones de import/export CSV (mover los botones del header de la tab anterior)
  - **Espacios reservados** (`spaces` del query existente): tabla compacta + botón "Agregar reserva" (mantiene `openSpaceModal()`)
  - **Conflictos** (derivado de `overlapMap`): solo aparece si hay solapamientos
- Padding del card contenedor: `0` (el viewer ocupa todo); cada sub-sección del sidebar lleva `padding: 14px`, separador `1px solid #e5e9f0`

Si el viewer y este layout combinado son demasiado cambio, puedes **mantener "Espacios" y "Stands" como sub-tabs internas** dentro de "Mapa del Venue" usando `<Tabs size="small" type="card">`.

---

### 5. Tab "Órdenes"

Mantener la tabla actual (`orderColumns`) y el botón de exportar CSV. Cambios visuales:

- Quitar el `<Card>` wrapper externo (la página ya provee el background gris)
- Toolbar superior con flex: a la izquierda título `"Órdenes de servicio"` (`font-size: 14px`, `font-weight: 600`, color navy), a la derecha botón `Exportar CSV` y `Nueva OS`
- Los chips de status de órdenes deben usar la misma paleta del header (consistencia):
  | Status | bg | color |
  |---|---|---|
  | QUOTED | `#2e7fc118` | `#2e7fc1` |
  | CONFIRMED | `#10b98118` | `#10b981` |
  | EXECUTED | `#3b82f618` | `#3b82f6` |
  | INVOICED | `#06b6d418` | `#06b6d4` |
  | CANCELLED | `#ef444418` | `#ef4444` |
  | CREDIT_NOTE | `#f59e0b18` | `#f59e0b` |
  Reemplaza el `<Tag color="blue">` actual por un span custom con esos estilos, o configura `Tag color={hex}` con paleta personalizada.

---

### 6. Tab "Producción"

**Nueva.** Reusar el componente de la página `/produccion` (`ProductionPage`) filtrado por `eventId`. Si ese filtro no existe en backend, agréguenlo. Mientras tanto:

- Si `produccionApi.byEvent(eventId)` no existe, muestra un empty state:
  - Ícono `<BarChartOutlined />` a `48px`, color `#94a3b8`
  - Texto `"Producción y costos por evento estará disponible pronto"` (`font-size: 14px`, color `#64748b`)
  - CTA `"Ver módulo general de Producción"` que navega a `/produccion`

---

### 7. Tab "Documentos"

Mantener el grid actual de documentos pero con tarjetas rediseñadas:

- `Row gutter={[12,12]}` se mantiene
- Cada `<Card size="small">` se reemplaza por un div custom:
  - `padding: 12px`, `border-radius: 10px`, `border: 1px solid #e5e9f0`, `background: white`
  - Header del card (flex row, `gap: 10px`, `align-items: center`):
    - Avatar de tipo: `32×32px`, `border-radius: 8px`, fondo según extensión (`.pdf` → `#ef444418/​#ef4444`, `.docx` → `#2e7fc118/​#2e7fc1`, default → `#64748b18/​#64748b`), ícono `<FileOutlined />` o `<FilePdfOutlined />`
    - Texto: filename (`font-size: 13px`, `font-weight: 500`, truncate) + tipo (`font-size: 11px`, color `#94a3b8`)
  - Acciones (download, delete) van en una segunda fila con `justify-content: flex-end`, `margin-top: 8px`

Botón "Subir documento" en la toolbar superior con estilos igual a "Compartir" del header.

---

### 8. Tab "Auditoría"

**Reemplazar** el `<AuditDrawer>` por una tab dedicada con dos sub-tabs:

```
[ Eventos ] [ Códigos de portal ]
```

- **Eventos**: timeline completo de `auditData.data` (la lista que hoy mete el drawer)
  - Reusar tu componente `<AuditTimeline>` con `bordered` y `padding: 24px`
- **Códigos de portal**: la tabla actual de portal codes + botón "Generar códigos" + modal asociado

> Si decides mantener el AuditDrawer en el header como botón flotante, omite la tab "Auditoría" y mueve "Códigos de portal" a una tab llamada **"Portal"**. Lo importante es que **el usuario decida**: confirma con el PM antes de borrar el drawer.

---

## Interacciones & Behavior

### Animaciones / transiciones
- Hover en botones del header: `transition: background 0.15s ease, color 0.15s ease`
- Hover en tabs inactivas: cambio de color con `transition: color 0.15s`
- Cambio de tab: el border-bottom azul anima con `transition: border-bottom 0.2s ease` (Antd lo hace por defecto, no toques `<Tabs>`)
- KPI cards en hover: `transform: translateY(-1px)` + `box-shadow: 0 4px 12px rgba(0,0,0,0.04)` con `transition: 0.15s ease`

### Loading states
- Mantén el `<Card loading />` global mientras `isLoading === true`. Pero ahora el `Card` deja de ser el wrapper visible; usa un skeleton custom: header gris + 4 KPIs grises + 2 cards grises a la izq y 2 a la der. Antd `<Skeleton.Node active />` por bloque.

### Error states
- Si `data?.data` es `null` después de `isLoading`, mostrar `<Alert type="error" message="Evento no encontrado" />` con botón "Volver a Eventos".

### Responsive
- En `<lg` (Antd `screens.lg === false`), colapsa el grid 2fr/1fr a una sola columna (`grid-template-columns: 1fr`)
- En `<md`, los 4 KPIs pasan a `grid-template-columns: repeat(2, 1fr)`
- Las tabs se vuelven scroll horizontal (Antd lo hace si pasas `tabBarExtraContent` y `more`); usa el prop `more={{ icon: <EllipsisOutlined /> }}` o deja el scroll horizontal nativo

---

## Estado / Data flow

**No agregar nuevos hooks de data fetching salvo lo siguiente:**

- `event.team` — si no existe en el API, agrégalo al endpoint `eventsApi.get(id)` (campo `team: { user: User, role: string }[]`)
- `event.tickets` y `event.ticketSections` — ya están si `TicketEventTab` los usa; reúsalos
- `event.expectedAttendance` y `event.venue` — campos opcionales, omite chips del header si no llegan

Todos los **mutations existentes se preservan**:
- `updateStatusMutation`
- `deleteDocMutation`
- `generateCodesMutation`
- `revokeCodeMutation`
- `saveSpaceMutation`
- `deleteSpaceMutation`
- `importStandsMutation`
- `deleteFloorPlanMutation`
- `handleStandSave`, `handleStandDelete`
- `handleFloorPlanUpload`

Todos los **modals existentes se preservan**:
- Modal de auditoría de espacio (`auditSpace`)
- Modal de edición de espacio (`spaceModalOpen`)
- Modal de generación de códigos (`genModalOpen`)
- Modal de import de stands (`standsImportModalOpen`)
- `<GenerateDocumentModal>` (`generateDocOpen`)
- `<CreateOrderFromSpacesModal>` (`orderFromSpacesOpen`)

---

## Design Tokens

Estos son los tokens **idénticos** a los que ya están declarados en `MainLayout.tsx` como objeto `T`. **Importa o duplica el mismo objeto**, no inventes nuevos hex.

```ts
const T = {
  navy:      '#1a3a5c',
  navyDark:  '#0f2540',
  blue:      '#2e7fc1',
  light:     '#f0f6ff',
  bg:        '#f5f7fa',
  border:    '#e5e9f0',
  text:      '#1f2937',
  textMuted: '#64748b',
  textDim:   '#94a3b8',
  success:   '#10b981',
  warning:   '#f59e0b',
  danger:    '#ef4444',
  purple:    '#8b5cf6',
}
```

**Sugerencia:** extrae este objeto a `apps/admin/src/styles/tokens.ts` y úsalo desde ambos archivos (MainLayout y EventDetailPage). Ahorra duplicación y previene drift.

### Tipografía

| Uso | font-size | weight | color |
|---|---|---|---|
| H1 título evento | 22px | 700 | navy |
| Card header (Equipo, Hitos, Timeline) | 14px / 13px | 600 | navy |
| KPI value | 22px | 700 | navy |
| KPI label | 11px | 400 | textMuted |
| Body | 13px | 400 | text |
| Caption / meta | 12px | 400 | textMuted |
| Timestamp | 11px | 400 | textDim |

Familia: `'Inter', system-ui, -apple-system, sans-serif` (ya configurado a nivel global).

### Spacing

- Card padding: `14px` (KPI), `16px` (Equipo/Hitos), `18px` (Timeline/Ocupación)
- Gap entre cards verticalmente: `14px` o `16px`
- Gap entre columnas del grid 2fr/1fr: `16px`
- Gap entre KPIs: `12px`
- Padding del header: `14px 24px`
- Padding del body: `24px`

### Border radius

| Uso | radius |
|---|---|
| Cards principales | `10px` |
| Botones | `6px` |
| Avatar de ícono (52×52, 32×32, 28×28) | `10px / 8px / 50%` |
| Status chip | `12px` |
| Barras de progreso | `3px` |

### Shadows

Solo en hover de KPI cards: `0 4px 12px rgba(0, 0, 0, 0.04)`. El resto de cards son flat con borde.

---

## Assets

- **Íconos**: usa `@ant-design/icons` exclusivamente. No copies los íconos custom de `shell-icons.jsx` — esos eran solo para el mockup.
- **Tipografía**: ya cargada (Inter desde Google Fonts).
- **Imágenes**: ninguna nueva. El gradiente del icono del header es CSS puro.

---

## Files de referencia (en `reference/`)

| Archivo | Para qué sirve |
|---|---|
| `IventIA Admin Shell C.html` | Punto de entrada del mockup. Ábrelo en navegador para ver todo el design canvas. La sección "Detalle de Evento con la nueva navegación" muestra `VC_EventDetail`. |
| `vc-detail-mobile.jsx` | **El componente principal a recrear**: `window.VC_EventDetail`. Layout completo del detalle de evento + las versiones móvil/tablet. |
| `variant-c.jsx` | El shell completo de la Variante C (top-nav + sidebar + tablero de eventos). Útil como contexto del look general. |
| `vc-areas.jsx` | Mapeo de áreas y sidebars contextuales por área. No necesario para esta tarea (ya está implementado en `MainLayout.tsx`). |
| `vc-states.jsx` | Estados del top-nav (búsqueda ⌘K, notificaciones). No necesario aquí. |
| `shell-icons.jsx` | Componente `<Icon>` custom del mockup. **No portear** — usa Antd Icons. |
| `shell-data.js` | Tokens y datos demo del mockup. Los tokens ya están en este README; los datos demo son ficticios. |
| `design-canvas.jsx` | Wrapper de presentación del canvas. No tiene relevancia para producción. |

### Cómo abrir el mockup
```bash
cd reference
python3 -m http.server 8000
# abrir http://localhost:8000/IventIA%20Admin%20Shell%20C.html
```

Navegar al artboard **"Festival Vive Latino 2026 · Resumen"** (sección "Detalle de Evento con la nueva navegación").

---

## Checklist de implementación

- [ ] Extraer `T` (tokens) a `apps/admin/src/styles/tokens.ts`
- [ ] Anular padding de `<main>` en la ruta `/eventos/:id` (margin negativo o variant del layout)
- [ ] Header: breadcrumbs + hero + tabs bar
- [ ] Crear `EventSummaryTab.tsx` con grid 2fr/1fr y los 5 cards
- [ ] Conectar KPIs a data real (no inventar números)
- [ ] Refactor de tab "Mapa del Venue" combinando Espacios + Stands + DxfViewer
- [ ] Renombrar tabs (Órdenes, no "Órdenes de Servicio") y reordenar
- [ ] Repintar status chips con paleta nueva
- [ ] Decidir con PM: ¿AuditDrawer o tab "Auditoría"? ¿Portal sigue como tab?
- [ ] Skeleton de loading custom
- [ ] Responsive: KPIs colapsan a 2 cols en `<md`, columnas a 1 en `<lg`
- [ ] QA: todos los modals existentes siguen funcionando
- [ ] QA: todas las mutations siguen funcionando

---

## Preguntas abiertas para el PM

1. ¿`event.team` existe en el API? Si no, ¿quién la calcula — backend o derivamos de OS asignadas?
2. ¿`event.expectedAttendance` y `event.venue` están en el modelo de Event?
3. ¿"Ocupación por sección" debe leer de Ticketing real o aceptamos mock por ahora?
4. ¿Mantener `<AuditDrawer>` flotante o convertir a tab?
5. ¿El módulo Producción tiene endpoint `byEvent(eventId)` o creamos un empty state?
6. ¿La sección "Línea de tiempo" del Resumen lee del audit log o necesita un feed nuevo (comentarios, etc.)?
