// Professional service type mapping system
export const SERVICE_TYPES = {
  SUNDAY_SERVICE: 'sunday_service',
  MIDWEEK_SERVICE: 'midweek_service',
  PRAYER_MEETING: 'prayer_meeting',
  YOUTH_SERVICE: 'youth_service',
  CHILDREN_SERVICE: 'children_service',
  SPECIAL_EVENT: 'special_event'
} as const

export type ServiceType = typeof SERVICE_TYPES[keyof typeof SERVICE_TYPES]

// Display labels for UI
export const SERVICE_TYPE_LABELS = {
  [SERVICE_TYPES.SUNDAY_SERVICE]: 'Sunday Service',
  [SERVICE_TYPES.MIDWEEK_SERVICE]: 'Midweek Service',
  [SERVICE_TYPES.PRAYER_MEETING]: 'Prayer Meeting',
  [SERVICE_TYPES.YOUTH_SERVICE]: 'Youth Service',
  [SERVICE_TYPES.CHILDREN_SERVICE]: 'Children Service',
  [SERVICE_TYPES.SPECIAL_EVENT]: 'Special Event'
} as const

// Icons for UI
export const SERVICE_TYPE_ICONS = {
  [SERVICE_TYPES.SUNDAY_SERVICE]: '⛪',
  [SERVICE_TYPES.MIDWEEK_SERVICE]: '📖',
  [SERVICE_TYPES.PRAYER_MEETING]: '🙏',
  [SERVICE_TYPES.YOUTH_SERVICE]: '👥',
  [SERVICE_TYPES.CHILDREN_SERVICE]: '👶',
  [SERVICE_TYPES.SPECIAL_EVENT]: '🎉'
} as const

// Service type options for forms
export const SERVICE_TYPE_OPTIONS = Object.values(SERVICE_TYPES).map(value => ({
  value,
  label: SERVICE_TYPE_LABELS[value],
  icon: SERVICE_TYPE_ICONS[value]
}))

// Professional mapping functions
export class ServiceTypeMapper {
  /**
   * Maps any service type input to the correct database enum value
   */
  static toEnum(input: string): ServiceType {
    console.log('🔍 ServiceTypeMapper.toEnum input:', input)
    console.log('🔍 SERVICE_TYPES values:', Object.values(SERVICE_TYPES))
    
    // If already a valid enum value, return it
    if (Object.values(SERVICE_TYPES).includes(input as ServiceType)) {
      console.log('🔍 Input is already enum value, returning:', input)
      return input as ServiceType
    }
    
    // Map display labels to enum values
    const labelToEnum: Record<string, ServiceType> = {
      'Sunday Service': SERVICE_TYPES.SUNDAY_SERVICE,
      'Midweek Service': SERVICE_TYPES.MIDWEEK_SERVICE,
      'Prayer Meeting': SERVICE_TYPES.PRAYER_MEETING,
      'Youth Service': SERVICE_TYPES.YOUTH_SERVICE,
      'Children Service': SERVICE_TYPES.CHILDREN_SERVICE,
      'Special Event': SERVICE_TYPES.SPECIAL_EVENT
    }
    
    const result = labelToEnum[input] || SERVICE_TYPES.SUNDAY_SERVICE
    console.log('🔍 Mapped result:', result)
    return result
  }
  
  /**
   * Gets the display label for a service type enum
   */
  static toLabel(enumValue: ServiceType): string {
    return SERVICE_TYPE_LABELS[enumValue] || 'Sunday Service'
  }
  
  /**
   * Gets the icon for a service type enum
   */
  static toIcon(enumValue: ServiceType): string {
    return SERVICE_TYPE_ICONS[enumValue] || '⛪'
  }
  
  /**
   * Validates if a string is a valid service type enum
   */
  static isValid(serviceType: string): serviceType is ServiceType {
    return Object.values(SERVICE_TYPES).includes(serviceType as ServiceType)
  }
  
  /**
   * Gets all service type options for forms
   */
  static getOptions() {
    return SERVICE_TYPE_OPTIONS
  }
}
