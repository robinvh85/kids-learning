import { describe, expect, it } from 'vitest'
import { COURSES } from './index.ts'
import { allSpeech, explainOf, promptOf, spellSteps, toneChoices, withTone, TONE_MARKS } from './speech.ts'

const activities = COURSES.flatMap((c) => c.lessons.flatMap((l) => l.activities.map((a) => ({ lesson: l.id, a }))))

describe('course content', () => {
  it('has unique lesson ids', () => {
    const ids = COURSES.flatMap((c) => c.lessons.map((l) => l.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('puts the answer of every choice among its options, once', () => {
    for (const { lesson, a } of activities) {
      if (a.type !== 'choose') continue
      const labels = a.options.map((o) => o.label)
      expect(labels, lesson).toContain(a.answer)
      expect(new Set(labels).size, lesson).toBe(labels.length)
    }
  })

  it('spells every combine and spell result from its parts and tone', () => {
    for (const { lesson, a } of activities) {
      if (a.type !== 'combine' && a.type !== 'spell') continue
      const built = (a.parts.join('') + TONE_MARKS[a.tone]).normalize('NFC')
      // The mark sits on the vowel, which is the last part in these CV syllables.
      expect(built, lesson).toBe(a.result.normalize('NFC'))
      if (a.type === 'combine') expect(a.extra.some((e) => a.parts.includes(e)), `${lesson}: extra tile duplicates a part`).toBe(false)
    }
  })

  it('offers the right count among the choices', () => {
    for (const { lesson, a } of activities) {
      if (a.type === 'count') expect(a.options, lesson).toContain(a.n)
      if (a.type === 'bond') {
        expect(a.known, lesson).toBeLessThanOrEqual(a.total)
        expect(a.options, lesson).toContain(a.total - a.known)
      }
    }
  })

  it('builds speech for every activity', () => {
    for (const { a } of activities) {
      expect(promptOf(a).every((s) => s.length > 0)).toBe(true)
      explainOf(a)
    }
    const all = allSpeech(COURSES)
    for (const step of ['bờ', 'a', 'ba', 'huyền', 'bà']) expect(all).toContain(step)
    expect(all).toContain('Có bao nhiêu con cá?')
  })
})

describe('spellSteps', () => {
  it('reads each part, the joined syllable, the tone, then the word', () => {
    expect(spellSteps({ parts: ['b', 'a'], tone: 'ngang', result: 'ba' })).toEqual([
      { text: 'bờ', light: [0] },
      { text: 'a', light: [1] },
      { text: 'ba', light: [0, 1] },
      { text: 'ba', light: ['result'] },
    ])
    expect(spellSteps({ parts: ['b', 'a'], tone: 'huyen', result: 'bà' }).map((s) => s.text)).toEqual(['bờ', 'a', 'ba', 'huyền', 'bà'])
  })
})

describe('tones', () => {
  it('moves the tone mark to another tone in place', () => {
    expect(withTone('bà', 'sac')).toBe('bá')
    expect(withTone('đỗ', 'hoi')).toBe('đổ')
    expect(withTone('cờ', 'nang')).toBe('cợ')
    expect(withTone('bà', 'ngang')).toBe('ba')
  })

  it('offers only no-mark, the answer and the previously taught tone', () => {
    expect(toneChoices('huyen')).toEqual(['ngang', 'huyen'])
    expect(toneChoices('sac')).toEqual(['ngang', 'huyen', 'sac'])
    expect(toneChoices('hoi')).toEqual(['ngang', 'sac', 'hoi'])
    expect(toneChoices('nga')).toEqual(['ngang', 'nga', 'nang'])
  })
})
