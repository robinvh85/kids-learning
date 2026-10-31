// Generates an mp3 for every sentence the lessons speak and writes public/audio/manifest.json.
// Only new or changed sentences call the API; files no longer used are deleted.
// Usage: npm run tts:build
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { COURSES } from '../src/content/index.ts'
import { allSpeech } from '../src/content/speech.ts'
import { apiKey, pool, synthesize } from './google-tts.ts'

const OUT = 'public/audio'
const RATE = 0.9

const key = apiKey()
const voice = process.env.TTS_VOICE
if (!voice) {
  console.error('Thiếu TTS_VOICE trong .env.local. Chạy `npm run tts:samples`, nghe ở #/voices rồi chọn một giọng.')
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
const texts = allSpeech(COURSES)
const files: Record<string, string> = {}
for (const text of texts) {
  files[text] = createHash('sha1').update(`${voice}|${RATE}|${text}`).digest('hex').slice(0, 16) + '.mp3'
}

const missing = texts.filter((t) => !existsSync(`${OUT}/${files[t]}`))
console.log(`${texts.length} câu, cần tạo mới ${missing.length} (giọng ${voice})`)

let done = 0
await pool(missing, 4, async (text) => {
  writeFileSync(`${OUT}/${files[text]}`, await synthesize(key, voice, text, RATE))
  if (++done % 25 === 0) console.log(`  ${done}/${missing.length}`)
})

const used = new Set(Object.values(files))
const stale = readdirSync(OUT).filter((f) => f.endsWith('.mp3') && !used.has(f))
stale.forEach((f) => rmSync(`${OUT}/${f}`))

writeFileSync(`${OUT}/manifest.json`, JSON.stringify({ voice, files }, null, 2))
console.log(`Xong. Đã xoá ${stale.length} file không dùng.`)
