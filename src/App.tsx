import { useEffect, useState } from 'react'
import { findCourse, findLesson } from './content/index.ts'
import { loadAudioManifest } from './engine/audio.ts'
import { dueReviews } from './engine/review.ts'
import { navigate, useRoute } from './engine/router.ts'
import { useActiveProfile, useProgress } from './engine/store.ts'
import { CourseMap } from './screens/CourseMap.tsx'
import { Home } from './screens/Home.tsx'
import { Parent } from './screens/Parent.tsx'
import { Player } from './screens/Player.tsx'
import { Voices } from './screens/Voices.tsx'

export default function App() {
  const route = useRoute()
  const ready = useProgress((s) => s.ready)
  const init = useProgress((s) => s.init)
  const profile = useActiveProfile()

  useEffect(() => {
    init()
    loadAudioManifest()
  }, [init])

  if (!ready) return null

  // Parent pages work without a child selected; everything else needs one.
  if (route.name === 'parent') return <Parent />
  if (route.name === 'voices') return <Voices />
  if (!profile || route.name === 'home') return <Home />

  if (route.name === 'course') {
    const course = findCourse(route.id)
    return course ? <CourseMap key={course.id} course={course} /> : <Home />
  }
  if (route.name === 'lesson') return <LessonRoute id={route.id} />
  return <ReviewRoute />
}

function LessonRoute({ id }: { id: string }) {
  const finishLesson = useProgress((s) => s.finishLesson)
  const found = findLesson(id)
  if (!found) return <Home />
  const { course, lesson, index } = found
  const next = course.lessons[index + 1]
  return (
    <Player
      key={lesson.id}
      activities={lesson.activities}
      onFinish={(answers) => finishLesson(lesson.id, answers)}
      onExit={() => navigate({ name: 'course', id: course.id })}
      onNext={next ? () => navigate({ name: 'lesson', id: next.id }) : undefined}
    />
  )
}

function ReviewRoute() {
  const profile = useActiveProfile()!
  const finishReview = useProgress((s) => s.finishReview)
  // Snapshot the due items once so saving answers does not change the running session.
  const [items] = useState(() => dueReviews(useProgress.getState().reviews[profile.id]))
  if (items.length === 0) return <Home />
  return (
    <Player
      activities={items.map((i) => i.activity)}
      onFinish={async (answers) => {
        await finishReview(answers)
        return undefined
      }}
      onExit={() => navigate({ name: 'home' })}
    />
  )
}
