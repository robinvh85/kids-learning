import { describe, expect, it } from 'vitest'
import type { Activity } from '../content/schema.ts'
import { changesToUpload, emptySnapshot, isEmptyUpload, type Snapshot } from './repository.ts'

const activity: Activity = { type: 'count', item: '🍎', n: 2, options: [1, 2], skill: 'dem:2' }
const na = { id: 'na', name: 'Na', avatar: '🐰', createdAt: 1 }
const bin = { id: 'bin', name: 'Bin', avatar: '🐻', createdAt: 2 }

function snapshot(patch: Partial<Snapshot>): Snapshot {
  return { ...emptySnapshot(), ...patch }
}

describe('changesToUpload', () => {
  it('uploads everything into an empty account, including settings', () => {
    const local = snapshot({
      profiles: [na],
      results: { na: { 'tv-01': { lessonId: 'tv-01', stars: 3, plays: 1, completedAt: 10 } } },
      reviews: { na: { 'dem:2': { skill: 'dem:2', activity, box: 1, due: 0, lapses: 1 } } },
      settings: { dailyMinutes: 20 },
    })
    const up = changesToUpload(local, emptySnapshot())
    expect(up.profiles).toEqual([na])
    expect(up.results.na).toHaveLength(1)
    expect(up.reviews.na).toHaveLength(1)
    expect(up.settings).toEqual({ dailyMinutes: 20 })
  })

  it('keeps profiles from both devices and does not override account settings', () => {
    const up = changesToUpload(snapshot({ profiles: [na] }), snapshot({ profiles: [bin] }))
    expect(up.profiles).toEqual([na])
    expect(up.settings).toBeUndefined()
  })

  it('takes the newer result for a lesson but keeps the best stars', () => {
    const local = snapshot({ profiles: [na], results: { na: { a: { lessonId: 'a', stars: 1, plays: 2, completedAt: 20 } } } })
    const remote = snapshot({ profiles: [na], results: { na: { a: { lessonId: 'a', stars: 3, plays: 5, completedAt: 10 } } } })
    expect(changesToUpload(local, remote).results.na).toEqual([{ lessonId: 'a', stars: 3, plays: 5, completedAt: 20 }])
    expect(changesToUpload(remote, local).results.na).toBeUndefined()
  })

  it('has nothing to upload when the device is already in sync', () => {
    const same = snapshot({ profiles: [na], reviews: { na: { 'dem:2': { skill: 'dem:2', activity, box: 2, due: 0, lapses: 0 } } } })
    expect(isEmptyUpload(changesToUpload(same, same))).toBe(true)
  })
})
