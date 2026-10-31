// Generates the same hard sentences in every Vietnamese voice so a voice can be chosen
// by ear on the #/voices page. Usage: npm run tts:samples
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { apiKey, listVoices, pool, synthesize } from './google-tts.ts'

const OUT = 'public/audio/samples'
const SAMPLES = [
  'ba, bà, bá, bả, bã, bạ',
  'a',
  'ơ',
  'ư',
  'ê',
  'bờ',
  'cờ',
  'ca',
  'bờ, a, ba, huyền, bà',
  'cờ, a, ca, sắc, cá',
  'đờ, ô, đô, ngã, đỗ',
  'Đây là dấu hỏi',
  'Bé hãy chọn chữ bờ',
  'Bé hãy ghép tiếng cỏ',
  'Có bao nhiêu quả táo?',
  'Năm gồm hai và mấy?',
  'Bốn lớn hơn hai',
  'Đúng rồi! Giỏi quá!',
  'Thử lại nhé!',
]

const key = apiKey()
const voices = await listVoices(key)
console.log(`Tìm thấy ${voices.length} giọng vi-VN: ${voices.map((v) => v.name).join(', ')}`)

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const manifest = { generatedAt: new Date().toISOString(), samples: SAMPLES, voices: [] as { name: string; files: string[] }[] }
const failed: string[] = []

for (const voice of voices) {
  const files = SAMPLES.map((_, i) => `${voice.name}-${String(i).padStart(2, '0')}.mp3`)
  try {
    await pool(
      SAMPLES.map((text, i) => ({ text, file: files[i] })),
      4,
      async ({ text, file }) => writeFileSync(`${OUT}/${file}`, await synthesize(key, voice.name, text, 0.9)),
    )
    manifest.voices.push({ name: voice.name, files })
    console.log(`✓ ${voice.name}`)
  } catch (e) {
    failed.push(voice.name)
    console.warn(`✗ ${voice.name}: ${(e as Error).message.slice(0, 200)}`)
  }
}

writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2))
console.log(`\nXong ${manifest.voices.length} giọng. Mở http://localhost:5173/#/voices để nghe thử.`)
if (failed.length) console.log(`Bỏ qua: ${failed.join(', ')}`)
