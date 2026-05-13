/**
 * Members Data Test
 * Test to check if members data is accessible
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

// Skipped: Convex/Firebase path; jest also mocks @supabase/supabase-js without a full query builder.
describe.skip('Members Data Access', () => {
  it('should be able to fetch members from database', async () => {
    const { data, error } = await supabase
      .from('members')
      .select(`
        *,
        user:app_users(
          id, full_name, membership_id, phone, email, role, 
          marital_status, created_at, join_year, updated_at
        )
      `)
      .eq('status', 'active')
      .limit(5)

    console.log('Members query result:', { data, error })
    
    if (error) {
      console.error('Database error:', error)
    }
    
    // Should not have an error
    expect(error).toBeNull()
    
    // Should return data (even if empty array)
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
  }, 10000)

  it('should be able to fetch app_users from database', async () => {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .limit(5)

    console.log('App users query result:', { data, error })
    
    if (error) {
      console.error('Database error:', error)
    }
    
    // Should not have an error
    expect(error).toBeNull()
    
    // Should return data (even if empty array)
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
  }, 10000)
})
