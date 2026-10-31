// Loaded lazily (dynamic import from store.ts) so Firebase is not in the first bundle.
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

// Web config is public by design; access is controlled by firestore.rules.
const app = initializeApp({
  apiKey: 'AIzaSyCftNcTiJEp_0Wc_sQ2U_ASTk6c3X-4MME',
  authDomain: 'kids-learning-vh.firebaseapp.com',
  projectId: 'kids-learning-vh',
  storageBucket: 'kids-learning-vh.firebasestorage.app',
  messagingSenderId: '1032561758093',
  appId: '1:1032561758093:web:43f338d6383def7f53f7c4',
})

export const auth = getAuth(app)

// The persistent cache keeps progress readable and writable offline and syncs when back online.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
})

if (import.meta.env.VITE_FIREBASE_EMULATORS) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

export function currentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const stop = onAuthStateChanged(auth, (user) => {
      stop()
      resolve(user)
    })
  })
}

export async function signInWithGoogle(): Promise<User> {
  const { user } = await signInWithPopup(auth, new GoogleAuthProvider())
  return user
}

export function signOutParent(): Promise<void> {
  return signOut(auth)
}
