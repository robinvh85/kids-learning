import { z } from 'zod'

export const TONES = ['ngang', 'huyen', 'sac', 'hoi', 'nga', 'nang'] as const
export const Tone = z.enum(TONES)
export type Tone = z.infer<typeof Tone>

// A picture is an emoji for now; later it can become a path to an SVG illustration.
const Picture = z.string().min(1)

const Option = z.object({
  label: z.string().min(1),
  picture: Picture.optional(),
})

// "skill" is the key the review queue tracks, e.g. "am:b" or "cong:3+2".
const base = {
  skill: z.string().optional(),
}

export const IntroActivity = z.object({
  ...base,
  type: z.literal('intro'),
  display: z.string(),
  picture: Picture.optional(),
  say: z.array(z.string()).min(1),
})

export const ChooseActivity = z.object({
  ...base,
  type: z.literal('choose'),
  prompt: z.string(),
  picture: Picture.optional(),
  options: z.array(Option).min(2).max(4),
  answer: z.string(),
  style: z.enum(['letter', 'word', 'number', 'picture']),
})

export const CombineActivity = z.object({
  ...base,
  type: z.literal('combine'),
  parts: z.array(z.string()).min(2),
  extra: z.array(z.string()).default([]),
  tone: Tone.default('ngang'),
  result: z.string(),
  picture: Picture.optional(),
})

// Watch and listen: "bờ – a – ba → ba", each part lighting up as it is read,
// then the child taps along to spell it themselves.
export const SpellActivity = z.object({
  ...base,
  type: z.literal('spell'),
  parts: z.array(z.string()).min(2),
  tone: Tone.default('ngang'),
  result: z.string(),
  picture: Picture.optional(),
})

export const TraceActivity = z.object({
  ...base,
  type: z.literal('trace'),
  char: z.string().min(1).max(2),
})

export const CountActivity = z.object({
  ...base,
  type: z.literal('count'),
  item: z.string(),
  n: z.number().int().min(0).max(10),
  options: z.array(z.number().int()).min(2).max(4),
})

export const MakeActivity = z.object({
  ...base,
  type: z.literal('make'),
  item: z.string(),
  n: z.number().int().min(1).max(10),
})

export const CompareActivity = z.object({
  ...base,
  type: z.literal('compare'),
  left: z.number().int().min(0).max(10),
  right: z.number().int().min(0).max(10),
  item: z.string(),
  ask: z.enum(['more', 'less', 'sign']),
})

export const BondActivity = z.object({
  ...base,
  type: z.literal('bond'),
  total: z.number().int().min(2).max(10),
  known: z.number().int().min(0).max(10),
  item: z.string(),
  options: z.array(z.number().int()).min(2).max(4),
})

export const Activity = z.discriminatedUnion('type', [
  IntroActivity,
  ChooseActivity,
  CombineActivity,
  SpellActivity,
  TraceActivity,
  CountActivity,
  MakeActivity,
  CompareActivity,
  BondActivity,
])
export type Activity = z.infer<typeof Activity>
export type ActivityOf<T extends Activity['type']> = Extract<Activity, { type: T }>

export const Lesson = z.object({
  id: z.string(),
  title: z.string(),
  // Where the lesson comes from in the Kết nối tri thức textbook, e.g. "Tiếng Việt 1 – Bài 2".
  source: z.string(),
  icon: z.string(),
  activities: z.array(Activity).min(1),
})
export type Lesson = z.infer<typeof Lesson>

export const Course = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string(),
  color: z.enum(['orange', 'blue']),
  lessons: z.array(Lesson).min(1),
})
export type Course = z.infer<typeof Course>
export type CourseInput = z.input<typeof Course>
