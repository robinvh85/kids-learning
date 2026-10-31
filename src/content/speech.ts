// Every sentence the app can speak is built here, so the UI and the TTS build
// script (scripts/tts-build.ts) produce exactly the same strings.
import { TONES, type Activity, type ActivityOf, type Course, type Tone } from './schema.ts'

// Sounds (âm) as taught in grade 1, not letter names: "bờ", not "bê".
const SOUNDS: Record<string, string> = {
  b: 'bờ', c: 'cờ', ch: 'chờ', d: 'dờ', đ: 'đờ', g: 'gờ', gh: 'gờ', gi: 'di',
  h: 'hờ', k: 'ca', kh: 'khờ', l: 'lờ', m: 'mờ', n: 'nờ', ng: 'ngờ', ngh: 'ngờ',
  nh: 'nhờ', p: 'pờ', ph: 'phờ', q: 'cu', qu: 'quờ', r: 'rờ', s: 'sờ', t: 'tờ',
  th: 'thờ', tr: 'trờ', v: 'vờ', x: 'xờ', y: 'i dài',
  ă: 'á', â: 'ớ',
}

export function soundOf(part: string): string {
  const key = part.toLowerCase()
  return SOUNDS[key] ?? key
}

export const TONE_NAMES: Record<Tone, string> = {
  ngang: 'thanh ngang',
  huyen: 'huyền',
  sac: 'sắc',
  hoi: 'hỏi',
  nga: 'ngã',
  nang: 'nặng',
}

export const TONE_MARKS: Record<Tone, string> = {
  ngang: '',
  huyen: '̀',
  sac: '́',
  hoi: '̉',
  nga: '̃',
  nang: '̣',
}

const NUMBER_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười']

export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n)
}

// Objects used in the maths lessons: emoji → spoken name with its classifier.
export const ITEMS: Record<string, string> = {
  '🍎': 'quả táo',
  '🐟': 'con cá',
  '🌸': 'bông hoa',
  '⭐': 'ngôi sao',
  '🐥': 'chú gà con',
  '🍌': 'quả chuối',
  '🎈': 'quả bóng bay',
  '🚗': 'chiếc ô tô',
  '🐶': 'chú chó',
  '🐱': 'chú mèo',
  '🦋': 'con bướm',
  '🍓': 'quả dâu',
}

export function itemName(item: string): string {
  const name = ITEMS[item]
  if (!name) throw new Error(`Unknown item ${item}: add it to ITEMS`)
  return name
}

export const FEEDBACK = {
  correct: ['Đúng rồi!', 'Giỏi quá!', 'Tuyệt vời!', 'Bé làm tốt lắm!'],
  wrong: ['Thử lại nhé!', 'Chưa đúng rồi, bé thử lại nào!'],
  lessonDone: 'Bé đã học xong bài này. Hoan hô bé!',
  traceDone: 'Bé tô đẹp quá!',
  traceMessy: 'Bé tô theo nét chữ nhé!',
  spellYourTurn: 'Bây giờ bé chạm vào từng chữ để đánh vần nhé!',
} as const

const MARKS = /[\u0300\u0301\u0303\u0309\u0323]/

// Put another tone on a syllable, in the same position as the original mark.
export function withTone(result: string, tone: Tone): string {
  const nfd = result.normalize('NFD')
  const at = nfd.search(MARKS)
  if (at < 0) return result
  return (nfd.slice(0, at) + TONE_MARKS[tone] + nfd.slice(at + 1)).normalize('NFC')
}

// Order the tone marks are taught in Tiếng Việt 1 (Kết nối tri thức): bài 2, 3, 6, 7, 9.
const TONE_ORDER: Tone[] = ['huyen', 'sac', 'hoi', 'nang', 'nga']

// Choices for the tone step of "combine": no mark, the answer, and the tone taught just
// before it, so a child is never asked about a mark they have not learned yet.
export function toneChoices(answer: Tone): Tone[] {
  const previous = TONE_ORDER[TONE_ORDER.indexOf(answer) - 1]
  const choices: Tone[] = ['ngang', answer, ...(previous ? [previous] : [])]
  return choices.sort((a, b) => TONES.indexOf(a) - TONES.indexOf(b))
}

// What lights up on the spelling board while a step is read.
export type SpellLight = number | 'mark' | 'result'
export type SpellStep = { text: string; light: SpellLight[] }

// "bờ – a – ba → ba" or "bờ – a – ba – huyền → bà". Each step is a separate
// recording so the board can light up exactly the part being read.
export function spellSteps(a: { parts: string[]; tone: Tone; result: string }): SpellStep[] {
  const steps: SpellStep[] = a.parts.map((p, i) => ({ text: soundOf(p), light: [i] }))
  steps.push({ text: a.parts.join(''), light: a.parts.map((_, i) => i) })
  if (a.tone !== 'ngang') steps.push({ text: TONE_NAMES[a.tone], light: ['mark'] })
  steps.push({ text: a.result, light: ['result'] })
  return steps
}

export function promptOf(a: Activity): string[] {
  switch (a.type) {
    case 'intro':
      return a.say
    case 'choose':
      return [a.prompt]
    case 'combine':
      return [`Bé hãy ghép tiếng ${a.result}`]
    case 'spell':
      return [`Mình cùng đánh vần tiếng ${a.result} nhé`]
    case 'trace':
      return /\d/.test(a.char) ? [`Bé hãy tô số ${numberWord(Number(a.char))}`] : [`Bé hãy tô chữ ${soundOf(a.char)}`]
    case 'count':
      return [`Có bao nhiêu ${itemName(a.item)}?`]
    case 'make':
      return [`Bé hãy lấy ${numberWord(a.n)} ${itemName(a.item)} bỏ vào giỏ`]
    case 'compare':
      if (a.ask === 'more') return [`Bên nào có nhiều ${itemName(a.item)} hơn?`]
      if (a.ask === 'less') return [`Bên nào có ít ${itemName(a.item)} hơn?`]
      return ['Bé chọn dấu đúng nhé: lớn hơn, bé hơn, hay bằng nhau?']
    case 'bond':
      return [`${capitalize(numberWord(a.total))} gồm ${numberWord(a.known)} và mấy?`]
  }
}

// What is said after the child answers correctly, reinforcing the concept.
export function explainOf(a: Activity): string | undefined {
  switch (a.type) {
    case 'count':
      return `${capitalize(numberWord(a.n))} ${itemName(a.item)}`
    case 'compare':
      if (a.ask === 'sign') return compareSentence(a.left, a.right)
      if (a.left === a.right) return 'Hai bên bằng nhau'
      return `Bên ${(a.ask === 'more') === a.left > a.right ? 'trái' : 'phải'} có ${a.ask === 'more' ? 'nhiều' : 'ít'} hơn`
    case 'bond':
      return `${capitalize(numberWord(a.total))} gồm ${numberWord(a.known)} và ${numberWord(a.total - a.known)}`
    default:
      return undefined
  }
}

export function compareSentence(left: number, right: number): string {
  const l = capitalize(numberWord(left))
  const r = numberWord(right)
  if (left > right) return `${l} lớn hơn ${r}`
  if (left < right) return `${l} bé hơn ${r}`
  return `${l} bằng ${r}`
}

// Words read aloud when the child taps a choice (letters, words, numbers).
export function optionSpeech(a: ActivityOf<'choose'>, label: string): string {
  if (a.style === 'letter') return soundOf(label)
  if (a.style === 'number') return numberWord(Number(label))
  return label
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Every string any lesson may speak, used by the TTS build script.
export function allSpeech(courses: Course[]): string[] {
  const out = new Set<string>()
  const add = (s: string | undefined) => s && out.add(s)
  for (const list of Object.values(FEEDBACK)) (Array.isArray(list) ? list : [list]).forEach(add)
  for (let n = 0; n <= 10; n++) add(numberWord(n))
  for (const course of courses) {
    add(course.title)
    for (const lesson of course.lessons) {
      for (const a of lesson.activities) {
        promptOf(a).forEach(add)
        add(explainOf(a))
        if (a.type === 'choose') a.options.forEach((o) => add(optionSpeech(a, o.label)))
        if (a.type === 'combine' || a.type === 'spell') spellSteps(a).forEach((s) => add(s.text))
        if (a.type === 'combine') {
          a.extra.forEach((p) => add(soundOf(p)))
          if (a.tone !== 'ngang') toneChoices(a.tone).forEach((t) => add(withTone(a.result, t)))
        }
        if (a.type === 'compare' && a.ask === 'sign') ['lớn hơn', 'bé hơn', 'bằng'].forEach(add)
      }
    }
  }
  return [...out]
}
