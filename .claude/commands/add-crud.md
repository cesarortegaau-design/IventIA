# Add Full CRUD for a New Entity

Creates the complete vertical slice for a new entity in the IventIA Admin: Prisma model, SQL migration, API controller + routes, and the Admin frontend page with Table + Modal.

**Usage:** `/add-crud <EntityName> [description of fields]`

Example: `/add-crud Venue name:string capacity:int address:string?`

---

## Step-by-step

### 1. Prisma Schema — `packages/prisma/schema.prisma`

Add a new model following existing conventions:
- Table name in `snake_case` via `@@map`
- All models include `id String @id @default(uuid())`, `tenantId`, `createdAt`, `updatedAt`
- Soft-delete pattern: `isActive Boolean @default(true) @map("is_active")`
- Add relation back from `Tenant` model if needed
- Use `@map("snake_case")` for every field

```prisma
model EntityName {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  // ... user-requested fields ...
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("entity_names")
}
```

### 2. SQL Migration — `packages/prisma/migrations/<timestamp>_<entity_name>/migration.sql`

Create folder named `YYYYMMDD_entity_name` with today's date and write raw SQL:
```sql
CREATE TABLE IF NOT EXISTS "entity_names" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  -- fields --
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "entity_names_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "entity_names_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);
```

### 3. Privileges — `packages/shared/src/privileges.ts`

Add privilege constants for the new entity:
```ts
ENTITYNAME_VIEW: 'entityname:view',
ENTITYNAME_CREATE: 'entityname:create',
ENTITYNAME_EDIT: 'entityname:edit',
ENTITYNAME_DELETE: 'entityname:delete',
```
Also add them to the `ADMIN` role's privilege list in the same file.

### 4. API Controller — `apps/api/src/controllers/entityNames.controller.ts`

Follow the pattern in `apps/api/src/controllers/resources.controller.ts`. Include:
- `list` — `findMany` filtered by `tenantId`, ordered by name/createdAt
- `get` — `findFirst` with `tenantId` + `id` check, throw `AppError(404)` if not found
- `create` — Zod schema validation, `prisma.entityName.create`
- `update` — Zod schema (all fields optional), `prisma.entityName.update`
- `remove` — soft-delete: `update({ isActive: false })` or hard-delete depending on entity

### 5. API Routes — `apps/api/src/routes/entityNames.routes.ts`

Follow the pattern in `apps/api/src/routes/resources.routes.ts`:
```ts
import { Router } from 'express'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import { list, get, create, update, remove } from '../controllers/entityNames.controller'

const router = Router()
router.get('/', requirePrivilege(PRIVILEGES.ENTITYNAME_VIEW), list)
router.get('/:id', requirePrivilege(PRIVILEGES.ENTITYNAME_VIEW), get)
router.post('/', requirePrivilege(PRIVILEGES.ENTITYNAME_CREATE), create)
router.patch('/:id', requirePrivilege(PRIVILEGES.ENTITYNAME_EDIT), update)
router.delete('/:id', requirePrivilege(PRIVILEGES.ENTITYNAME_DELETE), remove)
export default router
```

### 6. Register Routes — `apps/api/src/routes/index.ts`

Add:
```ts
import entityNamesRouter from './entityNames.routes'
// ...
router.use('/entity-names', entityNamesRouter)
```

### 7. Admin API Client — `apps/admin/src/api/entityNames.ts`

Follow the pattern in `apps/admin/src/api/resources.ts`:
```ts
import { apiClient } from './client'
export const entityNamesApi = {
  list: () => apiClient.get('/entity-names').then(r => r.data.data),
  get: (id: string) => apiClient.get(`/entity-names/${id}`).then(r => r.data.data),
  create: (data: any) => apiClient.post('/entity-names', data).then(r => r.data.data),
  update: (id: string, data: any) => apiClient.patch(`/entity-names/${id}`, data).then(r => r.data.data),
  remove: (id: string) => apiClient.delete(`/entity-names/${id}`).then(r => r.data),
}
```

### 8. Admin Page — `apps/admin/src/pages/catalogs/entityNames/EntityNamesPage.tsx`

Create a standard CRUD page. Follow `apps/admin/src/pages/catalogs/resources/ResourcesPage.tsx` as reference:
- `useQuery` to fetch list
- `useMutation` for create/update/delete with `queryClient.invalidateQueries`
- Ant Design `Table` with columns matching the entity fields
- `Modal` with `Form` for create/edit (single modal, `editingItem` state determines create vs update)
- `Popconfirm` on delete action
- Search/filter input if the list is expected to be long

### 9. Router — `apps/admin/src/router/index.tsx`

Add the route inside the authenticated layout:
```tsx
import EntityNamesPage from '../pages/catalogs/entityNames/EntityNamesPage'
// ...
<Route path="catalogos/entity-names" element={<EntityNamesPage />} />
```

### 10. Menu — `apps/admin/src/layouts/MainLayout.tsx`

Add inside the `catalogos` children array (or top-level if appropriate):
```ts
{ key: '/catalogos/entity-names', icon: <AppstoreOutlined />, label: 'Entity Names', show: hp(PRIVILEGES.ENTITYNAME_VIEW) },
```

---

## Checklist before finishing

- [ ] Prisma model added to `schema.prisma`
- [ ] SQL migration file created with correct date prefix
- [ ] Privileges added to `packages/shared/src/privileges.ts` and ADMIN role
- [ ] Controller created following multi-tenant pattern
- [ ] Routes file created and registered in `routes/index.ts`
- [ ] Admin API client created
- [ ] Admin page created (Table + Modal pattern)
- [ ] Route added to `router/index.tsx`
- [ ] Menu item added to `MainLayout.tsx`
- [ ] Offer to run `/deploy` when done
