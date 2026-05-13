/**
 * Enhanced Attendance Service
 * Handles comprehensive attendance tracking with departments, duplicates prevention, and absentee management
 * Uses Firebase/dataService (no Supabase).
 */

import { dataService } from './data-service'
import { Attendance, Department, DepartmentMembership, AbsenteeRecord, AttendanceActivity, AppUser, Member } from '@/lib/types'
import { smsService } from './sms-service'

export interface AttendanceSession {
  id: string
  service_date: string
  service_type: string
  start_time: string
  end_time?: string
  total_attendance: number
  is_active: boolean
  created_by: string
  created_at: string
}

export interface AttendanceStats {
  total_attendance: number
  male_attendance: number
  female_attendance: number
  adult_attendance: number
  children_attendance: number
  department_stats: {
    [departmentName: string]: {
      total: number
      present: number
      absent: number
    }
  }
  duplicate_prevention: {
    blocked_duplicates: number
    sessions_checked: number
  }
}

export interface AttendanceAnalytics {
  daily_breakdown: {
    date: string
    total: number
    male: number
    female: number
    adults: number
    children: number
    departments: { [key: string]: number }
  }[]
  weekly_trends: {
    week: string
    total: number
    growth_rate: number
  }[]
  department_performance: {
    department: string
    attendance_rate: number
    total_members: number
    present_members: number
  }[]
  absentee_analysis: {
    total_absentees: number
    follow_up_pending: number
    sms_sent: number
    patterns: { [key: string]: number }
  }
}

class EnhancedAttendanceService {
  // Create attendance session
  async createAttendanceSession(data: {
    service_date: string
    service_type: string
    created_by: string
  }): Promise<AttendanceSession> {
    const session = {
      id: `session_${Date.now()}`,
      service_date: data.service_date,
      service_type: data.service_type,
      start_time: new Date().toISOString(),
      total_attendance: 0,
      is_active: true,
      created_by: data.created_by,
      created_at: new Date().toISOString()
    }

    // In a real implementation, this would be stored in the database
    return session
  }

  // Check for duplicate attendance
  async checkDuplicateAttendance(memberId: string, serviceDate: string, serviceType: string): Promise<boolean> {
    const { data, error } = await dataService.getAttendanceRecords({
      member_id: memberId,
      service_date: serviceDate,
      service_type: serviceType,
      limit: 1
    })
    if (error) {
      console.error('Error checking duplicate attendance:', error)
      return false
    }
    return (data?.length ?? 0) > 0
  }

  // Record attendance with enhanced tracking
  async recordAttendance(data: {
    member_id: string
    service_date: string
    service_type: string
    method: 'qr' | 'kiosk' | 'admin' | 'pin' | 'mobile'
    created_by: string
    checked_in_by?: string
    notes?: string
  }): Promise<{ attendance: Attendance; isDuplicate: boolean }> {
    // Check for duplicates
    const isDuplicate = await this.checkDuplicateAttendance(data.member_id, data.service_date, data.service_type)
    
    if (isDuplicate) {
      return {
        attendance: {} as Attendance,
        isDuplicate: true
      }
    }

    // Get member details for enhanced tracking
    const { data: memberData, error: memberError } = await dataService.getMember(data.member_id)
    if (memberError || !memberData) {
      throw new Error('Failed to fetch member data')
    }

    const appUser = memberData.user
    const departments: string[] = [] // No department_memberships in current Firestore schema

    const ageCategory = this.getAgeCategory(memberData.dob)
    const gender = memberData.gender

    const { data: attendanceResult, error } = await dataService.recordAttendance({
      member_id: data.member_id,
      service_date: data.service_date,
      service_type: data.service_type,
      check_in_time: new Date().toISOString(),
      status: 'present',
      checked_in_by: data.checked_in_by || data.created_by
    })

    if (error || !attendanceResult) {
      throw new Error(error || 'Failed to record attendance')
    }

    const attendance = attendanceResult as unknown as Attendance

    await this.logAttendanceActivity({
      type: 'check_in',
      member_id: data.member_id,
      service_date: data.service_date,
      service_type: data.service_type,
      description: `${appUser?.full_name || 'Member'} checked in via ${data.method}`,
      metadata: { departments, age_category: ageCategory, gender },
      created_by: data.created_by
    })

    return { attendance, isDuplicate: false }
  }

  // Bulk attendance with duplicate prevention
  async recordBulkAttendance(data: {
    member_ids: string[]
    service_date: string
    service_type: string
    created_by: string
    checked_in_by?: string
    method?: 'bulk' | 'admin'
  }): Promise<{ successful: number; duplicates: number; errors: number }> {
    let successful = 0
    let duplicates = 0
    let errors = 0

    for (const memberId of data.member_ids) {
      try {
        const result = await this.recordAttendance({
          member_id: memberId,
          service_date: data.service_date,
          service_type: data.service_type,
          method: 'admin',
          created_by: data.created_by,
          checked_in_by: data.checked_in_by || data.created_by
        })

        if (result.isDuplicate) {
          duplicates++
        } else {
          successful++
        }
      } catch (error) {
        console.error(`Error recording attendance for member ${memberId}:`, error)
        errors++
      }
    }

    // Log bulk activity
    await this.logAttendanceActivity({
      type: 'bulk_attendance',
      service_date: data.service_date,
      service_type: data.service_type,
      description: `Bulk attendance recorded: ${successful} successful, ${duplicates} duplicates, ${errors} errors`,
      metadata: { 
        total_members: data.member_ids.length,
        successful,
        duplicates,
        errors
      },
      created_by: data.created_by
    })

    return { successful, duplicates, errors }
  }

  // Mark absentee and create follow-up record
  async markAbsentee(data: {
    member_id: string
    service_date: string
    service_type: string
    reason?: string
    follow_up_required: boolean
    created_by: string
  }): Promise<AbsenteeRecord> {
    // Check if absentee record already exists
    // For now, we'll create a mock absentee record since the table doesn't exist yet
    // In production, you would create the absentee_records table
    const record: AbsenteeRecord = {
      id: `absentee-${Date.now()}`,
      member_id: data.member_id,
      service_date: data.service_date,
      service_type: data.service_type,
      reason: data.reason,
      follow_up_required: data.follow_up_required || true,
      follow_up_completed: false,
      sms_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Log activity (this will also be mocked since the table doesn't exist)
    console.log('Absentee marked:', record)

    return record
  }

  // Send SMS to absentees
  async sendAbsenteeSMS(absenteeId: string): Promise<boolean> {
    try {
      // Since we don't have the absentee_records table yet, we'll simulate SMS sending
      // In production, you would fetch the actual absentee record from the database
      console.log(`Sending SMS for absentee ID: ${absenteeId}`)
      
      // Simulate SMS sending with dummy data
      await smsService.sendMessage({
        recipient: {
          name: 'Member',
          phone: '+233241234567',
          membership_id: 'EA-2024-001'
        },
        message: `Hello, we noticed you were absent from the recent service. We hope you're doing well and look forward to seeing you next time!`,
        type: 'custom',
        created_by: 'system'
      })

      return true
    } catch (error) {
      console.error('Error sending SMS to absentee:', error)
      return false
    }
  }

  // Get attendance statistics
  async getAttendanceStats(dateRange: { start: string; end: string }): Promise<AttendanceStats> {
    const { data: attendanceList, error } = await dataService.getAttendanceRecords({
      service_date: dateRange.start,
      limit: 5000
    })

    if (error) {
      throw new Error(error)
    }

    const allRecords: { member_id: string; service_date?: string; service_type?: string; metadata?: { gender?: string; age_category?: string; departments?: string[] } }[] = []
    const start = dateRange.start
    const end = dateRange.end
    for (const r of attendanceList ?? []) {
      const sd = (r as { service_date?: string }).service_date
      if (sd && sd >= start && sd <= end) allRecords.push(r as any)
    }

    const stats: AttendanceStats = {
      total_attendance: allRecords.length,
      male_attendance: 0,
      female_attendance: 0,
      adult_attendance: 0,
      children_attendance: 0,
      department_stats: {},
      duplicate_prevention: {
        blocked_duplicates: 0,
        sessions_checked: 0
      }
    }

    allRecords.forEach(record => {
      const gender = record.metadata?.gender
      const ageCategory = record.metadata?.age_category
      const departments = record.metadata?.departments || []

      if (gender === 'male') stats.male_attendance++
      else if (gender === 'female') stats.female_attendance++
      if (ageCategory === 'adult') stats.adult_attendance++
      else if (ageCategory === 'child') stats.children_attendance++
      departments.forEach((dept: string) => {
        if (!stats.department_stats[dept]) {
          stats.department_stats[dept] = { total: 0, present: 0, absent: 0 }
        }
        stats.department_stats[dept].present++
        stats.department_stats[dept].total++
      })
    })

    return stats
  }

  // Get recent attendance activity (from attendance records; no separate activities table in Firestore)
  async getRecentActivity(limitCount: number = 20): Promise<AttendanceActivity[]> {
    const { data: records, error } = await dataService.getAttendanceRecords({ limit: limitCount })
    if (error || !records) return []
    return records.map(
      (r: any): AttendanceActivity => ({
        id: r.id,
        type: 'check_in',
        member_id: r.member_id,
        service_date: r.service_date ?? '',
        service_type: r.service_type ?? '',
        description: `Check-in recorded`,
        created_by: '',
        created_at: r.check_in_time ?? new Date().toISOString(),
      })
    )
  }

  // Log attendance activity (no-op; no attendance_activities collection in Firestore)
  private async logAttendanceActivity(_data: {
    type: 'check_in' | 'check_out' | 'bulk_attendance' | 'absentee_marked' | 'follow_up'
    member_id?: string
    service_date: string
    service_type: string
    description: string
    metadata?: Record<string, any>
    created_by: string
  }): Promise<void> {
    // Optional: write to a Firestore 'attendance_activities' collection if added later
  }

  // Helper function to determine age category
  private getAgeCategory(dob?: string): 'adult' | 'child' {
    if (!dob) return 'adult'
    
    const age = new Date().getFullYear() - new Date(dob).getFullYear()
    return age < 18 ? 'child' : 'adult'
  }

  // Get departments (use groups as departments for now; no separate departments table in Firestore)
  async getDepartments(): Promise<Department[]> {
    const res = await dataService.getGroups(1, 100)
    const groups = res.data ?? []
    if (res.error || !groups.length) return []
    return groups.map(g => ({
      id: g.id,
      name: g.name ?? '',
      description: g.description,
      department_type: (g.group_type ?? 'ministry') as Department['department_type'],
      leader_id: g.leader_id,
      co_leader_id: g.co_leader_id,
      is_active: g.is_active ?? true,
      created_at: g.created_at ?? '',
      updated_at: g.updated_at ?? ''
    }))
  }

  // Get department members (use group members)
  async getDepartmentMembers(departmentId: string): Promise<DepartmentMembership[]> {
    const { data: members, error } = await dataService.getGroupMembers(departmentId)
    if (error || !members?.length) return []
    return members.map(m => ({
      id: m.id,
      department_id: m.group_id,
      member_id: m.member_id,
      role: m.role,
      joined_date: m.joined_date ?? '',
      is_active: m.is_active ?? true,
      created_at: m.created_at ?? ''
    })) as DepartmentMembership[]
  }
}

export const enhancedAttendanceService = new EnhancedAttendanceService()
export default enhancedAttendanceService
