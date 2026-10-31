import { describe, expect, it } from 'vitest'
import type { Activity } from '../content/schema.ts'
import { dueReviews, starsFor, updateReviews } from './review.ts'

const DAY = 24 * 60 * 60 * 1000
const count = (n: number): Activity => ({ type: 'count', item: '🍎', n, options: [n, n + 1], skill: `dem:${n}` })
const intro: Activity = { type: 'intro', display: 'a', say: ['a'], skill: 'am:a' }

describe('updateReviews', () => {
  it('sends a missed item back to box 1, due now', () => {
    const [item] = updateReviews({}, [{ activity: count(3), firstTry: false }], 1000)
    expect(item).toMatchObject({ skill: 'dem:3', box: 1, due: 1000, lapses: 1 })
  })

  it('promotes a known item and spaces it out', () => {
    const prev = { 'dem:3': { skill: 'dem:3', activity: count(3), box: 2, due: 0, lapses: 1 } }
    const [item] = updateReviews(prev, [{ activity: count(3), firstTry: true }], 0)
    expect(item.box).toBe(3)
    expect(item.due).toBe(3 * DAY)
    expect(item.lapses).toBe(1)
  })

  it('ignores intro screens', () => {
    expect(updateReviews({}, [{ activity: intro, firstTry: true }])).toEqual([])
  })
})

describe('dueReviews', () => {
  it('returns due items, weakest first, skipping mastered ones', () => {
    const items = {
      a: { skill: 'a', activity: count(1), box: 3, due: 0, lapses: 0 },
      b: { skill: 'b', activity: count(2), box: 1, due: 0, lapses: 2 },
      c: { skill: 'c', activity: count(3), box: 5, due: 0, lapses: 0 },
      d: { skill: 'd', activity: count(4), box: 1, due: 10 * DAY, lapses: 0 },
    }
    expect(dueReviews(items, DAY).map((i) => i.skill)).toEqual(['b', 'a'])
  })

  it('skips saved activities of a type that was removed', () => {
    const traced = { type: 'trace', char: 'a', skill: 'viet:a' } as unknown as Activity
    const items = {
      a: { skill: 'a', activity: count(1), box: 1, due: 0, lapses: 0 },
      'viet:a': { skill: 'viet:a', activity: traced, box: 1, due: 0, lapses: 3 },
    }
    expect(dueReviews(items, DAY).map((i) => i.skill)).toEqual(['a'])
  })
})

describe('starsFor', () => {
  it('grades on first-try answers, not counting intros', () => {
    const ok = { activity: count(1), firstTry: true }
    const miss = { activity: count(2), firstTry: false }
    expect(starsFor([{ activity: intro, firstTry: true }, ok, ok])).toBe(3)
    expect(starsFor([ok, ok, miss])).toBe(2)
    expect(starsFor([ok, miss, miss])).toBe(1)
  })
})
