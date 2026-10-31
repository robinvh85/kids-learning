import { useEffect, useState } from 'react'

// Hash routes keep the app working as static files and offline, with no server rewrites.
export type Route =
  | { name: 'home' }
  | { name: 'course'; id: string }
  | { name: 'lesson'; id: string }
  | { name: 'review' }
  | { name: 'parent' }
  | { name: 'voices' }

export function parseRoute(hash: string): Route {
  const [name, id] = hash.replace(/^#\/?/, '').split('/')
  if (name === 'course' && id) return { name, id }
  if (name === 'lesson' && id) return { name, id }
  if (name === 'review' || name === 'parent' || name === 'voices') return { name }
  return { name: 'home' }
}

export function href(route: Route): string {
  return 'id' in route ? `#/${route.name}/${route.id}` : route.name === 'home' ? '#/' : `#/${route.name}`
}

export function navigate(route: Route): void {
  window.location.hash = href(route)
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
