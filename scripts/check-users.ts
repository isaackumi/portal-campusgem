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

async function checkUsers() {
  console.log('🔍 Checking app_users table...\n')

  try {
    const { data: users, error } = await supabase
      .from('app_users')
      .select('id, full_name, phone, membership_id, role, auth_uid')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return
    }

    console.log(`Found ${users?.length || 0} users in app_users table:\n`)

    users?.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name || 'No name'} (${user.phone || 'No phone'})`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Membership ID: ${user.membership_id || 'None'}`)
      console.log(`   Role: ${user.role || 'No role'}`)
      console.log(`   Auth UID: ${user.auth_uid || 'No auth_uid'}`)
      console.log('')
    })

    // Check specifically for the working user
    const workingUser = users?.find(u => u.phone === '0548769251')
    if (workingUser) {
      console.log('✅ Working user found:')
      console.log(JSON.stringify(workingUser, null, 2))
    } else {
      console.log('❌ Working user (0548769251) not found')
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

checkUsers()

