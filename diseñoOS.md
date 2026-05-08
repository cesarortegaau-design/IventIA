# Handoff IventIA Admin · Rediseño Operaciones y Catálogos

**Para Claude Code · sesión en repo `IventIA` (monorepo, app `apps/admin`)**

Este documento es un prompt ejecutable. Pégalo completo en Claude Code abierto sobre el repo IventIA. El objetivo es **trasladar al código real** los rediseños del archivo `IventIA Operaciones y Catalogos.html` (mockup React standalone) a las páginas existentes del admin.

---

## 0. Contexto y stack

- Monorepo · pnpm + Turbo. App objetivo: `apps/admin/` (React 18 + Vite + TypeScript).
- UI: **Ant Design 5** con `ConfigProvider` ya inicializado en `apps/admin/src/main.tsx`. Color primario actual `#6B46C1` (mantenerlo, NO cambiar a navy del HomePage — el mockup usa el púrpura por consistencia con AntD theme ya configurado).
- Datos: `@tanstack/react-query` con `apiClient` en `apps/admin/src/api/client.ts`. **No mockear** — usar los hooks/clientes existentes en `apps/admin/src/api/*.ts`.
- Routing: `react-router-dom` v6, definido en `apps/admin/src/router/index.tsx`. **Todas las rutas ya existen** — solo se rediseñan páginas, no se crean rutas nuevas.
- i18n: español. Toda la copy en es-GT, monedas GTQ/MXN según organización activa.
- Tipografía: `Inter` (cargada vía CSS).
- **Reglas duras**:
  1. No introducir librerías nuevas. Usar AntD 5 components nativos (`Table`, `Tabs`, `Form`, `Steps`, `Drawer`, `Card`, `Tag`, `Statistic`, `Progress`, `Avatar`, `Descriptions`, `Empty`, `Skeleton`).
  2. Tipos TS estrictos. Reusar tipos exportados desde cada `api/*.ts`. Si falta un tipo, definirlo localmente en `pages/.../types.ts` — NO modificar el módulo de api sin justificación.
  3. Cada página rediseñada debe seguir compilando (`pnpm -F admin build`) y pasar lint (`pnpm -F admin lint`).
  4. **Commits atómicos** por fase. PR por fase. No hacer un único PR gigante.

---

## 1. Plan por fases

Ejecutar en este orden. Cada fase es un PR independiente.

| Fase | Alcance | PR sugerido |
|------|---------|-------------|
| 1 | Tokens visuales + componentes shared (`StatCard`, `StatusTag`, `PageHeader`, `FilterBar`) | `feat(admin): design system primitives for ops & catalogs` |
| 2 | Listado y Detalle de **Órdenes de Servicio** | `feat(admin): redesign orders list & detail` |
| 3 | Wizard de **OS** (`OrderFormWizard`) | `feat(admin): redesign order wizard with chapters` |
| 4 | Listado, Detalle y Wizard de **Órdenes de Compra** | `feat(admin): redesign purchase orders flow` |
| 5 | Catálogo de **Recursos** (con sidebar de categorías + margen) | `feat(admin): redesign resources catalog` |
| 6 | **Listas de Precio** (cliente y proveedor) con master-detail | `feat(admin): redesign price lists` |
| 7 | **Clientes** y **Proveedores** (tablas con avatar + KPIs) | `feat(admin): redesign clients & suppliers` |
| 8 | **Usuarios y Perfiles** (3 tabs internos) + **Organizaciones** | `feat(admin): redesign users, profiles & organizations` |

Cuando termines una fase: corre `pnpm -F admin build`, `pnpm -F admin lint`, abre PR contra `master`, y espera aprobación antes de continuar.

---

## 2. Fase 1 · Primitives (hacer PRIMERO)

Crear `apps/admin/src/components/ui/` con estos archivos:

### `StatCard.tsx`
Tarjeta de KPI (label uppercase, valor numérico grande con `font-variant-numeric: tabular-nums`, sublabel).

```tsx
import { Card } from 'antd'
import type { ReactNode } from 'react'

export interface StatCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'primary' | 'info'
}

const toneColor: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'rgba(0,0,0,0.88)',
  success: '#16a34a',
  warning: '#f59e0b',
  primary: '#6B46C1',
  info: '#0ea5e9',
}

export function StatCard({ label, value, hint, tone = 'default' }: StatCardProps) {
  return (
    <Card size="small" styles={{ body: { padding: 16 } }}>
      <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, fontVariantNumeric: 'tabular-nums', color: toneColor[tone], lineHeight: 1.2 }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>{hint}</div>}
    </Card>
  )
}
```

### `StatusTag.tsx`
Mapea estados de OS, OC, recursos, listas de precio, usuarios → tag con color consistente.

```tsx
import { Tag } from 'antd'

const statusMap: Record<string, { color: string; label?: string }> = {
  // OS
  draft: { color: 'default', label: 'Borrador' },
  in_review: { color: 'processing', label: 'En revisión' },
  approved: { color: 'success', label: 'Aprobada' },
  rejected: { color: 'error', label: 'Rechazada' },
  closed: { color: 'purple', label: 'Cerrada' },
  // OC
  sent: { color: 'processing', label: 'Enviada' },
  confirmed: { color: 'success', label: 'Confirmada' },
  partially_received: { color: 'warning', label: 'Recibida parcial' },
  fully_received: { color: 'success', label: 'Recibida total' },
  cancelled: { color: 'error', label: 'Anulada' },
  // Genérico
  active: { color: 'success', label: 'Activo' },
  inactive: { color: 'default', label: 'Inactivo' },
  suspended: { color: 'error', label: 'Suspendido' },
  prospect: { color: 'warning', label: 'Prospecto' },
  pending_activation: { color: 'warning', label: 'Pendiente activación' },
  archived: { color: 'default', label: 'Archivada' },
}

export function StatusTag({ status }: { status: string }) {
  const cfg = statusMap[status] ?? { color: 'default', label: status }
  return <Tag color={cfg.color}>{cfg.label}</Tag>
}
```

### `PageHeader.tsx`
Cabecera consistente con título, meta y acciones. Sustituye los `<Typography.Title>` sueltos.

```tsx
import { Space } from 'antd'
import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  tabs?: ReactNode  // suele ser <Tabs/> sin contenedor
}

export function PageHeader({ title, meta, actions, tabs }: PageHeaderProps) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, lineHeight: 1.3 }}>{title}</h1>
          {meta && <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', marginTop: 4 }}>{meta}</div>}
        </div>
        {actions && <Space>{actions}</Space>}
      </div>
      {tabs && <div style={{ padding: '0 24px' }}>{tabs}</div>}
    </div>
  )
}
```

### `FilterBar.tsx`
Barra horizontal de filtros (search + dropdowns). Hijos libres.

```tsx
import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'

export function FilterBar({
  search, onSearch, placeholder = 'Buscar…', children, right,
}: {
  search?: string
  onSearch?: (v: string) => void
  placeholder?: string
  children?: ReactNode
  right?: ReactNode
}) {
  return (
    <div style={{ padding: '16px 24px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
      <Input
        prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />}
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearch?.(e.target.value)}
        style={{ width: 280 }}
      />
      {children}
      <div style={{ flex: 1 }} />
      {right}
    </div>
  )
}
```

Exporta todo desde `apps/admin/src/components/ui/index.ts`.

**Termina la fase**: ejecuta `pnpm -F admin build`, abre PR.

---

## 3. Fase 2 · Órdenes de Servicio · Listado y Detalle

### Archivos a tocar
- `apps/admin/src/pages/orders/OrdersListPage.tsx` (rediseño)
- `apps/admin/src/pages/orders/OrderDetailPage.tsx` (rediseño)

### `OrdersListPage.tsx` — cambios

1. Reemplazar header actual por `<PageHeader>` con:
   - Título: "Órdenes de Servicio"
   - Meta: total de OS · `<Tag>` con count
   - Actions: `<Button icon={<DownloadOutlined/>}>Exportar</Button>` · `<Button type="primary" icon={<PlusOutlined/>}>Nueva OS</Button>` (este último navega a `/eventos/:eventId/ordenes/nueva` cuando hay evento contextual; si no, abre selector de evento)
   - Tabs: por estado (`Todas`, `Borrador`, `En revisión`, `Aprobada`, `Cerrada`, `Rechazada`) con contadores. Usar `<Tabs items=[...]>` controlado por `useState` `statusFilter`.

2. Bajo el header, fila de **4 `<StatCard>`** (Pipeline activo, Por aprobar, Margen promedio, OS este mes). Calcular desde la query `useOrders()`. Si los campos no vienen, calcular en cliente con `useMemo`. Si la API no expone margen agregado, dejar `tone="primary"` con valor `—` y nota "próximamente" (no inventar).

3. Reemplazar el `<Input.Search>` actual por `<FilterBar>` con dropdowns: Cliente (`<Select>` con opciones desde `useClients()`), Período (`<DatePicker.RangePicker>`), Responsable (`<Select>` desde `useUsers()`), Margen (`<Select>` con buckets <22% / 22-28% / >28%). Agregar botón "Limpiar filtros" (link). Persistir filtros en URL search params (usar `useSearchParams`).

4. Tabla `<Table>` AntD con columnas: checkbox, **Código** (link `/ordenes/:id`, color primary, tabular-nums), **Evento** (nombre + id pequeño), **Cliente**, **Responsable** (Avatar + nombre), **Entrega** (date), **Items** (numérico), **Total** (formateado con `Intl.NumberFormat` según moneda de la OS), **Margen** (color por bucket), **Estado** (`<StatusTag>`), kebab. Densidad `middle`, `rowSelection` activo.

5. Paginación AntD nativa (`pagination={{ pageSize: 25, showSizeChanger: true }}`).

6. **Estado vacío**: cuando `data?.length === 0` y sin filtros, mostrar `<Empty>` con CTA "Crear primera OS". Cuando hay filtros activos: `<Empty description="Sin resultados">` con botón "Limpiar filtros".

7. **Loading**: `<Skeleton active paragraph={{ rows: 8 }}/>` mientras `isLoading`.

### `OrderDetailPage.tsx` — cambios

Esta es la página más importante. Layout actual: tabla simple. Nuevo layout: **2 columnas (1fr 340px)**.

**Header**:
- `<PageHeader>` con título: código de OS + `<StatusTag>` inline.
- Meta: "Evento <bold>X</bold> · Cliente <bold>Y</bold> · Entrega <bold>fecha</bold>" + link a contrato si aplica.
- Actions: Duplicar, Exportar PDF (reusa `OrderPdf`), Generar OC (abre `CreatePurchaseOrderModal`), Aprobar (sólo si estado `in_review` y permiso).
- Tabs: `Items` (default), `Financiero`, `Documentos`, `Órdenes de Compra` (count), `Historial`.

**Tab `Items`** — columna principal:
1. Banner asistente IA (sólo si endpoint `/api/ai/order-suggestions/:id` devuelve sugerencias). Si no hay endpoint todavía, **omitir el banner por completo** — no inventar. Dejar `// TODO: integrar sugerencias IA cuando exista endpoint`.
2. Card "Items por capítulo" con header (acciones: + Item, + Capítulo, Importar plantilla, Expandir todo).
3. Por cada capítulo: header gris (chevron, nombre, count, subtotal), seguido de tabla con filas (código mono, recurso, cant, unid, precio, total, columna stock-check si el recurso tiene `stock_qty` en su `Resource`, kebab).
4. **Stock check**: comparar `item.quantity` con `resource.stock_qty`. Si `qty <= stock`: `<Tag color="success">✓ {stock} en stock</Tag>` minúsculo; si `qty > stock`: `<Tag color="error">⚠ falta {qty - stock}</Tag>`. Si no hay stock (servicios), no mostrar tag.

**Sidebar (340px)**:
1. Card "Resumen financiero": Subtotal · IVA 12% · Total grande primary. Sub-card verde con margen estimado y costo proveedor (si hay). Grid 2x2 de mini-stats: Items, Capítulos, Proveedores, OC asociadas.
2. Card "Evento": nombre, id, fecha, venue, dirección, link "Ver evento completo".
3. Card "Notas internas" (editable inline con `<Input.TextArea>` modo lectura/edición).
4. Card "Documentos" (lista pequeña con icono, nombre, size, autor, fecha).

**Tab `Historial`**: usa `<AuditTimeline>` ya existente con `entityType="ORDER"` y `entityId={id}`.

**Tab `Órdenes de Compra`**: tabla compacta filtrada por OS, con barra de recepción (`<Progress percent>`).

### Definición de tipos
Reusar `Order`, `OrderItem`, `OrderChapter` desde `apps/admin/src/api/orders.ts`. Si `OrderChapter` no existe pero los items tienen `chapterId`, hacer `groupBy` en cliente con `useMemo`.

**Termina la fase**: build, lint, PR.

---

## 4. Fase 3 · Wizard OS

Archivo: `apps/admin/src/pages/orders/OrderFormWizard.tsx` (existe, rediseñar).

1. Cambiar de form vertical a `<Steps>` AntD horizontal con 4 pasos: **Datos generales** · **Items y capítulos** · **Condiciones comerciales** · **Revisar y crear**.

2. Layout en cada paso: card central `maxWidth: 1100px`, padding 24, sombra. Footer con botones Atrás / Siguiente (primary).

3. **Paso 2 (el clave)**: split `300px 1fr`.
   - Izquierda: catálogo de recursos. Búsqueda + chips de categoría (`<Segmented>` o `<Tag.CheckableTag>`). Lista virtualizada si >100 items. Cada item: imagen/emoji opcional, nombre, código mono, precio, botón `+`.
   - Derecha: items en construcción agrupados por capítulo. Cada capítulo es un `<Collapse.Panel>` con header editable inline (nombre del capítulo). Tabla AntD compacta editable: cant (`<InputNumber>`), precio (`<InputNumber>`), total (calculado, read-only). Drag-handle para reordenar (usar `react-beautiful-dnd` SOLO si ya está en deps; si no, omitir DnD y dejar botones ▲▼).
   - Footer con totales en grid 1/3: Subtotal, IVA 12%, Total grande primary.

4. **Autosave de borrador**: al cambiar cualquier campo, debounce 800ms y `mutate` a `/api/orders/draft` (si existe endpoint). Mostrar "Borrador autoguardado a las HH:MM" en header del wizard. Si no existe endpoint de draft, omitir y dejar TODO.

5. **Paso 4**: render read-only de toda la cotización (preview del PDF lo más fiel posible al `OrderPdf` actual). Botón final: "Crear OS".

**Termina la fase**: build, lint, PR.

---

## 5. Fase 4 · Órdenes de Compra

Archivos:
- `apps/admin/src/pages/catalogs/purchaseOrders/PurchaseOrdersPage.tsx`
- `apps/admin/src/pages/catalogs/purchaseOrders/PurchaseOrderDetailPage.tsx`
- `apps/admin/src/pages/catalogs/purchaseOrders/PurchaseOrderWizard.tsx`

### Listado
- `<PageHeader>` igual que OS pero "Órdenes de Compra".
- Tabs por estado: `Todas`, `Borrador`, `Enviada`, `Confirmada`, `Recibida total`, `Recibida parcial`, `Anulada`.
- 4 `<StatCard>`: Comprometido este mes, Pendiente de recibir, Promedio entrega (días), Top proveedor.
- Tabla con columna especial **Recepción**: `<Progress percent={(received/items)*100} size="small" status={...}>` + texto `received/total`. Clave para visualización.

### Detalle
- 2 columnas (1fr 320px).
- Tabla de items con columna **Recibido** editable (`<InputNumber>`) y `<Tag>` de estado por línea.
- Sidebar: Resumen, Proveedor (con datos fiscales), Notas.
- Botón "Recibir mercancía" → modal/drawer que guarda en `warehouse.ts` API.

### Wizard
- Paso único, no multi-step (es derivado de una OS).
- Selectores arriba: Origen (OS), Proveedor, Almacén destino, Fecha emisión, Fecha entrega, Forma de pago.
- Tabla de items disponibles para ese proveedor desde la OS (filtrar `OrderItem` por `suggestedSupplierId === selectedSupplier`).
- Footer: Cancelar / Guardar borrador / Crear y enviar a proveedor.

Reutilizar `<CreatePurchaseOrderModal>` ya existente como base — comparar y consolidar para evitar duplicar lógica. Si conviene, refactorizar el modal para que use el mismo wizard como ruta dedicada.

**Termina la fase**: build, lint, PR.

---

## 6. Fase 5 · Catálogo de Recursos

Archivo: `apps/admin/src/pages/catalogs/resources/ResourcesPage.tsx`.

1. Layout: split `240px 1fr`.
2. **Sidebar de categorías**: card con lista jerárquica. "Todas" (selected default) + categorías con su count y swatch de color. Sub-categorías indentadas (sólo si la categoría está expandida). Categorías vienen de `useResourceCategories()` o equivalente; si no existe, derivar de `Resource[].category` con `useMemo`.
3. **Lista derecha**:
   - FilterBar con search + dropdowns Tipo/Almacén/Estado + toggle vista lista/grid (lista por default).
   - Tabla con columnas: checkbox, imagen (32px, fallback emoji por tipo), código mono, nombre + sublabel (unidad · almacén), categoría (`<Tag>`), tipo, costo, precio venta, **margen calculado** (`((precio - costo) / precio * 100).toFixed(0) + '%'`, color verde si ≥30%, ámbar 20-30%, rojo <20%), stock (numérico o `—` si servicio), estado, kebab.
4. Densidad `middle`. Click en fila → drawer lateral con detalle/edición (si ya existe modal, mantenerlo; si no, ruta dedicada).

**Termina la fase**: build, lint, PR.

---

## 7. Fase 6 · Listas de Precio (Cliente y Proveedor)

Archivos:
- `apps/admin/src/pages/catalogs/priceLists/PriceListsPage.tsx`
- `apps/admin/src/pages/catalogs/supplierPriceLists/SupplierPriceListsPage.tsx`

### `PriceListsPage` (Cliente) — patrón master-detail
- Layout split `1fr 380px`.
- Izquierda: tabla con columnas: Lista (icono + nombre + sublabel con clientes que la usan), Moneda (`<Tag>`), Items (numérico), Vigencia (rango fechas), Estado, kebab. Selección de fila (single).
- Derecha: card de detalle de la lista seleccionada — header con icono grande, nombre, código, botón Editar. Body con grid 2x2 de stats (Vigencia, Items, Descuento base, Eventos asociados), lista de "Clientes que la usan" (avatar + nombre), lista de "Reglas de precio" (bullet list de reglas categóricas).
- Si no hay selección: `<Empty description="Selecciona una lista para ver su detalle"/>`.

### `SupplierPriceListsPage` (Proveedor) — tabla simple
- Sin detalle lateral. Tabla con columnas: Proveedor (avatar+nombre), Lista (id mono), Moneda, Items, Vigencia, Condiciones (texto largo, ellipsis), Estado, kebab.
- FilterBar con dropdowns Estado y "Por vencer en N días".

**Termina la fase**: build, lint, PR.

---

## 8. Fase 7 · Clientes y Proveedores

Archivos:
- `apps/admin/src/pages/catalogs/clients/ClientsPage.tsx`
- `apps/admin/src/pages/catalogs/suppliers/SuppliersPage.tsx`

### `ClientsPage`
- `<PageHeader>` con tabs por estado (Todos, Activos, Prospectos, Inactivos).
- 4 `<StatCard>`: Total clientes, Activos, Top sector (texto), Facturado YTD.
- Tabla: avatar coloreado (hash del nombre → uno de 8 pares bg/fg), nombre + RFC mono, sector (`<Tag>` neutro), contacto principal (nombre + email), teléfono, eventos (numérico), facturado (currency), estado, kebab. Click en fila → `/catalogos/clientes/:id`.

### `SuppliersPage`
- Sin tabs. FilterBar con dropdowns Categoría / Estado / Rating.
- Tabla similar a Clientes pero con columnas: Proveedor (avatar+rfc), Categoría (`<Tag color="purple">`), Contacto, OC (numérico), Comprado YTD (currency), **Rating** (★ + número, color ámbar), Estado, kebab.

**Termina la fase**: build, lint, PR.

---

## 9. Fase 8 · Usuarios, Perfiles, Organizaciones

### Unificar Usuarios y Perfiles en una sola página

Crear nueva página `apps/admin/src/pages/catalogs/users/UsersAndProfilesPage.tsx` que reemplaza la nav actual de 3 entradas separadas (Usuarios internos, Usuarios portal, Perfiles) con **una sola página con tabs**.

Mantener archivos `UsersPage.tsx`, `PortalUsersPage.tsx`, `ProfilesPage.tsx` y montar su contenido como tabs. **Plan de migración del router**:

1. En `router/index.tsx`, agregar nueva ruta `/catalogos/usuarios-perfiles` → `<UsersAndProfilesPage>`.
2. Las rutas viejas (`catalogos/usuarios`, `catalogos/usuarios-portal`, `catalogos/perfiles`) se mantienen pero redirigen a la nueva con query param `?tab=internos|portal|perfiles`.
3. Actualizar el sidebar del `MainLayout` para que apunte sólo a la nueva ruta.

### `UsersAndProfilesPage` layout
- `<PageHeader>` título "Usuarios y Perfiles", meta "Cuentas de equipo interno, portal cliente, y matriz de permisos", actions `Invitar usuario` · `Crear perfil`.
- Tabs: Usuarios internos · Usuarios portal · Perfiles y permisos.
- **Tab Internos**: tabla con avatar, rol (`<Tag color="purple">`), depto, acceso (texto), último ingreso (mono), estado, kebab.
- **Tab Portal**: tabla con avatar azul, cliente, rol portal, eventos count, último ingreso, estado, kebab.
- **Tab Perfiles**: grid 2 columnas de cards. Cada card con borde-izquierdo de color, título + count de usuarios, descripción, lista de permisos con checkmarks coloreados.

### Organizaciones y Departamentos en una sola página

Archivo: `apps/admin/src/pages/catalogs/organizations/OrganizationsPage.tsx` (existe, expandir).

Layout split 1fr 1fr:
- Izquierda: lista de organizaciones (cada una como item: logo grande coloreado, nombre, badge "ACTUAL" en la activa, `<StatusTag>`, sublabel con país · usuarios · eventos · plan, botón "Cambiar"). Reusar `useOrganizationStore` para "actual".
- Derecha: tabla de departamentos de la organización seleccionada, con columnas: Departamento (icono + nombre + id mono), Responsable, Usuarios (numérico), Centro de costo (mono), kebab.

**Migrar `DepartmentsPage`**: redirigir su ruta a `OrganizationsPage` o mantenerla con un aviso de "esta sección se movió". Decisión: redirigir.

**Termina la fase**: build, lint, PR.

---

## 10. Tokens y estilos compartidos

En `apps/admin/src/styles/`, agregar `design-tokens.css`:

```css
:root {
  --iv-primary: #6B46C1;
  --iv-primary-bg: #f4eeff;
  --iv-primary-border: #d3adf7;
  --iv-success: #16a34a;
  --iv-warning: #f59e0b;
  --iv-error: #ef4444;
  --iv-info: #0ea5e9;
  --iv-text: rgba(0,0,0,0.88);
  --iv-text-secondary: rgba(0,0,0,0.65);
  --iv-text-muted: rgba(0,0,0,0.45);
  --iv-border: #f0f0f0;
  --iv-bg-subtle: #fafafa;
}

.iv-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: 'tnum'; }
.iv-num { font-variant-numeric: tabular-nums; }
.iv-uppercase-label { font-size: 11px; color: var(--iv-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
```

Importar desde `apps/admin/src/main.tsx` después del CSS de AntD.

---

## 11. Tipos y utilidades comunes

Crear `apps/admin/src/utils/format.ts` (si no existe equivalente):

```ts
export function formatMoney(n: number, currency = 'GTQ', locale = 'es-GT') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatPercent(n: number, decimals = 0) {
  return `${n.toFixed(decimals)}%`
}

export function getInitials(name: string) {
  return name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
}

const AVATAR_PALETTE = [
  ['#dbeafe', '#1e40af'], ['#fef3c7', '#92400e'], ['#fee2e2', '#991b1b'],
  ['#dcfce7', '#166534'], ['#e0e7ff', '#3730a3'], ['#fce7f3', '#9f1239'],
  ['#f3e8ff', '#6b21a8'], ['#fef9c3', '#854d0e'],
]

export function getAvatarColors(seed: string) {
  const hash = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0)
  const [bg, fg] = AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
  return { bg, fg }
}
```

---

## 12. Definition of Done por fase

- ✅ Build pasa: `pnpm -F admin build`
- ✅ Lint pasa: `pnpm -F admin lint`
- ✅ Sin errores de TypeScript
- ✅ Páginas navegables sin runtime errors (probar con `pnpm -F admin dev`)
- ✅ Estados loading/empty/error contemplados
- ✅ No hay `console.log` ni mocks `lorem ipsum` — todo viene de la API real
- ✅ Copy en español
- ✅ PR con título convencional y descripción de cambios
- ✅ Screenshot del antes/después en el PR

---

## 13. Lo que NO hacer

- ❌ No agregar dependencias nuevas (chart libs, dnd, etc.) sin avisar primero.
- ❌ No tocar `apps/portal`, `apps/tickets`, `apps/api` ni otros apps del monorepo.
- ❌ No cambiar el theme color primario de AntD ni el font stack.
- ❌ No mockear datos. Si un campo no existe en la API, dejarlo como `—` o TODO.
- ❌ No hacer un PR único — un PR por fase.
- ❌ No mezclar refactor de lógica con rediseño visual. Si encuentras un bug, anótalo en el PR pero arréglalo en commit aparte.

---

## 14. Referencia visual

El mockup de referencia (HTML standalone) está en el proyecto adjunto fuera del repo, archivo `IventIA Operaciones y Catalogos.html`. Las 13 pantallas mostradas ahí son la **fuente de verdad visual** para este rediseño:

1. Listado OS (estado activo, KPIs, fila seleccionada)
2. Detalle OS (capítulos colapsables, sidebar financiero)
3. Wizard OS (paso 2 con catálogo lateral)
4. Listado OC (con barra de recepción)
5. Detalle OC (con recepción editable)
6. Wizard OC (derivado de OS)
7. Recursos (sidebar categorías + tabla con margen)
8. Listas de Precio Cliente (master-detail)
9. Listas de Precio Proveedor
10. Clientes (KPIs + tabla con avatar)
11. Proveedores (con rating)
12. Usuarios + Portal + Perfiles (tabs unificados)
13. Organizaciones + Departamentos (split panel)

Si tienes acceso al HTML, pídele al usuario que te lo comparta o que abra el archivo en el navegador y pegue screenshots de cada artboard.

---

## 15. Comienzo

Empieza por **Fase 1** (primitives). Una vez aprobado ese PR, sigue con Fase 2. No saltes fases ni ejecutes en paralelo.

Al inicio de cada fase, lee primero el archivo actual para entender qué hay y qué patrones ya usa. Mantén lo que funcione bien (handlers, mutations, validaciones) y rediseña sólo el render layer.

Cuando termines toda la migración (Fase 8 mergeada), corre una pasada final de QA visual: navega cada ruta del admin, screenshot, y pega resumen en un issue final con título `chore(admin): admin redesign QA pass`.
