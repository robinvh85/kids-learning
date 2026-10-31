import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { COURSES } from '../content/index.ts'
import { navigate } from '../engine/router.ts'
import { dueReviews } from '../engine/review.ts'
import { totalStars, useActiveProfile, useProgress } from '../engine/store.ts'
import { usedSeconds } from '../engine/usage.ts'
import { BigButton, Emoji, Mascot } from '../components/ui.tsx'

const AVATARS = ['🐰', '🐻', '🦊', '🐼', '🐸', '🐯', '🐨', '🦁']

const COURSE_TINT = {
  orange: 'bg-orange-soft border-orange text-orange',
  blue: 'bg-blue-soft border-blue text-blue',
}

export function Home() {
  const profile = useActiveProfile()
  const profiles = useProgress((s) => s.profiles)
  if (!profile) return profiles.length ? <ProfilePicker /> : <FirstRun />
  return <Dashboard />
}

function Dashboard() {
  const profile = useActiveProfile()!
  const results = useProgress((s) => s.results[profile.id])
  const reviews = useProgress((s) => s.reviews[profile.id])
  const dailyMinutes = useProgress((s) => s.settings.dailyMinutes)
  const selectProfile = useProgress((s) => s.selectProfile)
  const due = dueReviews(reviews).length
  const resting = dailyMinutes > 0 && usedSeconds(profile.id) >= dailyMinutes * 60

  if (resting) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
        <Mascot mood="think" className="text-9xl" />
        <p className="text-4xl font-extrabold">Hôm nay bé học chăm lắm rồi!</p>
        <p className="text-2xl text-muted">Mình nghỉ ngơi, mai học tiếp nhé 😴</p>
        <ParentButton />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <button className="flex items-center gap-3 rounded-full bg-card px-4 py-2 border-2 border-line" onClick={() => selectProfile(null)}>
          <Emoji className="text-5xl">{profile.avatar}</Emoji>
          <span className="text-3xl font-extrabold">{profile.name}</span>
        </button>
        <div className="flex items-center gap-2 rounded-full bg-card px-5 py-2 border-2 border-line text-3xl font-extrabold">
          <Emoji>⭐</Emoji> {totalStars(results)}
        </div>
      </header>

      <main className="flex flex-1 flex-wrap items-center justify-center gap-8">
        {COURSES.map((course, i) => (
          <motion.button
            key={course.id}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate({ name: 'course', id: course.id })}
            className={`flex h-64 w-64 flex-col items-center justify-center gap-4 rounded-[3rem] border-4 shadow-[0_10px_0_var(--color-line)] ${COURSE_TINT[course.color]}`}
          >
            <Emoji className="text-[7rem]">{course.icon}</Emoji>
            <span className="text-3xl font-extrabold">{course.title}</span>
          </motion.button>
        ))}
        <motion.button
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          whileTap={{ scale: 0.95 }}
          disabled={due === 0}
          onClick={() => navigate({ name: 'review' })}
          className="relative flex h-64 w-64 flex-col items-center justify-center gap-4 rounded-[3rem] border-4 border-green bg-green-soft text-green shadow-[0_10px_0_var(--color-line)] disabled:opacity-40"
        >
          <Emoji className="text-[7rem]">🎯</Emoji>
          <span className="text-3xl font-extrabold">Ôn tập</span>
          {due > 0 && (
            <span className="absolute -right-2 -top-2 flex h-14 w-14 items-center justify-center rounded-full bg-orange text-2xl font-extrabold text-white">
              {due}
            </span>
          )}
        </motion.button>
      </main>

      <footer className="flex items-end justify-between">
        <Mascot />
        <ParentButton />
      </footer>
    </div>
  )
}

function ProfilePicker() {
  const profiles = useProgress((s) => s.profiles)
  const selectProfile = useProgress((s) => s.selectProfile)
  return (
    <div className="flex h-full flex-col items-center justify-center gap-10 p-6">
      <Mascot className="text-8xl" />
      <div className="flex flex-wrap justify-center gap-6">
        {profiles.map((p) => (
          <motion.button
            key={p.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => selectProfile(p.id)}
            className="flex h-56 w-48 flex-col items-center justify-center gap-3 rounded-[2.5rem] border-4 border-line bg-card shadow-[0_8px_0_var(--color-line)]"
          >
            <Emoji className="text-8xl">{p.avatar}</Emoji>
            <span className="text-3xl font-extrabold">{p.name}</span>
          </motion.button>
        ))}
      </div>
      <ParentButton />
    </div>
  )
}

function FirstRun() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <Mascot className="text-9xl" />
      <h1 className="text-5xl font-extrabold">Bé Học Vui</h1>
      <p className="max-w-xl text-2xl text-muted">Ba mẹ tạo hồ sơ cho bé để bắt đầu nhé.</p>
      <ProfileForm />
      <SignInLink />
    </div>
  )
}

// For a parent setting up a second device: bring back the profiles from the account.
function SignInLink() {
  const signIn = useProgress((s) => s.signIn)
  const [busy, setBusy] = useState(false)
  return (
    <button
      disabled={busy}
      className="text-lg font-bold text-blue underline disabled:opacity-50"
      onClick={async () => {
        setBusy(true)
        try {
          await signIn()
        } catch (e) {
          console.warn(e)
        } finally {
          setBusy(false)
        }
      }}
    >
      {busy ? 'Đang đăng nhập…' : 'Đã có tài khoản? Đăng nhập Google để lấy lại tiến độ'}
    </button>
  )
}

export function ProfileForm({ onDone }: { onDone?: () => void }) {
  const addProfile = useProgress((s) => s.addProfile)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  return (
    <form
      className="flex flex-col items-center gap-5"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!name.trim()) return
        await addProfile(name.trim(), avatar)
        setName('')
        onDone?.()
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tên của bé"
        maxLength={20}
        className="w-80 rounded-2xl border-4 border-line bg-card px-5 py-3 text-3xl font-bold outline-none focus:border-blue select-text"
      />
      <div className="flex flex-wrap justify-center gap-3">
        {AVATARS.map((a) => (
          <button
            type="button"
            key={a}
            onClick={() => setAvatar(a)}
            className={`emoji h-20 w-20 rounded-2xl border-4 text-5xl ${a === avatar ? 'border-orange bg-orange-soft' : 'border-line bg-card'}`}
          >
            {a}
          </button>
        ))}
      </div>
      <BigButton tint="green" type="submit" className="px-10 text-2xl" disabled={!name.trim()}>
        Tạo hồ sơ
      </BigButton>
    </form>
  )
}

// Holding for 2 seconds keeps young children out of the parents' area.
export function ParentButton() {
  const [holding, setHolding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const start = () => {
    setHolding(true)
    timer.current = setTimeout(() => navigate({ name: 'parent' }), 2000)
  }
  const cancel = () => {
    setHolding(false)
    clearTimeout(timer.current)
  }
  return (
    <button
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      className="relative overflow-hidden rounded-full border-2 border-line bg-card px-5 py-3 text-lg font-bold text-muted"
    >
      <motion.span
        className="absolute inset-0 bg-blue-soft"
        initial={false}
        animate={{ scaleX: holding ? 1 : 0 }}
        style={{ originX: 0 }}
        transition={{ duration: holding ? 2 : 0.2, ease: 'linear' }}
      />
      <span className="relative">🔒 Ba mẹ (giữ 2 giây)</span>
    </button>
  )
}
