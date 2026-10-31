import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { ActivityOf } from '../content/schema.ts'
import { promptOf, soundOf, spellText, toneChoices, withTone } from '../content/speech.ts'
import { speak } from '../engine/audio.ts'
import { Emoji, SpeakerButton } from '../components/ui.tsx'
import { shake, useFeedback, type ActivityProps } from './feedback.ts'

// The child taps the sounds in order to build the syllable (b + a = ba),
// then picks the tone mark if there is one (ba + huyền = bà).
export function Combine({ activity, onComplete }: ActivityProps<ActivityOf<'combine'>>) {
  const { solved, shakeKey, showHint, correct, wrong } = useFeedback(activity, onComplete)
  const [placed, setPlaced] = useState(0)
  const [wrongTile, setWrongTile] = useState<number | null>(null)
  const tiles = useMemo(() => {
    const all = [...activity.parts, ...activity.extra]
    return all.map((label, i) => ({ label, id: i })).sort((a, b) => (a.label < b.label ? -1 : 1))
  }, [activity])

  const base = activity.parts.join('')
  const needsTone = activity.tone !== 'ngang'
  const partsDone = placed >= activity.parts.length
  const expected = activity.parts[placed]
  const [usedIds, setUsedIds] = useState<number[]>([])

  function tapTile(tile: { label: string; id: number }) {
    if (partsDone || usedIds.includes(tile.id)) return
    if (tile.label === expected) {
      setUsedIds([...usedIds, tile.id])
      const next = placed + 1
      setPlaced(next)
      if (next === activity.parts.length) {
        if (needsTone) speak(soundOf(tile.label), base)
        else correct(spellText(activity))
      } else {
        speak(soundOf(tile.label))
      }
    } else {
      setWrongTile(tile.id)
      wrong(soundOf(tile.label))
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="flex items-center gap-6">
        {activity.picture && <Emoji className="text-[7rem]">{activity.picture}</Emoji>}
        <SpeakerButton texts={promptOf(activity)} />
      </div>

      <div className="flex items-end gap-3">
        {activity.parts.map((part, i) => (
          <div
            key={i}
            className={`flex h-36 min-w-32 items-center justify-center rounded-3xl border-4 border-dashed px-4 font-school text-8xl font-bold ${
              i < placed ? 'border-orange bg-orange-soft text-ink' : 'border-line bg-card/60 text-transparent'
            }`}
          >
            {i < placed ? part : '·'}
          </div>
        ))}
        {needsTone && partsDone && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`ml-4 flex h-36 items-center rounded-3xl border-4 px-6 font-school text-8xl font-bold ${
              solved ? 'border-green bg-green-soft' : 'border-line bg-card'
            }`}
          >
            {solved ? activity.result : base}
          </motion.div>
        )}
      </div>

      {!partsDone && (
        <div className="flex flex-wrap justify-center gap-5">
          {tiles.map((tile) => {
            const used = usedIds.includes(tile.id)
            const hint = showHint && tile.label === expected && !used
            return (
              <motion.button
                key={tile.id}
                whileTap={{ scale: 0.9 }}
                animate={hint ? { scale: [1, 1.08, 1], transition: { repeat: Infinity, duration: 1.2 } } : undefined}
                disabled={used}
                onClick={() => tapTile(tile)}
                className={`flex h-32 min-w-32 items-center justify-center rounded-3xl border-4 px-4 font-school text-7xl font-bold shadow-[0_8px_0_var(--color-line)] disabled:opacity-25 ${
                  hint ? 'border-sun bg-card' : 'border-line bg-card'
                }`}
              >
                <motion.span key={wrongTile === tile.id ? shakeKey : 'still'} animate={wrongTile === tile.id ? shake : undefined}>
                  {tile.label}
                </motion.span>
              </motion.button>
            )
          })}
        </div>
      )}

      {needsTone && partsDone && !solved && (
        <div className="flex flex-wrap justify-center gap-5">
          {toneChoices(activity.tone).map((tone) => {
            const isAnswer = tone === activity.tone
            const syllable = withTone(activity.result, tone)
            return (
              <motion.button
                key={tone}
                whileTap={{ scale: 0.9 }}
                animate={showHint && isAnswer ? { scale: [1, 1.08, 1], transition: { repeat: Infinity, duration: 1.2 } } : undefined}
                onClick={() => (isAnswer ? correct(spellText(activity)) : wrong(syllable))}
                className={`flex h-32 min-w-32 items-center justify-center rounded-3xl border-4 px-5 font-school text-7xl font-bold shadow-[0_8px_0_var(--color-line)] ${
                  showHint && isAnswer ? 'border-sun bg-card' : 'border-line bg-card'
                }`}
              >
                {syllable}
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
