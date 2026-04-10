# FUNCIONAL DE COMPRAS Y ALMACÉN - IventIA

## 1.- ALCANCE DEL MÓDULO DE COMPRAS Y ALMACÉN

El módulo de Compras y Almacén de IventIA permite gestionar el ciclo completo de abastecimiento y existencias de recursos necesarios para la operación de eventos:

- **Catálogo de Proveedores:** Registro y administración de proveedores y sus contactos
- **Catálogo de Listas de Recurso/Costo por Proveedor:** Definición de recursos ofrecidos por cada proveedor con sus precios
- **Órdenes de Compra:** Creación y gestión de solicitudes de compra a proveedores
- **Solicitudes de Compra:** Generación automática a partir de Órdenes de Servicio confirmadas
- **Recepción de Recursos:** Ingreso de materiales al almacén general
- **Gestión de Almacén:** Control de existencias y disponibilidad de recursos

---

## 2.- FUNCIONALIDADES DE CONFIGURACIÓN

### 2.1 Catálogo de Proveedores

**Crear, actualizar y activar o inactivar proveedores**

Cada proveedor podrá ser definido en términos de:

- **Descripción y código clave**
  - Código único incremental asignado automáticamente (PROV-YYYY-NNN)
  - Nombre comercial del proveedor
  
- **Datos fiscales**
  - RFC (para proveedores nacionales)
  - TAX ID (para proveedores internacionales)
  - Régimen fiscal
  - Razón social
  
- **Datos de contacto**
  - Correo electrónico principal
  - Teléfono
  - WhatsApp
  - Sitio web (opcional)
  
- **Datos de ubicación**
  - Calle y número
  - Ciudad
  - Estado/Provincia
  - Código postal
  - País
  
- **Datos operacionales**
  - Tipo de proveedor: Distribuidor, Fabricante, Mayorista, Servicios
  - Plazo de entrega promedio (en días)
  - Forma de pago preferida
  - Número de días de crédito permitido
  - Moneda de operación (MXN, USD, EUR, etc.)
  
- **Funcionalidad de contactos**
  - Múltiples contactos por proveedor (gerente de ventas, facturación, logística)
  - Relación con proveedor y descripción del rol
  - Activar o inactivar contactos
  
- **Funcionalidad de documentos anexos**
  - Permite anexar cualquier tipo de documento digital (catálogos PDF, términos y condiciones, credenciales, etc.)
  
- **Estado del proveedor**
  - Activo: disponible para crear órdenes de compra
  - Inactivo: no disponible para nuevas órdenes
  - Bloqueado: sin transacciones hasta revisión
  
- **Privilegios requeridos:** Solo usuarios con privilegio `CATALOG_SUPPLIERS_MANAGE` pueden crear, actualizar proveedores

---

### 2.2 Catálogo de Listas de Recurso/Costo por Proveedor

**Crear, actualizar y activar o inactivar listas de precios de proveedores**

Cada lista de recurso/costo podrá ser definida en términos de:

- **Datos generales**
  - Identificador único (auto-asignado)
  - Proveedor al que pertenece la lista
  - Código de lista (PLST-PROV-YYYY-NNN)
  - Descripción o nombre comercial
  
- **Vigencia de precios**
  - Fecha de inicio de validez
  - Fecha de fin de validez (opcional - vigencia indefinida)
  - Estado: Activa, Vencida, Próxima a vencer (warnings)
  
- **Condiciones comerciales**
  - Cantidad mínima de orden
  - Cantidad máxima de orden (opcional)
  - Descuento por volumen (escala de cantidades)
  - Días de crédito permitidos
  - Moneda de lista (puede diferir de la del proveedor)
  - Margen de utilidad sugerido para venta interna (%)
  
- **Funcionalidad de agregar o inactivar artículos del catálogo de recursos**
  - Cada recurso/producto en la lista podrá ser definido en términos de:
  - Referencia al Recurso del catálogo de IventIA Core
  - Código de referencia del proveedor (SKU proveedor)
  - Precio unitario
  - Unidad de medida (según la definida en el recurso)
  - Disponibilidad estimada
  - Tiempo de entrega (en días, puede variar según cantidad)
  - Activo o inactivo en la lista
  
- **Estado del recurso en lista**
  - Disponible: en stock del proveedor
  - Por encargo: requiere tiempo de producción
  - Descontinuado: ya no lo ofrece el proveedor
  - Agotado temporalmente: será reprogramado
  
- **Privilegios requeridos:** Solo usuarios con privilegio `CATALOG_SUPPLIER_PRICES_MANAGE` pueden crear, actualizar listas de precios

---

## 3.- FUNCIONALIDAD DE SOLICITUDES DE COMPRA Y ÓRDENES DE COMPRA

### 3.1 Proceso General

El flujo de compras en IventIA consta de dos momentos interconectados:

1. **Solicitud de Compra:** Generada automáticamente a partir de una Orden de Servicio confirmada, O creada manualmente por usuario
2. **Orden de Compra:** Documento enviado al proveedor solicitando los recursos

**Nota importante sobre Recursos:**
- Las líneas de Orden de Compra **referencian directamente el catálogo de Recursos existente** de IventIA Core (tabla `Resource`)
- No se duplican datos de recursos; se utiliza el mismo `resourceId` y datos (código, nombre, unidad, tipo)
- Esto permite: (a) trazabilidad completa del recurso desde compra → almacén → orden de servicio, (b) inventario unificado, (c) sincronización automática con existencias

---

### 3.2 Generación de Solicitud de Compra desde Orden de Servicio Confirmada

**Cuando una Orden de Servicio es confirmada:**

- El sistema evalúa cada línea de la orden (producto/servicio)
- Para cada recurso en la orden, busca en qué listas de precios de proveedores está disponible
- Presenta al usuario una **pantalla de selección de proveedores** indicando:
  - Recurso requerido
  - Cantidad requerida
  - Proveedores disponibles que ofrecen el recurso
  - Para cada proveedor:
    - Precio unitario (de su lista de recurso/costo)
    - Plazo de entrega
    - Disponibilidad estimada
    - Cantidad mínima de orden (si aplica)

**El usuario puede:**

- Aceptar la sugerencia de proveedor automática (por defecto, el de menor precio y mejor disponibilidad)
- Cambiar manualmente el proveedor sugerido
- Cambiar la cantidad a comprar (respetando mínimos si aplica)
- Agregar notas o especificaciones especiales para ese recurso
- Aplazar la compra de ciertos recursos (marcarlos como "no comprar ahora")
- Seleccionar múltiples proveedores para el mismo recurso (si se requieren múltiples fuentes)

**Resultado:**

- El sistema agrupa automáticamente los recursos seleccionados **por proveedor**
- Genera una **Orden de Compra por cada proveedor** con los recursos asignados
- Las órdenes de compra quedan en estado **"Borrador"** listas para revisión

---

### 3.2.1 Creación Manual de Orden de Compra (Directa)

**Alternativamente, un usuario puede crear una Orden de Compra directamente sin partir de una Orden de Servicio:**

El usuario puede:
1. **Seleccionar un Proveedor** de la lista activa
2. **Seleccionar una Lista de Recurso/Costo** del proveedor
3. **Agregar líneas manualmente:**
   - Seleccionar recurso del catálogo de Recursos
   - Ingresar cantidad
   - El sistema obtiene automáticamente el precio unitario de la lista de precios del proveedor
   - Permitir modificar precio (si aplica)
   - Agregar notas/especificaciones
4. **Revisar totales** (subtotal, impuestos, total)
5. **Confirmar y enviar** al proveedor

**Caso de uso:** 
- Reposición de stock por debajo de mínimos
- Compras preventivas
- Respuesta a promociones de proveedores
- Compras urgentes no originadas en una OS

**Resultado:** Orden de Compra en estado "Borrador", lista para revisión y confirmación.

---

### 3.3 Orden de Compra

**Estado inicial: "Borrador"**

La orden de compra requiere los siguientes datos:

- **Datos de referencia**
  - Número de orden de compra auto-asignado (OC-YYYY-NNNN)
  - Proveedor
  - Orden de servicio origen (referencia a la OS de donde surgió)
  - Fecha de creación
  
- **Datos generales**
  - Descripción o concepto general
  - Fecha requerida de entrega
  - Lugar de entrega (ubicación del evento o almacén)
  - Contacto proveedor responsable
  - Centro de costo o evento asociado
  
- **Líneas de la orden de compra**
  - **Recurso:** Referencia directa a tabla `Resource` (misma utilizada en Órdenes de Servicio)
    - Código del recurso (ej: "HAM-001")
    - Nombre del recurso
    - Unidad de medida
    - Tipo de recurso
  - Cantidad a comprar
  - Precio unitario (tomado automáticamente de la lista de recurso/costo del proveedor, editable si aplica)
  - Referencia del proveedor (SKU proveedor, si difiere)
  - Precio total línea (cantidad × precio unitario)
  - Notas o especificaciones especiales (ej: "entrega en evento X", "empaque especial")
  
- **Resumen totales**
  - Subtotal
  - Impuestos (IVA u otros, según país)
  - Total a pagar
  - Moneda
  
- **Funcionalidad de documentos anexos**
  - Permite anexar documentos (órdenes de producción, especificaciones técnicas, etc.)

**Acciones en estado "Borrador":**

- Modificar líneas de la orden (cantidad, proveedor, precio)
- Agregar o quitar líneas
- Editar datos generales
- Cambiar proveedor completo (reorganiza líneas)
- Cancelar la orden
- **Confirmar la orden:** Cambia a estado "Confirmada", genera notificación al proveedor

---

### 3.3.1 Flujos de Creación de Orden de Compra (Resumen)

**Hay DOS formas de crear una Orden de Compra:**

#### **Flujo 1: Automático desde Orden de Servicio Confirmada**
```
Orden de Servicio (Confirmada)
    ↓
    Usuario hace clic en "Generar Orden de Compra"
    ↓
    Sistema presenta pantalla de selección de proveedores
    (agrupa recursos por proveedor disponible)
    ↓
    Usuario selecciona proveedores para cada recurso
    ↓
    Sistema auto-agrupa y crea OCs por proveedor (Borrador)
    ↓
    Usuario revisa, ajusta si es necesario, y confirma OCs
```

#### **Flujo 2: Manual/Directo desde Módulo de Compras**
```
Usuario accede a "Crear Orden de Compra" > Opción Manual
    ↓
    Selecciona Proveedor
    ↓
    Selecciona Lista de Recurso/Costo del proveedor
    ↓
    Agrega líneas manualmente:
    - Selecciona Recurso del catálogo (tabla Resource)
    - Ingresa cantidad
    - Sistema obtiene precio de la lista de precios
    ↓
    Revisa totales
    ↓
    Confirma y envía al proveedor
```

**Ambos flujos resultan en:** Orden de Compra en estado "Borrador" → "Confirmada" → recepción en almacén.

---

### 3.4 Estados de la Orden de Compra

El ciclo de estados es el siguiente:

**Borrador** → **Confirmada** → **Parcialmente Recibida** → **Recibida** → **Facturada**
                      ↓
                  **Cancelada**

**Transiciones permitidas:**

- **Borrador:**
  - → Confirmada (usuario envía orden)
  - → Cancelada (usuario cancela)
  
- **Confirmada:**
  - → Parcialmente Recibida (al recibir parte de los recursos)
  - → Recibida (al recibir todos los recursos)
  - → Cancelada (si proveedor rechaza o cambios de planes)
  
- **Parcialmente Recibida:**
  - → Recibida (al recibir los recursos pendientes)
  - → Cancelada (si se cancela lo pendiente)
  
- **Recibida:**
  - → Facturada (una vez se recibe la factura del proveedor)
  
- **Facturada:**
  - (estado final, solo se puede crear nota de crédito)

---

### 3.5 Acciones por Estado

**Estado "Confirmada":**

- Generar reportes en PDF o Excel
- Enviar orden al proveedor (email, portal, etc.)
- Agregar anexos (cambios, especificaciones)
- Realizar seguimiento de entrega
- Recibir recursos en almacén
- Cambiar a "Parcialmente Recibida" o "Cancelada"

**Estado "Parcialmente Recibida" o "Recibida":**

- Ver detalles de lo recibido vs. lo ordenado
- Generar reportes de discrepancias
- Registrar la factura del proveedor
- Cambiar a "Facturada"

**Estado "Facturada":**

- Generar nota de crédito (si aplica)
- Realizar auditoría de pago
- Cierre de orden

---

## 4.- PROCESO DE RECEPCIÓN DE RECURSOS EN ALMACÉN

### 4.1 Registro de Recepción

**Cuando los recursos llegan al almacén general:**

El encargado del almacén realiza lo siguiente:

1. **Identifica la Orden de Compra** asociada (escanea código QR o ingresa número)

2. **Registra la recepción:**
   - Recurso recibido
   - Cantidad recibida
   - Fecha y hora de recepción
   - Condición del recurso (bueno, dañado, falta embalaje, etc.)
   - Notas observadas
   - Ubicación en almacén donde se coloca
   - Persona responsable de la recepción

3. **Validación:**
   - Compara cantidad recibida vs. cantidad ordenada
   - Si hay discrepancias, marca como "Recepción Parcial"
   - Si hay daños, genera una incidencia para resolver con el proveedor

4. **Actualización de estado:**
   - Si se recibe la totalidad: Orden → "Recibida"
   - Si se recibe parte: Orden → "Parcialmente Recibida"

---

### 4.2 Documento de Recepción

Se genera automáticamente un **Comprobante de Recepción** que incluye:

- Número de orden de compra
- Fecha de recepción
- Recursos recibidos con cantidades
- Discrepancias (si las hay)
- Observaciones del almacén
- Firma digital del encargado
- Este documento es anexado a la Orden de Compra

---

## 5.- FUNCIONALIDAD DE ALMACÉN Y GESTIÓN DE EXISTENCIAS

### 5.1 Catálogo de Almacenes

**Crear y administrar almacenes:**

- **Datos generales**
  - Código de almacén
  - Nombre (ej: "Almacén Principal", "Almacén Eventos", etc.)
  - Descripción
  
- **Ubicación**
  - Dirección
  - Responsable
  
- **Características**
  - Capacidad máxima (metros cuadrados o volumen)
  - Condiciones especiales (temperatura controlada, cerrado, abierto, etc.)
  
- **Permisos de acceso**
  - Usuarios autorizados a recibir/registrar recursos

---

### 5.2 Registro de Existencias por Recurso

**Estructura de inventario:**

Para cada Recurso en el Almacén se mantiene:

- **Cantidad en stock:**
  - Cantidad total disponible
  - Cantidad reservada (comprometida para órdenes de servicio en ejecución)
  - Cantidad disponible para venta = Total - Reservada
  
- **Movimientos de inventario:**
  - Entrada (desde orden de compra recibida)
  - Salida (hacia orden de servicio en ejecución)
  - Ajuste (correcciones, pérdidas, deterioros)
  - Devolución (recursos devueltos de una orden)
  
- **Información de control:**
  - Existencia mínima (punto de reorden)
  - Existencia máxima (capacidad del almacén)
  - Último movimiento (fecha y tipo)
  - Ubicación física en almacén (pasillo, estante, etc.)
  - Lote o número de serie (si aplica)
  - Fecha de caducidad o vigencia (si aplica)

---

### 5.3 Automatización: Recurso Descargado = Actualización de Existencias

**Cuando se registra la recepción de un recurso en almacén:**

1. El sistema obtiene la información:
   - Código del recurso
   - Cantidad recibida
   - Almacén destino
   
2. Automáticamente:
   - **Incrementa** la "Cantidad en stock" del recurso
   - Registra un movimiento de inventario tipo "Entrada"
   - Actualiza la fecha de último movimiento
   - Evalúa si la cantidad alcanza el máximo del almacén (warning si aplica)
   
3. **Validación de existencias:**
   - Si la cantidad alcanza la existencia máxima, emite alerta "Almacén lleno"
   - Si existencia < existencia mínima (aún después de recibir), emite alerta "Punto de reorden alcanzado"

---

### 5.4 Movimientos de Inventario

**Movimiento: Entrada (Recepción de OC)**

```
Fecha: [fecha recepción]
Tipo: ENTRADA
Origen: Orden de Compra [OC-YYYY-NNNN]
Recurso: [Código y nombre]
Cantidad: [qty]
Almacén: [almacén destino]
Saldo Anterior: [antes]
Saldo Nuevo: [después]
Responsable: [usuario almacén]
Observaciones: [notas de recepción]
```

**Movimiento: Salida (Asignación a Orden de Servicio)**

```
Fecha: [fecha asignación]
Tipo: SALIDA
Destino: Orden de Servicio [OS-YYYY-NNNN]
Recurso: [Código y nombre]
Cantidad: [qty]
Almacén: [almacén origen]
Saldo Anterior: [antes]
Saldo Nuevo: [después]
Responsable: [usuario operaciones]
Observaciones: [notas]
```

**Movimiento: Ajuste (Correcciones, pérdidas, devoluciones)**

```
Fecha: [fecha ajuste]
Tipo: AJUSTE | PERDIDA | DEVOLUCION
Motivo: [descripción]
Recurso: [Código y nombre]
Cantidad: [qty positiva o negativa]
Almacén: [almacén afectado]
Saldo Anterior: [antes]
Saldo Nuevo: [después]
Responsable: [usuario que registra]
Observaciones: [razón del ajuste]
Autorizado por: [usuario con privilegio]
```

---

### 5.5 Reportes de Almacén

**Disponibles para consulta y exportación:**

1. **Reporte de Existencias Actual**
   - Por almacén, por recurso
   - Cantidad en stock, reservada, disponible
   - Valor monetario del inventario (costo)
   - Recursos bajo existencia mínima
   - Recursos sobre existencia máxima

2. **Movimientos de Inventario**
   - Por período de fechas
   - Por tipo de movimiento
   - Por recurso
   - Trazabilidad completa de entradas/salidas

3. **Reporte de Órdenes de Compra Pendientes de Recepción**
   - Qué órdenes están en tránsito
   - Plazo de entrega esperado
   - Cantidad pendiente de recibir

4. **Análisis de Rotación de Inventario**
   - Recursos de rápido movimiento
   - Recursos estancados
   - Sugerencias de ajuste de mínimos/máximos

5. **Auditoría de Inventario**
   - Trazabilidad de cambios
   - Usuarios responsables
   - Fechas de cambios
   - Diferencias vs. último conteo físico

---

## 6.- INTEGRACIÓN CON ÓRDENES DE SERVICIO Y USO DE TABLA RESOURCE

### 6.1 Flujo Integrado

```
Orden de Servicio (OS) — usa recursos del catálogo (Resource table)
    ↓
    (Confirmada)
    ↓
    Sistema evalúa recursos necesarios (mismos recursos de la tabla Resource)
    ↓
    Presenta pantalla de selección de proveedores
    (usuario selecciona proveedor por cada recurso)
    ↓
    Genera Orden(es) de Compra (OC)
    en estado "Borrador"
    (OC líneas referencian los mismos recursos de la tabla Resource)
    ↓
    Usuario revisa, confirma y envía OC
    ↓
    Proveedor envía recursos
    ↓
    Almacén recibe y registra
    (ingresa cantidades contra el resourceId de la tabla Resource)
    ↓
    Existencias en Almacén se actualizan
    (tabla Inventory/ResourceInventory, mismos resourceIds)
    ↓
    Recursos están disponibles para la OS
    ↓
    Operaciones retira del almacén para OS
    (descuenta del inventario por resourceId)
    ↓
    Existencias disminuyen ("Salida")
```

**Ventaja clave:** Un solo catálogo de Recursos (`Resource` table) es utilizado por:
- Órdenes de Servicio (qué se vende/se ofrece al cliente)
- Órdenes de Compra (qué se compra a proveedores)
- Almacén (inventario de qué se tiene en stock)
- Pricing (pricing lists de proveedores)

Esto garantiza **trazabilidad 100% del recurso** desde compra hasta entrega.

### 6.2 Reserva de Recursos

**Cuando una Orden de Servicio es confirmada:**

- El sistema **reserva** los recursos necesarios del almacén
- Calcula: "Cantidad en stock" - "Cantidad a usar en OS" = nuevas existencias disponibles
- Si no hay suficiente inventario:
  - Emite alerta al usuario
  - Sugiere crear Orden de Compra automáticamente
  - Permite confirmar OS con recursos pendientes de llegar (back-order)

---

## 7.- PRIVILEGIOS REQUERIDOS

Para acceder a funcionalidades de Compras y Almacén, se requieren los siguientes privilegios:

| Funcionalidad | Privilegio | Descripción |
|---|---|---|
| **Proveedores** | `CATALOG_SUPPLIERS_MANAGE` | Crear, editar, inactivar proveedores |
| **Listas de Precio Proveedores** | `CATALOG_SUPPLIER_PRICES_MANAGE` | Crear, editar listas de recurso/costo |
| **Órdenes de Compra - Crear** | `PURCHASE_ORDER_CREATE` | Crear órdenes de compra |
| **Órdenes de Compra - Confirmar** | `PURCHASE_ORDER_CONFIRM` | Confirmar órdenes (enviar a proveedor) |
| **Órdenes de Compra - Editar** | `PURCHASE_ORDER_EDIT` | Editar órdenes en estado Borrador |
| **Órdenes de Compra - Ver** | `PURCHASE_ORDER_VIEW` | Consultar órdenes de compra |
| **Recepción en Almacén** | `WAREHOUSE_RECEIVE` | Registrar recepción de recursos |
| **Almacén - Consultar** | `WAREHOUSE_VIEW` | Consultar existencias y movimientos |
| **Almacén - Ajustar** | `WAREHOUSE_ADJUST` | Hacer ajustes de inventario |
| **Solicitud de Compra** | `PURCHASE_REQUEST_GENERATE` | Generar solicitudes desde OS confirmadas |

---

## 8.- ESTADOS DE ÓRDENES DE COMPRA (RESUMEN)

• **Borrador** — Orden en edición, no enviada aún
• **Confirmada** — Orden enviada al proveedor, pendiente recepción
• **Parcialmente Recibida** — Se ha recibido parte de los recursos
• **Recibida** — Todos los recursos han llegado, pendiente factura
• **Facturada** — Factura registrada, orden cerrada
• **Cancelada** — Orden cancelada (por usuario o proveedor)

---

## 9.- FLUJO DE SOLICITUD DE COMPRA - RESUMEN

1. **Orden de Servicio confirmada** → Trigger automático
2. **Sistema analiza recursos** de la OS
3. **Usuario selecciona proveedores** para cada recurso (con sugerencias)
4. **Sistema agrupa por proveedor** y crea Órdenes de Compra (Borrador)
5. **Usuario revisa** y confirma órdenes
6. **Sistema notifica** al proveedor
7. **Proveedor envía recursos**
8. **Almacén recibe** y registra entrada
9. **Existencias se actualizan** automáticamente
10. **Recursos listos** para la Orden de Servicio

---

## 10.- NOTAS ARQUITECTÓNICAS

### Uso de Tabla Resource (IventIA Core)

**Diseño de datos:**
- `PurchaseOrderLineItem.resourceId` → Foreign Key a `Resource` table
- `SupplierPriceListItem.resourceId` → Foreign Key a `Resource` table
- `ResourceInventory.resourceId` → Foreign Key a `Resource` table
- `OrderLineItem.resourceId` (SO) → Foreign Key a `Resource` table (ya existe)

**Esto significa:**
- NO hay tabla separada para "productos de compra"
- Un mismo `Resource` puede ser: vendido en SO, comprado a proveedor, guardado en almacén
- Al crear PO desde SO, los `resourceId` se copian directamente
- Sincronización automática de cambios (si un recurso cambia de código/nombre, se ve en toda la cadena)

**Implicaciones para Supplier Price List:**
- `SupplierPriceListItem` contiene:
  - `resourceId` (referencia a Resource)
  - `supplierSku` (código del proveedor, puede diferir del código de IventIA)
  - `price` (precio del proveedor)
  - Otros datos comerciales

---

- **Multi-tenancy:** Todas las órdenes de compra, almacenes y movimientos se filtran por `tenantId`
- **Auditoría completa:** Todos los movimientos de inventario registran usuario y fecha
- **Alertas:** Sistema emite warnings sobre:
  - Existencia baja (bajo mínimo)
  - Existencia alta (sobre máximo)
  - Órdenes vencidas sin recepción
  - Discrepancias en recepción
- **Integración contable:** Las órdenes de compra facturadas generan asientos contables (costo de ventas)
- **Versionado:** Próximas mejoras incluyen:
  - Predicción de demanda basada en histórico de OS
  - Sugerencias automáticas de reorden
  - Análisis de proveedores (precio, calidad, puntualidad)
  - Devoluciones y garantías con proveedores
