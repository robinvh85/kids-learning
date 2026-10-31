import type { Activity, Tone } from './schema.ts'
import { numberWord, soundOf, TONE_MARKS, TONE_NAMES } from './speech.ts'

type A = Activity

export function introLetter(upper: string, lower: string, example?: { word: string; picture: string }): A {
  const say = [`Đây là chữ ${soundOf(lower)}`, soundOf(lower)]
  if (example) say.push(`${soundOf(lower)}, như trong tiếng ${example.word}`)
  return { type: 'intro', display: `${upper} ${lower}`, picture: example?.picture, say, skill: `am:${lower}` }
}

export function introTone(tone: Exclude<Tone, 'ngang'>): A {
  const withA = ('a' + TONE_MARKS[tone]).normalize('NFC')
  return {
    type: 'intro',
    display: withA,
    say: [`Đây là dấu ${TONE_NAMES[tone]}`, `a, ${TONE_NAMES[tone]}, ${withA}`],
    skill: `thanh:${tone}`,
  }
}

export function introNumber(n: number, item: string): A {
  return {
    type: 'intro',
    display: String(n),
    picture: n === 0 ? undefined : item.repeat(n),
    say: [`Đây là số ${numberWord(n)}`, numberWord(n)],
    skill: `so:${n}`,
  }
}

export function chooseLetter(answer: string, others: string[]): A {
  return {
    type: 'choose',
    style: 'letter',
    prompt: `Bé hãy chọn chữ ${soundOf(answer)}`,
    options: shuffle([answer, ...others]).map((label) => ({ label })),
    answer,
    skill: `am:${answer}`,
  }
}

export function chooseWord(answer: string, others: string[], picture?: string): A {
  return {
    type: 'choose',
    style: 'word',
    prompt: picture ? 'Đây là gì? Bé chọn tiếng đúng nhé' : `Bé hãy chọn tiếng ${answer}`,
    picture,
    options: shuffle([answer, ...others]).map((label) => ({ label })),
    answer,
    skill: `tieng:${answer}`,
  }
}

export function combine(parts: string[], result: string, opts: { tone?: Tone; picture?: string; extra?: string[] } = {}): A {
  return {
    type: 'combine',
    parts,
    result,
    tone: opts.tone ?? 'ngang',
    picture: opts.picture,
    extra: opts.extra ?? [],
    skill: `tieng:${result}`,
  }
}

export function spell(parts: string[], result: string, opts: { tone?: Tone; picture?: string } = {}): A {
  return { type: 'spell', parts, result, tone: opts.tone ?? 'ngang', picture: opts.picture, skill: `tieng:${result}` }
}

export function count(item: string, n: number): A {
  return { type: 'count', item, n, options: near(n, 3), skill: `dem:${n}` }
}

export function make(item: string, n: number): A {
  return { type: 'make', item, n, skill: `dem:${n}` }
}

export function chooseNumber(n: number): A {
  return {
    type: 'choose',
    style: 'number',
    prompt: `Bé hãy chọn số ${numberWord(n)}`,
    options: near(n, 3).map((x) => ({ label: String(x) })),
    answer: String(n),
    skill: `so:${n}`,
  }
}

export function compare(left: number, right: number, item: string, ask: 'more' | 'less' | 'sign'): A {
  return { type: 'compare', left, right, item, ask, skill: ask === 'sign' ? `sosanh:${left}-${right}` : 'nhieu-it' }
}

export function bond(total: number, known: number, item: string): A {
  const other = total - known
  return { type: 'bond', total, known, item, options: near(other, 3, total), skill: `gom:${total}` }
}

// `size` distinct numbers in 0..max including n, close to n so the choice is meaningful.
// Deterministic so the content (and therefore the TTS list) is stable between builds.
function near(n: number, size: number, max = 10): number[] {
  const out = [n]
  for (let d = 1; out.length < size; d++) {
    if (n + d <= max) out.push(n + d)
    if (out.length < size && n - d >= 0) out.push(n - d)
  }
  return shuffle(out)
}

// Deterministic shuffle (seeded by the content) so the answer is not always first.
function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  let seed = [...JSON.stringify(items)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0
    const j = seed % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
