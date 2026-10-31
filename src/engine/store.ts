import { create } from 'zustand'
import {
  LocalRepository,
  changesToUpload,
  emptySnapshot,
  isEmptyUpload,
  type Profile,
  type ProgressRepository,
  type Settings,
  type Snapshot,
} from './repository.ts'
import { updateReviews, starsFor, type Answer } from './review.ts'

const ACTIVE_KEY = 'kids-learning:active-profile'

export type Account = { email: string | null; name: string | null }

type State = Snapshot & {
  ready: boolean
  activeId: string | null
  // The signed-in parent; null means progress is kept on this device only.
  account: Account | null
  syncError: string | null
  init: () => Promise<void>
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  addProfile: (name: string, avatar: string) => Promise<void>
  removeProfile: (id: string) => Promise<void>
  selectProfile: (id: string | null) => void
  finishLesson: (lessonId: string, answers: Answer[]) => Promise<number>
  finishReview: (answers: Answer[]) => Promise<void>
  updateSettings: (settings: Settings) => Promise<void>
}

let repo: ProgressRepository = new LocalRepository()

function readActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

function writeActive(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id)
    else localStorage.removeItem(ACTIVE_KEY)
  } catch {
    // Remembering the last profile is only a convenience.
  }
}

// Firebase (and its bundle) is only loaded when this runs.
async function loadFirebase() {
  const [fb, { FirestoreRepository }] = await Promise.all([import('./firebase.ts'), import('./firestore-repository.ts')])
  return { ...fb, FirestoreRepository }
}

export const useProgress = create<State>((set, get) => {
  // Cloud writes resolve only when the server confirms, which never happens offline,
  // so the UI updates first and writes finish in the background.
  function persist(write: Promise<void>) {
    write.then(
      () => get().syncError && set({ syncError: null }),
      (e: Error) => {
        console.error(e)
        set({ syncError: e.message })
      },
    )
  }

  async function load(account: Account | null) {
    const snapshot = await repo.loadAll()
    const remembered = readActive()
    const activeId = snapshot.profiles.some((p) => p.id === remembered) ? remembered : null
    set({ ...emptySnapshot(), ...snapshot, activeId, account, ready: true })
  }

  return {
    ...emptySnapshot(),
    ready: false,
    activeId: null,
    account: null,
    syncError: null,

    async init() {
      let account: Account | null = null
      try {
        const fb = await loadFirebase()
        const user = await fb.currentUser()
        if (user) {
          repo = new fb.FirestoreRepository(fb.db, user.uid)
          account = { email: user.email, name: user.displayName }
        }
      } catch (e) {
        // Without Firebase the app still works with progress kept on this device.
        console.warn('Firebase unavailable, using local progress', e)
      }
      await load(account)
    },

    // Sign-in needs a connection anyway, so the one-off upload of this device's progress
    // into the account is awaited here.
    async signIn() {
      const fb = await loadFirebase()
      const user = await fb.signInWithGoogle()
      const cloud = new fb.FirestoreRepository(fb.db, user.uid)
      const local = new LocalRepository()
      const changes = changesToUpload(await local.loadAll(), await cloud.loadAll())
      if (!isEmptyUpload(changes) || changes.settings) await cloud.upload(changes)
      local.clear()
      repo = cloud
      await load({ email: user.email, name: user.displayName })
    },

    async signOut() {
      const fb = await loadFirebase()
      await fb.signOutParent()
      repo = new LocalRepository()
      await load(null)
    },

    async addProfile(name, avatar) {
      const profile: Profile = { id: crypto.randomUUID(), name, avatar, createdAt: Date.now() }
      persist(repo.saveProfile(profile))
      set({ profiles: [...get().profiles, profile] })
    },

    async removeProfile(id) {
      persist(repo.deleteProfile(id))
      const { [id]: _r, ...results } = get().results
      const { [id]: _v, ...reviews } = get().reviews
      set({ profiles: get().profiles.filter((p) => p.id !== id), results, reviews })
      if (get().activeId === id) get().selectProfile(null)
    },

    selectProfile(id) {
      writeActive(id)
      set({ activeId: id })
    },

    async finishLesson(lessonId, answers) {
      const pid = get().activeId
      if (!pid) return 0
      const stars = starsFor(answers)
      const prev = get().results[pid]?.[lessonId]
      const result = {
        lessonId,
        stars: Math.max(stars, prev?.stars ?? 0),
        plays: (prev?.plays ?? 0) + 1,
        completedAt: Date.now(),
      }
      const reviewItems = updateReviews(get().reviews[pid] ?? {}, answers)
      persist(repo.saveResult(pid, result))
      persist(repo.saveReviews(pid, reviewItems))
      set({
        results: { ...get().results, [pid]: { ...get().results[pid], [lessonId]: result } },
        reviews: { ...get().reviews, [pid]: { ...get().reviews[pid], ...Object.fromEntries(reviewItems.map((i) => [i.skill, i])) } },
      })
      return stars
    },

    async finishReview(answers) {
      const pid = get().activeId
      if (!pid) return
      const reviewItems = updateReviews(get().reviews[pid] ?? {}, answers)
      persist(repo.saveReviews(pid, reviewItems))
      set({
        reviews: { ...get().reviews, [pid]: { ...get().reviews[pid], ...Object.fromEntries(reviewItems.map((i) => [i.skill, i])) } },
      })
    },

    async updateSettings(settings) {
      persist(repo.saveSettings(settings))
      set({ settings })
    },
  }
})

export function useActiveProfile() {
  return useProgress((s) => s.profiles.find((p) => p.id === s.activeId) ?? null)
}

export function totalStars(results: Record<string, { stars: number }> | undefined): number {
  return Object.values(results ?? {}).reduce((sum, r) => sum + r.stars, 0)
}
