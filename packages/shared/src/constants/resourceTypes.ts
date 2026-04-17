/**
 * Tipos de recursos y configuración de UI
 */

export const RESOURCE_TYPES = {
  CONSUMABLE: 'CONSUMABLE',
  EQUIPMENT: 'EQUIPMENT',
  SPACE: 'SPACE',
  FURNITURE: 'FURNITURE',
  SERVICE: 'SERVICE',
  DISCOUNT: 'DISCOUNT',
  TAX: 'TAX',
  PERSONAL: 'PERSONAL',
} as const

export type ResourceType = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES]

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  CONSUMABLE: 'Consumible',
  EQUIPMENT: 'Equipo',
  SPACE: 'Espacio',
  FURNITURE: 'Mobiliario',
  SERVICE: 'Servicio',
  DISCOUNT: 'Descuento',
  TAX: 'Impuesto',
  PERSONAL: 'Personal',
}

export const RESOURCE_TYPE_COLORS: Record<string, string> = {
  CONSUMABLE: 'orange',
  EQUIPMENT: 'blue',
  SPACE: 'green',
  FURNITURE: 'purple',
  SERVICE: 'cyan',
  DISCOUNT: 'red',
  TAX: 'gold',
  PERSONAL: 'magenta',
}

export const RESOURCE_TYPES_ARRAY = Object.keys(RESOURCE_TYPES).map(
  (key) => RESOURCE_TYPES[key as keyof typeof RESOURCE_TYPES]
)
