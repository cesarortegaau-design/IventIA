# Phase 3 & 4 Testing Plan: Package System with Pricing Integration

## Test Environment
- API: `http://localhost:3001`
- Admin: `http://localhost:5173`
- Default credentials: `admin@exposaantafe.com.mx` / `Admin1234!`

---

## Phase 3: Package Pricing Integration

### Test 3.1: Add Regular Resource to Price List
**Steps:**
1. Log in to Admin
2. Navigate to **Catálogos > Listas de Precio**
3. Create a new price list (or use existing)
4. Click "Ver artículos" on the price list
5. Click "Agregar artículo"
6. Select a regular (non-package) resource
7. Enter prices: Anticipado: $100, Normal: $150, Tardío: $200
8. Save

**Expected:**
- Item is added to price list
- Table shows the resource with three price columns
- No package component section should appear

---

### Test 3.2: Add Package Resource to Price List
**Prerequisites:**
- Create a package resource with at least 2 components (from ResourcesPage)
  - E.g., "Paquete Mesas" containing "Mesa Redonda (Qty: 2)" and "Mantel (Qty: 1)"

**Steps:**
1. Navigate to **Catálogos > Listas de Precio**
2. Create a new price list (or use existing)
3. Click "Ver artículos"
4. Click "Agregar artículo"
5. Select the package resource
6. **VERIFY:** Below the resource select, a blue information box appears showing:
   - "📦 Componentes del paquete"
   - List of components with Code, Name, Quantity, and Unit
   - E.g., "RDM - Mesa Redonda | Cantidad: 2.000 pieza"
7. Enter prices: Anticipado: $500, Normal: $750, Tardío: $1000
8. Leave Unit empty (will use package's unit)
9. Save

**Expected:**
- Package is added to price list
- Prices stored are for the package level, NOT component level
- Component prices remain independent (if they have their own price list entries)

---

### Test 3.3: View Package with Component Details
**Steps:**
1. Navigate to **Catálogos > Listas de Precio**
2. Click "Ver artículos" on the price list from Test 3.2
3. Find the package resource in the table
4. Click the expand arrow on the left of the package row

**Expected:**
- Row expands to show a nested table with:
  - "📦 Componentes del paquete" header
  - Each component listed with Code, Name, Quantity, Unit
  - E.g., "RDM - Mesa Redonda | Cantidad: 2.000 pieza"
- Collapsing the row hides the component details

---

### Test 3.4: Package with PERSONAL Component
**Prerequisites:**
- Create a PERSONAL resource with unit "turno"
- Create a package containing this PERSONAL resource
  - E.g., "Paquete Servicios" containing "Coordinador (Qty: 1, unit: turno)"

**Steps:**
1. Navigate to **Catálogos > Listas de Precio**
2. Add the package to a price list (same as Test 3.2)
3. Verify component shows: "Coordinador | Cantidad: 1.000 turno"

**Expected:**
- PERSONAL resource unit (turno) is displayed correctly
- Package pricing works regardless of component types

---

## Phase 4: End-to-End Package System Testing

### Test 4.1: Nested Packages (Package containing Package)
**Prerequisites:**
- Create Resource A: "Mesa Redonda" (non-package)
- Create Package B: "Pack Comedor" containing Resource A (Qty: 2)
- Create Package C: "Pack Eventos" containing Package B (Qty: 1)

**Steps:**
1. Navigate to **Catálogos > Recursos**
2. Click on Package C (Pack Eventos)
3. Verify it shows the "Componentes del Paquete" tab
4. Verify Package B is listed as a component with isPackage=true

**Expected:**
- Nested packages are supported
- ComponentResource shows correct structure
- Can view up to 2+ levels of nesting

---

### Test 4.2: Add Nested Package to Price List
**Steps:**
1. Navigate to **Catálogos > Listas de Precio**
2. Add Package C (from Test 4.1) to a price list
3. Verify the modal shows "📦 Componentes del paquete" with Package B listed
4. Set prices: $2000 (Anticipado), $3000 (Normal), $4000 (Tardío)
5. Save

**Expected:**
- Nested package is added successfully
- Direct child component (Package B) is displayed
- Nested components (Mesa Redonda inside Package B) are NOT shown
  - (This is expected: we only show direct children, not recursive expansion)

---

### Test 4.3: Substitute Components
**Prerequisites:**
- Create 3 resources: "Bebida A", "Bebida B", "Bebida C"
- Create Package D: "Bebida Mix" with isSubstitute=true
- Add all 3 resources as components to Package D

**Steps:**
1. Navigate to **Catálogos > Recursos**
2. Click on Package D
3. Verify the blue warning box appears: "⚠️ Componentes Sustitutos" with message "Solo uno de estos componentes será seleccionable en las órdenes de servicio"
4. Verify all 3 beverage components are listed in the table

**Expected:**
- isSubstitute flag displays warning UI
- All substitute components are visible
- Warning message is clear about selection behavior

---

### Test 4.4: Circular Reference Prevention
**Steps:**
1. Navigate to **Catálogos > Recursos**
2. Create a package "Test Package"
3. Click "Agregar Componente" button
4. In the "Recurso Componente" dropdown, search for "Test Package"
5. Attempt to select it

**Expected:**
- "Test Package" should NOT appear in the dropdown
- Dropdown filters out the package itself
- Error message or prevention occurs at API level

**Alternative Flow (API Test):**
```bash
curl -X POST http://localhost:3001/api/v1/resources/PACKAGE_ID/package-components \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"componentResourceId": "PACKAGE_ID", "quantity": 1}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "CIRCULAR_REFERENCE",
    "message": "Un paquete no puede contenerse a sí mismo"
  }
}
```

---

### Test 4.5: Duplicate Component Prevention
**Prerequisites:**
- Package with at least one component (e.g., "Mesa Redonda")

**Steps:**
1. Navigate to **Catálogos > Recursos**
2. Click on the package
3. Click "Agregar Componente"
4. Select "Mesa Redonda" and set Quantity: 1
5. Save
6. Attempt to add "Mesa Redonda" again (same component)
7. Set Quantity: 2, Save

**Expected:**
- First save succeeds
- Second save fails with error: "DUPLICATE_COMPONENT - Este componente ya está en el paquete"
- UI shows error message
- Component is not duplicated in the table

---

### Test 4.6: Unit Validation for PERSONAL Type
**Steps:**
1. Navigate to **Catálogos > Recursos**
2. Create a new resource with Type: PERSONAL
3. Verify the unit field changes from Text Input to a Select dropdown with options:
   - pieza
   - litro
   - kilogramo
   - metro
   - metro cuadrado
   - turno
4. Try to bypass by selecting "Turno"
5. Save

**Expected:**
- Unit becomes a restrictive dropdown for PERSONAL type
- Only valid units are available
- Resource is created with the selected unit

**Negative Test:**
```bash
curl -X POST http://localhost:3001/api/v1/resources \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "PERSONAL",
    "unit": "invalid_unit",
    "name": "Test",
    "code": "TST"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Para tipo PERSONAL, la unidad debe ser una de: pieza, litro, kilogramo, metro, metro cuadrado, turno"
  }
}
```

---

### Test 4.7: isSubstitute Validation
**Steps:**
1. Create a regular (non-package) resource
2. Try to add a component to it (should fail)
3. Create a package with isPackage=true
4. Try to set isSubstitute=true on a non-package resource

**Expected (API):**
```bash
curl -X POST http://localhost:3001/api/v1/resources \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "SERVICE",
    "name": "Test",
    "code": "TST",
    "isPackage": false,
    "isSubstitute": true
  }'
```

Response: 400 VALIDATION_ERROR - "isSubstitute solo se puede usar si isPackage es true"

---

### Test 4.8: Audit Logging
**Steps:**
1. Create a package and add components (as in earlier tests)
2. Navigate to **Admin > Auditoría** (if available)
3. Search for actions on PackageComponent
4. Verify logs show:
   - CREATE action when component is added
   - UPDATE action when quantity/order is changed
   - DELETE action when component is removed

**Expected:**
- All package component mutations are logged
- Logs include: tenantId, userId, resourceId, action, oldValues, newValues, timestamp, IP

---

## Summary of Test Coverage

| Test | Phase | Status | Expected Outcome |
|------|-------|--------|------------------|
| 3.1 | Regular resource pricing | - | ✅ Resource added, no components shown |
| 3.2 | Package pricing | - | ✅ Package added, components displayed |
| 3.3 | View package details | - | ✅ Expandable rows show component info |
| 3.4 | PERSONAL in package | - | ✅ Unit displayed correctly |
| 4.1 | Nested packages | - | ✅ Package can contain package |
| 4.2 | Nested package pricing | - | ✅ Nested package added to price list |
| 4.3 | Substitute components | - | ✅ Warning UI shown, all components listed |
| 4.4 | Circular reference prevention | - | ✅ Package can't contain itself |
| 4.5 | Duplicate prevention | - | ✅ Same component can't be added twice |
| 4.6 | PERSONAL unit validation | - | ✅ Unit restricted to allowed values |
| 4.7 | isSubstitute validation | - | ✅ Can only be true if isPackage=true |
| 4.8 | Audit logging | - | ✅ All mutations logged |

---

## Known Limitations & Design Decisions

1. **Component Price Inheritance:**
   - Packages are priced independently from their components
   - Component prices are NOT automatically calculated from package price
   - Each package and each component have their own price list entries

2. **Nested Component Display:**
   - When viewing a package with nested packages, we show only direct children
   - We don't recursively expand grandchildren
   - This keeps the UI simple and performant

3. **Stock Tracking:**
   - Package stock is not automatically calculated from component stock
   - Package stock must be managed separately
   - Component stock validation happens at order time

4. **Price Tier Calculation:**
   - Price tiers (EARLY, NORMAL, LATE) apply to the package as a whole
   - Components may have different tiers independently
