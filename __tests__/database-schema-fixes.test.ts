/**
 * Database Schema Fixes Test
 * Tests to verify that database queries use correct table columns
 */

import { describe, it, expect } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Skipped: legacy Supabase schema checks; app data layer is Convex-first.
describe.skip('Database Schema Fixes', () => {
  it('should query members table for gender and dob (not app_users)', async () => {
    const { data, error } = await supabase
      .from('members')
      .select(`
        id,
        gender,
        dob,
        user:app_users(id, full_name, membership_id, phone, email)
      `)
      .limit(1)

    console.log('Members query result:', { data, error })
    
    // Should not have an error
    expect(error).toBeNull()
    
    // Should return data
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
  }, 10000)

  it('should query attendance with correct member references', async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        member:members(gender, dob)
      `)
      .limit(1)

    console.log('Attendance query result:', { data, error })
    
    // Should not have an error
    expect(error).toBeNull()
    
    // Should return data (even if empty)
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
  }, 10000)

  it('should not try to access gender/dob from app_users table', async () => {
    // This query should fail if we try to access gender/dob from app_users
    const { data, error } = await supabase
      .from('app_users')
      .select('id, full_name, membership_id, phone, email')
      .limit(1)

    console.log('App users query result:', { data, error })
    
    // Should not have an error (since we're not accessing gender/dob)
    expect(error).toBeNull()
    
    // Should return data
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
  }, 10000)
})
