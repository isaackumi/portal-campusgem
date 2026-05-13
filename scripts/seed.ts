/**
 * Seed script for Campus Gem Ministries Church Management System
 * Creates sample data for development and testing
 */

import { createClient } from '@supabase/supabase-js'
import { generateMembershipId } from '../lib/membershipId'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SeedUser {
  full_name: string
  phone: string
  email?: string
  role: 'admin' | 'pastor' | 'elder' | 'finance_officer' | 'member' | 'visitor'
  join_year: number
  member?: {
    dob?: string
    gender?: 'male' | 'female' | 'other'
    address?: string
    emergency_contacts?: Array<{
      name: string
      relation: string
      phone: string
    }>
  }
  dependants?: Array<{
    name: string
    relationship: 'child' | 'spouse' | 'sibling' | 'parent' | 'guardian' | 'other'
    dob?: string
  }>
}

const seedUsers: SeedUser[] = [
  // Admin users
  {
    full_name: 'Rev. John Mensah',
    phone: '+233241234567',
    email: 'pastor@campusgemministries.org',
    role: 'admin',
    join_year: 2020,
    member: {
      dob: '1975-03-15',
      gender: 'male',
      address: '123 Church Street, Accra',
      emergency_contacts: [
        {
          name: 'Mary Mensah',
          relation: 'spouse',
          phone: '+233241234568'
        }
      ]
    }
  },
  {
    full_name: 'Elder Grace Asante',
    phone: '+233241234569',
    email: 'elder.grace@campusgemministries.org',
    role: 'elder',
    join_year: 2019,
    member: {
      dob: '1980-07-22',
      gender: 'female',
      address: '456 Faith Avenue, Accra',
      emergency_contacts: [
        {
          name: 'Kwame Asante',
          relation: 'spouse',
          phone: '+233241234570'
        }
      ]
    }
  },
  {
    full_name: 'Brother Samuel Osei',
    phone: '+233241234571',
    email: 'finance@campusgemministries.org',
    role: 'finance_officer',
    join_year: 2021,
    member: {
      dob: '1985-11-08',
      gender: 'male',
      address: '789 Hope Road, Accra'
    }
  },

  // Regular members with families
  {
    full_name: 'Sister Comfort Adjei',
    phone: '+233241234572',
    email: 'comfort.adjei@gmail.com',
    role: 'member',
    join_year: 2022,
    member: {
      dob: '1990-05-12',
      gender: 'female',
      address: '321 Peace Street, Accra',
      emergency_contacts: [
        {
          name: 'Emmanuel Adjei',
          relation: 'spouse',
          phone: '+233241234573'
        }
      ]
    },
    dependants: [
      {
        name: 'Grace Adjei',
        relationship: 'child',
        dob: '2015-08-20'
      },
      {
        name: 'Daniel Adjei',
        relationship: 'child',
        dob: '2018-03-10'
      }
    ]
  },
  {
    full_name: 'Brother Michael Boateng',
    phone: '+233241234574',
    email: 'michael.boateng@gmail.com',
    role: 'member',
    join_year: 2021,
    member: {
      dob: '1988-09-30',
      gender: 'male',
      address: '654 Love Lane, Accra',
      emergency_contacts: [
        {
          name: 'Sarah Boateng',
          relation: 'spouse',
          phone: '+233241234575'
        }
      ]
    },
    dependants: [
      {
        name: 'Sarah Boateng',
        relationship: 'spouse',
        dob: '1992-01-15'
      },
      {
        name: 'Joseph Boateng',
        relationship: 'child',
        dob: '2020-12-05'
      }
    ]
  },
  {
    full_name: 'Sister Abigail Frimpong',
    phone: '+233241234576',
    email: 'abigail.frimpong@gmail.com',
    role: 'member',
    join_year: 2023,
    member: {
      dob: '1995-04-18',
      gender: 'female',
      address: '987 Joy Avenue, Accra'
    }
  },

  // Youth members
  {
    full_name: 'Brother David Tetteh',
    phone: '+233241234577',
    email: 'david.tetteh@gmail.com',
    role: 'member',
    join_year: 2023,
    member: {
      dob: '2000-06-25',
      gender: 'male',
      address: '147 Youth Street, Accra'
    }
  },
  {
    full_name: 'Sister Esther Amoah',
    phone: '+233241234578',
    email: 'esther.amoah@gmail.com',
    role: 'member',
    join_year: 2022,
    member: {
      dob: '1998-10-14',
      gender: 'female',
      address: '258 Young Street, Accra'
    }
  },

  // Visitors
  {
    full_name: 'Brother Isaac Kumi',
    phone: '+233241234579',
    role: 'visitor',
    join_year: 2024,
    member: {
      dob: '1993-02-28',
      gender: 'male',
      address: '369 New Street, Accra'
    }
  }
]

async function seedDatabase() {
  console.log('🌱 Starting database seeding...')

  try {
    // Clear existing data (optional - comment out for production)
    // await clearExistingData()

    // Create users and members
    for (const userData of seedUsers) {
      console.log(`Creating user: ${userData.full_name}`)
      
      // Generate membership ID
      const membershipId = generateMembershipId(userData.phone, userData.join_year)
      
      // Create app user
      const { data: appUser, error: userError } = await supabase
        .from('app_users')
        .insert({
          full_name: userData.full_name,
          phone: userData.phone,
          email: userData.email,
          role: userData.role,
          membership_id: membershipId,
          join_year: userData.join_year
        })
        .select()
        .single()

      if (userError) {
        console.error(`Error creating user ${userData.full_name}:`, userError)
        continue
      }

      // Create member record if user is not visitor
      if (userData.role !== 'visitor' && userData.member) {
        const { data: member, error: memberError } = await supabase
          .from('members')
          .insert({
            user_id: appUser.id,
            dob: userData.member.dob,
            gender: userData.member.gender,
            address: userData.member.address,
            emergency_contacts: userData.member.emergency_contacts || [],
            status: 'active'
          })
          .select()
          .single()

        if (memberError) {
          console.error(`Error creating member for ${userData.full_name}:`, memberError)
          continue
        }

        // Create dependants
        if (userData.dependants && userData.dependants.length > 0) {
          for (const dependantData of userData.dependants) {
            const { error: dependantError } = await supabase
              .from('dependants')
              .insert({
                member_id: member.id,
                name: dependantData.name,
                relationship: dependantData.relationship,
                dob: dependantData.dob,
                notes: `Seed data - ${dependantData.relationship} of ${userData.full_name}`
              })

            if (dependantError) {
              console.error(`Error creating dependant ${dependantData.name}:`, dependantError)
            }
          }
        }
      }

      console.log(`✅ Created user: ${userData.full_name} (${membershipId})`)
    }

    // Create sample attendance records
    await createSampleAttendance()

    // Create sample donations
    await createSampleDonations()

    // Create sample prayer requests
    await createSamplePrayerRequests()

    console.log('🎉 Database seeding completed successfully!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

async function createSampleAttendance() {
  console.log('Creating sample attendance records...')

  // Get member IDs
  const { data: members } = await supabase
    .from('members')
    .select('id, user_id, app_users!inner(full_name)')
    .eq('status', 'active')

  if (!members || members.length === 0) return

  // Create attendance for last 4 weeks
  const today = new Date()
  const attendanceRecords = []

  for (let week = 0; week < 4; week++) {
    const sundayDate = new Date(today)
    sundayDate.setDate(today.getDate() - (today.getDay() + (week * 7)))
    
    const midweekDate = new Date(sundayDate)
    midweekDate.setDate(sundayDate.getDate() + 3)

    // Sunday service attendance (80% of members)
    const sundayMembers = members.slice(0, Math.floor(members.length * 0.8))
    for (const member of sundayMembers) {
      attendanceRecords.push({
        member_id: member.id,
        service_date: sundayDate.toISOString().split('T')[0],
        service_type: 'sunday_service',
        method: 'qr',
        metadata: { seed_data: true }
      })
    }

    // Midweek service attendance (60% of members)
    const midweekMembers = members.slice(0, Math.floor(members.length * 0.6))
    for (const member of midweekMembers) {
      attendanceRecords.push({
        member_id: member.id,
        service_date: midweekDate.toISOString().split('T')[0],
        service_type: 'midweek_service',
        method: 'kiosk',
        metadata: { seed_data: true }
      })
    }
  }

  // Insert in batches
  const batchSize = 50
  for (let i = 0; i < attendanceRecords.length; i += batchSize) {
    const batch = attendanceRecords.slice(i, i + batchSize)
    const { error } = await supabase
      .from('attendance')
      .insert(batch)

    if (error) {
      console.error('Error creating attendance batch:', error)
    }
  }

  console.log(`✅ Created ${attendanceRecords.length} attendance records`)
}

async function createSampleDonations() {
  console.log('Creating sample donation records...')

  // Get member IDs
  const { data: members } = await supabase
    .from('members')
    .select('id')
    .eq('status', 'active')

  if (!members || members.length === 0) return

  const donationTypes = ['tithe', 'offering', 'special', 'building_fund']
  const donations = []

  // Create donations for last 3 months
  for (let month = 0; month < 3; month++) {
    const monthDate = new Date()
    monthDate.setMonth(monthDate.getMonth() - month)

    // Each member makes 2-4 donations per month
    for (const member of members) {
      const numDonations = Math.floor(Math.random() * 3) + 2 // 2-4 donations
      
      for (let i = 0; i < numDonations; i++) {
        const donationDate = new Date(monthDate)
        donationDate.setDate(Math.floor(Math.random() * 28) + 1)

        donations.push({
          member_id: member.id,
          amount: Math.floor(Math.random() * 500) + 50, // 50-550 GHS
          donation_type: donationTypes[Math.floor(Math.random() * donationTypes.length)],
          donation_date: donationDate.toISOString().split('T')[0],
          payment_method: Math.random() > 0.5 ? 'cash' : 'mobile_money',
          reference_number: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          metadata: { seed_data: true }
        })
      }
    }
  }

  // Insert in batches
  const batchSize = 100
  for (let i = 0; i < donations.length; i += batchSize) {
    const batch = donations.slice(i, i + batchSize)
    const { error } = await supabase
      .from('donations')
      .insert(batch)

    if (error) {
      console.error('Error creating donation batch:', error)
    }
  }

  console.log(`✅ Created ${donations.length} donation records`)
}

async function createSamplePrayerRequests() {
  console.log('Creating sample prayer requests...')

  // Get member IDs
  const { data: members } = await supabase
    .from('members')
    .select('id')
    .eq('status', 'active')

  if (!members || members.length === 0) return

  const prayerRequests = [
    {
      title: 'Prayer for Healing',
      description: 'Please pray for my recovery from illness',
      category: 'health'
    },
    {
      title: 'Family Unity',
      description: 'Pray for peace and unity in our family',
      category: 'family'
    },
    {
      title: 'Financial Breakthrough',
      description: 'Pray for God\'s provision and financial breakthrough',
      category: 'financial'
    },
    {
      title: 'Spiritual Growth',
      description: 'Pray for deeper relationship with God',
      category: 'spiritual'
    },
    {
      title: 'Job Opportunity',
      description: 'Pray for a good job opportunity',
      category: 'career'
    }
  ]

  // Create 2-3 prayer requests per member
  const requests = []
  for (const member of members) {
    const numRequests = Math.floor(Math.random() * 2) + 2 // 2-3 requests
    
    for (let i = 0; i < numRequests; i++) {
      const prayerRequest = prayerRequests[Math.floor(Math.random() * prayerRequests.length)]
      const requestDate = new Date()
      requestDate.setDate(requestDate.getDate() - Math.floor(Math.random() * 30))

      requests.push({
        member_id: member.id,
        title: prayerRequest.title,
        description: prayerRequest.description,
        category: prayerRequest.category,
        status: Math.random() > 0.7 ? 'answered' : 'active',
        is_anonymous: Math.random() > 0.8,
        created_at: requestDate.toISOString()
      })
    }
  }

  const { error } = await supabase
    .from('prayer_requests')
    .insert(requests)

  if (error) {
    console.error('Error creating prayer requests:', error)
  } else {
    console.log(`✅ Created ${requests.length} prayer request records`)
  }
}

async function clearExistingData() {
  console.log('⚠️  Clearing existing data...')
  
  // Delete in reverse order of dependencies
  const tables = [
    'prayer_requests',
    'donations',
    'attendance',
    'dependants',
    'members',
    'app_users'
  ]

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

    if (error) {
      console.error(`Error clearing ${table}:`, error)
    }
  }
}

// Run the seeding
if (require.main === module) {
  seedDatabase()
}

export { seedDatabase }
