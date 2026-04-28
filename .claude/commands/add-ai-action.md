# Add AI Action (Tool Use)

Agrega una nueva acción ejecutable al Asistente IA de IventIA.
Las acciones permiten que Claude interactúe con el sistema (leer datos, crear/modificar registros)
mediante el mecanismo de tool use de la API de Anthropic.

**Uso:** `/add-ai-action <nombre_tool> [descripción breve]`

Ejemplo: `/add-ai-action send_portal_invite send invitation email to exhibitor portal`

---

## Archivos a modificar

| Archivo | Qué hacer |
|---|---|
| `apps/api/src/services/ai.tools.service.ts` | Agregar la función `tool<NombrePascal>(input, tenantId, userId?)` |
| `apps/api/src/controllers/ai.controller.ts` | Agregar la definición del tool en `AI_TOOLS[]` y el `case` en `executeTool()` |
| `apps/admin/src/pages/analysis/AnalysisDashboard.tsx` | Si la acción tiene resultado especial, agregar icono/label en `ACTION_META` |

---

## Paso 1 — Implementar la función en `ai.tools.service.ts`

Patrón obligatorio:

```typescript
// ── Tool: <nombre_tool> ───────────────────────────────────────────────────────
export async function tool<NombrePascal>(
  input: { campo1: string; campo2?: string },
  tenantId: string,
  userId?: string,         // solo si la acción escribe datos
): Promise<Record<string, any>> {
  // 1. Validar que los recursos pertenecen al tenant
  const entity = await prisma.<model>.findFirst({ where: { id: input.campo1, tenantId } })
  if (!entity) throw new Error(`<Entidad> no encontrada`)

  // 2. Ejecutar la operación
  const result = await prisma.<model>.<accion>(...)

  // 3. Devolver un objeto plano con los datos relevantes
  return {
    id: result.id,
    // ... campos necesarios para que Claude describa el resultado
    adminUrl: `/ruta/${result.id}`,
  }
}
```

Reglas:
- Siempre filtrar por `tenantId` en todas las queries Prisma
- Devolver `adminUrl` para que el frontend pueda mostrar un enlace
- Para acciones de escritura, usar `userId` como `createdById`
- Lanzar `Error` con mensaje en español si algo no se encuentra

---

## Paso 2 — Registrar el tool en `ai.controller.ts`

### 2a. Agregar a `AI_TOOLS[]`

```typescript
{
  name: '<nombre_tool>',
  description: 'Descripción clara de cuándo y para qué usar este tool. Si escribe datos, indica "Pide confirmación al usuario ANTES de ejecutar."',
  input_schema: {
    type: 'object' as const,
    properties: {
      campo1: { type: 'string', description: 'Qué es este campo' },
      campo2: { type: 'string', description: 'Qué es este campo (opcional)' },
    },
    required: ['campo1'],
  },
},
```

### 2b. Agregar a `executeTool()`

```typescript
case '<nombre_tool>': return tool<NombrePascal>(input, tenantId, userId)
```

### 2c. Importar la función nueva al inicio del archivo

```typescript
import { ..., tool<NombrePascal> } from '../services/ai.tools.service'
```

---

## Paso 3 — Actualizar el frontend (opcional)

En `AnalysisDashboard.tsx`, el mapa `ACTION_META` controla icono y etiqueta de cada acción:

```typescript
const ACTION_META: Record<string, { icon: string; label: string }> = {
  // ...acciones existentes...
  '<nombre_tool>': { icon: '✉️', label: 'Invitación enviada' },
}
```

Si el tool devuelve `adminUrl`, se muestra automáticamente como enlace clickeable.

---

## Paso 4 — Actualizar el system prompt (si aplica)

Si el nuevo tool requiere contexto adicional que Claude no tiene (ej. IDs de recursos específicos),
agrega esa información en `buildAIContext()` en `apps/api/src/services/ai.context.service.ts`.

---

## Tipos de tool por patrón

| Patrón | Ejemplo | ¿Necesita userId? | ¿Pide confirmación? |
|---|---|---|---|
| Lectura | `search_events`, `check_availability` | No | No |
| Creación | `create_order`, `copy_event` | Sí | Sí |
| Modificación | `update_event_status` | Sí | Sí |
| Envío externo | `send_portal_invite` | Sí | Sí |

---

## Checklist

- [ ] Función en `ai.tools.service.ts` con filtro por `tenantId`
- [ ] Definición en `AI_TOOLS[]` con description clara (incluye "Pide confirmación" si escribe datos)
- [ ] `case` en `executeTool()`
- [ ] Import agregado en `ai.controller.ts`
- [ ] `ACTION_META` actualizado en `AnalysisDashboard.tsx` (si aplica)
- [ ] Probar en chat: "busca el evento X" → "cópialo a mayo 2026" → confirmar → verificar en Admin
- [ ] Offer to run `/deploy` when done
