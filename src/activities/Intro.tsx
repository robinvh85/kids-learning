import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { ActivityOf } from '../content/schema.ts'
import { speak, stopSpeaking } from '../engine/audio.ts'
import { BigButton, Emoji, SpeakerButton } from '../components/ui.tsx'
import type { ActivityProps } from './feedback.ts'

export function Intro({ activity, onComplete }: ActivityProps<ActivityOf<'intro'>>) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const id = setTimeout(async () => {
      await speak(...activity.say)
      if (!cancelled) setReady(true)
    }, 250)
    // Never block a child on audio that fails to play.
    const fallback = setTimeout(() => setReady(true), 4000)
    return () => {
      cancelled = true
      clearTimeout(id)
      clearTimeout(fallback)
      stopSpeaking()
    }
  }, [activity])

  const isNumber = /^\d+$/.test(activity.display)

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <motion.button
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => speak(...activity.say)}
        className={`rounded-[3rem] bg-card border-4 border-line px-14 py-6 leading-none font-bold ${
          isNumber ? 'font-sans text-[11rem] text-blue' : 'font-school text-[10rem] text-orange'
        }`}
      >
        {activity.display}
      </motion.button>
      {activity.picture && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <Emoji className={`${activity.picture.length > 4 ? 'text-5xl tracking-widest' : 'text-8xl'}`}>{activity.picture}</Emoji>
        </motion.div>
      )}
      <div className="flex gap-4">
        <SpeakerButton texts={activity.say} />
        <BigButton tint="green" className="text-4xl px-10" disabled={!ready} onClick={() => onComplete(true)} aria-label="Tiếp tục">
          ➡️
        </BigButton>
      </div>
    </div>
  )
}
