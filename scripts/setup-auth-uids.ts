import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function setupAuthUids() {
  console.log('🔧 Setting up auth_uid for all users...\n')

  try {
    // Get all users without auth_uid
    const { data: users, error: fetchError } = await supabase
      .from('app_users')
      .select('id, full_name, phone, role')
      .is('auth_uid', null)

    if (fetchError) {
      console.error('Error fetching users:', fetchError)
      return
    }

    console.log(`Found ${users?.length || 0} users without auth_uid\n`)

    if (!users || users.length === 0) {
      console.log('All users already have auth_uid set!')
      return
    }

    // Update each user with a new auth_uid
    for (const user of users) {
      const authUid = randomUUID()
      
      console.log(`Setting auth_uid for ${user.full_name} (${user.phone})...`)
      
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ auth_uid: authUid })
        .eq('id', user.id)

      if (updateError) {
        console.error(`Error updating ${user.full_name}:`, updateError)
      } else {
        console.log(`✅ Updated ${user.full_name} with auth_uid: ${authUid}`)
      }
    }

    console.log('\n🎉 All users now have auth_uid set!')
    console.log('\nYou can now login with any user using their phone number or membership ID.')

  } catch (error) {
    console.error('Error:', error)
  }
}

setupAuthUids()

