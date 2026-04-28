# IventIA — Manual de Skills de Claude Code

Este archivo documenta todos los skills (comandos slash) disponibles en este proyecto, cómo usarlos, y cómo crear nuevos en el futuro.

---

## ¿Qué es un skill?

Un skill es un **comando slash personalizado** (`/nombre`) que le entrega a Claude Code un conjunto de instrucciones especializadas para ejecutar una tarea recurrente de forma consistente y eficiente.

Cuando escribes `/add-crud Venue`, Claude no parte de cero leyendo el codebase: el skill ya contiene el mapa de todos los archivos que hay que tocar, las convenciones del proyecto, y el checklist de pasos. Esto produce dos beneficios:

1. **Menos tokens** — No hay que redescubrir patrones en cada sesión.
2. **Consistencia** — El output siempre sigue las mismas convenciones (naming, multi-tenancy, privilege checks, etc.).

---

## Skills disponibles

### `/deploy "mensaje de commit"`

Hace `git add` + `git commit` + `git push origin master` para desplegar a producción (Vercel auto-despliega en ~1-2 min).

```
/deploy "Add Venues CRUD and menu entry"
```

---

### `/add-crud <EntidadEnPascalCase> [descripción de campos]`

Crea el ciclo completo de una nueva entidad en Admin:

| Qué crea | Dónde |
|---|---|
| Modelo Prisma | `packages/prisma/schema.prisma` |
| Migración SQL | `packages/prisma/migrations/YYYYMMDD_entity_name/` |
| Constantes de privilegio | `packages/shared/src/privileges.ts` |
| Controller REST | `apps/api/src/controllers/entityNames.controller.ts` |
| Routes file | `apps/api/src/routes/entityNames.routes.ts` |
| Registro en router API | `apps/api/src/routes/index.ts` |
| API client Admin | `apps/admin/src/api/entityNames.ts` |
| Página admin (Table+Modal) | `apps/admin/src/pages/catalogs/entityNames/EntityNamesPage.tsx` |
| Ruta admin | `apps/admin/src/router/index.tsx` |
| Ítem de menú | `apps/admin/src/layouts/MainLayout.tsx` |

**Ejemplos:**
```
/add-crud Venue name:string city:string capacity:int address:string?
/add-crud ExhibitorBadge type:string printedAt:DateTime? notes:string?
```

---

### `/add-model-field <Model> <fieldName> <prismaType> [optional]`

Agrega un campo a un modelo existente y lo propaga a través de todo el stack.

| Qué modifica | Dónde |
|---|---|
| Schema Prisma | `packages/prisma/schema.prisma` |
| Migración SQL | `packages/prisma/migrations/YYYYMMDD_add_field_to_table/` |
| Zod schema create/update | Controller correspondiente |
| Columna en tabla admin | Página admin correspondiente |
| Campo en form de modal | Página admin correspondiente |
| Portal (si aplica) | Página portal correspondiente |

**Ejemplos:**
```
/add-model-field Order deliveryAddress String optional
/add-model-field Event maxCapacity Int
/add-model-field Client taxId String optional
```

---

### `/add-portal-page <NombrePagina> [descripción]`

Crea una nueva página para el Portal de Expositores con el design system establecido: header de gradiente oscuro, dot pattern, orb de luz, badges de eyebrow, secciones en cards blancas.

| Qué crea | Dónde |
|---|---|
| API client portal | `apps/portal/src/api/<pageName>.ts` |
| Componente de página | `apps/portal/src/pages/<section>/<PageName>Page.tsx` |
| Endpoint API (si nuevo) | `apps/api/src/controllers/portal.<section>.controller.ts` |
| Ruta portal | `apps/portal/src/router/index.tsx` |
| Link de nav portal | `apps/portal/src/layouts/PortalLayout.tsx` |

**Ejemplos:**
```
/add-portal-page Documents list of downloadable documents for the exhibitor
/add-portal-page Profile exhibitor company profile editor
```

---

### `/add-admin-page <NombrePagina> [campos y descripción]`

Crea una página admin estándar (Table + Modal + búsqueda) sin necesariamente crear un modelo nuevo en la DB. Útil para entidades que ya existen en la DB pero no tienen página en Admin.

| Qué crea | Dónde |
|---|---|
| API client admin | `apps/admin/src/api/<pageNames>.ts` |
| Página (Table + Modal) | `apps/admin/src/pages/<section>/<PageName>sPage.tsx` |
| Ruta admin | `apps/admin/src/router/index.tsx` |
| Ítem de menú | `apps/admin/src/layouts/MainLayout.tsx` |

**Ejemplo:**
```
/add-admin-page ExhibitorType name, description, color (badge color)
```

---

### `/add-ai-action <nombre_tool> [descripción]`

Agrega una nueva acción ejecutable al Asistente IA (tool use de Anthropic).

| Qué modifica | Dónde |
|---|---|
| Nueva función `tool<Nombre>()` | `apps/api/src/services/ai.tools.service.ts` |
| Definición en `AI_TOOLS[]` y `case` en `executeTool()` | `apps/api/src/controllers/ai.controller.ts` |
| Icono y label (opcional) | `apps/admin/src/pages/analysis/AnalysisDashboard.tsx` → `ACTION_META` |

**Ejemplos:**
```
/add-ai-action send_portal_invite send invitation email to exhibitor portal
/add-ai-action update_event_status change event status with reason
```

---

### `/add-report <NombreReporte> [descripción y filtros]`

Crea un reporte en Admin con filtro de fechas, tabla de resultados y exportación CSV.

| Qué crea | Dónde |
|---|---|
| Endpoint API | `apps/api/src/controllers/reports.controller.ts` |
| Ruta API | `apps/api/src/routes/reports.routes.ts` |
| Privilegio | `packages/shared/src/privileges.ts` |
| API client | `apps/admin/src/api/reports.ts` |
| Página de reporte | `apps/admin/src/pages/reports/<Name>ReportPage.tsx` |
| Ruta admin | `apps/admin/src/router/index.tsx` |
| Ítem de menú | `apps/admin/src/layouts/MainLayout.tsx` |

**Ejemplos:**
```
/add-report Payments payments by event and date range, grouped by status
/add-report ResourceUsage how many units of each resource were ordered per event
```

---

## Cómo crear un nuevo skill

### 1. Crea el archivo en `.claude/commands/`

El nombre del archivo se convierte en el nombre del comando slash:

```
.claude/commands/mi-skill.md  →  /mi-skill
```

### 2. Estructura mínima del archivo

```markdown
# Título del skill

Descripción breve de qué hace.

**Uso:** `/mi-skill <argumento-requerido> [argumento-opcional]`

---

## Step-by-step

### 1. Primer paso
Instrucción detallada...

### 2. Segundo paso
...

---

## Checklist

- [ ] Tarea 1
- [ ] Tarea 2
- [ ] Offer to run `/deploy` when done
```

### 3. Usa `$ARGUMENTS` para recibir input del usuario

Cuando el usuario escribe `/mi-skill Venue address:string`, Claude recibe `"Venue address:string"` en `$ARGUMENTS`. Puedes indicar en las instrucciones cómo parsear eso.

### 4. Principios para escribir un buen skill

| Qué incluir | Por qué |
|---|---|
| Archivos exactos a tocar | Evita que Claude busque a ciegas |
| Ejemplo de código del patrón | Ancla al estilo del proyecto |
| Checklist al final | Reduce omisiones |
| "Offer to run `/deploy`" | Cierra el loop de despliegue |
| Referencias a archivos existentes | "Lee X antes de empezar" evita drift |

**Qué NO incluir:**
- Código que cambia con frecuencia (ponlo como referencia, no como copia literal)
- Detalles de negocio que pueden cambiar (fechas, nombres de clientes)
- Instrucciones para cosas que Claude ya sabe hacer bien (git, imports básicos de React)

### 5. Documenta el nuevo skill en este manual

Agrega una sección siguiendo el formato de las anteriores: nombre, tabla de qué crea / dónde, y ejemplo de uso.

---

## Dónde viven los skills

```
C:\IventIA\WORK\
└── .claude/
    └── commands/
        ├── SKILLS_MANUAL.md     ← este archivo
        ├── deploy.md
        ├── add-crud.md
        ├── add-model-field.md
        ├── add-portal-page.md
        ├── add-admin-page.md
        └── add-report.md
```

Los skills en `.claude/commands/` son específicos de este proyecto. Si quieres skills globales (disponibles en todos tus proyectos), colócalos en:
```
C:\Users\gabso\.claude\commands\
```

---

## Flujo de trabajo recomendado

```
1. Describe la feature al asistente en lenguaje natural
2. Si encaja con un skill → invoca el skill con /nombre
3. El asistente ejecuta el skill paso a paso
4. Al final: /deploy "descripción de lo que se hizo"
5. Vercel/Railway despliegan en ~1-2 minutos
```
