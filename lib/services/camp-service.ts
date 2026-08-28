/**
 * Camp operations delegate to Convex-backed server actions in `lib/actions/camp`.
 */

import type { CampRegistration, CampInteraction, CampSessionAttendance, CampRoom } from '@/lib/types'
import type { ApiResponse } from './data-service'
import {
  appendCampInteraction,
  assignCampRegistrationRoom,
  createCampActivityRecord,
  createCampRoom,
  deleteCampActivityRecord,
  deleteCampRoom,
  getCampRegistrationById,
  getCampRegistrations,
  getCampRooms,
  getCampSessionAttendancesForActivity,
  loadCampActivitiesForYear,
  patchCampRegistration,
  promoteCampRegistrant,
  randomAssignCampRooms,
  recordCampSessionCheckIn,
  setCampRoomLeader,
  syncCampRegistrationDobToMember,
  getCampRegistrationRoomContext,
  updateCampActivityRecord,
  updateCampRoom,
} from '@/lib/actions/camp'

export class CampService {
  private handleError(error: unknown): string {
    return error instanceof Error ? error.message : 'An unexpected error occurred'
  }

  async getCampRegistrations(campYearId: string): Promise<ApiResponse<CampRegistration[]>> {
    try {
      const { data, error } = await getCampRegistrations(campYearId)
      if (error) return { data: null, error, loading: false }
      return { data: data ?? [], error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async getRegistration(id: string): Promise<ApiResponse<CampRegistration>> {
    try {
      const { data, error } = await getCampRegistrationById(id)
      if (error) return { data: null, error, loading: false }
      if (!data) return { data: null, error: 'Not found', loading: false }
      return { data, error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async updateRegistration(
    id: string,
    updates: Partial<CampRegistration> & Record<string, unknown>
  ): Promise<ApiResponse<CampRegistration>> {
    try {
      const { data, error } = await patchCampRegistration(id, updates)
      if (error) return { data: null, error, loading: false }
      if (!data) return { data: null, error: 'Not found', loading: false }
      return { data, error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async addInteraction(interaction: Partial<CampInteraction>): Promise<ApiResponse<CampInteraction>> {
    try {
      const registrationId = interaction.registration_id
      const performedBy = interaction.performed_by
      if (!registrationId || !performedBy) {
        return { data: null, error: 'registration_id and performed_by are required', loading: false }
      }
      const { data, error } = await appendCampInteraction({
        registration_id: registrationId,
        performed_by: performedBy,
        interaction_type: interaction.interaction_type ?? 'note',
        notes: interaction.notes,
      })
      if (error) return { data: null, error, loading: false }
      if (!data) return { data: null, error: 'Failed to add interaction', loading: false }
      return { data, error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async getCampActivities(campYearId: string): Promise<ApiResponse<unknown[]>> {
    try {
      const { data, error } = await loadCampActivitiesForYear(campYearId)
      if (error) return { data: [], error: null, loading: false }
      return { data: data ?? [], error: null, loading: false }
    } catch {
      return { data: [], error: null, loading: false }
    }
  }

  async getActivity(_id: string): Promise<ApiResponse<unknown>> {
    return { data: null, error: 'Use list + filter by id if needed', loading: false }
  }

  async createActivity(activity: Partial<unknown>): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await createCampActivityRecord(activity as Record<string, unknown>)
      if (error) return { data: null, error, loading: false }
      return { data, error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async updateActivity(id: string, updates: Partial<unknown>): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await updateCampActivityRecord(id, updates as Record<string, unknown>)
      if (error) return { data: null, error, loading: false }
      return { data, error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async deleteActivity(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await deleteCampActivityRecord(id)
      if (error) return { data: false, error, loading: false }
      return { data: true, error: null, loading: false }
    } catch (error) {
      return { data: false, error: this.handleError(error), loading: false }
    }
  }

  async promoteToDirectory(
    registrationId: string,
    args: {
      role: 'admin' | 'pastor' | 'elder' | 'finance_officer' | 'member' | 'visitor'
      birth_month?: number
      birth_day?: number
      birth_year?: number
    }
  ): Promise<ApiResponse<CampRegistration>> {
    try {
      const { data, error } = await promoteCampRegistrant(registrationId, args)
      if (error) return { data: null, error, loading: false }
      if (!data) return { data: null, error: 'Promotion returned no registration', loading: false }
      return { data, error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async syncRegistrationBirthdayToMember(registrationId: string): Promise<ApiResponse<boolean>> {
    try {
      const { data, error } = await syncCampRegistrationDobToMember(registrationId)
      if (error) return { data: null, error, loading: false }
      return { data, error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async recordSessionCheckIn(args: {
    activity_id: string
    registration_id: string
    performed_by: string
    check_in_method?: CampSessionAttendance['check_in_method']
  }): Promise<
    ApiResponse<{
      already_checked_in: boolean
      attendance: CampSessionAttendance | null
      registration: CampRegistration | null
    }>
  > {
    try {
      const { data, error } = await recordCampSessionCheckIn(args)
      if (error) return { data: null, error, loading: false }
      if (!data) return { data: null, error: 'Check-in failed', loading: false }
      return { data, error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async getSessionAttendancesForActivity(
    activityId: string
  ): Promise<ApiResponse<CampSessionAttendance[]>> {
    try {
      const { data, error } = await getCampSessionAttendancesForActivity(activityId)
      if (error) return { data: null, error, loading: false }
      return { data: data ?? [], error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async getCampRooms(campYearId: string): Promise<ApiResponse<CampRoom[]>> {
    try {
      const { data, error } = await getCampRooms(campYearId)
      if (error) return { data: null, error, loading: false }
      return { data: data ?? [], error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async createRoom(input: {
    camp_year_id: string
    name: string
    building?: string
    capacity: number
    gender?: CampRoom['gender']
    notes?: string
  }): Promise<ApiResponse<CampRoom>> {
    try {
      const { data, error } = await createCampRoom(input)
      if (error) return { data: null, error, loading: false }
      if (!data) return { data: null, error: 'Failed to create room', loading: false }
      return { data, error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async updateRoom(
    id: string,
    patch: Parameters<typeof updateCampRoom>[1]
  ): Promise<ApiResponse<CampRoom>> {
    try {
      const { data, error } = await updateCampRoom(id, patch)
      if (error) return { data: null, error, loading: false }
      if (!data) return { data: null, error: 'Failed to update room', loading: false }
      return { data, error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async deleteRoom(id: string): Promise<ApiResponse<{ deleted: boolean; unassigned: number }>> {
    try {
      const { data, error } = await deleteCampRoom(id)
      if (error) return { data: null, error, loading: false }
      if (!data) return { data: null, error: 'Failed to delete room', loading: false }
      return { data, error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async assignRegistrationRoom(args: {
    registration_id: string
    room_id: string | null
  }): Promise<ApiResponse<CampRegistration>> {
    try {
      const { data, error } = await assignCampRegistrationRoom(args)
      if (error) return { data: null, error, loading: false }
      if (!data) return { data: null, error: 'Failed to assign room', loading: false }
      return { data, error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async randomAssignRooms(args: {
    camp_year_id: string
    respect_gender?: boolean
    only_unassigned?: boolean
  }): Promise<ApiResponse<{ assigned: number; skipped: number }>> {
    try {
      const { data, error } = await randomAssignCampRooms(args)
      if (error) return { data: null, error, loading: false }
      if (!data) return { data: null, error: 'Random assignment failed', loading: false }
      return { data, error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async getRegistrationRoomContext(
    registrationId: string
  ): Promise<ApiResponse<import('@/lib/types').CampRegistrationRoomContext>> {
    try {
      const { data, error } = await getCampRegistrationRoomContext(registrationId)
      if (error) return { data: null, error, loading: false }
      if (!data) return { data: null, error: 'No room context', loading: false }
      return { data, error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }

  async setRoomLeader(args: {
    room_id: string
    registration_id: string | null
  }): Promise<ApiResponse<CampRoom>> {
    try {
      const { data, error } = await setCampRoomLeader(args)
      if (error) return { data: null, error, loading: false }
      if (!data) return { data: null, error: 'Failed to set room leader', loading: false }
      return { data, error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error), loading: false }
    }
  }
}

export const campService = new CampService()
