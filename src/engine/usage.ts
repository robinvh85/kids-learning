// Minutes of practice per child per day, for the parent's daily limit.
// Kept on this device only: it is a gentle nudge, not a strict control.
const key = (profileId: string) => `kids-learning:usage:${profileId}:${new Date().toISOString().slice(0, 10)}`

export function usedSeconds(profileId: string): number {
  try {
    return Number(localStorage.getItem(key(profileId)) ?? 0)
  } catch {
    return 0
  }
}

export function addSeconds(profileId: string, seconds: number): void {
  try {
    localStorage.setItem(key(profileId), String(usedSeconds(profileId) + seconds))
  } catch {
    // Not critical.
  }
}
