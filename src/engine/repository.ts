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

// What a device's local progress adds to an account's cloud progress on first sign-in.
export type Upload = {
  profiles: Profile[]
  results: Record<string, LessonResult[]>
  reviews: Record<string, ReviewItem[]>
  settings?: Settings
}

// Children are matched by id, so profiles from two devices are kept side by side rather
// than merged. For the same lesson the newer result wins but keeps the best stars.
export function changesToUpload(local: Snapshot, remote: Snapshot): Upload {
  const upload: Upload = { profiles: [], results: {}, reviews: {} }
  for (const profile of local.profiles) {
    if (!remote.profiles.some((p) => p.id === profile.id)) upload.profiles.push(profile)
    const remoteResults = remote.results[profile.id] ?? {}
    const results = Object.values(local.results[profile.id] ?? {}).flatMap((r) => {
      const other = remoteResults[r.lessonId]
      if (!other) return [r]
      if (r.completedAt <= other.completedAt) return []
      return [{ ...r, stars: Math.max(r.stars, other.stars), plays: Math.max(r.plays, other.plays) }]
    })
    if (results.length) upload.results[profile.id] = results
    const remoteReviews = remote.reviews[profile.id] ?? {}
    const reviews = Object.values(local.reviews[profile.id] ?? {}).filter((r) => !remoteReviews[r.skill])
    if (reviews.length) upload.reviews[profile.id] = reviews
  }
  if (remote.profiles.length === 0) upload.settings = local.settings
  return upload
}

export function isEmptyUpload(u: Upload): boolean {
  return !u.profiles.length && !Object.keys(u.results).length && !Object.keys(u.reviews).length
}

// Screens talk to this interface only, so the storage backend (this device, or
// Firestore once a parent signs in) can change without touching the UI.
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

  // After local progress has been uploaded to an account, so it is not uploaded again
  // into a different account later.
  clear() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // Nothing stored.
    }
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
