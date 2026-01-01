import { initializeApp, getApp, getApps } from 'firebase/app'
import type { Analytics } from 'firebase/analytics'
import { GoogleAuthProvider, getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

const requiredKeys = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
]

const hasFirebaseConfig = requiredKeys.every(Boolean)

const app = hasFirebaseConfig
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null

const auth = app ? getAuth(app) : null
const provider = new GoogleAuthProvider()

let analytics: Analytics | null = null

const initAnalytics = async () => {
  if (!app || typeof window === 'undefined') return null
  if (analytics) return analytics
  const { getAnalytics, isSupported } = await import('firebase/analytics')
  const supported = await isSupported()
  if (!supported) return null
  analytics = getAnalytics(app)
  return analytics
}

export { app, auth, provider, hasFirebaseConfig, initAnalytics }
