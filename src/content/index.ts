import { Course } from './schema.ts'
import { tiengViet } from './tieng-viet.ts'
import { toan } from './toan.ts'

// Parsing here means a malformed lesson fails at startup (and in tests), not mid-lesson.
export const COURSES: Course[] = [tiengViet, toan].map((c) => Course.parse(c))

export function findCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id)
}

export function findLesson(id: string) {
  for (const course of COURSES) {
    const index = course.lessons.findIndex((l) => l.id === id)
    if (index >= 0) return { course, lesson: course.lessons[index], index }
  }
  return undefined
}
