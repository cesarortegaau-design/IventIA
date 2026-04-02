# Funcionalidad nueva solución llamada IventIA

Implementar un módulo administrativo (el cual será llamado de aquí en adelante Core) cuya funcionalidad permita crear y administrar los siguientes catálogos: 

---
## 1. Catálogo de Recursos

**Categorías (pestañas):**
- Consumibles: Recursos físicos que se usan una sola vez, no regresan a almacén. Tienen un valor de Stock.
Se le puede asignar precio por unidad en la lista de precios. Ejemplos: papel higiénico, agua embotellada
- Equipos: Recursos físicos que existen en almacén. Cada recurso es una unidad, tienen un identificador para diferenciarlo. Se le puede agregar precio de renta en la lista de precios.Ejemplos: Computadora, proyector, pantalla
- Espacios: Son los espacios que tiene disponible un inmueble. Puede estar formado por otros espacios. Se puede reservar para un evento. Se le puede asignar un valor de renta en lista de precios.
- Mobiliario: Recursos físicos que existen en almacén. Cada recurso tiene un stock. Se le puede agregar precio de renta en la lista de precios.Ejemplos: sillas, mesas
- Servicios: Servicios que se pueden entregar en las órdenes de servicio. Se le puede agregar un precio en la lista de precios por unidad. Ejemplos: Servicio de Internet, servicio de limpieza, meseros, etc.

**Listado:**
- Columnas: Tipo de recurso, Nombre, Código de recurso, Activo, Visible

**Funcionalidades:**
- Buscador
- Agregar recurso
- Editar por registro
- Paginación con selector de registros por página
- Campos Activo y Visible para control de disponibilidad y visibilidad en portal

**Observaciones:**
- Catálogo muy flexible que cubre bienes físicos, servicios y conceptos contables
- Descuentos e Impuestos como tipos de recurso se manejan como líneas dentro de las OS
- El campo Visible controla qué recursos aparecen en el Portal de Expositores

---

## 7. Agregar / Editar Recurso

**Flujo wizard — 3 pasos:**
1. Seleccionar tipo de recurso
2. Datos sobre el recurso
3. Recurso en portal

### Paso 1 — Seleccionar tipo de recurso

| Campo | Descripción |
|-------|-------------|
| Tipo de recurso | Dropdown (Consumibles, Equipos, Espacios, Mobiliario, Personas, Servicios, Descuentos, Impuestos) |
| Código del recurso | Texto |
| Nombre | Texto |
| Visible | Sí / No |
| Impuesto(s) aplicable(s) | Selector |
| Notas | Texto libre |

### Paso 2 — Datos sobre el recurso

| Campo | Descripción |
|-------|-------------|
| Skill | Dropdown (para recursos tipo Personas) |
| Porcentaje de impuesto | Numérico |
| Ubicación de stock | Dropdown (ej. Bodega Sur) |
| Porcentaje de descuento | Numérico |
| Stock | Numérico |
| Metros cuadrados | Numérico (para Espacios) |
| Acción | Dropdown |
| Tiempos de recuperación | Numérico |
| Capacidad | Numérico |
| Dirección | Texto |
| Departamento | Dropdown (ej. Logística) |
| Checar stock | Sí / No |
| Checar duplicado | Sí / No |

**Observaciones:**
- Gestión de inventario físico con ubicación en bodega
- Tiempos de recuperación para controlar disponibilidad tras uso
- Metros cuadrados aplicable a recursos tipo Espacios
- Checar stock valida disponibilidad al agregar a una OS
- Checar duplicado previene asignación doble en una misma orden
- Departamento asocia el recurso a un área operativa

### Paso 3 — Recurso en portal

| Campo | Descripción |
|-------|-------------|
| Descripción | Texto público visible para expositores en el portal |
| Visible en | Portal (checkbox) |
| Adjuntar archivo | Upload de documento o imagen (ficha técnica, foto, etc.) |

## 2. Calendario de Eventos

**Ruta:** /evento/calendario

**Filtros disponibles:**
- Número de evento
- Cliente
- Evento
- Fecha inicial / Fecha final
- Espacio
- Tipo de evento
- Botones: Buscar / Limpiar

**Vista de calendario:**
- Visualización mensual con navegación por flechas
- Cada evento muestra su clave (EVN-#) y nombre
- Ejemplos: EVN-4 Israel Reyes, EVN-2 Feria Internacional Arte Capital 2025, EVN-5 Jose Antonio Soto, EVN-12 Calendario 2025

**Menú principal visible:**
- IventIA - Administra...
- IventIA - Market Pla...
- IventIA - Boletos
- Calendario
- Espacios
- Select / Steex / WhatsApp / Event Calendar

---

## 2. Dashboard del Evento

**Identificación:** EVN-2 — Feria Internacional Arte Capital 2025

Centro de control del evento que consolida en una sola vista todos los elementos relacionados: logística, finanzas, contratos y operaciones.

**Secciones:**

### Evento (datos generales)
- Nombre del evento, Cliente
- Horarios: Montaje / Evento / Desmontaje con fechas

### Órdenes de servicio
- Tabla: Número, Monto prospectado, Monto real, Departamento

### Contratos
- Tabla: Nombre, Estatus, Monto total, Monto devengado, Monto restante, Documento

### Facturación
- Tabla: Factura no., Cliente, Monto, Documento

### Lista de invitados
- Sección disponible (sin datos en muestra)

### Solicitud(es) reservada(s)
- Tabla: Nombre, Fecha/hora inicial de reserva, Fecha/hora final de reserva

### Agenda
- Tabla: Actividad padre, Fecha/hora inicial, Fecha/hora final, Espacio
- Actividades: Espacio, Montaje, Evento, Desmontaje

### Plan de pagos
- Tabla: Contrato, Pago, Monto total, Monto devengado, Monto restante

### Órdenes de compra
- Tabla: Número, Monto, Departamento

---

## 3. Órdenes de Servicio del Evento

**Contexto del evento:**
- Evento, Cliente, Fecha inicial, Fecha final

**Listado:**
- Columnas: Número, Actividad, Fecha inicial, Fecha final, Estatus, Total
- Total del evento visible al pie
- Estatus observado: Prospectado

**Funcionalidades:**
- Buscador
- Descargar Excel
- Agregar OS
- Editar / Eliminar por registro
- Paginación con selector de registros por página

**Observaciones:**
- El campo Actividad se relaciona con la fase del evento (Montaje, Evento, Desmontaje)
- El estatus "Prospectado" sugiere un flujo de estados (prospectado → confirmado → facturado)

---

## 4. Editar Orden de Servicio

**Flujo wizard — 2 pasos:**
1. Detalle de la orden de servicio
2. Encabezado de la orden de servicio

**Paso 1A — Definir cantidades y precios de recursos:**

Tabla de recursos con columnas:
- Recurso
- Fecha solicitud
- Fecha entrega
- Precio de lista
- Precio prospectado / Cantidad prospectada
- Precio real / Cantidad real
- Precio total prospecto / Precio total real
- Eliminar

**Resumen financiero:**
- Subtotal
- Descuento aplicado %
- Subtotal menos descuento
- Impuestos
- Total

**Paso 1B:** Seleccionar recursos de la lista de precios para la orden

**Observaciones:**
- Maneja precio prospectado vs precio real (estimación vs valor final confirmado)
- Aplica descuentos e impuestos a nivel de orden
- Distinción entre cantidad prospectada y cantidad real

---

## 5. Editar Evento

### Pestaña: Edición General

**Campos:**
- Nombre del evento
- Cliente
- Lista de precios (asignada al evento)
- Capacidad
- Estatus (ej. Prospectado)
- Notas
- Notas del cliente desde el portal

**Fechas y horarios por fase:**

| Fase | Fecha inicial | Hora | Fecha final | Hora |
|------|--------------|------|-------------|------|
| Montaje | 10/11/2025 | 02:00 p.m. | 12/11/2025 | — |
| Evento | 13/11/2025 | 11:00 a.m. | 16/11/2025 | 09:00 p.m. |
| Desmontaje | 17/11/2025 | 02:00 p.m. | 17/11/2025 | 08:00 p.m. |

**Observaciones:**
- El evento se divide en tres fases: Montaje, Evento y Desmontaje
- La Lista de precios se asigna al evento y es heredada por las órdenes de servicio
- El campo "Notas del cliente desde el portal" confirma integración con Portal de Expositores

### Pestaña: Edición Avanzada

**Campos (todos dropdowns con catálogos configurables):**
- Tipo (ej. Cultural)
- Coordinador (ej. IventIA)
- Clase (ej. Presentacion Producto)
- Ejecutivo (ej. IventIA)
- Categoría (ej. Grande)

**Observaciones:**
- Permite clasificar el evento por naturaleza, formato y tamaño
- Coordinador y Ejecutivo asignan responsables internos

### Pestaña: Edición de Portal

**Campos:**
- Descripción de evento (texto público para expositores)
- Visible en: Portal ✅ / Mosaico ✅
- Adjuntar imágenes

**Observaciones:**
- Controla visibilidad del evento en el Portal de Expositores
- "Mosaico" sugiere una vista tipo galería/tarjetas en el portal público
- Permite asociar imágenes al evento

---

