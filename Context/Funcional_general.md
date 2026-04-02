1.- Implementar un módulo administrativo (el cual será llamado de aquí en adelante IventIA Core) cuya funcionalidad permita crear y administrar: 
- Productos y Servicios
- Departamentos operativos
- Listas de precio
- Clientes (también definidos como Expositores que son Personas físicas o morales)
- Privilegios y Usuarios
- Eventos
- Stands
- Órdenes de servicio
- Solicitud de Facturas y Notas de crédito.


2.- Crear y administrar un Portal de Expositores con Market Place con las siguientes características:
- Mis Datos (administración de datos personales y fiscales del usuario)
- Mis Eventos (eventos a los que el usuario está relacionado)
- Portal del Evento 
	- Información general del Evento
- Nueva solicitud de Productos y Servicios
	- Solicitudes anteriores de Productos y servicios	
- Chatbot de ayuda al expositor.


	
3.	ALCANCE
El siguiente alcance de trabajo se basa en la comprensión actual de IventIA de las necesidades, el presupuesto y el cronograma del Cliente.
Se recibe el siguiente requerimiento por parte del área Administración e Información Comercial y del área de TI para una solución de software, el cual consiste en:


IventIA Core

1.- El módulo administrativo IventIA Core permitirá gestionar los roles y privilegios para usuarios, catálogos y flujos de trabajo necesarios para lograr los objetivos previamente descritos:


Funcionalidades de Configuración

Catálogo de productos y servicios	
•	Crear, actualizar y activar o inactivar productos y servicios
•	Cada producto/servicio podrá ser definido en términos de:
•	Descripción y código clave
•	Tipo: Consumible, Mobiliario o Equipo
•	Unidad de medida: unidades, metros, litros, turnos, etc.
•	Departamento operacional al que pertenece
•	Solo un rol o usuario (ajeno al personal administrador ) puede tener la facultad de utilizar esta opción.

Catálogo de departamentos operativos
•	Crear, actualizar y activar o inactivar departamentos operativos
•	Cada departamento operativo podrá ser definido en términos de:
•	Descripción y código clave
•	Tipo: Interno o Externo
•	Usuarios que están asignados al departamento operacional
•	Solo un rol o usuario (ajeno al personal administrador ) puede tener la facultad de utilizar esta opción.

Catálogo de listas de precio
•	Crear, actualizar y activar o inactivar listas de precio
•	Cada lista de precios podrá ser definida en términos de:
•	Descripción y código clave
•	Fecha inicial y final de disponibilidad
•	Fechas de inicio para precio anticipado, normal y tardío
•	Porcentaje de descuento autorizado
•	Departamento operativo (no obligatorio)
•	Funcionalidad de agregar o inactivar artículos del catálogo de productos y servicios
•	Cada producto/servicio podrá ser definido en términos de:
•	Precio anticipado, normal y tardío
•	Activo o inactivo
•	Solo un rol o usuario (ajeno al personal administrador ) puede tener la facultad de utilizar esta opción.

Catálogo de Clientes (Expositores)
•	Crear, actualizar y activar o inactivar clientes
•	Cada cliente podrá ser definido en términos de:
•	Descripción y código clave

•	Datos fiscales, incluyendo RFC para clientes nacionales o TAX ID para clientes internacionales
•	Datos demográficos
•	Tipo: persona física o persona moral
•	Origen: nacional o internacional
•	Funcionalidad de documentos anexos
•	Permite anexar cualquier tipo de documento digital a la ficha del cliente (Office, PDF’s, imágenes, etc.)
•	Funcionalidad de relaciones
•	Las personas físicas podrán ser relacionadas a una persona moral, como:
•	Representante
•	Representante legal
•	Contacto de Facturación
•	Las relaciones pueden ser activadas o inactivadas
•	Solo un rol o usuario (ajeno al personal administrador ) puede tener la facultad de utilizar esta opción.

Catálogo de Usuarios y privilegios
•	Crear, actualizar y activar o inactivar usuarios
•	Cada usuario podrá ser definido en términos de:
•	Descripción y código clave
•	Datos personales (Nombre, email, número de Whatsapp)
•	Departamento operacional
•	Funcionalidad de documentos anexos
•	Permite anexar cualquier tipo de documento digital a la ficha del cliente (Office, PDF’s, imágenes, etc.)
•	Funcionalidad de privilegios
•	Asignar privilegios de una lista de privilegios generales de IventIA, tales como:
•	Acceso por departamento operacional
•	Funcionalidad de asignar departamento operacional al usuario
•	Tipo usuario: normal, administrador, consulta
•	Creación y modificación de eventos por estado del evento
•	Creación y modificación de órdenes de servicio por estado de la orden
•	Asignación de descuentos en órdenes de servicio
•	Solo un rol o usuario (ajeno al personal administrador ) puede tener la facultad de utilizar esta opción.



Catálogo de Eventos
•	Crear, actualizar y cancelar eventos
•	Cada evento podrá ser definido en términos de:
•	Descripción y código clave
•	Datos generales, fechas de inicio y fin, cliente, número de visitantes, etc.
•	El evento tiene la posibilidad de ser asignado a un estado:
•	Cotizado
•	Confirmado
•	En ejecución
•	Cerrado
•	Cancelado
•	Datos demográficos (tipo, clase, origen, etc.)
•	Origen: nacional o internacional
•	Funcionalidad de documentos anexos
•	Permite anexar cualquier tipo de documento digital a la fiche del cliente (Office, PDF’s, imágenes, etc.)
•	Funcionalidad de reservas
•	Se especifica en qué espacios y fechas sucede el evento
•	Solo un rol o usuario (ajeno al personal administrador ) puede tener la facultad de utilizar esta opción.

Catálogo de Stands
•	Crear, actualizar e inactivar stands. Cada evento tiene la funcionalidad de agregar una lista de Stands
•	Cada stand podrá ser definido en términos de:
•	Descripción y código clave
•	Datos definitorios (frente, fondo, etc.)
•	Cliente
•	Funcionalidad de documentos anexos
•	Permite anexar cualquier tipo de documento digital a la ficha del cliente (Office, PDF’s, imágenes, etc.)

Aspectos técnicos
•	Infraestructura de la solución alojada en Microsoft Azure
•	Web Server, Database Server, monitoreo, balanceo de cargas, seguridad y control de identidad
•	Solución Web responsiva




Funcionalidad de órdenes de servicio

La creación y gestión de órdenes de servicio dentro de Core IventIA implica lo siguiente:

•	Las órdenes se crean dentro de un evento y necesitan dos datos iniciales importantes: un cliente y una lista de precios 
•	La orden de servicio nace en un estado inicial de “Cotizada” y con un número identificador incremental 
que IventIA asigna automáticamente, llamado Número de Orden . Se deben proporcionar los siguientes datos:

•	Cliente
•	Cliente para facturar
•	Lista de Precios
•	Datos generales, fechas de inicio y fin, etc.
•	Stand (no obligatorio)
•	Departamento operacional (no obligatorio)
•	Funcionalidad de documentos anexos
•	Permite anexar cualquier tipo de documento digital a la ficha del cliente (Office, PDF’s, imágenes, etc.)
•	Funcionalidad de agregar/modificar productos o servicios contenidos en la lista de precios	
•	Asignar cantidad requerida a cada producto/servicio
•	Agregar observaciones al producto/servicio (no obligatorio)
•	Agregar descuento (si está activo el privilegio correspondiente en el usuario)
•	En este estado, la orden se debe poder ejecutar las siguientes acciones:
•	Generar reportes en Excel o PDF (Cotización, Resumen comercial, etc.)
•	Compartir información y anexar reportes generados con el cliente (email, Whatsapp, portal IventIA)
•	La orden de servicio puede entonces cambiar de estado: “Cancelada” si no se ejecutará o “Confirmada” si seguirá su proceso. Si la orden está en este último estado, se deben ejecutar las siguientes acciones:
•	Hacer cambios a la orden, ya sea en sus datos generales o en el detalle de los productos/servicios de la misma
•	Validar la vigencia de los precios de la orden en términos de las fechas límite para precios anticipado, normal y  tardío
•	Generar pago(s) para liquidar el total de la orden. Una vez que la orden tenga un pago parcial el estado cambiará a “En Pago”, si la orden ha sido liquidada completamente se debe cambiar el estado a “Pagada”
•	Se debe agregar pagos en términos de:
•	Monto del Pago
•	Tipo de Pago: efectivo, transferencia, tarjeta de crédito, cheque, Swift
•	Al cambiar el estado de la orden a “Pagada” se activará una notificación (email) automática 
para el departamento operacional de Contabilidad, que tendrá un dashboard específicamente

 diseñado para mostrar órdenes de servicio en estado “Pagada” y también en estado “En revisión” para aquellas órdenes creadas desde el Portal del Expositor con pago diferido

•	Contabilidad proporcionará la factura timbrada al SAT (anexando el archivo XML y archivo PDF a la orden de servicio de Core IventIA, la factura también será visible en el portal del Expositor, en el caso de órdenes que provienen del Portal del Expositor revisará los archivos digitales que proporcionó el usuario) y cambiando el estado de esta a “Facturada”. Se enviará una notificación automática al cliente/expositor sobre la generación de la factura (email, Whatsapp, Portal del Expositor)

•	Al cambiar el estado de la orden a “Facturada” se activará una notificación (email) al departamento operacional de “Operaciones”, que tendrá un dashboard específicamente diseñado para mostrar órdenes de servicio en estado “Facturada”
•	En el caso de ser necesaria una cancelación o devolución parcial se debe ejecutar el mismo proceso para crear una orden de servicio con los siguientes cambios en el proceso:
•	Al crear la orden de servicio, se activa la casilla de “Nota de Crédito”, automáticamente se activa el campo “Orden de servicio referencia” donde se debe proporcionar el Número de Orden a la que la Nota de Crédito afecta
•	Al momento de agregar los productos/servicios y agregar cantidades, los totales serán mostrados en negativo
•	El flujo de trabajo es exactamente el mismo que el de una orden de servicio.


