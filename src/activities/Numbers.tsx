import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import type { ActivityOf } from '../content/schema.ts'
import { numberWord, promptOf } from '../content/speech.ts'
import { sfx, speak } from '../engine/audio.ts'
import { BigButton, Emoji, SpeakerButton } from '../components/ui.tsx'
import { shake, useFeedback, type ActivityProps } from './feedback.ts'

// Items laid out in rows of five, like a ten-frame, so quantities can be seen
// at a glance instead of always counted one by one.
export function ItemRows({ item, n, size = 'text-6xl', onTap }: { item: string; n: number; size?: string; onTap?: (i: number) => void }) {
  const rows = [Array.from({ length: Math.min(n, 5) }, (_, i) => i), Array.from({ length: Math.max(0, n - 5) }, (_, i) => i + 5)]
  return (
    <div className="flex min-h-24 flex-col items-center justify-center gap-3">
      {rows
        .filter((r) => r.length)
        .map((row, r) => (
          <div key={r} className="flex gap-3">
            <AnimatePresence>
              {row.map((i) => {
                const pop = { initial: { scale: 0 }, animate: { scale: 1 }, exit: { scale: 0 } }
                // Plain spans when not tappable, so the rows can sit inside a button.
                return onTap ? (
                  <motion.button key={i} {...pop} onClick={() => onTap(i)} className={`emoji ${size}`}>
                    {item}
                  </motion.button>
                ) : (
                  <motion.span key={i} {...pop} className={`emoji ${size}`}>
                    {item}
                  </motion.span>
                )
              })}
            </AnimatePresence>
          </div>
        ))}
    </div>
  )
}

function NumberChoices({
  options,
  answer,
  onPick,
  solved,
  showHint,
  shakeKey,
}: {
  options: number[]
  answer: number
  onPick: (n: number) => void
  solved: boolean
  showHint: boolean
  shakeKey: number
}) {
  const [tapped, setTapped] = useState<number | null>(null)
  return (
    <div className="flex gap-5">
      {options.map((n) => {
        const isAnswer = n === answer
        return (
          <motion.button
            key={n}
            whileTap={{ scale: 0.9 }}
            animate={showHint && isAnswer && !solved ? { scale: [1, 1.08, 1], transition: { repeat: Infinity, duration: 1.2 } } : undefined}
            onClick={() => {
              setTapped(n)
              onPick(n)
            }}
            className={`flex h-32 w-32 items-center justify-center rounded-3xl border-4 text-7xl font-extrabold text-blue shadow-[0_8px_0_var(--color-line)] ${
              solved && isAnswer ? 'border-green bg-green-soft' : showHint && isAnswer ? 'border-sun bg-card' : 'border-line bg-card'
            }`}
          >
            <motion.span key={tapped === n && !isAnswer ? shakeKey : 'still'} animate={tapped === n && !isAnswer ? shake : undefined}>
              {n}
            </motion.span>
          </motion.button>
        )
      })}
    </div>
  )
}

export function Count({ activity, onComplete }: ActivityProps<ActivityOf<'count'>>) {
  const fb = useFeedback(activity, onComplete)
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="flex min-h-56 items-center rounded-[2.5rem] border-4 border-line bg-card px-10 py-6">
        {activity.n === 0 ? <span className="text-3xl text-muted">(không có gì)</span> : <ItemRows item={activity.item} n={activity.n} />}
      </div>
      <div className="flex items-center gap-6">
        <SpeakerButton texts={promptOf(activity)} />
        <NumberChoices
          options={activity.options}
          answer={activity.n}
          solved={fb.solved}
          showHint={fb.showHint}
          shakeKey={fb.shakeKey}
          onPick={(n) => (n === activity.n ? fb.correct() : fb.wrong(numberWord(n)))}
        />
      </div>
    </div>
  )
}

export function Make({ activity, onComplete }: ActivityProps<ActivityOf<'make'>>) {
  const fb = useFeedback(activity, onComplete)
  const [n, setN] = useState(0)
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="flex items-center gap-6">
        <span className="text-8xl font-extrabold text-blue">{activity.n}</span>
        <SpeakerButton texts={promptOf(activity)} />
      </div>
      <div className="flex items-center gap-8">
        <BigButton
          tint="white"
          className="h-40 w-40"
          aria-label="Thêm một"
          disabled={fb.solved || n >= 10}
          onClick={() => {
            setN(n + 1)
            speak(numberWord(n + 1))
          }}
        >
          <Emoji className="text-8xl">{activity.item}</Emoji>
        </BigButton>
        <span className="text-5xl">➡️</span>
        {/* The basket: tap an item to take it back out. */}
        <motion.div
          key={fb.shakeKey}
          animate={fb.shakeKey ? shake : undefined}
          className={`flex min-h-56 min-w-96 items-center justify-center rounded-[2.5rem] border-4 border-dashed px-6 py-4 ${
            fb.solved ? 'border-green bg-green-soft' : 'border-orange bg-orange-soft/50'
          }`}
        >
          {n === 0 ? (
            <Emoji className="text-7xl opacity-30">🧺</Emoji>
          ) : (
            <ItemRows item={activity.item} n={n} size="text-5xl" onTap={fb.solved ? undefined : () => setN(n - 1)} />
          )}
        </motion.div>
      </div>
      <BigButton
        tint="green"
        className="px-12 text-4xl"
        aria-label="Xong"
        disabled={fb.solved || n === 0}
        onClick={() => (n === activity.n ? fb.correct() : fb.wrong(numberWord(n)))}
      >
        ✔️
      </BigButton>
    </div>
  )
}

export function Compare({ activity, onComplete }: ActivityProps<ActivityOf<'compare'>>) {
  const fb = useFeedback(activity, onComplete)
  const { left, right, ask, item } = activity
  const truth = left > right ? 'gt' : left < right ? 'lt' : 'eq'

  if (ask === 'sign') {
    const signs = [
      { key: 'gt', label: '>', say: 'lớn hơn' },
      { key: 'lt', label: '<', say: 'bé hơn' },
      { key: 'eq', label: '=', say: 'bằng' },
    ]
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="flex items-center gap-6">
          <Side n={left} item={item} showNumber />
          <div className="flex h-32 w-32 items-center justify-center rounded-3xl border-4 border-dashed border-orange text-8xl font-extrabold text-orange">
            {fb.solved ? signs.find((s) => s.key === truth)!.label : '?'}
          </div>
          <Side n={right} item={item} showNumber />
        </div>
        <div className="flex items-center gap-5">
          <SpeakerButton texts={promptOf(activity)} />
          {signs.map((s) => (
            <BigButton
              key={s.key}
              tint="white"
              className={`h-28 w-28 text-7xl ${fb.showHint && s.key === truth ? 'border-sun!' : ''}`}
              disabled={fb.solved}
              onClick={() => (s.key === truth ? fb.correct() : fb.wrong(s.say))}
            >
              {s.label}
            </BigButton>
          ))}
        </div>
      </div>
    )
  }

  // more / less: tap the side, or "bằng nhau" when both have the same amount.
  const winner = truth === 'eq' ? 'eq' : (ask === 'more') === (truth === 'gt') ? 'left' : 'right'
  const pick = (side: 'left' | 'right' | 'eq') => (side === winner ? fb.correct() : fb.wrong())

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="flex items-stretch gap-6">
        {(['left', 'right'] as const).map((side) => (
          <motion.button
            key={side}
            whileTap={{ scale: 0.96 }}
            disabled={fb.solved}
            onClick={() => pick(side)}
            className={`flex min-h-56 min-w-80 items-center justify-center rounded-[2.5rem] border-4 px-6 py-6 ${
              fb.solved && winner === side ? 'border-green bg-green-soft' : fb.showHint && winner === side ? 'border-sun bg-card' : 'border-line bg-card'
            }`}
          >
            <ItemRows item={item} n={side === 'left' ? left : right} size="text-6xl" />
          </motion.button>
        ))}
      </div>
      <div className="flex items-center gap-5">
        <SpeakerButton texts={promptOf(activity)} />
        <BigButton
          tint="white"
          className={`px-8 text-3xl ${fb.showHint && winner === 'eq' ? 'border-sun!' : ''}`}
          disabled={fb.solved}
          onClick={() => {
            sfx.tap()
            pick('eq')
          }}
        >
          🟰 Bằng nhau
        </BigButton>
      </div>
    </div>
  )
}

function Side({ n, item, showNumber }: { n: number; item: string; showNumber?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[2.5rem] border-4 border-line bg-card px-6 py-4">
      <ItemRows item={item} n={n} size="text-4xl" />
      {showNumber && <span className="text-7xl font-extrabold text-blue">{n}</span>}
    </div>
  )
}

// Number bond ("mấy và mấy"): the whole splits into a known part and a missing part.
export function Bond({ activity, onComplete }: ActivityProps<ActivityOf<'bond'>>) {
  const fb = useFeedback(activity, onComplete)
  const other = activity.total - activity.known
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center">
        <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-blue bg-card text-7xl font-extrabold text-blue">
          {activity.total}
        </div>
        <svg width="320" height="50" aria-hidden>
          <line x1="160" y1="0" x2="60" y2="50" stroke="var(--color-blue)" strokeWidth="5" />
          <line x1="160" y1="0" x2="260" y2="50" stroke="var(--color-blue)" strokeWidth="5" />
        </svg>
        <div className="flex gap-24">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-orange bg-card text-7xl font-extrabold text-orange">
              {activity.known}
            </div>
            <ItemRows item={activity.item} n={activity.known} size="text-3xl" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div
              className={`flex h-28 w-28 items-center justify-center rounded-full border-4 border-dashed text-7xl font-extrabold ${
                fb.solved ? 'border-green bg-green-soft text-green' : 'border-orange bg-card text-orange'
              }`}
            >
              {fb.solved ? other : '?'}
            </div>
            <div className={fb.solved ? '' : 'opacity-25 grayscale'}>
              <ItemRows item={activity.item} n={other} size="text-3xl" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <SpeakerButton texts={promptOf(activity)} />
        <NumberChoices
          options={activity.options}
          answer={other}
          solved={fb.solved}
          showHint={fb.showHint}
          shakeKey={fb.shakeKey}
          onPick={(n) => (n === other ? fb.correct() : fb.wrong(numberWord(n)))}
        />
      </div>
    </div>
  )
}

// Addition "a + b = ?". Story styles show the two groups (side by side for "gộp lại",
// the second group arriving for "thêm vào"); "picture" puts the items under each number.
export function Add({ activity, onComplete }: ActivityProps<ActivityOf<'add'>>) {
  const fb = useFeedback(activity, onComplete)
  const { a, b, item, style } = activity
  const sum = a + b
  const group = (n: number, arrive = false) => (
    <motion.div
      initial={arrive ? { opacity: 0, x: 80 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: arrive ? 1 : 0, duration: 0.6 }}
      className="flex min-h-40 min-w-40 items-center justify-center rounded-[2rem] border-4 border-line bg-card px-4 py-3"
    >
      {n === 0 ? <span className="text-2xl text-muted">(không có gì)</span> : <ItemRows item={item!} n={n} size="text-5xl" />}
    </motion.div>
  )
  const num = (n: number) => <span className="w-20 text-center text-8xl font-extrabold text-blue">{n}</span>
  const sign = (s: string) => <span className="text-7xl font-extrabold text-orange">{s}</span>
  const answerBox = (
    <div
      className={`flex h-32 w-32 items-center justify-center rounded-3xl border-4 border-dashed text-8xl font-extrabold ${
        fb.solved ? 'border-green bg-green-soft text-green' : 'border-orange bg-card text-orange'
      }`}
    >
      {fb.solved ? sum : '?'}
    </div>
  )

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      {(style === 'join' || style === 'more') && (
        <div className="flex items-center gap-4">
          {group(a)}
          {sign('+')}
          {group(b, style === 'more')}
        </div>
      )}
      {style === 'picture' ? (
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-3">
            {num(a)}
            {group(a)}
          </div>
          <div className="pt-2">{sign('+')}</div>
          <div className="flex flex-col items-center gap-3">
            {num(b)}
            {group(b)}
          </div>
          <div className="pt-2">{sign('=')}</div>
          {answerBox}
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {num(a)}
          {sign('+')}
          {num(b)}
          {sign('=')}
          {answerBox}
        </div>
      )}
      <div className="flex items-center gap-6">
        <SpeakerButton texts={promptOf(activity)} />
        <NumberChoices
          options={activity.options}
          answer={sum}
          solved={fb.solved}
          showHint={fb.showHint}
          shakeKey={fb.shakeKey}
          onPick={(n) => (n === sum ? fb.correct() : fb.wrong(numberWord(n)))}
        />
      </div>
    </div>
  )
}
