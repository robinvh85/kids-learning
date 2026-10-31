import { useEffect, useRef, useState } from 'react'
import type { Activity } from '../content/schema.ts'
import { explainOf, FEEDBACK, promptOf } from '../content/speech.ts'
import { sfx, speak, stopSpeaking } from '../engine/audio.ts'

export type ActivityProps<T extends Activity = Activity> = {
  activity: T
  onComplete: (firstTry: boolean) => void
}

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

// Shared answer flow for every activity: speak the prompt on mount, celebrate and
// explain on a right answer, encourage on a wrong one, and show a hint after two misses.
export function useFeedback(activity: Activity, onComplete: (firstTry: boolean) => void) {
  const [mistakes, setMistakes] = useState(0)
  const [solved, setSolved] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const done = useRef(false)

  useEffect(() => {
    const id = setTimeout(() => speak(...promptOf(activity)), 250)
    return () => {
      clearTimeout(id)
      stopSpeaking()
    }
  }, [activity])

  async function correct(extra?: string) {
    if (done.current) return
    done.current = true
    setSolved(true)
    sfx.correct()
    const started = Date.now()
    await speak(pick(FEEDBACK.correct), extra ?? explainOf(activity))
    // Leave a moment to enjoy the success even when no audio played.
    const wait = Math.max(0, 900 - (Date.now() - started))
    setTimeout(() => onComplete(mistakes === 0), wait)
  }

  function wrong(said?: string) {
    if (done.current) return
    sfx.wrong()
    setMistakes((m) => m + 1)
    setShakeKey((k) => k + 1)
    speak(said, pick(FEEDBACK.wrong))
  }

  return { mistakes, solved, shakeKey, showHint: mistakes >= 2, correct, wrong }
}

export const shake = { x: [0, -14, 14, -10, 10, 0], transition: { duration: 0.4 } }
