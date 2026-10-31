import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { ActivityOf, Tone } from '../content/schema.ts'
import { FEEDBACK, promptOf, spellSteps, type SpellLight } from '../content/speech.ts'
import { sfx, speak, speakSteps, stopSpeaking } from '../engine/audio.ts'
import { BigButton, Emoji } from '../components/ui.tsx'
import type { ActivityProps } from './feedback.ts'
import { useSpellPlayback, type Word } from './spellPlayback.ts'

const same = (a: SpellLight, b: SpellLight) => a === b

// Tone marks drawn on their own, as on the textbook's tone cards.
const TONE_SIGNS: Record<Exclude<Tone, 'ngang'>, string> = { huyen: 'ˋ', sac: 'ˊ', hoi: 'ˀ', nga: '˜', nang: '•' }

// The spelling board: [b] [a] ( [◌̀] ) → [bà]. Whatever is being read lights up.
export function SpellBoard({
  word,
  lit,
  pulse,
  onTap,
}: {
  word: Word
  lit: SpellLight[]
  pulse?: SpellLight
  onTap?: (light: SpellLight) => void
}) {
  const tile = (light: SpellLight, label: string, extra = '') => {
    const on = lit.some((l) => same(l, light))
    const hint = pulse !== undefined && same(pulse, light) && !on
    return (
      <motion.button
        key={String(light)}
        disabled={!onTap}
        onClick={() => onTap?.(light)}
        animate={on ? { scale: 1.12, y: -6 } : hint ? { scale: [1, 1.06, 1], transition: { repeat: Infinity, duration: 1.2 } } : { scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={`flex h-36 min-w-32 items-center justify-center rounded-3xl border-4 px-5 font-school text-8xl font-bold transition-colors duration-150 ${
          on ? 'border-orange bg-orange text-white shadow-[0_8px_0_#d96a22]' : hint ? 'border-sun bg-card text-ink' : 'border-line bg-card text-ink'
        } ${extra}`}
      >
        {label}
      </motion.button>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {word.parts.map((p, i) => tile(i, p))}
      {word.tone !== 'ngang' && tile('mark', TONE_SIGNS[word.tone], 'ml-3 font-sans text-9xl leading-none')}
      <span className="mx-2 text-6xl text-muted" aria-hidden>
        ➜
      </span>
      {tile('result', word.result, 'min-w-44')}
    </div>
  )
}

// Watch "bờ – a – ba → ba" once, then tap each part in order to spell it yourself.
export function Spell({ activity, onComplete }: ActivityProps<ActivityOf<'spell'>>) {
  const { lit, setLit, play } = useSpellPlayback(activity)
  const [phase, setPhase] = useState<'watch' | 'tap' | 'done'>('watch')
  const [next, setNext] = useState(0)
  const order: SpellLight[] = [...activity.parts.map((_, i) => i), ...(activity.tone !== 'ngang' ? ['mark' as const] : []), 'result']
  const steps = spellSteps(activity)

  async function watch() {
    setPhase('watch')
    await speak(...promptOf(activity))
    if (!(await play())) return
    setNext(0)
    setPhase('tap')
    speak(FEEDBACK.spellYourTurn)
  }

  useEffect(() => {
    const id = setTimeout(watch, 250)
    return () => {
      clearTimeout(id)
      stopSpeaking()
    }
    // Runs once per activity; watch() only uses the activity it was created with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity])

  // The step that reads a given tile when tapped (the last part also reads the joined syllable).
  async function tap(light: SpellLight) {
    if (phase !== 'tap') return
    const expected = order[next]
    const stepFor = (l: SpellLight) => steps.find((s) => s.light.length === 1 && same(s.light[0], l))!
    if (!same(light, expected)) {
      // Not the next part: just read what was tapped, no penalty.
      setLit([light])
      await speak(stepFor(light).text)
      setLit([])
      return
    }
    const lastPart = typeof light === 'number' && light === activity.parts.length - 1
    const say = lastPart ? [stepFor(light), steps[activity.parts.length]] : [stepFor(light)]
    setNext(next + 1)
    await speakSteps(
      say.map((s) => s.text),
      (i) => setLit(say[i].light),
    )
    setLit([])
    if (light === 'result') {
      setPhase('done')
      setLit(['result'])
      sfx.correct()
      await speak(FEEDBACK.correct[1])
      setTimeout(() => onComplete(true), 500)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      {activity.picture && <Emoji className="text-[7rem]">{activity.picture}</Emoji>}
      <SpellBoard word={activity} lit={lit} pulse={phase === 'tap' ? order[next] : undefined} onTap={phase === 'tap' ? tap : undefined} />
      <div className="flex h-24 items-center gap-4">
        {phase === 'tap' && (
          <BigButton tint="white" className="text-3xl" aria-label="Nghe lại cách đánh vần" onClick={watch}>
            🔁
          </BigButton>
        )}
      </div>
    </div>
  )
}
