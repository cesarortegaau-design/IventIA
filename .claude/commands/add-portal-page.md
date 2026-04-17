# Add Portal Page

Creates a new page for the Exhibitor Portal (`apps/portal`) following the established design system: dark gradient header with dot pattern, section cards, and the purple palette.

**Usage:** `/add-portal-page <PageName> [brief description of what it shows]`

Examples:
- `/add-portal-page Documents list of documents the exhibitor can download`
- `/add-portal-page Profile exhibitor profile editor`

---

## Design System Reference

Every portal page uses this visual language (reference: `apps/portal/src/pages/event/EventPortalPage.tsx`):

### Color palette
```ts
const COLORS = {
  primary: '#6B46C1',       // purple buttons, accents
  primaryDark: '#553C9A',   // hover states
  dark: '#1e1b4b',          // header background start
  darkMid: '#312e81',       // header background end
  accent: '#7C3AED',        // glow orb, highlights
  offWhite: '#F3F4F6',      // page background
  border: '#E5E7EB',        // card borders
  textMuted: '#6B7280',     // secondary text
}
```

### Page structure
```tsx
<div style={{ minHeight: '100vh', background: COLORS.offWhite }}>

  {/* ── Dark gradient header ─────────────────────────────── */}
  <div style={{
    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
    padding: '32px 24px 40px',
    position: 'relative',
    overflow: 'hidden',
  }}>
    {/* Dot pattern overlay */}
    <div style={{
      position: 'absolute', inset: 0, opacity: 0.15,
      backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    }} />
    {/* Glow orb */}
    <div style={{
      position: 'absolute', top: -60, right: -60, width: 200, height: 200,
      borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.4), transparent 70%)',
    }} />

    <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto' }}>
      {/* Eyebrow badge */}
      <div style={{
        display: 'inline-block', background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(8px)', borderRadius: 20, padding: '4px 16px',
        color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: 1,
        textTransform: 'uppercase', marginBottom: 12,
      }}>
        PAGE CATEGORY
      </div>
      {/* Title */}
      <Title level={2} style={{ color: '#fff', margin: 0, fontSize: 26 }}>
        Page Title
      </Title>
      {/* Subtitle */}
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4, display: 'block' }}>
        Short description
      </Text>
    </div>
  </div>

  {/* ── Content area ────────────────────────────────────── */}
  <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>

    {/* Section card */}
    <div style={{
      background: '#fff', borderRadius: 16, border: `1px solid ${COLORS.border}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16, overflow: 'hidden',
    }}>
      {/* Section header */}
      <div style={{
        padding: '14px 20px', borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.offWhite, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #6B46C1, #7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <SomeIcon style={{ color: '#fff', fontSize: 16 }} />
        </div>
        <Text strong style={{ fontSize: 15 }}>Section Title</Text>
      </div>
      {/* Section body */}
      <div style={{ padding: 20 }}>
        {/* content */}
      </div>
    </div>

  </div>
</div>
```

---

## Step-by-step

### 1. Read context

Read `apps/portal/src/pages/event/EventPortalPage.tsx` briefly to stay aligned with the current design patterns, and `apps/portal/src/router/index.tsx` to understand route structure.

### 2. Portal API Client — `apps/portal/src/api/<pageName>.ts`

Create an API client using the portal axios instance:
```ts
import { apiClient } from './client'
export const <pageName>Api = {
  list: () => apiClient.get('/<endpoint>').then(r => r.data.data),
  // add other methods as needed
}
```

Note: the portal `apiClient` base URL points to `/api/v1/portal` — endpoints are relative to that.

### 3. Page Component — `apps/portal/src/pages/<section>/<PageName>Page.tsx`

- Use the design system structure above
- Use `useQuery` from TanStack Query for data fetching
- Use `useAuthStore` from `../stores/authStore` if you need user/tenant info
- Handle loading with `<Spin />` centered, errors with a simple error message card
- Mobile-first: use `padding: '0 16px'` on mobile, wider on desktop via inline checks or the `mobile.css` overrides

### 4. API Backend (if new endpoint needed)

If the page needs a new endpoint, add it to:
- `apps/api/src/controllers/portal.<section>.controller.ts` (or create new file)
- `apps/api/src/routes/portal.routes.ts`

All portal routes use `portalAuth` middleware — the portal user context is in `req.portalUser`.

### 5. Router — `apps/portal/src/router/index.tsx`

Add the route inside the authenticated portal layout:
```tsx
import <PageName>Page from '../pages/<section>/<PageName>Page'
// ...
<Route path="/<route-path>" element={<PageName>Page />} />
```

### 6. Portal Navigation — `apps/portal/src/layouts/PortalLayout.tsx`

Add a menu/nav link if the page should appear in the portal sidebar or bottom nav.

---

## Checklist

- [ ] API client created in `apps/portal/src/api/`
- [ ] Page component created with dark gradient header design
- [ ] Loading and error states handled
- [ ] Backend endpoint created/updated if needed
- [ ] Route added to portal router
- [ ] Navigation link added to portal layout
- [ ] Offer to run `/deploy` when done
