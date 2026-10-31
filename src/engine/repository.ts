import type { Activity } from '../content/schema.ts'

export type Profile = { id: string; name: string; avatar: string; createdAt: number }

export type LessonResult = { lessonId: string; stars: number; plays: number; completedAt: number }

// Leitner box: 1 = needs practice now, 5 = well known.
export type ReviewItem = { skill: string; activity: Activity; box: number; due: number; lapses: number }

export type Settings = { dailyMinutes: number }

export type Snapshot = {
  profiles: Profile[]
  results: Record<string, Record<string, LessonResult>>
  reviews: Record<string, Record<string, ReviewItem>>
  settings: Settings
}

export const emptySnapshot = (): Snapshot => ({
  profiles: [],
  results: {},
  reviews: {},
  settings: { dailyMinutes: 15 },
})

// Screens talk to this interface only, so the storage backend (this device now,
// Firestore later) can change without touching the UI.
export interface ProgressRepository {
  loadAll(): Promise<Snapshot>
  saveProfile(profile: Profile): Promise<void>
  deleteProfile(profileId: string): Promise<void>
  saveResult(profileId: string, result: LessonResult): Promise<void>
  saveReviews(profileId: string, items: ReviewItem[]): Promise<void>
  saveSettings(settings: Settings): Promise<void>
}

const KEY = 'kids-learning:v1'

export class LocalRepository implements ProgressRepository {
  private read(): Snapshot {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? { ...emptySnapshot(), ...(JSON.parse(raw) as Snapshot) } : emptySnapshot()
    } catch {
      return emptySnapshot()
    }
  }

  private write(update: (s: Snapshot) => void): Promise<void> {
    const s = this.read()
    update(s)
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      // Storage full or blocked (private mode): progress lives in memory for this session.
    }
    return Promise.resolve()
  }

  loadAll() {
    return Promise.resolve(this.read())
  }

  saveProfile(profile: Profile) {
    return this.write((s) => {
      s.profiles = [...s.profiles.filter((p) => p.id !== profile.id), profile]
    })
  }

  deleteProfile(profileId: string) {
    return this.write((s) => {
      s.profiles = s.profiles.filter((p) => p.id !== profileId)
      delete s.results[profileId]
      delete s.reviews[profileId]
    })
  }

  saveResult(profileId: string, result: LessonResult) {
    return this.write((s) => {
      s.results[profileId] = { ...s.results[profileId], [result.lessonId]: result }
    })
  }

  saveReviews(profileId: string, items: ReviewItem[]) {
    return this.write((s) => {
      const current = { ...s.reviews[profileId] }
      for (const item of items) current[item.skill] = item
      s.reviews[profileId] = current
    })
  }

  saveSettings(settings: Settings) {
    return this.write((s) => {
      s.settings = settings
    })
  }
}
