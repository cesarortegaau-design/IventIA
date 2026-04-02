# Introduction
1.	RESUMEN DEL PROYECTO


Contexto

La Industria de los Eventos ha crecido en los últimos años, consolidando un nicho de negocios boyante y que requiere de
servicios tecnológicos.

Existen divisiones dentro de la industria:
    - Inmuebles
        Son eventos que crean y ejecutan dertro de inmuebles, que se encuentran adaptados y con recursos para alojar eventos de diferente tipos. Es muy importante para estos organizadores el uso de un calendario de eventos y un calendario de reservas que les permite reservar el(los) subesacio(s) que tienen disponibles, este manejo implica la posibilidad de generar reservas de espacios que pueden tener conflictos (se enciman entre si) y es importantísimo tener un esquema para el manejo de reservas que permita permitir o no reservas con conflictos, que registre el orden cronológico en el que las reservas fueron creadas y que administre la lista de espera de reservas de espacios con conflictos considerando la confirmación de una de las reservas y la cancelación de otras donde la lista de espera debe ser dinámica y asignar en todo momento el lugar en la lista de espera que la reserva ocupa.
        También es posible que estos organizadores administren y vendan (para la ejecución de los eventos) bienes  y servicios que tengan inhouse o que obtengan de proveedores terceros. Esto puede ir desde la renta de los espacios pasando por bienes y consumibles disponibles en el inmueble (mobiliario, audio e iluminación, alimentos y bebidas, etc.), servicios (de Internet, de seguridad, de limpieza, etc.). En este segmento están los Centros de Exposiciones, Ferias y Convenciones, Salones de Fiestas, Hoteles, Estadios, Arenas, Gimnasios, Universidades, Instituciones públicas.

    - Organizadores de Eventos
        Son aquellos que organizan eventos en diferentes lugares (el lugar o inmueble es una condición y proviene de un tercero). El calendario de eventos es muy importante para ellos pero no requieren del manejo de Inmuebles.
        Ellos también utilizas bienes y servicios internos y de terceros  para ejecutar sus eventos. En este rubro se encuentran los organizadores de conciertos, de giras teatrales, de eventos sociales, eventos educativos y/o capacitación.

Expo Santa Fe es un inmueble donde se ofrecen servicios adicionales que pueden ser contratados, pagados y facturados durante la ejecución de los eventos que suceden ahí. El equipo que administra los servicios adicionales registra y gestiona de forma manual órdenes de servicio que contienen productos y servicios que se le brindarán tanto al comité organizador como a los expositores del evento.
Las órdenes de servicio se crean con un esquema de listas de precios diferenciadas para comités organizadores y expositores que incluyen estrategias como precio anticipado, normal y tardío. Además de administrar la relación con los clientes (Expositores, Montadores u otros participantes en el evento también se emiten cotizaciones y se reciben pagos a través de diversos medios y esquemas distintos, como el pago en firme y pago diferido.
La información de las órdenes de servicio se ve reflejada en múltiples documentos y reportes empleados por el equipo de Expo Santa Fe tanto para las actividades relacionadas a Operaciones y Contabilidad que incluyen aspectos tales como la entrega de servicios por parte de los equipos de operación y el  registro contable y  facturación por parte del equipo contable.
 


Objetivo global

Se debe crear una solución de software que permita configurar y administrar los eventos, productos y servicios, listas de precio, clientes de Expo Santa Fe y así mismo gestionar todos los procesos que son inherentes a la creación, operación, facturación y pago de órdenes de servicio. De igual manera, la solución de software debe permitir crear y administrar un Portal público para Expositores que sean autorizados a usarlo en eventos asignados, que les permita solicitar productos y servicios, pagar por ellos, recibir  facturas digitales, establecer un esquema de colaboración con el equipo de Expo Santa Fe, compartir documentos y acceder a información general de  Expo Santa Fe y del evento. 


2.	OBJETIVOS


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
