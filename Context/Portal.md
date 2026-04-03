# Portal de Expositores — IventIA

Implementar un portal público (en adelante **Portal**) al que acceden los Expositores autorizados para un evento específico. El Portal permite a los expositores solicitar productos y servicios, realizar pagos, consultar información del evento y colaborar con el equipo de Expo Santa Fe, sin necesidad de intervención manual del equipo administrativo.

---

## 1. Acceso y Autenticación

**Flujo de acceso:**
1. El administrador habilita el Portal para un evento desde la pestaña *Edición de Portal* del evento.
2. El cliente (Expositor) recibe por correo electrónico / WhatsApp un enlace de invitación con token de acceso único.
3. El Expositor accede al Portal y crea o confirma sus credenciales.
4. La sesión queda vinculada al Expositor y al evento correspondiente.

**Observaciones:**
- Un mismo Expositor puede estar vinculado a múltiples eventos; el Portal muestra únicamente los eventos a los que tiene acceso.
- La visibilidad del evento en el Portal se controla con el campo `portalEnabled` del evento.

---

## 2. Mis Datos

Sección donde el Expositor administra su información personal y fiscal.

| Campo | Descripción |
|-------|-------------|
| Nombre / Razón social | Nombre completo o nombre de la empresa |
| RFC / ID fiscal | Identificador fiscal del expositor |
| Dirección fiscal | Calle, número, colonia, ciudad, estado, CP |
| Correo electrónico | Correo de contacto y notificaciones |
| Teléfono | Número de contacto principal |
| Datos de contacto adicionales | Contactos secundarios (nombre, cargo, teléfono) |
| Logotipo | Imagen representativa del expositor |

**Funcionalidades:**
- Editar datos personales y fiscales
- Guardar cambios con validación de campos obligatorios
- Los datos fiscales se utilizan automáticamente en la generación de facturas

---

## 3. Mis Eventos

Vista resumen de todos los eventos a los que el Expositor tiene acceso.

**Listado de eventos:**
- Columnas: Nombre del evento, Fecha de inicio, Fecha de fin, Estatus, Acciones
- Acceso rápido al Portal del Evento desde cada fila

**Observaciones:**
- Solo se muestran eventos con `portalEnabled = true`
- El estatus del evento refleja el estado actual (Confirmado, En Ejecución, Cerrado)

---

## 4. Portal del Evento

Centro de información del evento para el Expositor. Accesible desde *Mis Eventos* al seleccionar un evento.

### 4.1 Información General del Evento

| Campo | Descripción |
|-------|-------------|
| Nombre del evento | Nombre oficial del evento |
| Descripción | Descripción pública configurada en *Edición de Portal* |
| Fechas de montaje | Fecha y hora de inicio / fin del montaje |
| Fechas del evento | Fecha y hora de inicio / fin del evento |
| Fechas de desmontaje | Fecha y hora de inicio / fin del desmontaje |
| Recinto / Ubicación | Dirección o nombre del espacio del evento |
| Documentos del evento | Archivos adjuntos públicos (reglamento, planos, etc.) |
| Imágenes del evento | Galería de imágenes asociadas al evento |

**Observaciones:**
- La información visible es la configurada por el administrador en la pestaña *Edición de Portal*
- El Expositor no puede editar esta información

### 4.2 Mi Stand

Información del stand asignado al Expositor dentro del evento.

| Campo | Descripción |
|-------|-------------|
| Código de stand | Identificador único del stand (ej. A-12) |
| Dimensiones | Metros cuadrados / configuración |
| Ubicación en plano | Referencia visual dentro del recinto |
| Notas del stand | Información adicional del stand |

---

## 5. Solicitud de Productos y Servicios

Módulo para que el Expositor realice nuevas órdenes de servicio desde el Portal.

**Flujo de solicitud (wizard):**

### Paso 1 — Selección de productos y servicios
- Se muestra el catálogo de recursos con `visible = true` en lista de precios del evento
- Columnas: Recurso, Descripción, Precio unitario, Cantidad
- El Expositor selecciona los recursos y define las cantidades
- Se aplica la lista de precios asignada al evento (precio anticipado / normal / tardío según fecha)

### Paso 2 — Resumen y fechas
- Resumen de los recursos seleccionados
- Selección de fechas de entrega por recurso (si aplica)
- Visualización del resumen financiero:
  - Subtotal
  - Descuentos aplicables
  - Impuestos
  - **Total**

### Paso 3 — Confirmación y pago
- Confirmación de la solicitud
- Selección de método de pago (transferencia, tarjeta, pago diferido)
- Generación de referencia de pago
- Envío de confirmación por correo electrónico al Expositor y notificación al equipo administrativo

**Observaciones:**
- Las solicitudes creadas desde el Portal generan una Orden de Servicio en el módulo Core con estatus *Prospectado*
- El equipo administrativo puede confirmar, modificar o rechazar la solicitud desde Core
- Los recursos con `visible = false` no aparecen en el catálogo del Portal

---

## 6. Mis Solicitudes

Historial de todas las órdenes de servicio creadas por el Expositor en el evento actual.

**Listado:**
- Columnas: Número de OS, Fecha, Productos/Servicios, Total, Estatus, Acciones
- Estatus posibles: Prospectado, Confirmado, En entrega, Entregado, Cancelado
- Acciones: Ver detalle, Descargar comprobante

**Detalle de solicitud:**
- Tabla de recursos con cantidades, precios y fechas de entrega
- Historial de cambios de estatus
- Comprobante de pago adjunto (si aplica)
- Factura digital (si fue emitida)

---

## 7. Documentos Compartidos

Sección para intercambio de documentos entre el Expositor y el equipo de Expo Santa Fe.

**Funcionalidades:**
- Subir documentos desde el Portal (contrato firmado, permiso de montaje, logotipos, etc.)
- Descargar documentos enviados por el equipo administrativo (facturas, contratos, reglamento)
- Columnas: Nombre del documento, Tipo, Fecha, Subido por, Acciones (ver / descargar / eliminar)

**Tipos de documento:**
- Contrato
- Factura
- Reglamento
- Permiso
- Plano
- Comprobante de pago
- Otro

---

## 8. Chatbot de Ayuda al Expositor

Asistente conversacional disponible en todas las secciones del Portal para resolver dudas frecuentes.

**Funcionalidades:**
- Respuestas automáticas a preguntas frecuentes (horarios, servicios disponibles, políticas de pago)
- Escalación a agente humano del equipo de Expo Santa Fe cuando la consulta no puede resolverse automáticamente
- Historial de conversaciones accesible para el Expositor y para el equipo administrativo desde Core

**Observaciones:**
- Las respuestas automáticas se configuran desde el módulo Core
- El chatbot tiene acceso a los datos del evento y del expositor para personalizar respuestas

---

## 9. Configuración del Portal desde Core (Admin)

El equipo administrativo controla el Portal desde el módulo Core en la pestaña **Edición de Portal** del evento.

| Campo | Descripción |
|-------|-------------|
| Visible en Portal | Activa o desactiva la visibilidad del evento en el Portal |
| Descripción del evento | Texto público visible para expositores |
| Imágenes del evento | Galería pública del evento |
| Documentos públicos | Archivos descargables para todos los expositores |
| Fecha límite de solicitudes | Fecha hasta la cual se aceptan nuevas solicitudes de OS |
| Permitir pago en línea | Activa el módulo de pago dentro del Portal |
| Mensaje de bienvenida | Texto personalizado en la pantalla de inicio del Portal |

---

## 10. Notificaciones

El Portal genera notificaciones automáticas en los siguientes eventos:

| Disparador | Canal | Destinatario |
|-----------|-------|--------------|
| Invitación al Portal | Correo + WhatsApp | Expositor |
| Nueva solicitud creada | Correo | Equipo admin |
| Cambio de estatus de OS | Correo + Portal | Expositor |
| Documento compartido | Correo + Portal | Expositor / Admin |
| Pago registrado | Correo | Expositor |
| Factura disponible | Correo + Portal | Expositor |

---

## 11. Consideraciones Técnicas

- El Portal es una aplicación web independiente del módulo Core, accesible desde un subdominio (ej. `portal.iventia.com`)
- La autenticación utiliza JWT con tokens de corta duración y refresh tokens
- usa el tipo de diseño de UI utilizada en el proyecto SAAS
- Los recursos visibles en el Portal se filtran por `visible = true` en el catálogo de recursos
- Las listas de precios aplicadas dependen de la fecha de solicitud (precio anticipado / normal / tardío)
- El Portal consume los mismos endpoints de la API que Core, con middleware de autorización específico para el rol `EXPOSITOR`
- Toda acción del Expositor queda registrada en el log de auditoría del sistema


También considera esta información:

Portal de Expositores

Dado que se contará con dos esquemas para la creación de órdenes de servicio: a través de IventIA Core (que permite al equipo de Expo Santa Fe gestionar ellos directamente las órdenes de servicio) y a través del Portal de Expositores (que permite que Expo Santa Fe designe a usuarios externos, idealmente personas que representan a un expositor para que accedan un portal público que les permita solicitar, pagar y recibir la facturación de sus órdenes de servicio en Expo Santa Fe) se establecen los siguientes procesos para el Portal de Expositores, tomado en cuenta estas premisas:

•	En cada evento, dentro de IventIA Core, el equipo de Expo Santa FE podrá generar una lista de códigos que podrán distribuir entre los expositores autorizados para operar dentro del mismo
•	El expositor, la primera vez que use el Portal de Expositores recibirá un código y una serie de instrucciones que incluyen:
•	La URL del Portal de Expositores
•	Acceder a la sección Mis Datos y elegir la opción “Registro inicial”, si es que es la primera vez que se usa el portal
•	Una vez dentro de esta opción, proporcionar el código que les fue entregado y proporcionar los datos personales:
•	Email
•	Nombre 
•	Contraseña
•	Persona física o moral  a la que representa (proveer datos legales y demográficos)

•	Si ya se ha usado previamente el Portal de Expositores , elegir la opción de “Iniciar sesión” y proporcionar email y contraseña
•	Al acceder se tendrán las siguientes opciones de navegación:
•	Mis Datos
•	Usuarios del Portal podrán auto administrar sus datos
•	Contraseña

•	Datos identitarios y demográficos
•	Datos fiscales y demográficos de las personas físicas o morales a las que representan
•	Mis Eventos
•	Lista de Eventos a los que el usuario del portal ha sido autorizado a acceder, se puede seleccionar uno para empezar las acciones siguientes
•	Portal del Evento
•	Información general del Evento
•	Datos generales del Evento ( fechas de montaje-inicio-fin, documentos anexos, etc.) 
•	Nueva solicitud de Productos y Servicios
•	Carrito de compras digital, creación de órdenes de servicio a través de un market place que permite agregar productos/servicios, consultando fácilmente la descripción visual,técnica, operativa y de venta de cada uno de ellos 
•	Métodos de pago en tiempo real o diferidos. Permite el pago en tiempo real a través del payment porta Stripe y el uso de una tarjeta de crédito. Lo orden de servicio será creada en el estado Pagada
•	También se permite seleccionar pagos diferidos: Cheque, Transferencia bancaria, Swift
•	Para este tipo de pago, la orden de servicio será creada en estado “Cotizada “
•	El usuario podrá anexar los documentos digitales que comprueben el pago, la hacerlo, el estado de la orden cambia  a “En revisión”
•	Consulta de órdenes de servicio anteriores de Productos y servicios
•	Consulta de Pagos y Facturas
		
•	Chatbot de ayuda al expositor
	Se proporciona una chatbot que resolverá dudas sobre el proceso de uso del Portal de Expositores, Lista de Precios, aspectos técnicos u operacionales de los productos/servicios, etc.

Aspectos técnicos
•	Infraestructura de la solución alojada en Microsoft Azure
•	Web Server, Database Server, monitoreo, balanceo de cargas, seguridad y control de identidad
•	Solución Web responsiva

