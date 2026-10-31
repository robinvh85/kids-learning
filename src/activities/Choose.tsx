import { motion } from 'motion/react'
import { useState } from 'react'
import type { ActivityOf } from '../content/schema.ts'
import { optionSpeech, promptOf } from '../content/speech.ts'
import { Emoji, SpeakerButton } from '../components/ui.tsx'
import { shake, useFeedback, type ActivityProps } from './feedback.ts'

const LABEL_STYLE = {
  letter: 'font-school text-8xl',
  word: 'font-school text-6xl',
  number: 'font-sans text-8xl',
  picture: 'text-7xl',
}

export function Choose({ activity, onComplete }: ActivityProps<ActivityOf<'choose'>>) {
  const { solved, shakeKey, showHint, correct, wrong } = useFeedback(activity, onComplete)
  const [tapped, setTapped] = useState<string | null>(null)

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="flex items-center gap-6">
        {activity.picture && <Emoji className="text-[8rem]">{activity.picture}</Emoji>}
        <SpeakerButton texts={promptOf(activity)} />
      </div>
      <div className="flex flex-wrap justify-center gap-6">
        {activity.options.map((option) => {
          const isAnswer = option.label === activity.answer
          return (
            <motion.button
              key={option.label}
              whileTap={{ scale: 0.92 }}
              animate={
                solved && isAnswer
                  ? { scale: [1, 1.15, 1] }
                  : showHint && isAnswer
                    ? { scale: [1, 1.06, 1], transition: { repeat: Infinity, duration: 1.2 } }
                    : undefined
              }
              className={`flex h-44 min-w-44 items-center justify-center rounded-[2.5rem] border-4 px-6 font-bold shadow-[0_8px_0_var(--color-line)] ${
                solved && isAnswer ? 'border-green bg-green-soft' : showHint && isAnswer ? 'border-sun bg-card' : 'border-line bg-card'
              } ${LABEL_STYLE[activity.style]}`}
              onClick={() => {
                if (isAnswer) return correct()
                setTapped(option.label)
                wrong(optionSpeech(activity, option.label))
              }}
            >
              <motion.span key={tapped === option.label ? shakeKey : 'still'} animate={tapped === option.label ? shake : undefined}>
                {option.picture ? <Emoji>{option.picture}</Emoji> : option.label}
              </motion.span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
