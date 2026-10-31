import type { Activity } from '../content/schema.ts'
import { Choose } from './Choose.tsx'
import { Combine } from './Combine.tsx'
import { Intro } from './Intro.tsx'
import { Bond, Compare, Count, Make } from './Numbers.tsx'
import { Spell } from './Spell.tsx'

export function ActivityView({ activity, onComplete }: { activity: Activity; onComplete: (firstTry: boolean) => void }) {
  switch (activity.type) {
    case 'intro':
      return <Intro activity={activity} onComplete={onComplete} />
    case 'choose':
      return <Choose activity={activity} onComplete={onComplete} />
    case 'combine':
      return <Combine activity={activity} onComplete={onComplete} />
    case 'spell':
      return <Spell activity={activity} onComplete={onComplete} />
    case 'count':
      return <Count activity={activity} onComplete={onComplete} />
    case 'make':
      return <Make activity={activity} onComplete={onComplete} />
    case 'compare':
      return <Compare activity={activity} onComplete={onComplete} />
    case 'bond':
      return <Bond activity={activity} onComplete={onComplete} />
  }
}
