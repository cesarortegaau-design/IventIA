// Variant C: Event Detail page with new shell + Mobile/Tablet shell

const VC3_T = window.IventIATokens;
const VC3_I = window.Icon;

window.VC_EventDetail = () => {
  const T = VC3_T;
  const I = VC3_I;
  const tabs = ['Resumen', 'Boletos', 'Mapa del Venue', 'Órdenes', 'Contratos', 'Producción', 'Documentos', 'Auditoría'];
  return (
    <div style={{ width: 1440, height: 900, background: T.bg, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 8 }}>
      <window.VC_TopNav active="eventos" />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Sidebar */}
        <aside style={{ width: 224, background: 'white', borderRight: `1px solid ${T.border}`, padding: '14px 8px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.textDim, letterSpacing: 1, textTransform: 'uppercase', padding: '4px 10px 6px' }}>Vistas</div>
          {[{l:'Todos',c:47},{l:'Activos',c:12,active:true},{l:'Borradores',c:5},{l:'Calendario'}].map((it,i)=>(
            <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 10px',background:it.active?T.light:'transparent',borderLeft:it.active?`3px solid ${T.blue}`:'3px solid transparent',borderRadius:4,fontSize:13,color:it.active?T.navy:T.text,fontWeight:it.active?600:400 }}>
              <I name="calendar" size={14} color={it.active?T.blue:T.textMuted}/>
              <span style={{flex:1}}>{it.l}</span>
              {it.c && <span style={{fontSize:11,color:T.textDim}}>{it.c}</span>}
            </div>
          ))}
          <div style={{ fontSize: 10, fontWeight: 600, color: T.textDim, letterSpacing: 1, textTransform: 'uppercase', padding: '14px 10px 6px' }}>Recientes</div>
          {[{l:'Vive Latino 2026',d:T.blue,active:true},{l:'Expo Tecnológica',d:T.success},{l:'Cumbre Empresarial',d:T.textMuted}].map((it,i)=>(
            <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 10px',background:it.active?T.light:'transparent',borderLeft:it.active?`3px solid ${T.blue}`:'3px solid transparent',borderRadius:4,fontSize:13,color:it.active?T.navy:T.text,fontWeight:it.active?600:400 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: it.d, marginLeft: 3 }} />
              <span>{it.l}</span>
            </div>
          ))}
        </aside>

        {/* Main */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Header */}
          <div style={{ background: 'white', borderBottom: `1px solid ${T.border}`, padding: '14px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.textMuted, marginBottom: 8 }}>
              <span>Eventos</span><I name="chevron" size={9} color={T.textDim}/>
              <span>Activos</span><I name="chevron" size={9} color={T.textDim}/>
              <span style={{ color: T.text }}>Vive Latino 2026</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#1e4d7b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <I name="calendar" size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h1 style={{ margin: 0, fontSize: 22, color: T.navy, fontWeight: 700 }}>Festival Vive Latino 2026</h1>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: T.blue + '18', color: T.blue, fontWeight: 600 }}>Confirmado</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4, display: 'flex', gap: 14 }}>
                    <span>📅 14–15 Mar 2026</span>
                    <span>📍 Foro Sol · CDMX</span>
                    <span>👤 OCESA</span>
                    <span>🎟 65,000 asistentes</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ padding: '7px 12px', background: 'white', border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, color: T.text }}>Compartir</button>
                <button style={{ padding: '7px 14px', background: T.navy, color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>Editar</button>
              </div>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, marginTop: 14, marginBottom: -14 }}>
              {tabs.map((t, i) => (
                <div key={t} style={{ padding: '10px 14px', borderBottom: i === 0 ? `2px solid ${T.blue}` : '2px solid transparent', color: i === 0 ? T.navy : T.textMuted, fontSize: 13, fontWeight: i === 0 ? 600 : 500 }}>{t}</div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              {/* Left col */}
              <div>
                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: 'Boletos vendidos', value: '48,320', sub: '74% ocupación', color: T.success },
                    { label: 'Ingreso total', value: '$28.4M', sub: '+12% vs meta', color: T.blue },
                    { label: 'OS activas', value: '34', sub: '7 pendientes', color: T.warning },
                    { label: 'Días al evento', value: '47', sub: 'on-track', color: T.purple },
                  ].map((k, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: 10, padding: 14, border: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{k.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: T.navy }}>{k.value}</div>
                      <div style={{ fontSize: 11, color: k.color, marginTop: 2 }}>{k.sub}</div>
                    </div>
                  ))}
                </div>
                {/* Timeline */}
                <div style={{ background: 'white', borderRadius: 10, padding: 18, border: `1px solid ${T.border}`, marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.navy, marginBottom: 14 }}>Línea de tiempo</div>
                  {[
                    { t: 'Hoy', icon: 'message', c: T.blue, title: 'Ana Torres comentó en producción', desc: 'Necesitamos 4 generadores adicionales para backstage' },
                    { t: 'Hace 2 d', icon: 'dollar', c: T.success, title: 'OS-2026-0142 aprobada', desc: 'Mobiliario VIP · $1,240,000' },
                    { t: 'Hace 5 d', icon: 'file-protect', c: T.warning, title: 'Contrato firmado', desc: 'Versión final firmada por OCESA' },
                  ].map((e, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 2 ? `1px solid ${T.border}` : 'none' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: e.c + '18', color: e.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <I name={e.icon} size={14} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>{e.title}</div>
                        <div style={{ fontSize: 12, color: T.textMuted }}>{e.desc}</div>
                      </div>
                      <div style={{ fontSize: 11, color: T.textDim }}>{e.t}</div>
                    </div>
                  ))}
                </div>
                {/* Boletos por sección */}
                <div style={{ background: 'white', borderRadius: 10, padding: 18, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.navy, marginBottom: 14 }}>Ocupación por sección</div>
                  {[
                    { name: 'Pista General', sold: 24500, total: 30000, color: T.blue },
                    { name: 'Grada VIP', sold: 12000, total: 15000, color: T.purple },
                    { name: 'Platinum', sold: 8200, total: 12000, color: T.warning },
                    { name: 'Palcos', sold: 3620, total: 8000, color: T.success },
                  ].map((s, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: T.text, fontWeight: 500 }}>{s.name}</span>
                        <span style={{ color: T.textMuted }}>{s.sold.toLocaleString()} / {s.total.toLocaleString()}</span>
                      </div>
                      <div style={{ height: 6, background: T.bg, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${s.sold/s.total*100}%`, height: '100%', background: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Right col */}
              <div>
                <div style={{ background: 'white', borderRadius: 10, padding: 16, border: `1px solid ${T.border}`, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 12 }}>Equipo</div>
                  {['Ana Torres · Producción','Carlos Méndez · Comercial','Lucía Vega · Logística'].map((p,i)=>(
                    <div key={i} style={{ display:'flex',alignItems:'center',gap:9,padding:'6px 0' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: [T.blue,T.success,T.warning][i], color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{p.split(' ')[0][0]}{p.split(' ')[1][0]}</div>
                      <span style={{ fontSize: 12, color: T.text }}>{p}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'white', borderRadius: 10, padding: 16, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 12 }}>Próximos hitos</div>
                  {[{d:'18 Feb',l:'Cierre cotizaciones'},{d:'25 Feb',l:'Montaje inicia'},{d:'13 Mar',l:'Pruebas técnicas'},{d:'14 Mar',l:'Apertura'}].map((m,i)=>(
                    <div key={i} style={{ display:'flex',gap:10,padding:'7px 0',borderBottom:i<3?`1px solid ${T.border}`:'none' }}>
                      <div style={{ minWidth: 56, fontSize: 11, color: T.textMuted, fontWeight: 600 }}>{m.d}</div>
                      <div style={{ fontSize: 12, color: T.text }}>{m.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// === MOBILE / TABLET ===
window.VC_Mobile = () => {
  const T = VC3_T;
  const I = VC3_I;
  return (
    <div style={{ width: 1100, padding: 28, background: T.bg, borderRadius: 8, fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ margin: '0 0 4px', color: T.navy, fontSize: 22 }}>Móvil y tablet</h2>
      <p style={{ margin: '0 0 18px', color: T.textMuted, fontSize: 13 }}>Top-nav colapsa a logo + menú; áreas y sidebar se vuelven drawer. Bottom-tabs en mobile para las 4 áreas más frecuentes.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '375px 768px', gap: 20, justifyContent: 'center' }}>
        {/* Mobile */}
        <div>
          <div style={{ fontSize: 11, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>Mobile · 375px</div>
          <div style={{ width: 375, height: 720, background: 'white', borderRadius: 24, border: `8px solid #1f1f1f`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 28, background: '#1f1f1f' }} />
            <div style={{ background: T.navy, color: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <I name="menu" size={18} color="white" />
                <span style={{ fontWeight: 700, fontSize: 16 }}>Eventos</span>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <I name="search" size={16} color="white" />
                <div style={{ position: 'relative' }}>
                  <I name="bell" size={16} color="white" />
                  <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', background: T.danger }} />
                </div>
              </div>
            </div>
            <div style={{ padding: 14, flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>Activos · 12</div>
              {[{n:'Vive Latino 2026',d:'14 Mar',c:T.blue,s:'Confirmado'},{n:'Expo Tecnológica',d:'22 Abr',c:T.success,s:'En Progreso'},{n:'Cumbre Empresarial',d:'08 May',c:T.blue,s:'Confirmado'},{n:'Torneo Regional',d:'15 Jun',c:T.blue,s:'Confirmado'}].map((e,i)=>(
                <div key={i} style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: T.navy }}>{e.n}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 9, background: e.c+'18', color: e.c, fontWeight: 600 }}>{e.s}</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>{e.d}</div>
                </div>
              ))}
            </div>
            {/* Bottom tabs */}
            <div style={{ background: 'white', borderTop: `1px solid ${T.border}`, display: 'flex', padding: '6px 0' }}>
              {[{i:'home',l:'Inicio'},{i:'calendar',l:'Eventos',active:true},{i:'tool',l:'Operac.'},{i:'menu',l:'Más'}].map((t,i)=>(
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 0', color: t.active ? T.blue : T.textMuted }}>
                  <I name={t.i} size={18} />
                  <span style={{ fontSize: 10, fontWeight: t.active ? 600 : 500 }}>{t.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Tablet */}
        <div>
          <div style={{ fontSize: 11, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>Tablet · 768px (sidebar colapsado a íconos)</div>
          <div style={{ width: 768, height: 720, background: 'white', borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: T.navy, color: 'white', height: 52, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: T.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>I</div>
              <nav style={{ display: 'flex', gap: 4 }}>
                {['home','calendar','tool','appstore','bar-chart','contacts'].map((ic,i)=>(
                  <div key={ic} style={{ width: 36, height: 36, background: i===1?'rgba(255,255,255,0.12)':'transparent', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: i===1?'white':'rgba(255,255,255,0.7)' }}>
                    <I name={ic} size={16} />
                  </div>
                ))}
              </nav>
              <div style={{ flex: 1 }} />
              <I name="search" size={16} color="white" />
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: T.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>CO</div>
            </div>
            <div style={{ flex: 1, display: 'flex' }}>
              <aside style={{ width: 56, background: 'white', borderRight: `1px solid ${T.border}`, padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                {['calendar','schedule','file-protect','file-word'].map((ic,i)=>(
                  <div key={i} style={{ width: 36, height: 36, background: i===0?T.light:'transparent', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: i===0?T.blue:T.textMuted }}>
                    <I name={ic} size={15} />
                  </div>
                ))}
              </aside>
              <div style={{ flex: 1, padding: 16, background: T.bg }}>
                <div style={{ fontSize: 13, color: T.navy, fontWeight: 600, marginBottom: 12 }}>Activos · 12</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                  {[1,2,3,4].map(i=>(
                    <div key={i} style={{ background: 'white', borderRadius: 8, padding: 12, border: `1px solid ${T.border}` }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: T.navy }}>Evento {i}</div>
                      <div style={{ fontSize: 11, color: T.textMuted }}>Confirmado</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
