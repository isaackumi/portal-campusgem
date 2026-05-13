/**
 * Utility functions for Firestore operations
 * These help bridge the gap between Supabase patterns and Firestore
 */

import { adminDb } from './admin'
import { db } from './client'
import { 
  QueryConstraint, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore'

/**
 * Convert Supabase-style query to Firestore query
 */
export interface FirestoreQueryOptions {
  where?: Array<[string, FirebaseFirestore.WhereFilterOp, any]>
  orderBy?: Array<[string, 'asc' | 'desc']>
  limit?: number
  startAfter?: QueryDocumentSnapshot<DocumentData>
}

/**
 * Helper to build Firestore queries
 */
export function buildQuery(
  collection: string,
  options: FirestoreQueryOptions = {}
) {
  let query: any = adminDb.collection(collection)
  
  if (options.where) {
    options.where.forEach(([field, op, value]) => {
      query = query.where(field, op, value)
    })
  }
  
  if (options.orderBy) {
    options.orderBy.forEach(([field, direction]) => {
      query = query.orderBy(field, direction)
    })
  }
  
  if (options.limit) {
    query = query.limit(options.limit)
  }
  
  if (options.startAfter) {
    query = query.startAfter(options.startAfter)
  }
  
  return query
}

/**
 * Convert Firestore document to plain object with id
 */
export function docToObject<T>(doc: FirebaseFirestore.DocumentSnapshot): T & { id: string } {
  return {
    id: doc.id,
    ...doc.data()
  } as T & { id: string }
}

/**
 * Convert Firestore query snapshot to array
 */
export function snapshotToArray<T>(snapshot: FirebaseFirestore.QuerySnapshot): (T & { id: string })[] {
  return snapshot.docs.map(doc => docToObject<T>(doc))
}

/**
 * Find document by field value
 */
export async function findOneByField<T>(
  collection: string,
  field: string,
  value: any
): Promise<(T & { id: string }) | null> {
  const snapshot = await adminDb
    .collection(collection)
    .where(field, '==', value)
    .limit(1)
    .get()
  
  if (snapshot.empty) {
    return null
  }
  
  return docToObject<T>(snapshot.docs[0])
}

/**
 * Find multiple documents by field value
 */
export async function findByField<T>(
  collection: string,
  field: string,
  value: any,
  options?: { orderBy?: [string, 'asc' | 'desc'], limit?: number }
): Promise<(T & { id: string })[]> {
  let query: FirebaseFirestore.Query = adminDb
    .collection(collection)
    .where(field, '==', value)
  
  if (options?.orderBy) {
    query = query.orderBy(options.orderBy[0], options.orderBy[1])
  }
  
  if (options?.limit) {
    query = query.limit(options.limit)
  }
  
  const snapshot = await query.get()
  return snapshotToArray<T>(snapshot)
}

export { normalizePhone, phoneLoginVariants, isValidPhone } from '@/lib/phone'
