import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkMembersTable() {
  console.log('🔍 Checking members table...\n')

  try {
    // Get all members with their user data
    const { data: members, error } = await supabase
      .from('members')
      .select(`
        id, status, created_at,
        user:app_users(
          id, full_name, membership_id, phone, email, role
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching members:', error)
      return
    }

    console.log(`Found ${members?.length || 0} members in members table:\n`)

    members?.forEach((member, index) => {
      const user = Array.isArray(member.user) ? member.user[0] : member.user
      console.log(`${index + 1}. ${user?.full_name || 'No name'} (${user?.phone || 'No phone'})`)
      console.log(`   Member ID: ${member.id}`)
      console.log(`   Status: ${member.status}`)
      console.log(`   User ID: ${user?.id}`)
      console.log(`   Role: ${user?.role}`)
      console.log(`   Membership ID: ${user?.membership_id || 'None'}`)
      console.log('')
    })

    // Check if System Administrator is in members table
    const systemAdmin = members?.find(m => {
      const user = Array.isArray(m.user) ? m.user[0] : m.user
      return user?.phone === '+233548769251'
    })
    if (systemAdmin) {
      console.log('✅ System Administrator found in members table:')
      console.log(JSON.stringify(systemAdmin, null, 2))
    } else {
      console.log('❌ System Administrator NOT found in members table')
    }

    // Check if Abena Dorcy is in members table
    const abena = members?.find(m => {
      const user = Array.isArray(m.user) ? m.user[0] : m.user
      return user?.phone === '+233551133402'
    })
    if (abena) {
      console.log('✅ Abena Dorcy found in members table:')
      console.log(JSON.stringify(abena, null, 2))
    } else {
      console.log('❌ Abena Dorcy NOT found in members table')
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

checkMembersTable()
