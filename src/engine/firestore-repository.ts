import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch, type Firestore } from 'firebase/firestore'
import { emptySnapshot, type LessonResult, type Profile, type ProgressRepository, type ReviewItem, type Settings, type Snapshot, type Upload } from './repository.ts'

// Layout, one tree per signed-in parent (see firestore.rules):
//   parents/{uid}                                  { settings }
//   parents/{uid}/children/{childId}               Profile
//   parents/{uid}/children/{childId}/results/{lessonId}
//   parents/{uid}/children/{childId}/reviews/{skill}
//
// Writes resolve only once the server confirms them, so callers should not await them
// before updating the UI; the local cache already has the change, including offline.
export class FirestoreRepository implements ProgressRepository {
  private readonly db: Firestore
  private readonly uid: string

  constructor(db: Firestore, uid: string) {
    this.db = db
    this.uid = uid
  }

  private parent() {
    return doc(this.db, 'parents', this.uid)
  }

  private child(id: string) {
    return doc(this.db, 'parents', this.uid, 'children', id)
  }

  async loadAll(): Promise<Snapshot> {
    const snapshot = emptySnapshot()
    const [parent, children] = await Promise.all([getDoc(this.parent()), getDocs(collection(this.parent(), 'children'))])
    const settings = parent.data()?.settings as Settings | undefined
    if (settings) snapshot.settings = settings
    await Promise.all(
      children.docs.map(async (c) => {
        snapshot.profiles.push(c.data() as Profile)
        const [results, reviews] = await Promise.all([getDocs(collection(c.ref, 'results')), getDocs(collection(c.ref, 'reviews'))])
        snapshot.results[c.id] = Object.fromEntries(results.docs.map((d) => [d.id, d.data() as LessonResult]))
        snapshot.reviews[c.id] = Object.fromEntries(reviews.docs.map((d) => [d.id, d.data() as ReviewItem]))
      }),
    )
    snapshot.profiles.sort((a, b) => a.createdAt - b.createdAt)
    return snapshot
  }

  async saveProfile(profile: Profile) {
    await setDoc(this.child(profile.id), profile)
  }

  async deleteProfile(profileId: string) {
    const ref = this.child(profileId)
    const [results, reviews] = await Promise.all([getDocs(collection(ref, 'results')), getDocs(collection(ref, 'reviews'))])
    const batch = writeBatch(this.db)
    for (const d of [...results.docs, ...reviews.docs]) batch.delete(d.ref)
    await batch.commit()
    await deleteDoc(ref)
  }

  async saveResult(profileId: string, result: LessonResult) {
    await setDoc(doc(this.child(profileId), 'results', result.lessonId), result)
  }

  async saveReviews(profileId: string, items: ReviewItem[]) {
    const batch = writeBatch(this.db)
    for (const item of items) batch.set(doc(this.child(profileId), 'reviews', item.skill), item)
    await batch.commit()
  }

  async saveSettings(settings: Settings) {
    await setDoc(this.parent(), { settings }, { merge: true })
  }

  async upload(changes: Upload) {
    const writes: [ReturnType<typeof doc>, object][] = []
    for (const p of changes.profiles) writes.push([this.child(p.id), p])
    for (const [pid, results] of Object.entries(changes.results))
      for (const r of results) writes.push([doc(this.child(pid), 'results', r.lessonId), r])
    for (const [pid, reviews] of Object.entries(changes.reviews))
      for (const r of reviews) writes.push([doc(this.child(pid), 'reviews', r.skill), r])
    // A batch holds at most 500 writes.
    for (let i = 0; i < writes.length; i += 400) {
      const batch = writeBatch(this.db)
      for (const [ref, data] of writes.slice(i, i + 400)) batch.set(ref, data)
      await batch.commit()
    }
    if (changes.settings) await this.saveSettings(changes.settings)
  }
}
