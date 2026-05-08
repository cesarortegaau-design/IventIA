// Variant C deep-dive: 6-area mapping + contextual sidebars for each area
const VC_T = window.IventIATokens;
const VC_I = window.Icon;

// === FULL AREA MAP ===
window.VC_AreaMap = () => {
  const T = VC_T;
  const I = VC_I;
  const areas = [
    { key: 'inicio', icon: 'home', label: 'Inicio', color: T.blue, modules: [
      'Dashboard de bienvenida', 'KPIs ejecutivos', 'Próximos eventos', 'Acceso rápido', 'Notificaciones recientes'
    ]},
    { key: 'eventos', icon: 'calendar', label: 'Eventos', color: '#3b82f6', modules: [
      'Lista de eventos', 'Calendario de Reservas', 'Contratos', 'Plantillas de documentos', 'Mapa del Venue', 'Boletos / Ticketing'
    ]},
    { key: 'operaciones', icon: 'tool', label: 'Operaciones', color: '#10b981', modules: [
      'Órdenes de Servicio', 'Órdenes de Compra', 'Producción y Costos', 'Almacenes', 'Inventario', 'Recepción de OC'
    ]},
    { key: 'catalogos', icon: 'appstore', label: 'Catálogos', color: '#f59e0b', modules: [
      'Recursos', 'Listas de Precio', 'Listas de Precio Proveedores', 'Clientes', 'Proveedores', 'Organizaciones', 'Departamentos', 'Perfiles', 'Usuarios', 'Usuarios Portal'
    ]},
    { key: 'analitica', icon: 'bar-chart', label: 'Analítica', color: '#8b5cf6', modules: [
      'Análisis IA', 'Dashboard Contabilidad', 'Dashboard Operaciones', 'Reportes de Órdenes'
    ]},
    { key: 'crm', icon: 'contacts', label: 'CRM', color: '#ec4899', modules: [
      'Pipeline de oportunidades', 'Cuentas y contactos', 'Actividades', 'Colabora (chat interno)'
    ]},
  ];
  return (
    <div style={{ width: 1200, padding: 28, background: 'white', borderRadius: 8, fontFamily: 'Inter, sans-serif', color: T.text }}>
      <h2 style={{ margin: '0 0 4px', color: T.navy, fontSize: 22 }}>Mapeo: 6 áreas → módulos</h2>
      <p style={{ margin: '0 0 18px', color: T.textMuted, fontSize: 13 }}>Reducción de 18 ítems sueltos a 6 áreas semánticas. Cada área agrupa entre 4–10 módulos relacionados.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {areas.map(a => (
          <div key={a.key} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, background: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: a.color + '18', color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <I name={a.icon} size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{a.label}</div>
                <div style={{ fontSize: 11, color: T.textDim }}>{a.modules.length} módulos</div>
              </div>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {a.modules.map((m, i) => (
                <li key={i} style={{ fontSize: 12, color: T.text, padding: '3px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: a.color }} />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

// Reusable: top nav for sidebar mockups
window.VC_TopNav = ({ active = 'eventos' }) => {
  const T = VC_T;
  const I = VC_I;
  const areas = [
    { key: 'inicio', icon: 'home', label: 'Inicio' },
    { key: 'eventos', icon: 'calendar', label: 'Eventos' },
    { key: 'operaciones', icon: 'tool', label: 'Operaciones' },
    { key: 'catalogos', icon: 'appstore', label: 'Catálogos' },
    { key: 'analitica', icon: 'bar-chart', label: 'Analítica' },
    { key: 'crm', icon: 'contacts', label: 'CRM' },
  ];
  return (
    <header style={{ height: 56, background: T.navy, color: 'white', display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0, gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 16, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ width: 30, height: 30, borderRadius: 6, background: T.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>I</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>IventIA</div>
      </div>
      <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
        {areas.map(a => {
          const isActive = active === a.key;
          return (
            <div key={a.key} style={{ padding: '8px 14px', background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent', borderRadius: 6, color: isActive ? 'white' : 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: isActive ? 600 : 500 }}>
              <I name={a.icon} size={14} />
              {a.label}
            </div>
          );
        })}
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 12, color: 'rgba(255,255,255,0.6)', width: 220 }}>
        <I name="search" size={12} color="rgba(255,255,255,0.6)" />
        <span style={{ flex: 1 }}>Buscar…</span>
        <kbd style={{ fontSize: 10, padding: '1px 5px', background: 'rgba(255,255,255,0.1)', borderRadius: 3, fontFamily: 'inherit' }}>⌘K</kbd>
      </div>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>CO</div>
    </header>
  );
};

// === SIDEBARS for each area ===
window.VC_Sidebars = () => {
  const T = VC_T;
  const I = VC_I;

  const sidebars = {
    inicio: [
      { type: 'section', label: 'Vista' },
      { label: 'Resumen ejecutivo', icon: 'home', active: true },
      { label: 'Notificaciones', icon: 'bell', count: 5 },
      { type: 'section', label: 'Atajos' },
      { label: 'Eventos activos', icon: 'calendar', count: 12 },
      { label: 'Órdenes pendientes', icon: 'dollar', count: 8 },
      { label: 'Cotizaciones', icon: 'file-text', count: 3 },
    ],
    eventos: [
      { type: 'section', label: 'Vistas' },
      { label: 'Todos los eventos', icon: 'calendar', count: 47, active: true },
      { label: 'Activos', icon: 'calendar', count: 12 },
      { label: 'Borradores', icon: 'file-text', count: 5 },
      { label: 'Calendario', icon: 'schedule' },
      { type: 'section', label: 'Documentación' },
      { label: 'Contratos', icon: 'file-protect', count: 8 },
      { label: 'Plantillas', icon: 'file-word' },
      { type: 'section', label: 'Recientes' },
      { label: 'Vive Latino 2026', icon: 'calendar', dot: T.blue },
      { label: 'Expo Tecnológica', icon: 'calendar', dot: T.success },
    ],
    operaciones: [
      { type: 'section', label: 'Comercial' },
      { label: 'Órdenes de Servicio', icon: 'dollar', count: 24, active: true },
      { label: 'Órdenes de Compra', icon: 'file-text', count: 15 },
      { label: 'Producción y Costos', icon: 'bar-chart' },
      { type: 'section', label: 'Almacén' },
      { label: 'Almacenes', icon: 'apartment' },
      { label: 'Inventario', icon: 'tags' },
      { label: 'Recepción OC', icon: 'file-text', count: 3 },
    ],
    catalogos: [
      { type: 'section', label: 'Productos y precios' },
      { label: 'Recursos', icon: 'tags', count: 348, active: true },
      { label: 'Listas de Precio', icon: 'dollar', count: 12 },
      { label: 'Listas Proveedores', icon: 'dollar' },
      { type: 'section', label: 'Personas' },
      { label: 'Clientes', icon: 'team', count: 156 },
      { label: 'Proveedores', icon: 'contacts', count: 84 },
      { type: 'section', label: 'Estructura' },
      { label: 'Organizaciones', icon: 'apartment' },
      { label: 'Departamentos', icon: 'apartment' },
      { type: 'section', label: 'Accesos' },
      { label: 'Usuarios', icon: 'user' },
      { label: 'Perfiles', icon: 'safety-cert' },
      { label: 'Usuarios Portal', icon: 'team' },
    ],
    analitica: [
      { type: 'section', label: 'Inteligencia' },
      { label: 'Análisis IA', icon: 'robot', badge: 'NEW', active: true },
      { type: 'section', label: 'Dashboards' },
      { label: 'Contabilidad', icon: 'dollar' },
      { label: 'Operaciones', icon: 'tool' },
      { type: 'section', label: 'Reportes' },
      { label: 'Reporte de Órdenes', icon: 'file-text' },
    ],
    crm: [
      { type: 'section', label: 'Comercial' },
      { label: 'Pipeline', icon: 'bar-chart', count: 32, active: true },
      { label: 'Cuentas', icon: 'team', count: 156 },
      { label: 'Contactos', icon: 'contacts', count: 412 },
      { label: 'Actividades', icon: 'schedule', count: 18 },
      { type: 'section', label: 'Comunicación' },
      { label: 'Colabora', icon: 'message', count: 3 },
    ],
  };

  const SidebarMini = ({ areaKey, areaLabel, areaColor }) => {
    const items = sidebars[areaKey];
    return (
      <div style={{ width: 240, background: 'white', border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}`, background: T.bg, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: areaColor }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: T.navy, textTransform: 'uppercase', letterSpacing: 0.5 }}>{areaLabel}</span>
        </div>
        <div style={{ padding: '10px 8px', flex: 1 }}>
          {items.map((it, i) => {
            if (it.type === 'section') return <div key={i} style={{ fontSize: 10, fontWeight: 600, color: T.textDim, letterSpacing: 1, textTransform: 'uppercase', padding: '10px 10px 4px' }}>{it.label}</div>;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 10px', background: it.active ? T.light : 'transparent', borderLeft: it.active ? `3px solid ${T.blue}` : '3px solid transparent', borderRadius: 4, fontSize: 12, color: it.active ? T.navy : T.text, fontWeight: it.active ? 600 : 400 }}>
                {it.dot ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: it.dot, marginLeft: 2 }} /> : <I name={it.icon} size={12} color={it.active ? T.blue : T.textMuted} />}
                <span style={{ flex: 1 }}>{it.label}</span>
                {it.badge && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8, background: T.warning, color: 'white', fontWeight: 700 }}>{it.badge}</span>}
                {it.count !== undefined && <span style={{ fontSize: 11, color: T.textDim }}>{it.count}</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const areas = [
    { key: 'inicio', label: 'Inicio', color: T.blue },
    { key: 'eventos', label: 'Eventos', color: '#3b82f6' },
    { key: 'operaciones', label: 'Operaciones', color: '#10b981' },
    { key: 'catalogos', label: 'Catálogos', color: '#f59e0b' },
    { key: 'analitica', label: 'Analítica', color: '#8b5cf6' },
    { key: 'crm', label: 'CRM', color: '#ec4899' },
  ];

  return (
    <div style={{ width: 1620, padding: 28, background: T.bg, borderRadius: 8, fontFamily: 'Inter, sans-serif', color: T.text }}>
      <h2 style={{ margin: '0 0 4px', color: T.navy, fontSize: 22 }}>Sidebar contextual por área</h2>
      <p style={{ margin: '0 0 18px', color: T.textMuted, fontSize: 13 }}>Cada área del top-nav cambia el sidebar de la izquierda con sus propias secciones, contadores y atajos.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
        {areas.map(a => <SidebarMini key={a.key} areaKey={a.key} areaLabel={a.label} areaColor={a.color} />)}
      </div>
    </div>
  );
};
