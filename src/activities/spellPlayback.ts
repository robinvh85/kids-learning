import { useState } from 'react'
import type { Tone } from '../content/schema.ts'
import { spellSteps, type SpellLight } from '../content/speech.ts'
import { speakSteps } from '../engine/audio.ts'

export type Word = { parts: string[]; tone: Tone; result: string }

// Plays the whole spelling on the board, lighting each part as it is read.
export function useSpellPlayback(word: Word) {
  const [lit, setLit] = useState<SpellLight[]>([])
  const steps = spellSteps(word)
  async function play() {
    const finished = await speakSteps(
      steps.map((s) => s.text),
      (i) => setLit(steps[i].light),
    )
    setLit([])
    return finished
  }
  return { lit, setLit, play }
}
