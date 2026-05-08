// Variant C deep-dive: top nav states, ⌘K modal, notifications, event detail, mobile

const VC2_T = window.IventIATokens;
const VC2_I = window.Icon;

// === TOP NAV STATES ===
window.VC_TopNavStates = () => {
  const T = VC2_T;
  const I = VC2_I;
  const Btn = ({ state, label }) => {
    const styles = {
      default: { bg: 'transparent', color: 'rgba(255,255,255,0.7)', fw: 500 },
      hover: { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.9)', fw: 500 },
      active: { bg: 'rgba(255,255,255,0.12)', color: 'white', fw: 600, indicator: true },
      focus: { bg: 'rgba(255,255,255,0.06)', color: 'white', fw: 500, ring: true },
    }[state];
    return (
      <div style={{ position: 'relative', padding: '8px 14px', background: styles.bg, borderRadius: 6, color: styles.color, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: styles.fw, boxShadow: styles.ring ? `0 0 0 2px ${T.blue}` : 'none' }}>
        <I name="calendar" size={14} />Eventos
      </div>
    );
  };
  const Row = ({ title, children }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>{title}</div>
      <div style={{ background: T.navy, padding: '10px 14px', borderRadius: 8, display: 'flex', gap: 6 }}>{children}</div>
    </div>
  );
  return (
    <div style={{ width: 1100, padding: 28, background: 'white', borderRadius: 8, fontFamily: 'Inter, sans-serif', color: T.text }}>
      <h2 style={{ margin: '0 0 4px', color: T.navy, fontSize: 22 }}>Estados del top-nav</h2>
      <p style={{ margin: '0 0 18px', color: T.textMuted, fontSize: 13 }}>Default · Hover · Active · Focus (teclado) · Scrolled (sticky con sombra)</p>
      <Row title="Default · Hover · Active · Focus">
        <Btn state="default" />
        <Btn state="hover" />
        <Btn state="active" />
        <Btn state="focus" />
      </Row>
      <Row title="Scrolled (con sombra inferior y backdrop-blur)">
        <div style={{ width: '100%', height: 40, background: 'rgba(26,58,92,0.92)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', padding: '0 14px', color: 'white', fontSize: 13 }}>
          IventIA &nbsp; · &nbsp; <span style={{ opacity: 0.85 }}>Eventos</span>
        </div>
      </Row>
      <div style={{ marginTop: 18, padding: 14, background: T.light, borderRadius: 8, fontSize: 12, color: T.textMuted, lineHeight: 1.7 }}>
        <b style={{ color: T.navy }}>Tokens:</b> active <code>rgba(255,255,255,0.12)</code> · hover <code>rgba(255,255,255,0.06)</code> · focus ring <code>{T.blue}</code> 2px · scrolled <code>rgba(26,58,92,0.92)</code> + <code>backdrop-filter: blur(8px)</code>
      </div>
    </div>
  );
};

// === ⌘K MODAL ===
window.VC_CmdK = () => {
  const T = VC2_T;
  const I = VC2_I;
  const groups = [
    { label: 'Eventos', icon: 'calendar', items: [
      { name: 'Festival Vive Latino 2026', meta: '14 Mar · Foro Sol' },
      { name: 'Expo Tecnológica CDMX', meta: '22 Abr · Expo Santa Fe' },
    ]},
    { label: 'Clientes', icon: 'team', items: [
      { name: 'OCESA Entretenimiento', meta: 'Cliente · 12 eventos' },
      { name: 'Reed Exhibitions México', meta: 'Cliente · 5 eventos' },
    ]},
    { label: 'Acciones', icon: 'tool', items: [
      { name: 'Crear nuevo evento', meta: 'Atajo · ⌘ N' },
      { name: 'Crear orden de servicio', meta: 'Atajo · ⌘ ⇧ O' },
    ]},
    { label: 'Navegación', icon: 'home', items: [
      { name: 'Ir a Inventario', meta: 'Almacén → Inventario' },
      { name: 'Ir a Análisis IA', meta: 'Analítica → Análisis IA' },
    ]},
  ];
  return (
    <div style={{ width: 1000, height: 720, background: 'rgba(15, 37, 64, 0.55)', backdropFilter: 'blur(4px)', borderRadius: 8, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 100 }}>
      <div style={{ width: 600, background: 'white', borderRadius: 12, boxShadow: '0 24px 60px rgba(15,37,64,0.4)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <I name="search" size={16} color={T.textMuted} />
          <input placeholder="Buscar eventos, clientes, recursos, acciones…" defaultValue="vive" readOnly style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: T.text, fontFamily: 'inherit' }} />
          <kbd style={{ fontSize: 11, padding: '2px 7px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, color: T.textMuted }}>esc</kbd>
        </div>
        <div style={{ maxHeight: 480, overflowY: 'auto', padding: '8px 0' }}>
          {groups.map((g, gi) => (
            <div key={gi} style={{ marginBottom: 4 }}>
              <div style={{ padding: '8px 18px 4px', fontSize: 10, fontWeight: 700, color: T.textDim, letterSpacing: 1, textTransform: 'uppercase' }}>{g.label}</div>
              {g.items.map((it, ii) => (
                <div key={ii} style={{ padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 12, background: gi === 0 && ii === 0 ? T.light : 'transparent', borderLeft: gi === 0 && ii === 0 ? `3px solid ${T.blue}` : '3px solid transparent' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 7, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.blue }}>
                    <I name={g.icon} size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: T.navy, fontWeight: 500 }}>{it.name}</div>
                    <div style={{ fontSize: 11, color: T.textDim }}>{it.meta}</div>
                  </div>
                  {gi === 0 && ii === 0 && (
                    <kbd style={{ fontSize: 10, padding: '2px 6px', background: 'white', border: `1px solid ${T.border}`, borderRadius: 4, color: T.textMuted }}>↵</kbd>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 18px', borderTop: `1px solid ${T.border}`, background: T.bg, display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: T.textMuted }}>
          <span><kbd style={{ padding: '1px 5px', background: 'white', border: `1px solid ${T.border}`, borderRadius: 3, marginRight: 4 }}>↑↓</kbd> navegar</span>
          <span><kbd style={{ padding: '1px 5px', background: 'white', border: `1px solid ${T.border}`, borderRadius: 3, marginRight: 4 }}>↵</kbd> abrir</span>
          <span><kbd style={{ padding: '1px 5px', background: 'white', border: `1px solid ${T.border}`, borderRadius: 3, marginRight: 4 }}>⌘K</kbd> alternar</span>
          <span style={{ flex: 1, textAlign: 'right' }}>4 grupos · 8 resultados</span>
        </div>
      </div>
    </div>
  );
};

// === NOTIFICATIONS DROPDOWN ===
window.VC_Notifications = () => {
  const T = VC2_T;
  const I = VC2_I;
  const groups = [
    { label: 'Hoy', items: [
      { icon: 'dollar', color: T.success, title: 'OS-2026-0142 aprobada', desc: 'Festival Vive Latino · OCESA aprobó la orden por $1,240,000', time: 'hace 12 min', unread: true },
      { icon: 'message', color: T.blue, title: 'Mensaje de Ana Torres', desc: '"Necesitamos ajustar capacidades del backstage..."', time: 'hace 38 min', unread: true },
      { icon: 'file-protect', color: T.warning, title: 'Contrato pendiente de firma', desc: 'Expo Tecnológica · vence en 2 días', time: 'hace 2 h', unread: true },
    ]},
    { label: 'Ayer', items: [
      { icon: 'tool', color: T.purple, title: 'Recepción OC-0089 completada', desc: '124 ítems recibidos en Almacén CDMX', time: 'ayer', unread: false },
      { icon: 'team', color: T.success, title: 'Nuevo cliente registrado', desc: 'Centro Citibanamex creó cuenta en el portal', time: 'ayer', unread: false },
    ]},
  ];
  return (
    <div style={{ width: 900, height: 720, background: T.bg, borderRadius: 8, fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* Top nav */}
      <div style={{ background: T.navy, height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <div style={{ position: 'relative', width: 32, height: 32, background: 'rgba(255,255,255,0.12)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <I name="bell" size={16} color="white" />
          <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: T.danger, border: `2px solid ${T.navy}` }} />
        </div>
      </div>
      {/* Dropdown */}
      <div style={{ position: 'absolute', top: 64, right: 16, width: 380, background: 'white', borderRadius: 10, boxShadow: '0 16px 40px rgba(15,37,64,0.18)', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Notificaciones</span>
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, background: T.danger, color: 'white', fontWeight: 700 }}>3 nuevas</span>
          </div>
          <button style={{ background: 'transparent', border: 'none', color: T.blue, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Marcar leídas</button>
        </div>
        {/* Filters */}
        <div style={{ padding: '10px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 6 }}>
          {['Todas', 'No leídas', 'Menciones', 'OS', 'Contratos'].map((f, i) => (
            <span key={f} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 12, background: i === 0 ? T.navy : T.bg, color: i === 0 ? 'white' : T.textMuted, fontWeight: 500 }}>{f}</span>
          ))}
        </div>
        <div style={{ maxHeight: 440, overflowY: 'auto' }}>
          {groups.map((g, gi) => (
            <div key={gi}>
              <div style={{ padding: '8px 18px 4px', fontSize: 10, fontWeight: 700, color: T.textDim, letterSpacing: 1, textTransform: 'uppercase', background: T.bg }}>{g.label}</div>
              {g.items.map((it, i) => (
                <div key={i} style={{ padding: '12px 18px', display: 'flex', gap: 11, borderBottom: `1px solid ${T.border}`, background: it.unread ? '#fafcff' : 'white', position: 'relative' }}>
                  {it.unread && <span style={{ position: 'absolute', left: 7, top: 18, width: 6, height: 6, borderRadius: '50%', background: T.blue }} />}
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: it.color + '18', color: it.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <I name={it.icon} size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: it.unread ? 600 : 500, color: T.navy, marginBottom: 2 }}>{it.title}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.desc}</div>
                    <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{it.time}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 18px', textAlign: 'center', borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.blue, fontWeight: 500 }}>Ver todas las notificaciones →</div>
      </div>
    </div>
  );
};
