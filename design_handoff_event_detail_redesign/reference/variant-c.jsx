// Variant C — Top nav + contextual sidebar
// Asana/Monday-style: top nav with 6 areas, sidebar changes per area

const VariantC = () => {
  const T = window.IventIATokens;
  const I = window.Icon;
  const areas = window.IventIAMenu.topAreas;
  const [activeArea, setActiveArea] = React.useState('eventos');
  const [activeItem, setActiveItem] = React.useState('todos');

  const sidebar = {
    eventos: [
      { type: 'section', label: 'Vistas' },
      { key: 'todos', label: 'Todos los eventos', icon: 'calendar', count: 47 },
      { key: 'activos', label: 'Activos', icon: 'calendar', count: 12 },
      { key: 'borradores', label: 'Borradores', icon: 'file-text', count: 5 },
      { key: 'calendario', label: 'Calendario', icon: 'schedule' },
      { type: 'section', label: 'Documentación' },
      { key: 'contratos', label: 'Contratos', icon: 'file-protect', count: 8 },
      { key: 'plantillas', label: 'Plantillas', icon: 'file-word' },
      { type: 'section', label: 'Recientes' },
      { key: 'r1', label: 'Vive Latino 2026', icon: 'calendar', dot: T.blue },
      { key: 'r2', label: 'Expo Tecnológica', icon: 'calendar', dot: T.success },
      { key: 'r3', label: 'Cumbre Empresarial', icon: 'calendar', dot: T.textMuted },
    ],
  };

  const items = sidebar[activeArea] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 1440, height: 900, background: T.bg, fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden', borderRadius: 8 }}>
      {/* Top nav */}
      <header style={{ height: 56, background: T.navy, color: 'white', display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0, gap: 16 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 16, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ width: 30, height: 30, borderRadius: 6, background: T.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>I</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>IventIA</div>
        </div>

        {/* Nav areas */}
        <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
          {areas.map(a => {
            const isActive = activeArea === a.key;
            return (
              <button key={a.key} onClick={() => setActiveArea(a.key)}
                style={{ padding: '8px 14px', background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent', border: 'none', borderRadius: 6, color: isActive ? 'white' : 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: isActive ? 600 : 500 }}>
                <I name={a.icon} size={14} />
                {a.label}
              </button>
            );
          })}
        </nav>

        {/* Org switcher */}
        <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 12 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: '#f59e0b', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>ES</div>
          <span style={{ fontWeight: 500 }}>Expo Santa Fe</span>
          <I name="chevron-down" size={9} color="rgba(255,255,255,0.6)" />
        </button>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 12, color: 'rgba(255,255,255,0.6)', width: 240 }}>
          <I name="search" size={12} color="rgba(255,255,255,0.6)" />
          <span style={{ flex: 1 }}>Buscar eventos, clientes, recursos…</span>
          <kbd style={{ fontSize: 10, padding: '1px 5px', background: 'rgba(255,255,255,0.1)', borderRadius: 3, fontFamily: 'inherit' }}>⌘K</kbd>
        </div>

        {/* Bell */}
        <button style={{ width: 32, height: 32, border: 'none', background: 'transparent', color: 'white', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <I name="bell" size={16} />
          <span style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: T.danger, border: `2px solid ${T.navy}` }} />
        </button>

        <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>CO</div>
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Contextual sidebar */}
        <aside style={{ width: 224, background: 'white', borderRight: `1px solid ${T.border}`, padding: '14px 8px', overflowY: 'auto', flexShrink: 0 }}>
          {items.map((it, i) => {
            if (it.type === 'section') return (
              <div key={i} style={{ fontSize: 10, fontWeight: 600, color: T.textDim, letterSpacing: 1, textTransform: 'uppercase', padding: '12px 10px 6px' }}>{it.label}</div>
            );
            const isActive = activeItem === it.key;
            return (
              <button key={it.key} onClick={() => setActiveItem(it.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 10px', background: isActive ? T.light : 'transparent', border: 'none', borderLeft: isActive ? `3px solid ${T.blue}` : '3px solid transparent', borderRadius: 4, color: isActive ? T.navy : T.text, fontSize: 13, cursor: 'pointer', marginBottom: 1, fontWeight: isActive ? 600 : 400, textAlign: 'left' }}>
                {it.dot ? (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: it.dot, marginLeft: 3, marginRight: 3 }} />
                ) : (
                  <I name={it.icon} size={14} color={isActive ? T.blue : T.textMuted} />
                )}
                <span style={{ flex: 1 }}>{it.label}</span>
                {it.count !== undefined && (
                  <span style={{ fontSize: 11, color: T.textDim, fontWeight: 500 }}>{it.count}</span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Main */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Sub-tabs */}
          <div style={{ background: 'white', borderBottom: `1px solid ${T.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 4, height: 48 }}>
            {['Lista', 'Tablero', 'Calendario', 'Mapa', 'Reportes'].map((t, i) => (
              <button key={t} style={{ padding: '0 14px', height: 48, background: 'transparent', border: 'none', borderBottom: i === 0 ? `2px solid ${T.blue}` : '2px solid transparent', color: i === 0 ? T.navy : T.textMuted, fontSize: 13, fontWeight: i === 0 ? 600 : 500, cursor: 'pointer' }}>{t}</button>
            ))}
            <div style={{ flex: 1 }} />
            <button style={{ padding: '7px 12px', background: 'white', border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: T.text }}>
              <I name="filter" size={12} color={T.textMuted} />
              Filtros
            </button>
            <button style={{ padding: '7px 14px', background: T.navy, color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
              <I name="plus" size={12} />
              Nuevo evento
            </button>
          </div>

          <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: T.bg }}>
            {/* Kanban board */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, height: '100%' }}>
              {[
                { title: 'Borradores', count: 5, color: T.textMuted, items: [
                  { name: 'Foro Innovación 2026', client: 'INADEM', date: '02 Jul' },
                  { name: 'Expo Salud', client: 'Sec. Salud', date: '15 Ago' },
                ]},
                { title: 'Confirmados', count: 18, color: T.blue, items: [
                  { name: 'Vive Latino 2026', client: 'OCESA', date: '14 Mar' },
                  { name: 'Cumbre Empresarial', client: 'COPARMEX', date: '08 May' },
                  { name: 'Concierto Sinfónico', client: 'OFCM', date: '19 Ago' },
                ]},
                { title: 'En Progreso', count: 12, color: T.success, items: [
                  { name: 'Expo Tecnológica', client: 'Reed Exhibitions', date: '22 Abr' },
                  { name: 'Festival Gastronómico', client: 'Sectur CDMX', date: '03 Oct' },
                ]},
                { title: 'Completados', count: 30, color: T.purple, items: [
                  { name: 'Fashion Week 2025', client: 'Mercedes-Benz', date: '14 Nov 2025' },
                  { name: 'Auto Show', client: 'AMDA', date: '02 Sep 2025' },
                ]},
              ].map((col, ci) => (
                <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                    <span style={{ fontWeight: 600, color: T.navy, fontSize: 13 }}>{col.title}</span>
                    <span style={{ fontSize: 11, color: T.textDim, padding: '1px 7px', background: 'white', borderRadius: 9, fontWeight: 500 }}>{col.count}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {col.items.map((it, ii) => (
                      <div key={ii} style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, cursor: 'pointer' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: T.navy, marginBottom: 6, lineHeight: 1.3 }}>{it.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: T.textMuted }}>
                          <span>{it.client}</span>
                          <span>{it.date}</span>
                        </div>
                      </div>
                    ))}
                    <button style={{ padding: '8px', background: 'transparent', border: `1px dashed ${T.border}`, borderRadius: 6, color: T.textMuted, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <I name="plus" size={11} /> Agregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

window.VariantC = VariantC;
