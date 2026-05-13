import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore'

// Initialize Firebase Admin SDK
let app: App
if (getApps().length === 0) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }

  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "campusgemchms",
  })
} else {
  app = getApps()[0]
}

// Initialize Admin services
export const adminAuth: Auth = getAuth(app)
export const adminDb: Firestore = getFirestore(app)

// Export FieldValue for use in migration scripts
export { FieldValue }

export default app
