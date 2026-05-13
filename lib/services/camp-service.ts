/**
 * Camp operations delegate to Convex-backed server actions in `lib/actions/camp`.
 */

import type { CampRegistration, CampInteraction } from '@/lib/types'
import type { ApiResponse } from './data-service'
import {
  appendCampInteraction,
  createCampActivityRecord,
  deleteCampActivityRecord,
  getCampRegistrationById,
  getCampRegistrations,
  loadCampActivitiesForYear,
  patchCampRegistration,
  updateCampActivityRecord,
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
}

export const campService = new CampService()
