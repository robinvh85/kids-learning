import { useState } from 'react'
import { COURSES } from '../content/index.ts'
import { navigate } from '../engine/router.ts'
import { totalStars, useProgress } from '../engine/store.ts'
import { usedSeconds } from '../engine/usage.ts'
import { BackButton, Emoji, Stars } from '../components/ui.tsx'
import { ProfileForm } from './Home.tsx'

const SKILL_LABELS: Record<string, string> = {
  am: 'âm', tieng: 'tiếng', thanh: 'dấu', viet: 'tô chữ', 'viet-so': 'tô số',
  so: 'số', dem: 'đếm', sosanh: 'so sánh', gom: 'tách số',
}
const TONE_LABELS: Record<string, string> = { huyen: 'huyền', sac: 'sắc', hoi: 'hỏi', nga: 'ngã', nang: 'nặng' }

function skillLabel(skill: string): string {
  if (skill === 'nhieu-it') return 'nhiều hơn / ít hơn'
  const [kind, value = ''] = skill.split(':')
  const shown = kind === 'thanh' ? TONE_LABELS[value] ?? value : kind === 'sosanh' ? value.replace('-', ' và ') : value
  return `${SKILL_LABELS[kind] ?? kind} ${shown}`
}

export function Parent() {
  const profiles = useProgress((s) => s.profiles)
  const results = useProgress((s) => s.results)
  const reviews = useProgress((s) => s.reviews)
  const settings = useProgress((s) => s.settings)
  const updateSettings = useProgress((s) => s.updateSettings)
  const removeProfile = useProgress((s) => s.removeProfile)
  const [adding, setAdding] = useState(false)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6 text-lg">
        <header className="flex items-center gap-4">
          <BackButton onClick={() => navigate({ name: 'home' })} />
          <h1 className="text-3xl font-extrabold">Khu vực ba mẹ</h1>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-extrabold">Hồ sơ của bé</h2>
          {profiles.map((p) => {
            const weak = Object.values(reviews[p.id] ?? {})
              .filter((r) => r.lapses > 0)
              .sort((a, b) => b.lapses - a.lapses)
              .slice(0, 6)
            return (
              <div key={p.id} className="flex flex-col gap-4 rounded-3xl border-2 border-line bg-card p-5">
                <div className="flex items-center gap-4">
                  <Emoji className="text-5xl">{p.avatar}</Emoji>
                  <div className="flex-1">
                    <div className="text-2xl font-extrabold">{p.name}</div>
                    <div className="text-muted">
                      ⭐ {totalStars(results[p.id])} · Hôm nay học {Math.round(usedSeconds(p.id) / 60)} phút
                    </div>
                  </div>
                  <button
                    className="rounded-xl border-2 border-line px-3 py-2 text-base text-muted"
                    onClick={() => confirm(`Xoá hồ sơ ${p.name} và toàn bộ tiến độ?`) && removeProfile(p.id)}
                  >
                    Xoá
                  </button>
                </div>
                {COURSES.map((course) => (
                  <div key={course.id}>
                    <div className="mb-2 font-bold">
                      {course.icon} {course.title}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {course.lessons.map((l) => {
                        const r = results[p.id]?.[l.id]
                        return (
                          <div key={l.id} title={l.source} className={`rounded-xl border-2 px-3 py-1 text-base ${r ? 'border-green bg-green-soft' : 'border-line text-muted'}`}>
                            {l.title} {r && <Stars count={r.stars} size="text-sm" />}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {weak.length > 0 && (
                  <div>
                    <div className="mb-2 font-bold">Bé hay nhầm</div>
                    <div className="flex flex-wrap gap-2">
                      {weak.map((w) => (
                        <span key={w.skill} className="rounded-xl bg-red-soft px-3 py-1 text-base">
                          {skillLabel(w.skill)} ({w.lapses} lần)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {adding ? (
            <div className="rounded-3xl border-2 border-line bg-card p-5">
              <ProfileForm onDone={() => setAdding(false)} />
            </div>
          ) : (
            <button className="self-start rounded-2xl border-2 border-dashed border-line px-5 py-3 font-bold" onClick={() => setAdding(true)}>
              ➕ Thêm bé
            </button>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-extrabold">Thời gian học mỗi ngày</h2>
          <div className="flex flex-wrap gap-3">
            {[10, 15, 20, 30, 0].map((m) => (
              <button
                key={m}
                onClick={() => updateSettings({ ...settings, dailyMinutes: m })}
                className={`rounded-2xl border-2 px-5 py-3 font-bold ${settings.dailyMinutes === m ? 'border-blue bg-blue-soft' : 'border-line bg-card'}`}
              >
                {m === 0 ? 'Không giới hạn' : `${m} phút`}
              </button>
            ))}
          </div>
          <p className="text-base text-muted">Hết giờ, bé sẽ thấy màn hình nghỉ ngơi. Thời gian được đếm riêng trên từng máy.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-extrabold">Giọng đọc</h2>
          <a href="#/voices" className="self-start rounded-2xl border-2 border-line bg-card px-5 py-3 font-bold">
            🎧 Nghe thử các giọng Google TTS
          </a>
        </section>
      </div>
    </div>
  )
}
