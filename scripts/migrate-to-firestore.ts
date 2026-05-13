/**
 * Data Migration Script: Supabase PostgreSQL → Firebase Firestore
 * 
 * This script helps migrate data from Supabase to Firestore.
 * Run this after setting up your Firebase project.
 * 
 * Usage:
 * 1. Export data from Supabase (or connect directly if you have access)
 * 2. Update the connection details below
 * 3. Run: bun run scripts/migrate-to-firestore.ts
 */

import { adminDb, FieldValue } from '../lib/firebase/admin'
import { createClient } from '@supabase/supabase-js'

// Supabase connection (for reading data)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Convert UUID to Firestore-compatible ID
 */
function uuidToId(uuid: string): string {
  // Use UUID as-is, Firestore supports it
  return uuid
}

/**
 * Convert PostgreSQL timestamp to Firestore timestamp
 */
function toFirestoreTimestamp(pgTimestamp: string | Date): any {
  const date = typeof pgTimestamp === 'string' ? new Date(pgTimestamp) : pgTimestamp
  const admin = require('firebase-admin')
  return admin.firestore.Timestamp.fromDate(date)
}

/**
 * Convert PostgreSQL JSONB to Firestore-compatible object
 */
function convertJsonb(jsonb: any): any {
  if (jsonb === null || jsonb === undefined) {
    return null
  }
  if (typeof jsonb === 'string') {
    return JSON.parse(jsonb)
  }
  return jsonb
}

/**
 * Migrate app_users table
 */
async function migrateUsers() {
  console.log('Migrating users...')
  
  const { data: users, error } = await supabase
    .from('app_users')
    .select('*')
  
  if (error) {
    console.error('Error fetching users:', error)
    return
  }
  
  if (!users || users.length === 0) {
    console.log('No users to migrate')
    return
  }
  
  const batch = adminDb.batch()
  let count = 0
  
  for (const user of users) {
    const docRef = adminDb.collection('users').doc(uuidToId(user.id))
    
    batch.set(docRef, {
      authUid: user.auth_uid || null,
      membershipId: user.membership_id || null,
      phone: user.phone || null,
      email: user.email || null,
      fullName: user.full_name,
      role: user.role,
      profileCompletion: user.profile_completion || 0,
      joinYear: user.join_year || new Date().getFullYear(),
      createdAt: user.created_at ? toFirestoreTimestamp(user.created_at) : FieldValue.serverTimestamp(),
      updatedAt: user.updated_at ? toFirestoreTimestamp(user.updated_at) : FieldValue.serverTimestamp(),
    })
    
    count++
    
    // Firestore batches are limited to 500 operations
    if (count % 500 === 0) {
      await batch.commit()
      console.log(`Migrated ${count} users...`)
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit()
  }
  
  console.log(`✅ Migrated ${count} users`)
}

/**
 * Migrate members table
 */
async function migrateMembers() {
  console.log('Migrating members...')
  
  const { data: members, error } = await supabase
    .from('members')
    .select('*')
  
  if (error) {
    console.error('Error fetching members:', error)
    return
  }
  
  if (!members || members.length === 0) {
    console.log('No members to migrate')
    return
  }
  
  const batch = adminDb.batch()
  let count = 0
  
  for (const member of members) {
    const docRef = adminDb.collection('members').doc(uuidToId(member.id))
    
    batch.set(docRef, {
      userId: member.user_id ? adminDb.collection('users').doc(uuidToId(member.user_id)) : null,
      dob: member.dob || null,
      gender: member.gender || null,
      address: member.address || null,
      emergencyContacts: convertJsonb(member.emergency_contacts) || [],
      profilePhoto: member.profile_photo || null,
      documents: convertJsonb(member.documents) || [],
      status: member.status || 'active',
      notes: member.notes || null,
      createdAt: member.created_at ? toFirestoreTimestamp(member.created_at) : FieldValue.serverTimestamp(),
      updatedAt: member.updated_at ? toFirestoreTimestamp(member.updated_at) : FieldValue.serverTimestamp(),
    })
    
    count++
    
    if (count % 500 === 0) {
      await batch.commit()
      console.log(`Migrated ${count} members...`)
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit()
  }
  
  console.log(`✅ Migrated ${count} members`)
}

/**
 * Migrate attendance table
 */
async function migrateAttendance() {
  console.log('Migrating attendance...')
  
  const { data: attendance, error } = await supabase
    .from('attendance')
    .select('*')
  
  if (error) {
    console.error('Error fetching attendance:', error)
    return
  }
  
  if (!attendance || attendance.length === 0) {
    console.log('No attendance records to migrate')
    return
  }
  
  const batch = adminDb.batch()
  let count = 0
  
  for (const record of attendance) {
    const docRef = adminDb.collection('attendance').doc(uuidToId(record.id))
    
    batch.set(docRef, {
      memberId: record.member_id ? adminDb.collection('members').doc(uuidToId(record.member_id)) : null,
      dependantId: record.dependant_id ? adminDb.collection('dependants').doc(uuidToId(record.dependant_id)) : null,
      serviceDate: record.service_date,
      serviceType: record.service_type || null,
      checkInTime: record.check_in_time ? toFirestoreTimestamp(record.check_in_time) : FieldValue.serverTimestamp(),
      method: record.method || 'qr',
      metadata: convertJsonb(record.metadata) || {},
      clientUuid: record.client_uuid || null,
      createdBy: record.created_by ? adminDb.collection('users').doc(uuidToId(record.created_by)) : null,
      createdAt: record.created_at ? toFirestoreTimestamp(record.created_at) : FieldValue.serverTimestamp(),
    })
    
    count++
    
    if (count % 500 === 0) {
      await batch.commit()
      console.log(`Migrated ${count} attendance records...`)
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit()
  }
  
  console.log(`✅ Migrated ${count} attendance records`)
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('Starting migration from Supabase to Firestore...')
  console.log('⚠️  Make sure you have backed up your Supabase data!')
  
  try {
    await migrateUsers()
    await migrateMembers()
    await migrateAttendance()
    
    // Add more table migrations as needed
    // await migrateDonations()
    // await migratePledges()
    // await migrateGroups()
    // etc.
    
    console.log('✅ Migration completed!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate()
}

export { migrate }
