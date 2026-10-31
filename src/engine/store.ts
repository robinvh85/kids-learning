import { create } from 'zustand'
import { LocalRepository, emptySnapshot, type Profile, type ProgressRepository, type Settings, type Snapshot } from './repository.ts'
import { updateReviews, starsFor, type Answer } from './review.ts'

const ACTIVE_KEY = 'kids-learning:active-profile'

type State = Snapshot & {
  ready: boolean
  activeId: string | null
  init: () => Promise<void>
  addProfile: (name: string, avatar: string) => Promise<void>
  removeProfile: (id: string) => Promise<void>
  selectProfile: (id: string | null) => void
  finishLesson: (lessonId: string, answers: Answer[]) => Promise<number>
  finishReview: (answers: Answer[]) => Promise<void>
  updateSettings: (settings: Settings) => Promise<void>
}

export const repo: ProgressRepository = new LocalRepository()

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

export const useProgress = create<State>((set, get) => ({
  ...emptySnapshot(),
  ready: false,
  activeId: null,

  async init() {
    const snapshot = await repo.loadAll()
    const remembered = readActive()
    const activeId = snapshot.profiles.some((p) => p.id === remembered) ? remembered : null
    set({ ...snapshot, activeId, ready: true })
  },

  async addProfile(name, avatar) {
    const profile: Profile = { id: crypto.randomUUID(), name, avatar, createdAt: Date.now() }
    await repo.saveProfile(profile)
    set({ profiles: [...get().profiles, profile] })
  },

  async removeProfile(id) {
    await repo.deleteProfile(id)
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
    await Promise.all([repo.saveResult(pid, result), repo.saveReviews(pid, reviewItems)])
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
    await repo.saveReviews(pid, reviewItems)
    set({
      reviews: { ...get().reviews, [pid]: { ...get().reviews[pid], ...Object.fromEntries(reviewItems.map((i) => [i.skill, i])) } },
    })
  },

  async updateSettings(settings) {
    await repo.saveSettings(settings)
    set({ settings })
  },
}))

export function useActiveProfile() {
  return useProgress((s) => s.profiles.find((p) => p.id === s.activeId) ?? null)
}

export function totalStars(results: Record<string, { stars: number }> | undefined): number {
  return Object.values(results ?? {}).reduce((sum, r) => sum + r.stars, 0)
}
