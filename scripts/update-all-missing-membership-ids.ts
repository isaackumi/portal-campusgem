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

function generateMembershipId(): string {
  const year = new Date().getFullYear()
  const randomNum = Math.floor(Math.random() * 9000) + 1000 // 4-digit random number
  return `EA${randomNum}${year}`
}

async function updateAllMissingMembershipIds() {
  console.log('🔄 Updating all users with missing membership IDs...\n')

  try {
    // Find all users without membership IDs
    const { data: users, error: findError } = await supabase
      .from('app_users')
      .select('id, full_name, phone, membership_id')
      .is('membership_id', null)

    if (findError) {
      console.error('Error finding users:', findError)
      return
    }

    if (!users || users.length === 0) {
      console.log('✅ All users already have membership IDs!')
      return
    }

    console.log(`Found ${users.length} users without membership IDs:`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name} (${user.phone})`)
    })
    console.log('')

    // Update each user with a membership ID
    for (const user of users) {
      const membershipId = generateMembershipId()
      console.log(`Updating ${user.full_name} with membership ID: ${membershipId}`)
      
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ 
          membership_id: membershipId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        console.error(`Error updating ${user.full_name}:`, updateError)
      } else {
        console.log(`✅ Updated ${user.full_name}`)
      }
    }

    console.log('\n🎉 All users now have membership IDs!')

  } catch (error) {
    console.error('Error:', error)
  }
}

updateAllMissingMembershipIds()

