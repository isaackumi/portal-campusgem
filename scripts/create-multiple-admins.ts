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

// Admin users data
const adminUsers = [
  {
    phone: '+233247503214',
    full_name: 'Nana Kwaku',
    email: 'nanakwaku@campusgemministries.org',
    gender: 'male'
  },
  {
    phone: '+233245193818', // Oliver Ngissah - will be removed and recreated
    full_name: 'Oliver Ngissah',
    email: 'oliverngissah@campusgemministries.org',
    gender: 'male'
  },
  {
    phone: '+233593065455',
    full_name: 'Esther Maamle Asigbey',
    email: 'estherasigbey@campusgemministries.org',
    gender: 'female' // Note: User said Male but name suggests Female
  }
]

async function removeExistingUser(phone: string, name: string) {
  try {
    console.log(`\n🗑️  Removing existing user: ${name} (${phone})`)
    
    // Find user by phone
    const { data: user, error: userError } = await supabaseAdmin
      .from('app_users')
      .select('id, auth_uid')
      .eq('phone', phone)
      .single()

    if (userError || !user) {
      console.log(`ℹ️  User ${name} not found, skipping removal`)
      return
    }

    // Remove from auth.users if auth_uid exists
    if (user.auth_uid) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.auth_uid)
      if (authError) {
        console.warn(`⚠️  Could not remove auth user: ${authError.message}`)
      } else {
        console.log(`✅ Removed auth user for ${name}`)
      }
    }

    // Remove member record
    const { error: memberError } = await supabaseAdmin
      .from('members')
      .delete()
      .eq('user_id', user.id)

    if (memberError) {
      console.warn(`⚠️  Could not remove member record: ${memberError.message}`)
    } else {
      console.log(`✅ Removed member record for ${name}`)
    }

    // Remove from app_users
    const { error: userDeleteError } = await supabaseAdmin
      .from('app_users')
      .delete()
      .eq('id', user.id)

    if (userDeleteError) {
      console.error(`❌ Could not remove user record: ${userDeleteError.message}`)
      return false
    } else {
      console.log(`✅ Removed user record for ${name}`)
    }

    return true
  } catch (error) {
    console.error(`❌ Error removing user ${name}:`, error)
    return false
  }
}

async function createAdminUser(userData: typeof adminUsers[0]) {
  try {
    console.log(`\n🚀 Creating admin user: ${userData.full_name}`)

    // Generate membership ID
    const membershipId = generateMembershipId(userData.phone, 2025)
    
    console.log(`📱 Phone: ${userData.phone}`)
    console.log(`🆔 Membership ID: ${membershipId}`)
    console.log(`👤 Name: ${userData.full_name}`)
    console.log(`👥 Gender: ${userData.gender}`)

    // Create user in app_users table
    const { data: user, error: userError } = await supabaseAdmin
      .from('app_users')
      .insert({
        membership_id: membershipId,
        phone: userData.phone,
        email: userData.email,
        full_name: userData.full_name,
        role: 'admin',
        join_year: 2025
      })
      .select()
      .single()

    if (userError) {
      console.error(`❌ Error creating user ${userData.full_name}:`, userError)
      return null
    }

    console.log(`✅ Admin user ${userData.full_name} created successfully!`)

    // Create corresponding member profile
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .insert({
        user_id: user.id,
        dob: '1990-01-01', // Default date of birth
        gender: userData.gender,
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
      console.error(`❌ Error creating member profile for ${userData.full_name}:`, memberError)
      return null
    }

    console.log(`✅ Member profile created for ${userData.full_name}!`)

    // Create auth user for phone authentication
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      phone: userData.phone,
      email: userData.email,
      user_metadata: {
        full_name: userData.full_name,
        membership_id: membershipId
      }
    })

    if (authError) {
      console.error(`❌ Error creating auth user for ${userData.full_name}:`, authError)
      return null
    }

    console.log(`✅ Auth user created for ${userData.full_name}!`)

    // Update app_users with auth_uid
    const { error: updateError } = await supabaseAdmin
      .from('app_users')
      .update({ auth_uid: authData.user.id })
      .eq('id', user.id)

    if (updateError) {
      console.error(`❌ Error linking auth user for ${userData.full_name}:`, updateError)
      return null
    }

    console.log(`✅ Auth user linked for ${userData.full_name}!`)

    return {
      user,
      membershipId,
      authData
    }
  } catch (error) {
    console.error(`❌ Unexpected error creating user ${userData.full_name}:`, error)
    return null
  }
}

async function createMultipleAdmins() {
  try {
    console.log('🚀 Starting admin user creation process...')
    
    const results = []
    
    for (const userData of adminUsers) {
      // Remove existing user if it exists (especially for Oliver)
      await removeExistingUser(userData.phone, userData.full_name)
      
      // Create new admin user
      const result = await createAdminUser(userData)
      if (result) {
        results.push({
          name: userData.full_name,
          phone: userData.phone,
          membershipId: result.membershipId,
          gender: userData.gender
        })
      }
    }

    console.log('\n🎉 Admin user creation process completed!')
    console.log('\n📋 Login Details for All Admins:')
    console.log('=' .repeat(60))
    
    results.forEach((admin, index) => {
      console.log(`\n${index + 1}. ${admin.name} (${admin.gender})`)
      console.log(`   📱 Phone: ${admin.phone}`)
      console.log(`   🆔 Membership ID: ${admin.membershipId}`)
      console.log(`   🔐 Login with: ${admin.phone} or ${admin.membershipId}`)
    })
    
    console.log('\n📱 OTP will be sent to each phone number for verification.')
    console.log('🔐 All users have admin privileges and can access the admin panel.')
    
    return results
  } catch (error) {
    console.error('❌ Unexpected error in main process:', error)
    return []
  }
}

// Run the script
createMultipleAdmins().then((results) => {
  console.log(`\n✨ Script completed! Created ${results.length} admin users.`)
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})
