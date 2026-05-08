// Shared data and tokens for IventIA Admin shell variants
window.IventIATokens = {
  navy:    '#1a3a5c',
  navy2:   '#1e4d7b',
  navyDark:'#0f2540',
  blue:    '#2e7fc1',
  blueLight:'#4a9be0',
  light:   '#f0f6ff',
  bg:      '#f5f7fa',
  white:   '#ffffff',
  border:  '#e5e9f0',
  text:    '#1f2937',
  textMuted: '#64748b',
  textDim: '#94a3b8',
  success: '#10b981',
  warning: '#f59e0b',
  danger:  '#ef4444',
  purple:  '#8b5cf6',
};

// Real menu structure derived from MainLayout.tsx
window.IventIAMenu = {
  // Variant A: refined groups
  groupedMenu: [
    {
      key: 'main',
      label: 'PRINCIPAL',
      items: [
        { key: 'home', icon: 'home', label: 'Inicio' },
        { key: 'eventos', icon: 'calendar', label: 'Eventos', badge: 12 },
        { key: 'booking', icon: 'schedule', label: 'Calendario' },
        { key: 'crm', icon: 'contacts', label: 'CRM' },
      ],
    },
    {
      key: 'operaciones',
      label: 'OPERACIONES',
      items: [
        { key: 'ordenes-servicio', icon: 'dollar', label: 'Órdenes de Servicio' },
        { key: 'ordenes-compra', icon: 'file-text', label: 'Órdenes de Compra' },
        { key: 'produccion', icon: 'bar-chart', label: 'Producción y Costos' },
        { key: 'almacen', icon: 'tool', label: 'Almacén', children: [
          { key: 'almacenes', label: 'Almacenes' },
          { key: 'inventario', label: 'Inventario' },
          { key: 'recepcion', label: 'Recepción OC' },
        ]},
      ],
    },
    {
      key: 'documentos',
      label: 'DOCUMENTOS',
      items: [
        { key: 'contratos', icon: 'file-protect', label: 'Contratos' },
        { key: 'plantillas', icon: 'file-word', label: 'Plantillas' },
      ],
    },
    {
      key: 'catalogos',
      label: 'CATÁLOGOS',
      items: [
        { key: 'recursos', icon: 'tags', label: 'Recursos' },
        { key: 'precios', icon: 'dollar', label: 'Listas de Precio' },
        { key: 'clientes', icon: 'team', label: 'Clientes' },
        { key: 'proveedores', icon: 'contacts', label: 'Proveedores' },
        { key: 'organizaciones', icon: 'apartment', label: 'Organizaciones' },
        { key: 'usuarios', icon: 'user', label: 'Usuarios y Perfiles' },
      ],
    },
    {
      key: 'analitica',
      label: 'ANALÍTICA',
      items: [
        { key: 'analisis-ia', icon: 'robot', label: 'Análisis IA', badge: 'NEW' },
        { key: 'dash-contabilidad', icon: 'dollar', label: 'Contabilidad' },
        { key: 'dash-operaciones', icon: 'tool', label: 'Operaciones' },
      ],
    },
    {
      key: 'colaboracion',
      label: 'COLABORACIÓN',
      items: [
        { key: 'chat', icon: 'message', label: 'Colabora', badge: 3 },
      ],
    },
  ],

  // Variant C: 6 top-level areas
  topAreas: [
    { key: 'inicio', icon: 'home', label: 'Inicio' },
    { key: 'eventos', icon: 'calendar', label: 'Eventos' },
    { key: 'operaciones', icon: 'tool', label: 'Operaciones' },
    { key: 'catalogos', icon: 'appstore', label: 'Catálogos' },
    { key: 'analitica', icon: 'bar-chart', label: 'Analítica' },
    { key: 'crm', icon: 'contacts', label: 'CRM' },
  ],

  contextualByArea: {
    eventos: {
      label: 'Eventos',
      items: [
        { key: 'todos', label: 'Todos los eventos', count: 47 },
        { key: 'activos', label: 'Activos', count: 12 },
        { key: 'borradores', label: 'Borradores', count: 5 },
        { key: 'completados', label: 'Completados', count: 30 },
        { type: 'divider' },
        { key: 'calendario', label: 'Calendario', icon: 'schedule' },
        { key: 'contratos', label: 'Contratos', icon: 'file-protect' },
        { key: 'plantillas', label: 'Plantillas', icon: 'file-word' },
      ],
    },
  },
};
