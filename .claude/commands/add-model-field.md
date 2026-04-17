# Add Field to Existing Model

Adds a new field to an existing Prisma model and propagates the change through the full stack: schema → migration → API controller → Admin frontend → Portal frontend (if applicable).

**Usage:** `/add-model-field <ModelName> <fieldName> <prismaType> [optional]`

Examples:
- `/add-model-field Order deliveryAddress String`
- `/add-model-field Event maxCapacity Int optional`
- `/add-model-field Client taxId String optional`

---

## Step-by-step

### 1. Read current state first

Before touching anything, read:
- `packages/prisma/schema.prisma` — find the model and understand existing fields
- The relevant controller in `apps/api/src/controllers/` — identify where to add the field to list/create/update queries
- The relevant admin page — identify the Table column and Form field to add

### 2. Prisma Schema — `packages/prisma/schema.prisma`

Add the field to the model. Use `@map("snake_case")` and mark optional with `?` if requested:
```prisma
fieldName  PrismaType?  @map("field_name")
```

### 3. SQL Migration — `packages/prisma/migrations/<YYYYMMDD>_add_<field>_to_<table>/migration.sql`

```sql
ALTER TABLE "table_names" ADD COLUMN IF NOT EXISTS "field_name" <SQL_TYPE>;
```

Type mapping:
| Prisma type | SQL type |
|---|---|
| String | TEXT |
| String? | TEXT |
| Int | INTEGER |
| Float | DOUBLE PRECISION |
| Boolean | BOOLEAN NOT NULL DEFAULT false |
| DateTime | TIMESTAMPTZ |
| Decimal | NUMERIC(15,4) |
| Bytes | BYTEA |

### 4. API Controller

Identify the controller for the model (`apps/api/src/controllers/<model>s.controller.ts`):

- **list/get queries**: Add field to `select` or `include` if it needs to be returned. If using `findMany` without explicit select, nothing needed — Prisma returns all fields by default.
- **create handler**: Add field to Zod schema and to `prisma.<model>.create({ data: { ... } })`
- **update handler**: Add field to Zod schema (as `.optional()`) and to `prisma.<model>.update({ data: { ... } })`

For portal controllers (`apps/api/src/controllers/portal.*.controller.ts`), check if the field is relevant to portal users and update those too.

### 5. Admin Frontend

**API client** (`apps/admin/src/api/<model>s.ts`): Usually no change needed — `any` typed payloads pass through.

**Page component** (`apps/admin/src/pages/...`):
- Add a `Table` column if the field should be visible in the list
- Add a `Form.Item` with the appropriate Ant Design input to the create/edit Modal:
  - `String` → `<Input />`
  - `String` multiline → `<Input.TextArea rows={3} />`
  - `Int / Float / Decimal` → `<InputNumber />`
  - `Boolean` → `<Switch />`
  - `DateTime` → `<DatePicker showTime />`
  - Optional field → no `rules={[{ required: true }]}`

### 6. Portal Frontend (if applicable)

If the field is relevant to portal users (e.g., dates visible to exhibitors, order notes):
- Add to the display in the relevant portal page
- Add to form inputs if the portal user should be able to set it
- Check `apps/portal/src/pages/` for the relevant page

---

## Checklist

- [ ] Field added to `schema.prisma` with correct type and `@map`
- [ ] Migration SQL file created
- [ ] Controller `create` Zod schema updated
- [ ] Controller `update` Zod schema updated
- [ ] Portal controller updated if relevant
- [ ] Admin page: Table column added (if list-visible)
- [ ] Admin page: Form field added to Modal
- [ ] Portal page updated if relevant
- [ ] Offer to run `/deploy` when done
