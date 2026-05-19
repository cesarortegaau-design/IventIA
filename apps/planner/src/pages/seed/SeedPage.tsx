/**
 * SeedPage.tsx
 * Ruta utilitaria: visitar /seed carga los datos demo de Boda García López
 * en localStorage y redirige al evento en el Planner.
 * No afecta producción más allá de los datos en localStorage del browser.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spin, Typography } from 'antd'

const { Text } = Typography

const EID = '3bc99b38-d059-4d8d-9fdf-346e88811780'

const TIMELINE = {
  updatedAt: new Date().toISOString(),
  phases: [
    { id:'ph-1', name:'Pre-producción',       color:'#6366F1', sortOrder:0, date:'2026-05-30' },
    { id:'ph-2', name:'Montaje',               color:'#0D9488', sortOrder:1, date:'2026-06-14' },
    { id:'ph-3', name:'Ceremonia',             color:'#7C3AED', sortOrder:2, date:'2026-06-15' },
    { id:'ph-4', name:'Cóctel de bienvenida',  color:'#F97316', sortOrder:3, date:'2026-06-15' },
    { id:'ph-5', name:'Banquete',              color:'#EC4899', sortOrder:4, date:'2026-06-15' },
    { id:'ph-6', name:'Baile y celebración',   color:'#D97706', sortOrder:5, date:'2026-06-15' },
    { id:'ph-7', name:'Desmontaje',            color:'#6B7280', sortOrder:6, date:'2026-06-16' },
  ],
  activities: [
    { id:'act-101', phaseId:'ph-1', name:'Reunión final de coordinación con novios',          responsible:'Coordinadora MR', startTime:'09:00', endTime:'10:30', status:'COMPLETED', notes:'Confirmar lista final de invitados y protocolo' },
    { id:'act-102', phaseId:'ph-1', name:'Confirmación menú y maridaje con Catering Aurora',  responsible:'Chef Aurora',      startTime:'11:00', endTime:'12:30', status:'COMPLETED', notes:'Menú 5 tiempos, barra libre premium, cóctel con pasapalos gourmet' },
    { id:'act-103', phaseId:'ph-1', name:'Prueba de sonido e iluminación con DJ',             responsible:'DJ Neon',          startTime:'14:00', endTime:'16:00', status:'COMPLETED', notes:'Playlist aprobada. Sistema L-Acoustics confirmado.' },
    { id:'act-104', phaseId:'ph-1', name:'Entrega y verificación de florería',                responsible:'Flores del Valle', startTime:'15:00', endTime:'17:00', status:'IN_PROGRESS', notes:'Rosas inglesas, orquídeas y peonias. Paleta: blanco roto y sage green.' },
    { id:'act-105', phaseId:'ph-1', name:'Revisión y distribución de seating chart (500 pax)',responsible:'Coordinadora MR', startTime:'10:30', endTime:'12:00', status:'COMPLETED' },
    { id:'act-106', phaseId:'ph-1', name:'Confirmación transporte de invitados foráneos',     responsible:'Logística JC',     startTime:'13:00', endTime:'14:00', status:'PENDING',   notes:'3 autobuses CDMX, 1 desde aeropuerto' },
    { id:'act-201', phaseId:'ph-2', name:'Ingreso de proveedores al venue',                   responsible:'Coordinadora MR',  startTime:'06:00', endTime:'07:00', status:'PENDING' },
    { id:'act-202', phaseId:'ph-2', name:'Armado de estructura principal y drapeado',         responsible:'Producción GT',    startTime:'07:00', endTime:'13:00', status:'PENDING',   notes:'Techo de tela plisada, columnatas con luminaria cálida' },
    { id:'act-203', phaseId:'ph-2', name:'Instalación sistema de iluminación LED arquitectónico', responsible:'Luz & Escena', startTime:'07:30', endTime:'14:00', status:'PENDING' },
    { id:'act-204', phaseId:'ph-2', name:'Montaje 62 mesas redondas y 500 chiavaris',         responsible:'Mobiliario Plus',  startTime:'09:00', endTime:'15:00', status:'PENDING',   notes:'Chiavaris dorados, manteles ivory, menaje Christofle' },
    { id:'act-205', phaseId:'ph-2', name:'Decoración floral: arcos, centros de mesa y altar', responsible:'Flores del Valle', startTime:'10:00', endTime:'17:00', status:'PENDING' },
    { id:'act-206', phaseId:'ph-2', name:'Instalación pantalla LED 9×5 m + mapping',          responsible:'AV Express',       startTime:'12:00', endTime:'16:00', status:'PENDING' },
    { id:'act-207', phaseId:'ph-2', name:'Armado presidium y mesa de honor (20 pax)',          responsible:'Mobiliario Plus',  startTime:'14:00', endTime:'16:30', status:'PENDING' },
    { id:'act-208', phaseId:'ph-2', name:'Setup cocina y estaciones de servicio',              responsible:'Chef Aurora',      startTime:'12:00', endTime:'18:00', status:'PENDING' },
    { id:'act-209', phaseId:'ph-2', name:'Prueba técnica final: sonido, video y luces',        responsible:'DJ Neon / AV',     startTime:'16:00', endTime:'18:00', status:'PENDING' },
    { id:'act-210', phaseId:'ph-2', name:'Inspección general y ajustes finales',               responsible:'Coordinadora MR',  startTime:'17:30', endTime:'18:30', status:'PENDING' },
    { id:'act-301', phaseId:'ph-3', name:'Arribo del equipo de foto y video',                  responsible:'Focus Studio',     startTime:'16:00', endTime:'16:30', status:'PENDING' },
    { id:'act-302', phaseId:'ph-3', name:'Apertura de puertas — recepción de invitados',       responsible:'Coordinadora MR',  startTime:'17:00', endTime:'18:00', status:'PENDING', notes:'Hostess en acceso, programa de mano y decoración de entrada' },
    { id:'act-303', phaseId:'ph-3', name:'Inicio música procesional — cuarteto de cuerdas',    responsible:'Cuarteto Allegro', startTime:'17:45', endTime:'18:00', status:'PENDING' },
    { id:'act-304', phaseId:'ph-3', name:'Entrada del novio y familia',                        responsible:'MC Ricardo',       startTime:'18:00', endTime:'18:05', status:'PENDING' },
    { id:'act-305', phaseId:'ph-3', name:'Entrada de cortejo nupcial y damas',                 responsible:'MC Ricardo',       startTime:'18:05', endTime:'18:12', status:'PENDING' },
    { id:'act-306', phaseId:'ph-3', name:'Entrada de la novia',                                responsible:'MC Ricardo',       startTime:'18:12', endTime:'18:18', status:'PENDING', notes:'Marcha nupcial en vivo. Fotógrafo en posición frontal.' },
    { id:'act-307', phaseId:'ph-3', name:'Ceremonia civil / religiosa',                        responsible:'Sacerdote / Juez', startTime:'18:18', endTime:'19:10', status:'PENDING' },
    { id:'act-308', phaseId:'ph-3', name:'Brindis simbólico y primer beso',                    responsible:'MC Ricardo',       startTime:'19:10', endTime:'19:20', status:'PENDING' },
    { id:'act-309', phaseId:'ph-3', name:'Sesión fotográfica novios y familia inmediata',      responsible:'Focus Studio',     startTime:'19:20', endTime:'20:00', status:'PENDING' },
    { id:'act-401', phaseId:'ph-4', name:'Servicio de cóctel — pasapalos gourmet 500 pax',    responsible:'Catering Aurora',  startTime:'19:15', endTime:'20:30', status:'PENDING', notes:'12 tipos de pasapalos, servicio en bandeja' },
    { id:'act-402', phaseId:'ph-4', name:'Barra de espumosos y cócteles de autor',             responsible:'Bar Elite',        startTime:'19:15', endTime:'20:30', status:'PENDING' },
    { id:'act-403', phaseId:'ph-4', name:'Música ambiente — cuarteto de jazz',                 responsible:'Cuarteto Allegro', startTime:'19:15', endTime:'20:30', status:'PENDING' },
    { id:'act-404', phaseId:'ph-4', name:'Foto grupal familia extendida',                       responsible:'Focus Studio',     startTime:'19:45', endTime:'20:10', status:'PENDING' },
    { id:'act-405', phaseId:'ph-4', name:'Foto booth interactivo',                             responsible:'Foto Booth GT',    startTime:'19:30', endTime:'23:00', status:'PENDING' },
    { id:'act-501', phaseId:'ph-5', name:'Llamado a salón y acomodo de invitados',             responsible:'Coordinadora MR',  startTime:'20:30', endTime:'20:45', status:'PENDING' },
    { id:'act-502', phaseId:'ph-5', name:'Bienvenida y presentación de novios',                responsible:'MC Ricardo',       startTime:'20:45', endTime:'20:55', status:'PENDING' },
    { id:'act-503', phaseId:'ph-5', name:'Primer tiempo: ensalada y amuse-bouche',             responsible:'Catering Aurora',  startTime:'20:55', endTime:'21:20', status:'PENDING' },
    { id:'act-504', phaseId:'ph-5', name:'Discursos: padrinos y familia (máx 4 × 3 min)',     responsible:'MC Ricardo',       startTime:'21:20', endTime:'21:40', status:'PENDING' },
    { id:'act-505', phaseId:'ph-5', name:'Brindis oficial con espumoso',                       responsible:'MC Ricardo',       startTime:'21:40', endTime:'21:50', status:'PENDING' },
    { id:'act-506', phaseId:'ph-5', name:'Plato fuerte: res Angus / salmón (alternado)',       responsible:'Catering Aurora',  startTime:'22:10', endTime:'22:50', status:'PENDING', notes:'Opción vegetariana: risotto de hongos silvestres' },
    { id:'act-507', phaseId:'ph-5', name:'Corte de pastel nupcial',                            responsible:'Coordinadora MR',  startTime:'22:50', endTime:'23:05', status:'PENDING', notes:'6 pisos, fondant ivory. Foto y video en posición.' },
    { id:'act-508', phaseId:'ph-5', name:'Postre, petit fours y café de altura',               responsible:'Catering Aurora',  startTime:'23:05', endTime:'23:30', status:'PENDING' },
    { id:'act-601', phaseId:'ph-6', name:'Vals nupcial — primera pieza',                       responsible:'DJ Neon',          startTime:'23:30', endTime:'23:42', status:'PENDING', notes:'Canción: "Perfect" — Ed Sheeran (arreglo orquestal)' },
    { id:'act-602', phaseId:'ph-6', name:'Baile con padres de los novios',                     responsible:'DJ Neon',          startTime:'23:42', endTime:'23:52', status:'PENDING' },
    { id:'act-603', phaseId:'ph-6', name:'Apertura de pista para todos los invitados',         responsible:'DJ Neon',          startTime:'23:52', endTime:'00:15', status:'PENDING' },
    { id:'act-604', phaseId:'ph-6', name:'DJ Set principal — internacional y latina 6h',       responsible:'DJ Neon',          startTime:'00:15', endTime:'02:00', status:'PENDING' },
    { id:'act-605', phaseId:'ph-6', name:'Show pirotécnico en jardín (5 min)',                 responsible:'Pirotecnia Élite', startTime:'01:00', endTime:'01:15', status:'PENDING', notes:'Área designada coordinada con venue.' },
    { id:'act-606', phaseId:'ph-6', name:'Entrega de recuerdos y despedida de novios',         responsible:'Coordinadora MR',  startTime:'01:50', endTime:'02:00', status:'PENDING' },
    { id:'act-701', phaseId:'ph-7', name:'Cierre de barra y retiro de invitados',              responsible:'Coordinadora MR',  startTime:'02:00', endTime:'02:30', status:'PENDING' },
    { id:'act-702', phaseId:'ph-7', name:'Retiro de decoración floral y elementos',            responsible:'Flores del Valle', startTime:'02:30', endTime:'05:00', status:'PENDING' },
    { id:'act-703', phaseId:'ph-7', name:'Desmontaje de mobiliario y equipo AV',               responsible:'Mobiliario Plus',  startTime:'02:30', endTime:'06:00', status:'PENDING' },
    { id:'act-704', phaseId:'ph-7', name:'Limpieza general del venue',                         responsible:'Venue Staff',      startTime:'05:00', endTime:'08:00', status:'PENDING' },
    { id:'act-705', phaseId:'ph-7', name:'Inventario y cierre con proveedores',                responsible:'Coordinadora MR',  startTime:'07:00', endTime:'08:30', status:'PENDING' },
    { id:'act-706', phaseId:'ph-7', name:'Entrega formal del venue',                           responsible:'Coordinadora MR',  startTime:'08:30', endTime:'09:00', status:'PENDING' },
  ],
}

const TAREAS = {
  updatedAt: new Date().toISOString(),
  counter: 20,
  tasks: [
    { id:'t-01', code:'T-101', title:'Confirmar menú de degustación 5 tiempos con Catering Aurora',    category:'Catering',     dueDate:'2026-06-01', assignee:'MR', status:'POR_HACER', notes:'Incluir opciones vegetarianas y alérgenos' },
    { id:'t-02', code:'T-102', title:'Pedir cotización iluminación arquitectónica adicional (jardín)',  category:'Producción',   dueDate:'2026-06-07', assignee:'JC', status:'POR_HACER' },
    { id:'t-03', code:'T-103', title:'Listar dietas especiales y restricciones de invitados',           category:'Logística',    dueDate:'2026-06-14', assignee:'MR', status:'POR_HACER', notes:'18 celíacos, 7 vegetarianos confirmados' },
    { id:'t-04', code:'T-104', title:'Coordinar protocolo de seguridad con venue (500 pax)',            category:'Legal',        dueDate:'2026-06-10', assignee:'AF', status:'POR_HACER' },
    { id:'t-05', code:'T-105', title:'Confirmar lista de canciones especiales con DJ Neon',             category:'Música',       dueDate:'2026-06-05', assignee:'PL', status:'POR_HACER' },
    { id:'t-06', code:'T-106', title:'Gestionar permiso para fuegos artificiales',                      category:'Legal',        dueDate:'2026-06-08', assignee:'JC', status:'POR_HACER', notes:'Municipio CDMX — plazo máximo 7 días antes del evento' },
    { id:'t-07', code:'T-201', title:'Diseño final de invitaciones digitales e impresas (v3)',          category:'Diseño',       dueDate:'2026-05-28', assignee:'PL', status:'EN_CURSO',  notes:'Cambio de tipografía solicitado por novia. Aprobación pendiente.' },
    { id:'t-08', code:'T-202', title:'Recorrido técnico en venue con DJ y equipo AV',                   category:'Producción',   dueDate:'2026-05-30', assignee:'JC', status:'EN_CURSO' },
    { id:'t-09', code:'T-203', title:'Pago anticipo 40% — Flores del Valle',                           category:'Pagos',        dueDate:'2026-05-29', assignee:'MR', status:'EN_CURSO',  notes:'Monto: $48,000 MXN. Transferencia pendiente aprobación.' },
    { id:'t-10', code:'T-204', title:'Elaborar seating chart final (500 pax) en software',             category:'Coordinación', dueDate:'2026-06-01', assignee:'MR', status:'EN_CURSO' },
    { id:'t-11', code:'T-205', title:'Revisión y aprobación de maqueta de pastel nupcial',             category:'Catering',     dueDate:'2026-05-25', assignee:'PL', status:'EN_CURSO',  notes:'Novia debe confirmar diseño.' },
    { id:'t-12', code:'T-301', title:'Revisar propuesta de seating chart (v2) con familia García',     category:'Cliente',      dueDate:'2026-05-23', assignee:'AF', status:'ESPERANDO_OK', notes:'Familia López pidió cambios en mesa de honor.' },
    { id:'t-13', code:'T-302', title:'OK final del cliente sobre playlist y vals nupcial',              category:'Cliente',      dueDate:'2026-05-22', assignee:'AF', status:'ESPERANDO_OK' },
    { id:'t-14', code:'T-303', title:'Aprobación novios: propuesta de iluminación LED (mock-up)',      category:'Diseño',       dueDate:'2026-05-26', assignee:'PL', status:'ESPERANDO_OK', notes:'Render enviado. Esperando respuesta desde el 20-may.' },
    { id:'t-15', code:'T-304', title:'Confirmación de habitaciones con hotel para invitados VIP',      category:'Logística',    dueDate:'2026-05-20', assignee:'JC', status:'ESPERANDO_OK' },
    { id:'t-16', code:'T-401', title:'Firmar contrato y póliza con venue principal',                   category:'Legal',        dueDate:'2026-04-29', assignee:'MR', status:'LISTA',       notes:'Firmado con depósito del 50%.' },
    { id:'t-17', code:'T-402', title:'Confirmación y reserva de fotógrafo Focus Studio',              category:'Foto',         dueDate:'2026-05-04', assignee:'PL', status:'LISTA',       notes:'Paquete foto + video + drone. Anticipo liquidado.' },
    { id:'t-18', code:'T-403', title:'Bloqueo de 20 habitaciones para invitados foráneos',            category:'Logística',    dueDate:'2026-05-09', assignee:'JC', status:'LISTA',       notes:'Hotel Presidente Intercontinental. Tarifa especial.' },
    { id:'t-19', code:'T-404', title:'Contrato firmado con DJ Neon y cuarteto Allegro',               category:'Música',       dueDate:'2026-04-15', assignee:'PL', status:'LISTA' },
    { id:'t-20', code:'T-405', title:'Envío y confirmación de invitaciones digitales (480 invitados)', category:'Coordinación', dueDate:'2026-04-30', assignee:'MR', status:'LISTA',       notes:'94% tasa de apertura. 412 confirmados.' },
  ],
}

const PRESUPUESTO = {
  updatedAt: new Date().toISOString(),
  chapters: [
    { id:'ch-1', name:'Coordinación y producción', color:'#7C3AED', sortOrder:0 },
    { id:'ch-2', name:'Catering y bar',             color:'#F97316', sortOrder:1 },
    { id:'ch-3', name:'Decoración y florería',      color:'#EC4899', sortOrder:2 },
    { id:'ch-4', name:'Música y entretenimiento',   color:'#6366F1', sortOrder:3 },
    { id:'ch-5', name:'Foto y video',               color:'#0D9488', sortOrder:4 },
    { id:'ch-6', name:'Mobiliario y equipo',        color:'#D97706', sortOrder:5 },
    { id:'ch-7', name:'Logística y transporte',     color:'#059669', sortOrder:6 },
    { id:'ch-8', name:'Papelería y branding',       color:'#DC2626', sortOrder:7 },
  ],
  items: [
    { id:'i-101', chapterId:'ch-1', code:'C1-1', concept:'Coordinación integral del evento (10 meses)',    provider:'IventIA Pro',       quantity:1,   unit:'evento', unitPrice:85000, status:'CONFIRMED' },
    { id:'i-102', chapterId:'ch-1', code:'C1-2', concept:'Day-of coordinator y asistente',                 provider:'IventIA Pro',       quantity:2,   unit:'pza',    unitPrice:8500,  status:'CONFIRMED' },
    { id:'i-103', chapterId:'ch-1', code:'C1-3', concept:'Producción general y permisos municipales',     provider:'Producción GT',     quantity:1,   unit:'evento', unitPrice:45000, status:'CONFIRMED' },
    { id:'i-201', chapterId:'ch-2', code:'C2-1', concept:'Cena 5 tiempos — 500 pax',                      provider:'Catering Aurora',   quantity:500, unit:'pax',    unitPrice:1850,  status:'CONFIRMED', notes:'Incluye servicio, menaje y lencería Christofle' },
    { id:'i-202', chapterId:'ch-2', code:'C2-2', concept:'Cóctel gourmet (pasapalos) — 500 pax',          provider:'Catering Aurora',   quantity:500, unit:'pax',    unitPrice:480,   status:'CONFIRMED' },
    { id:'i-203', chapterId:'ch-2', code:'C2-3', concept:'Barra libre premium 6h',                        provider:'Bar Elite',          quantity:500, unit:'pax',    unitPrice:650,   status:'CONFIRMED' },
    { id:'i-204', chapterId:'ch-2', code:'C2-4', concept:'Pastel nupcial 6 pisos (fondant artesanal)',    provider:'Dulce Élite',        quantity:1,   unit:'pza',    unitPrice:28000, status:'PENDING' },
    { id:'i-205', chapterId:'ch-2', code:'C2-5', concept:'Personal de servicio (80 meseros y capitanes)', provider:'Catering Aurora',   quantity:80,  unit:'pza',    unitPrice:1200,  status:'CONFIRMED' },
    { id:'i-301', chapterId:'ch-3', code:'C3-1', concept:'Arco floral principal — rosas y orquídeas',     provider:'Flores del Valle',  quantity:1,   unit:'pza',    unitPrice:65000, status:'CONFIRMED' },
    { id:'i-302', chapterId:'ch-3', code:'C3-2', concept:'62 centros de mesa florales premium',           provider:'Flores del Valle',  quantity:62,  unit:'pza',    unitPrice:3800,  status:'CONFIRMED' },
    { id:'i-303', chapterId:'ch-3', code:'C3-3', concept:'Decoración altar, pasillos y acceso',           provider:'Flores del Valle',  quantity:1,   unit:'evento', unitPrice:45000, status:'PENDING' },
    { id:'i-304', chapterId:'ch-3', code:'C3-4', concept:'Drapeado techo y columnatas iluminadas',        provider:'Producción GT',     quantity:1,   unit:'evento', unitPrice:55000, status:'CONFIRMED' },
    { id:'i-401', chapterId:'ch-4', code:'C4-1', concept:'DJ Neon — set completo 6h',                    provider:'DJ Neon',            quantity:1,   unit:'evento', unitPrice:35000, status:'CONFIRMED' },
    { id:'i-402', chapterId:'ch-4', code:'C4-2', concept:'Cuarteto de cuerdas y jazz Allegro',            provider:'Cuarteto Allegro',  quantity:1,   unit:'evento', unitPrice:28000, status:'CONFIRMED' },
    { id:'i-403', chapterId:'ch-4', code:'C4-3', concept:'Show pirotécnico en jardín (5 min)',            provider:'Pirotecnia Élite',  quantity:1,   unit:'evento', unitPrice:22000, status:'PENDING' },
    { id:'i-404', chapterId:'ch-4', code:'C4-4', concept:'MC / Maestro de ceremonias',                   provider:'MC Ricardo',         quantity:1,   unit:'evento', unitPrice:18000, status:'CONFIRMED' },
    { id:'i-501', chapterId:'ch-5', code:'C5-1', concept:'Fotografía artística — cobertura total',        provider:'Focus Studio',      quantity:1,   unit:'evento', unitPrice:55000, status:'CONFIRMED' },
    { id:'i-502', chapterId:'ch-5', code:'C5-2', concept:'Video cinematográfico + drone 4K',              provider:'Focus Studio',      quantity:1,   unit:'evento', unitPrice:42000, status:'CONFIRMED' },
    { id:'i-503', chapterId:'ch-5', code:'C5-3', concept:'Foto booth interactivo (6h)',                   provider:'Foto Booth GT',     quantity:1,   unit:'evento', unitPrice:12000, status:'PENDING' },
    { id:'i-601', chapterId:'ch-6', code:'C6-1', concept:'500 sillas Chiavari doradas',                   provider:'Mobiliario Plus',   quantity:500, unit:'pza',    unitPrice:95,    status:'CONFIRMED' },
    { id:'i-602', chapterId:'ch-6', code:'C6-2', concept:'62 mesas redondas 1.8 m',                       provider:'Mobiliario Plus',   quantity:62,  unit:'pza',    unitPrice:450,   status:'CONFIRMED' },
    { id:'i-603', chapterId:'ch-6', code:'C6-3', concept:'Sistema de sonido L-Acoustics profesional',    provider:'AV Express',        quantity:1,   unit:'evento', unitPrice:38000, status:'CONFIRMED' },
    { id:'i-604', chapterId:'ch-6', code:'C6-4', concept:'Pantalla LED 9×5 m + video mapping',           provider:'AV Express',        quantity:1,   unit:'evento', unitPrice:45000, status:'PENDING' },
    { id:'i-605', chapterId:'ch-6', code:'C6-5', concept:'Generador eléctrico 250 KVA',                  provider:'AV Express',        quantity:1,   unit:'evento', unitPrice:18000, status:'CONFIRMED' },
    { id:'i-701', chapterId:'ch-7', code:'C7-1', concept:'3 autobuses CDMX-Venue round trip',            provider:'Transport Premium',  quantity:3,   unit:'pza',    unitPrice:12000, status:'CONFIRMED' },
    { id:'i-702', chapterId:'ch-7', code:'C7-2', concept:'6 Sprinter VIP traslados',                     provider:'Transport Premium',  quantity:6,   unit:'pza',    unitPrice:4500,  status:'PENDING' },
    { id:'i-703', chapterId:'ch-7', code:'C7-3', concept:'Valet parking 500 automóviles',                provider:'VIP Valet',          quantity:1,   unit:'evento', unitPrice:25000, status:'CONFIRMED' },
    { id:'i-801', chapterId:'ch-8', code:'C8-1', concept:'Invitaciones impresas lujo (500 sets)',         provider:'Imprenta Élite',    quantity:500, unit:'pza',    unitPrice:185,   status:'CONFIRMED' },
    { id:'i-802', chapterId:'ch-8', code:'C8-2', concept:'Menús, programas y señalética',                provider:'Imprenta Élite',    quantity:500, unit:'pza',    unitPrice:45,    status:'CONFIRMED' },
    { id:'i-803', chapterId:'ch-8', code:'C8-3', concept:'Recuerdos personalizados para invitados',      provider:'Regalos & Co.',     quantity:500, unit:'pza',    unitPrice:220,   status:'PENDING' },
  ],
}

export default function SeedPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'done'>('loading')

  useEffect(() => {
    localStorage.setItem(`iventia-timeline-${EID}`,    JSON.stringify(TIMELINE))
    localStorage.setItem(`iventia-tareas-${EID}`,      JSON.stringify(TAREAS))
    localStorage.setItem(`iventia-presupuesto-${EID}`, JSON.stringify(PRESUPUESTO))
    setStatus('done')
    const t = setTimeout(() => navigate(`/eventos/${EID}/lienzo`), 1200)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#F8F7FF', gap: 16,
    }}>
      {status === 'loading' ? (
        <>
          <Spin size="large" />
          <Text style={{ color: '#7C3AED', fontWeight: 600 }}>Cargando datos demo…</Text>
        </>
      ) : (
        <>
          <span style={{ fontSize: 48 }}>💍</span>
          <Text style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a' }}>
            Boda García López — datos cargados
          </Text>
          <Text style={{ color: '#888' }}>
            7 fases · 46 actividades · 20 tareas · 8 capítulos de presupuesto
          </Text>
          <Text style={{ color: '#bbb', fontSize: 12 }}>Redirigiendo al lienzo…</Text>
        </>
      )}
    </div>
  )
}
