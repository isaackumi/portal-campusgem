import { initializeApp, getApps, cert, type App, type ServiceAccount } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore, FieldValue } from 'firebase-admin/firestore'

export { FieldValue }

type ServiceAccountJson = {
  project_id: string
  client_email: string
  private_key: string
}

function loadServiceAccount(): ServiceAccountJson | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim()
  if (raw) {
    try {
      const o = JSON.parse(raw) as Record<string, unknown>
      const project_id = typeof o.project_id === 'string' ? o.project_id : null
      const client_email = typeof o.client_email === 'string' ? o.client_email : null
      const private_key = typeof o.private_key === 'string' ? o.private_key : null
      if (project_id && client_email && private_key) {
        return { project_id, client_email, private_key }
      }
    } catch {
      return null
    }
  }
  const project_id = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()
  const client_email = process.env.FIREBASE_CLIENT_EMAIL?.trim()
  const private_key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')?.trim()
  if (project_id && client_email && private_key) {
    return { project_id, client_email, private_key }
  }
  return null
}

let cachedApp: App | undefined

export function getFirebaseAdminApp(): App {
  if (cachedApp) return cachedApp
  const existing = getApps()[0]
  if (existing) {
    cachedApp = existing
    return cachedApp
  }
  const creds = loadServiceAccount()
  if (!creds) {
    throw new Error(
      'Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY (service account JSON) or FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and NEXT_PUBLIC_FIREBASE_PROJECT_ID.'
    )
  }
  cachedApp = initializeApp({
    credential: cert(creds as ServiceAccount),
    projectId: creds.project_id,
  })
  return cachedApp
}

function getAdminDbInstance(): Firestore {
  return getFirestore(getFirebaseAdminApp())
}

function getAdminAuthInstance(): Auth {
  return getAuth(getFirebaseAdminApp())
}

/** Lazily initialized so `next build` succeeds when Vercel env is not yet set. */
export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop, receiver) {
    const inst = getAdminDbInstance()
    const val = Reflect.get(inst, prop, receiver) as unknown
    return typeof val === 'function' ? (val as (...args: unknown[]) => unknown).bind(inst) : val
  },
})

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    const inst = getAdminAuthInstance()
    const val = Reflect.get(inst, prop, receiver) as unknown
    return typeof val === 'function' ? (val as (...args: unknown[]) => unknown).bind(inst) : val
  },
})

const defaultApp = new Proxy({} as App, {
  get(_target, prop, receiver) {
    const inst = getFirebaseAdminApp()
    const val = Reflect.get(inst, prop, receiver) as unknown
    return typeof val === 'function' ? (val as (...args: unknown[]) => unknown).bind(inst) : val
  },
})

export default defaultApp
