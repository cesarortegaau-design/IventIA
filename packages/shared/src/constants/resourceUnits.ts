/**
 * Unidades válidas para recursos
 */

export const VALID_UNITS = {
  KG:    'kg',
  LT:    'lt',
  PZA:   'pza',
  UNIT:  'unidad',
  SHIFT: 'turno',
  M2:    'm2',
  M:     'm',
} as const

export type ValidUnit = (typeof VALID_UNITS)[keyof typeof VALID_UNITS]

export const VALID_UNITS_ARRAY = Object.values(VALID_UNITS)

export const VALID_UNITS_LABELS: Record<ValidUnit, string> = {
  kg:     'kg - kilogramos',
  lt:     'lt - litros',
  pza:    'pza - piezas',
  unidad: 'unidad',
  turno:  'turno',
  m2:     'm2 - metros cuadrados',
  m:      'm - metros',
}

/**
 * Mapa de restricciones de unidades por tipo de recurso
 * null = sin restricción (cualquier unidad)
 * array = solo estas unidades permitidas
 */
export const UNIT_RESTRICTIONS: Record<string, ValidUnit[] | null> = {
  CONSUMABLE: VALID_UNITS_ARRAY,
  EQUIPMENT:  VALID_UNITS_ARRAY,
  SPACE:      VALID_UNITS_ARRAY,
  FURNITURE:  VALID_UNITS_ARRAY,
  SERVICE:    VALID_UNITS_ARRAY,
  DISCOUNT:   null,
  TAX:        null,
  PERSONAL:   VALID_UNITS_ARRAY,
}

export const TIME_UNIT_OPTIONS = ['no aplica', 'horas', 'días'] as const
export type TimeUnit = (typeof TIME_UNIT_OPTIONS)[number]
