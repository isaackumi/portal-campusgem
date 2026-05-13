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

async function syncUsersToMembers() {
  console.log('🔄 Syncing app_users to members table...\n')

  try {
    // Get all users from app_users
    const { data: users, error: usersError } = await supabase
      .from('app_users')
      .select('id, full_name, phone, email, role, membership_id, created_at')

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return
    }

    console.log(`Found ${users?.length || 0} users in app_users table`)

    // Get existing members to avoid duplicates
    const { data: existingMembers, error: membersError } = await supabase
      .from('members')
      .select('user_id')

    if (membersError) {
      console.error('Error fetching existing members:', membersError)
      return
    }

    const existingUserIds = new Set(existingMembers?.map(m => m.user_id) || [])
    console.log(`Found ${existingUserIds.size} existing members`)

    // Find users that don't have member records
    const usersToSync = users?.filter(user => !existingUserIds.has(user.id)) || []
    console.log(`Found ${usersToSync.length} users to sync to members table\n`)

    if (usersToSync.length === 0) {
      console.log('✅ All users already have member records!')
      return
    }

    // Create member records for users that don't have them
    for (const user of usersToSync) {
      console.log(`Creating member record for ${user.full_name} (${user.phone})...`)
      
      const memberData = {
        user_id: user.id,
        status: 'active', // Default status
        created_at: user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error: insertError } = await supabase
        .from('members')
        .insert(memberData)

      if (insertError) {
        console.error(`Error creating member record for ${user.full_name}:`, insertError)
      } else {
        console.log(`✅ Created member record for ${user.full_name}`)
      }
    }

    console.log('\n🎉 User sync completed!')
    console.log('All users now have corresponding member records.')

  } catch (error) {
    console.error('Error:', error)
  }
}

syncUsersToMembers()

