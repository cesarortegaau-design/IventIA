# Phase 4: End-to-End Testing Guide

**Objective:** Verify the complete package system works correctly across all scenarios

**Environment:**
- Admin UI: http://localhost:5173
- Credentials: admin@exposaantafe.com.mx / Admin1234!
- Database: Should already have demo data

---

## Test Suite 1: Package Creation & Component Management

### Test 1.1: Create Simple Package
**Steps:**
1. Log in to Admin
2. Navigate to **Catálogos > Recursos**
3. Click **Nueva Recurso**
4. Fill in:
   - Código: `PKG_BASICO`
   - Nombre: `Paquete Básico`
   - Tipo: `SERVICE`
   - Stock: `10`
5. Toggle ON: **¿Es paquete?**
6. Verify: **¿Es sustituto?** toggle disappears (only shows if isPackage=true)
7. Save

**Expected Result:**
- ✅ Resource created with isPackage=true
- ✅ UI shows "¿Paquete?" column with "Sí" indicator
- ✅ New tab appears: "Componentes del Paquete"

---

### Test 1.2: Add Components to Package
**Prerequisites:** Existing resources (Mesa, Silla, Mantel)

**Steps:**
1. From Test 1.1, click on "Paquete Básico"
2. Click on "Componentes del Paquete" tab
3. Click **Agregar Componente**
4. Modal opens:
   - Select: "Mesa Redonda"
   - Cantidad: `2`
   - Orden: `0`
   - Click OK
5. Verify: Component appears in table
6. Repeat: Add "Silla" (Qty: 4, Order: 1)
7. Repeat: Add "Mantel" (Qty: 1, Order: 2)

**Expected Result:**
- ✅ Table shows all 3 components with Code, Name, Quantity, Unit columns
- ✅ Components ordered by "Orden" field
- ✅ Success message "Componente agregado"

---

### Test 1.3: Edit Component Quantity
**Prerequisites:** Test 1.2 completed

**Steps:**
1. In the Componentes table, find "Mesa Redonda" row
2. Click Edit (pencil icon)
3. Modal opens with current values
4. Change Cantidad from `2` to `3`
5. Change Orden from `0` to `1`
6. Click OK

**Expected Result:**
- ✅ Component quantity updated to 3
- ✅ Sort order updated
- ✅ Table refreshes
- ✅ Message: "Componente actualizado"

---

### Test 1.4: Delete Component
**Prerequisites:** Test 1.3 completed (Mesa should have Qty: 3)

**Steps:**
1. Find "Mesa Redonda" in components table
2. Click Delete (trash icon)
3. Confirm deletion in popup
4. Verify: Component removed from table

**Expected Result:**
- ✅ Component deleted successfully
- ✅ Message: "Componente removido del paquete"
- ✅ Only 2 components remain (Silla, Mantel)

---

### Test 1.5: Prevent Self-Reference
**Prerequisites:** Test 1.2 completed (Paquete Básico with components)

**Steps:**
1. On Paquete Básico, click **Agregar Componente**
2. In the dropdown, search for "Paquete Básico"
3. Try to select it

**Expected Result:**
- ✅ "Paquete Básico" does NOT appear in dropdown
- ✅ Self-reference is prevented at UI level

**API Test (if needed):**
```bash
curl -X POST http://localhost:3001/api/v1/resources/{PKG_ID}/package-components \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"componentResourceId": "{PKG_ID}", "quantity": 1}'

# Expected: 400 CIRCULAR_REFERENCE error
```

---

### Test 1.6: Prevent Duplicate Components
**Prerequisites:** Test 1.2 completed

**Steps:**
1. On Paquete Básico, click **Agregar Componente**
2. Select "Silla" (already in package)
3. Enter Cantidad: `2`
4. Try to save

**Expected Result:**
- ✅ Error message: "DUPLICATE_COMPONENT - Este componente ya está en el paquete"
- ✅ Component is not added twice
- ✅ Modal stays open to try again with different component

---

## Test Suite 2: PERSONAL Resource Type

### Test 2.1: Create PERSONAL Resource
**Steps:**
1. Navigate to **Catálogos > Recursos**
2. Click **Nueva Recurso**
3. Fill in:
   - Código: `COORD_01`
   - Nombre: `Coordinador Evento`
   - Tipo: `PERSONAL`
4. Observe: Unit field changes from Text Input to **Select Dropdown**
5. Select: `turno`
6. Save

**Expected Result:**
- ✅ Type dropdown shows PERSONAL option
- ✅ Unit field becomes SELECT (not TEXT INPUT)
- ✅ Dropdown options: pieza, litro, kilogramo, metro, metro cuadrado, turno
- ✅ Resource saved successfully with unit: "turno"

---

### Test 2.2: PERSONAL in Package
**Steps:**
1. Create a new Package: "Servicios Evento"
2. Click on it → Components tab
3. Click **Agregar Componente**
4. Select: "Coordinador Evento" (from Test 2.1)
5. Enter Cantidad: `1`
6. Save

**Expected Result:**
- ✅ Component added successfully
- ✅ Table shows: "COORD_01 - Coordinador Evento | Cantidad: 1.000 turno"
- ✅ Unit (turno) is preserved and displayed

---

### Test 2.3: Invalid Unit for PERSONAL (API Test)
**API Command:**
```bash
curl -X POST http://localhost:3001/api/v1/resources \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "INVALID",
    "name": "Invalid PERSONAL",
    "type": "PERSONAL",
    "unit": "invalid_unit"
  }'
```

**Expected Result:**
- ✅ Status: 400
- ✅ Error: VALIDATION_ERROR
- ✅ Message: "Para tipo PERSONAL, la unidad debe ser una de: pieza, litro, kilogramo, metro, metro cuadrado, turno"

---

## Test Suite 3: Substitute Components

### Test 3.1: Create Package with Substitute Components
**Steps:**
1. Navigate to **Catálogos > Recursos**
2. Click **Nueva Recurso**
3. Fill in:
   - Código: `PKG_BEBIDAS`
   - Nombre: `Bebida Mix (Sustituto)`
   - Tipo: `SERVICE`
4. Toggle ON: **¿Es paquete?**
5. Observe: **¿Es sustituto?** toggle appears
6. Toggle ON: **¿Es sustituto?**
7. Save

**Expected Result:**
- ✅ isPackage AND isSubstitute are both true
- ✅ No error on save

---

### Test 3.2: Add Substitute Components
**Prerequisites:** Test 3.1 completed, with resources: "Jugo", "Refresco", "Agua"

**Steps:**
1. Click on "Bebida Mix (Sustituto)"
2. Click on "Componentes del Paquete" tab
3. Observe blue warning box:
   - **"⚠️ Componentes Sustitutos"**
   - Message: "Solo uno de estos componentes será seleccionable en las órdenes de servicio"
4. Click **Agregar Componente**
5. Add "Jugo" (Qty: 1, Order: 0)
6. Repeat: Add "Refresco" (Qty: 1, Order: 1)
7. Repeat: Add "Agua" (Qty: 1, Order: 2)

**Expected Result:**
- ✅ Blue warning box is displayed prominently
- ✅ All 3 components are listed
- ✅ No error on adding multiple components to substitute package

---

### Test 3.3: Cannot Create Substitute Without Package
**API Test:**
```bash
curl -X POST http://localhost:3001/api/v1/resources \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "INVALID_SUB",
    "name": "Invalid Substitute",
    "type": "SERVICE",
    "isPackage": false,
    "isSubstitute": true
  }'
```

**Expected Result:**
- ✅ Status: 400
- ✅ Error: VALIDATION_ERROR
- ✅ Message: "isSubstitute solo se puede usar si isPackage es true"

---

## Test Suite 4: Nested Packages

### Test 4.1: Create Nested Package Structure
**Steps:**
1. Create Resource A: "Silla" (regular FURNITURE resource)
2. Create Package B: "Set Comedor"
   - Add Component: Silla (Qty: 4)
   - Save
3. Create Package C: "Paquete Eventos Grandes"
4. Click on Package C → Components tab
5. Click **Agregar Componente**
6. Select: "Set Comedor" (Package B)
7. Enter Cantidad: `1`
8. Save

**Expected Result:**
- ✅ Package C contains Package B as a component
- ✅ Component table shows:
  - Code: PKG_COMEDOR
  - Name: Set Comedor
  - Cantidad: 1.000
  - Es Paquete: Sí (checkbox or indicator)

---

### Test 4.2: View Nested Package Structure
**Prerequisites:** Test 4.1 completed

**Steps:**
1. Click on Package C
2. Observe components table
3. Verify "Set Comedor" has "Es Paquete = Sí" indicator

**Note:** We don't recursively expand to show the Silla inside Set Comedor in the UI. This is by design to keep the hierarchy simple.

---

### Test 4.3: Add Nested Package to Price List
**Prerequisites:** Test 4.1 completed

**Steps:**
1. Navigate to **Catálogos > Listas de Precio**
2. Create or open existing price list
3. Click "Ver artículos"
4. Click **Agregar artículo**
5. Select: "Paquete Eventos Grandes" (Package C)
6. Observe: Blue box appears showing:
   - "📦 Componentes del paquete"
   - List: "PKG_COMEDOR - Set Comedor | Cantidad: 1.000"
7. Enter prices:
   - Anticipado: `3000`
   - Normal: `4500`
   - Tardío: `6000`
8. Save

**Expected Result:**
- ✅ Component "Set Comedor" is shown in info box
- ✅ Prices are set at Package C level (not Set Comedor level)
- ✅ Price list item created successfully

---

## Test Suite 5: Package Pricing Integration

### Test 5.1: View Package Details in Price List
**Prerequisites:** Test 4.3 completed

**Steps:**
1. Navigate to **Catálogos > Listas de Precio**
2. Open the price list from Test 4.3
3. Find "Paquete Eventos Grandes" row
4. Click expand arrow (left side of row)

**Expected Result:**
- ✅ Row expands to show nested table:
   - "📦 Componentes del paquete"
   - "PKG_COMEDOR - Set Comedor | Cantidad: 1.000"
- ✅ Click arrow again to collapse

---

### Test 5.2: Package with Multiple Component Types
**Steps:**
1. Create a new package: "Pack Mixto"
2. Add components:
   - Resource A (type: FURNITURE, Qty: 2)
   - Resource B (type: CONSUMABLE, Qty: 1)
   - Resource C (type: PERSONAL, Qty: 1, unit: turno)
3. Add to price list with prices
4. View price list details
5. Expand "Pack Mixto" row

**Expected Result:**
- ✅ All component types are shown correctly
- ✅ PERSONAL component shows unit "turno"
- ✅ No error on mixed types

---

## Test Suite 6: Validation & Error Handling

### Test 6.1: Unit Validation Error Display
**UI Test:**
1. Navigate to **Catálogos > Recursos**
2. Create PERSONAL resource
3. Try to select invalid unit (if dropdown allows it)
4. Try to save

**Expected Result:**
- ✅ Error message displays clearly
- ✅ Resource not saved with invalid unit

---

### Test 6.2: Duplicate Error Handling
**UI Test:**
1. Open any package with components
2. Try to add same component twice
3. Second time should show error

**Expected Result:**
- ✅ Error message: "Este componente ya está en el paquete"
- ✅ Modal stays open for retry
- ✅ Component not duplicated

---

## Test Suite 7: Audit Logging (Optional Advanced Testing)

### Test 7.1: Verify Component Mutations Are Logged
**If Audit Log UI exists:**
1. Create a package and add components (as in Test 1.2)
2. Navigate to any Audit Log page (if available)
3. Search for PackageComponent actions
4. Verify entries for: CREATE, UPDATE, DELETE

**Expected Entry Structure:**
```
Entity: PackageComponent
Action: CREATE
Timestamp: [current]
User: admin@exposaantafe.com.mx
Old Values: null
New Values: {
  packageResourceId: "xxx",
  componentResourceId: "yyy",
  quantity: "2.000"
}
IP: [client IP]
```

---

## Quick Reference: Test Checklist

**Phase 1-2 Features (Verified Earlier):**
- [ ] Create package resources (isPackage=true)
- [ ] Add/edit/delete package components
- [ ] PERSONAL type with unit restrictions
- [ ] Circular reference prevention (self)
- [ ] Duplicate component prevention

**Phase 3 Features (New):**
- [ ] Package components display in "Agregar Artículo" modal
- [ ] Package components display in price list detail view
- [ ] Expandable rows in price list table
- [ ] Component info shown for reference

**Phase 4 Features (End-to-End):**
- [ ] Nested packages (package in package)
- [ ] Substitute components with warning
- [ ] Multiple component types in one package
- [ ] PERSONAL type in packages
- [ ] All validations working
- [ ] Error messages clear and helpful

---

## Running the Tests

### Recommended Order:
1. **Test Suite 1** - Basic package functionality (15 min)
2. **Test Suite 2** - PERSONAL type (10 min)
3. **Test Suite 3** - Substitute components (10 min)
4. **Test Suite 4** - Nested packages (10 min)
5. **Test Suite 5** - Price list integration (15 min)
6. **Test Suite 6** - Error handling (10 min)
7. **Test Suite 7** - Audit logging (optional, 5 min)

**Total Time: ~75 minutes for complete testing**

---

## Success Criteria

All of the following must be true:
- ✅ All tests in Test Suites 1-6 pass
- ✅ No console errors in browser dev tools
- ✅ No API errors (HTTP 5xx)
- ✅ All error messages are clear and helpful
- ✅ UI behaves consistently
- ✅ Data persists correctly across page reloads

---

## Troubleshooting

If a test fails:

1. **Check browser console** (F12) for JavaScript errors
2. **Check network tab** for API errors (look for 400/500 responses)
3. **Verify data exists** - ensure prerequisites are completed
4. **Clear cache** if seeing stale data
5. **Restart dev server** if API is unresponsive

---

## Notes for QA/Testing

- Package system is fully backward compatible (no breaking changes)
- PERSONAL type is now available and restricted
- isSubstitute flag only applies to packages
- Circular references prevented at API and UI level
- All mutations are audit-logged

---

## Sign-Off

**Tested By:** _______________  
**Date:** _______________  
**Result:** PASSED / FAILED  
**Notes:** _______________
