/**
 * Unidades válidas para recursos, especialmente restringidas para PERSONAL
 */

export const VALID_UNITS = {
  PIECE: 'pieza',
  LITER: 'litro',
  KILOGRAM: 'kilogramo',
  METER: 'metro',
  SQUARE_METER: 'metro cuadrado',
  SHIFT: 'turno',
} as const

export type ValidUnit = (typeof VALID_UNITS)[keyof typeof VALID_UNITS]

export const VALID_UNITS_ARRAY = Object.values(VALID_UNITS)

/**
 * Mapa de restricciones de unidades por tipo de recurso
 * null = sin restricción (cualquier unidad)
 * array = solo estas unidades permitidas
 */
export const UNIT_RESTRICTIONS: Record<string, ValidUnit[] | null> = {
  CONSUMABLE: null,        // Cualquier unidad
  EQUIPMENT: null,         // Cualquier unidad
  SPACE: null,            // Cualquier unidad
  FURNITURE: null,        // Cualquier unidad
  SERVICE: null,          // Cualquier unidad
  DISCOUNT: null,         // Sin restricción (aunque normalmente sin unidad)
  TAX: null,              // Sin restricción (aunque normalmente sin unidad)
  PERSONAL: VALID_UNITS_ARRAY,  // ← RESTRINGIDO a unidades específicas
}
