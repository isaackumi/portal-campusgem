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

async function updateAbenaMembership() {
  console.log('🔄 Updating Abena Dorcy with membership ID...\n')

  try {
    // Find Abena Dorcy
    const { data: abena, error: findError } = await supabase
      .from('app_users')
      .select('id, full_name, phone, membership_id')
      .eq('phone', '+233551133402')
      .single()

    if (findError) {
      console.error('Error finding Abena Dorcy:', findError)
      return
    }

    if (!abena) {
      console.error('Abena Dorcy not found')
      return
    }

    console.log('Found Abena Dorcy:', abena)

    // Generate a new membership ID
    const membershipId = generateMembershipId()
    console.log(`Generated membership ID: ${membershipId}`)

    // Update her with the membership ID
    const { data: updatedUser, error: updateError } = await supabase
      .from('app_users')
      .update({ 
        membership_id: membershipId,
        updated_at: new Date().toISOString()
      })
      .eq('id', abena.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating Abena Dorcy:', updateError)
      return
    }

    console.log('✅ Successfully updated Abena Dorcy:')
    console.log(`   Name: ${updatedUser.full_name}`)
    console.log(`   Phone: ${updatedUser.phone}`)
    console.log(`   Membership ID: ${updatedUser.membership_id}`)

  } catch (error) {
    console.error('Error:', error)
  }
}

updateAbenaMembership()

