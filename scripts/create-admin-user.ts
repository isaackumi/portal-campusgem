import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Simple membership ID generation function
function generateMembershipId(phone: string, joinYear: number): string {
  let digits = '0000'
  
  if (phone && phone.length >= 4) {
    // Extract last 4 digits from phone
    const cleanPhone = phone.replace(/\D/g, '')
    digits = cleanPhone.slice(-4)
  } else {
    // Generate random 4 digits
    digits = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  }
  
  return `EA-${digits}${joinYear}`
}

async function createAdminUser() {
  try {
    console.log('🚀 Creating admin user...')

    // Admin user details
    const adminData = {
      phone: '+233241234567', // Replace with your actual phone number
      full_name: 'System Administrator',
      email: 'admin@campusgemministries.org',
      role: 'admin' as const,
      join_year: 2024
    }

    // Generate membership ID
    const membershipId = generateMembershipId(adminData.phone, adminData.join_year)
    
    console.log(`📱 Phone: ${adminData.phone}`)
    console.log(`🆔 Membership ID: ${membershipId}`)
    console.log(`👤 Name: ${adminData.full_name}`)

    // Create user in app_users table
    const { data: user, error: userError } = await supabaseAdmin
      .from('app_users')
      .insert({
        membership_id: membershipId,
        phone: adminData.phone,
        email: adminData.email,
        full_name: adminData.full_name,
        role: adminData.role,
        join_year: adminData.join_year,
        profile_completion: 100
      })
      .select()
      .single()

    if (userError) {
      console.error('❌ Error creating user:', userError)
      return
    }

    console.log('✅ Admin user created successfully!')

    // Create corresponding member profile
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .insert({
        user_id: user.id,
        dob: '1990-01-01', // You can change this
        gender: 'male', // You can change this
        address: 'Campus Gem Ministries, Odorkor',
        emergency_contacts: [
          {
            name: 'Emergency Contact',
            relation: 'family',
            phone: '+233241234568'
          }
        ],
        status: 'active'
      })
      .select()
      .single()

    if (memberError) {
      console.error('❌ Error creating member profile:', memberError)
      return
    }

    console.log('✅ Member profile created successfully!')

    // Create auth user for phone authentication
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      phone: adminData.phone,
      email: adminData.email,
      user_metadata: {
        full_name: adminData.full_name,
        membership_id: membershipId
      }
    })

    if (authError) {
      console.error('❌ Error creating auth user:', authError)
      return
    }

    console.log('✅ Auth user created successfully!')

    // Update app_users with auth_uid
    const { error: updateError } = await supabaseAdmin
      .from('app_users')
      .update({ auth_uid: authData.user.id })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Error linking auth user:', updateError)
      return
    }

    console.log('✅ Auth user linked successfully!')

    console.log('\n🎉 Admin user setup complete!')
    console.log('\n📋 Login Details:')
    console.log(`   Phone: ${adminData.phone}`)
    console.log(`   Membership ID: ${membershipId}`)
    console.log('\n🔐 You can now login using either:')
    console.log('   1. Phone number: +233241234567')
    console.log('   2. Membership ID: ' + membershipId)
    console.log('\n📱 OTP will be sent to the phone number for verification.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the script
createAdminUser().then(() => {
  console.log('\n✨ Script completed!')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})
