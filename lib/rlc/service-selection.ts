import { RLC_SERVICES } from '@/lib/constants/rlc'
import type { Attendance, RlcCustomService, ServiceType } from '@/lib/types'

export type StandardServiceType = (typeof RLC_SERVICES)[number]['value']

export type RlcServiceSelection =
  | { kind: 'standard'; serviceType: StandardServiceType }
  | { kind: 'custom'; customServiceId: string; label: string }

export const RLC_STANDARD_PLACEHOLDER = '__rlc_standard_none__'
export const RLC_CUSTOM_PLACEHOLDER = '__rlc_custom_none__'

export function defaultRlcServiceSelection(): RlcServiceSelection {
  return { kind: 'standard', serviceType: 'sunday_service' }
}

export function attendanceMatchesService(row: Attendance, selection: RlcServiceSelection): boolean {
  if (selection.kind === 'standard') {
    return row.service_type === selection.serviceType
  }
  if (row.service_type !== 'other') return false
  const meta = row.metadata as { custom_service_id?: string } | undefined
  return meta?.custom_service_id === selection.customServiceId
}

export function rlcServiceSelectionLabel(selection: RlcServiceSelection): string {
  if (selection.kind === 'custom') return selection.label
  return RLC_SERVICES.find((s) => s.value === selection.serviceType)?.label ?? selection.serviceType
}

export function attendanceServiceLabel(row: Attendance): string {
  if (row.service_type === 'other') {
    const meta = row.metadata as { custom_service_name?: string } | undefined
    if (meta?.custom_service_name) return meta.custom_service_name
    return 'Other service'
  }
  if (!row.service_type) return 'Service'
  return RLC_SERVICES.find((s) => s.value === row.service_type)?.label ?? row.service_type.replace(/_/g, ' ')
}

export function printQueryFromSelection(selection: RlcServiceSelection): URLSearchParams {
  const params = new URLSearchParams()
  if (selection.kind === 'standard') {
    params.set('service', selection.serviceType)
  } else {
    params.set('service', 'other')
    params.set('custom', selection.customServiceId)
  }
  return params
}

export function parseRlcServiceSelection(
  service: string | null,
  customId: string | null,
  customServices: RlcCustomService[]
): RlcServiceSelection {
  if (service === 'other' && customId) {
    const found = customServices.find((row) => row.id === customId)
    if (found) {
      return { kind: 'custom', customServiceId: found.id, label: found.name }
    }
  }
  const standard = RLC_SERVICES.find((s) => s.value === service)
  if (standard) {
    return { kind: 'standard', serviceType: standard.value }
  }
  return defaultRlcServiceSelection()
}

export function recordArgsFromSelection(selection: RlcServiceSelection): {
  serviceType?: ServiceType
  customServiceId?: string
} {
  if (selection.kind === 'custom') {
    return { serviceType: 'other', customServiceId: selection.customServiceId }
  }
  return { serviceType: selection.serviceType }
}
