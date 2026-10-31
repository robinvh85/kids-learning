import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { Course } from '../content/schema.ts'
import { navigate } from '../engine/router.ts'
import { useActiveProfile, useProgress } from '../engine/store.ts'
import { BackButton, Emoji, Stars } from '../components/ui.tsx'

const NODE = {
  orange: { done: 'bg-orange text-white border-orange', current: 'bg-card text-orange border-orange', text: 'text-orange' },
  blue: { done: 'bg-blue text-white border-blue', current: 'bg-card text-blue border-blue', text: 'text-blue' },
}

// Lessons as stops along a winding path. A lesson opens once the previous one is
// finished; there is no minimum score, weak items come back in review instead.
export function CourseMap({ course }: { course: Course }) {
  const profile = useActiveProfile()
  const results = useProgress((s) => (profile ? s.results[profile.id] : undefined)) ?? {}
  const currentRef = useRef<HTMLDivElement>(null)
  const firstOpen = course.lessons.findIndex((l) => !results[l.id])
  const current = firstOpen === -1 ? course.lessons.length - 1 : firstOpen
  const colors = NODE[course.color]

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
  }, [])

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 p-6">
        <BackButton onClick={() => navigate({ name: 'home' })} />
        <Emoji className="text-5xl">{course.icon}</Emoji>
        <h1 className={`text-4xl font-extrabold ${colors.text}`}>{course.title}</h1>
      </header>
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="relative flex h-full min-w-max items-center gap-6 px-12 pb-10">
          {course.lessons.map((lesson, i) => {
            const result = results[lesson.id]
            const locked = i > current
            const isCurrent = i === current
            const up = i % 2 === 0
            const glyph = /^[\p{L}\d<>]+$/u.test(lesson.icon)
            return (
              <div key={lesson.id} ref={isCurrent ? currentRef : undefined} className={`flex flex-col items-center gap-2 ${up ? '-translate-y-12' : 'translate-y-12'}`}>
                <motion.button
                  whileTap={locked ? undefined : { scale: 0.92 }}
                  animate={isCurrent ? { scale: [1, 1.08, 1] } : undefined}
                  transition={isCurrent ? { repeat: Infinity, duration: 1.6 } : undefined}
                  disabled={locked}
                  onClick={() => navigate({ name: 'lesson', id: lesson.id })}
                  className={`flex h-32 w-32 items-center justify-center rounded-full border-[6px] shadow-[0_8px_0_var(--color-line)] ${
                    locked ? 'border-line bg-line text-muted' : result ? colors.done : colors.current
                  } ${glyph ? 'font-school text-6xl font-bold' : 'text-5xl'}`}
                  aria-label={lesson.title}
                >
                  {locked ? <Emoji>🔒</Emoji> : glyph ? lesson.icon : <Emoji>{lesson.icon}</Emoji>}
                </motion.button>
                <span className="max-w-36 text-center text-lg font-bold text-muted">{lesson.title}</span>
                {result ? <Stars count={result.stars} size="text-2xl" /> : <span className="h-8" />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
