import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { ActivityView } from '../activities/index.tsx'
import type { Activity } from '../content/schema.ts'
import { FEEDBACK } from '../content/speech.ts'
import { sfx, speak, stopSpeaking } from '../engine/audio.ts'
import type { Answer } from '../engine/review.ts'
import { useProgress } from '../engine/store.ts'
import { addSeconds } from '../engine/usage.ts'
import { BackButton, BigButton, Mascot, Stars } from '../components/ui.tsx'

// Plays a list of activities one at a time, then shows the celebration screen.
// Used for both lessons and review sessions.
export function Player({
  activities,
  onFinish,
  onExit,
  onNext,
}: {
  activities: Activity[]
  onFinish: (answers: Answer[]) => Promise<number | undefined>
  onExit: () => void
  onNext?: () => void
}) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [stars, setStars] = useState<number | null>(null)
  const activeId = useProgress((s) => s.activeId)
  const lastTick = useRef(0)

  // Count practice time towards the daily limit.
  useEffect(() => {
    lastTick.current = Date.now()
    const flush = () => {
      if (activeId) addSeconds(activeId, Math.round((Date.now() - lastTick.current) / 1000))
      lastTick.current = Date.now()
    }
    const id = setInterval(flush, 15000)
    return () => {
      clearInterval(id)
      flush()
    }
  }, [activeId])

  async function complete(firstTry: boolean) {
    const next = [...answers, { activity: activities[index], firstTry }]
    setAnswers(next)
    if (index + 1 < activities.length) {
      setIndex(index + 1)
      return
    }
    const earned = await onFinish(next)
    setStars(earned ?? 3)
    sfx.fanfare()
    speak(FEEDBACK.lessonDone)
  }

  if (stars !== null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-8 p-6">
        <Mascot mood="happy" className="text-9xl" />
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
          <Stars count={stars} size="text-8xl" />
        </motion.div>
        <div className="flex gap-5">
          <BigButton tint="white" className="text-4xl" aria-label="Học lại" onClick={() => { setIndex(0); setAnswers([]); setStars(null) }}>
            🔁
          </BigButton>
          <BigButton tint="white" className="text-4xl" aria-label="Về bản đồ" onClick={onExit}>
            🗺️
          </BigButton>
          {onNext && (
            <BigButton tint="green" className="px-10 text-4xl" aria-label="Bài tiếp theo" onClick={onNext}>
              ➡️
            </BigButton>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <BackButton
          onClick={() => {
            stopSpeaking()
            onExit()
          }}
        />
        <div className="h-6 flex-1 overflow-hidden rounded-full bg-line">
          <motion.div className="h-full rounded-full bg-green" animate={{ width: `${(index / activities.length) * 100}%` }} />
        </div>
        <Mascot className="text-5xl" />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          data-step={index}
          className="flex flex-1 flex-col"
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -80, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <ActivityView activity={activities[index]} onComplete={complete} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
