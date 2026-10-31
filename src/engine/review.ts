import type { Activity } from '../content/schema.ts'
import type { ReviewItem } from './repository.ts'

const DAY = 24 * 60 * 60 * 1000
// Days until the next review for each Leitner box.
const INTERVALS = [0, 0, 1, 3, 7, 14]

export type Answer = { activity: Activity; firstTry: boolean }

// Screens that show and tell rather than test: not graded, not reviewed.
const isPractice = (a: Activity) => a.type === 'intro' || a.type === 'spell'

export function updateReviews(existing: Record<string, ReviewItem>, answers: Answer[], now = Date.now()): ReviewItem[] {
  const out = new Map<string, ReviewItem>()
  for (const { activity, firstTry } of answers) {
    if (!activity.skill || isPractice(activity)) continue
    const prev = out.get(activity.skill) ?? existing[activity.skill]
    const box = firstTry ? Math.min((prev?.box ?? 1) + 1, 5) : 1
    out.set(activity.skill, {
      skill: activity.skill,
      activity,
      box,
      due: now + INTERVALS[box] * DAY,
      lapses: (prev?.lapses ?? 0) + (firstTry ? 0 : 1),
    })
  }
  return [...out.values()]
}

export function dueReviews(items: Record<string, ReviewItem> | undefined, now = Date.now(), limit = 8): ReviewItem[] {
  return Object.values(items ?? {})
    .filter((i) => i.due <= now && i.box < 5)
    .sort((a, b) => a.box - b.box || b.lapses - a.lapses)
    .slice(0, limit)
}

export function starsFor(answers: Answer[]): number {
  const graded = answers.filter((a) => !isPractice(a.activity))
  if (graded.length === 0) return 3
  const ratio = graded.filter((a) => a.firstTry).length / graded.length
  return ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1
}
