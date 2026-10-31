// Minimal Google Cloud Text-to-Speech REST client, authenticated with an API key.
import { existsSync } from 'node:fs'

const API = 'https://texttospeech.googleapis.com/v1'
export const SAMPLE_RATE = 24000

export function apiKey(): string {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local')
  const key = process.env.GOOGLE_TTS_API_KEY
  if (!key) {
    console.error('Thiếu GOOGLE_TTS_API_KEY. Tạo file .env.local theo mẫu .env.example.')
    process.exit(1)
  }
  return key
}

export type Voice = { name: string; ssmlGender: string }

export async function listVoices(key: string): Promise<Voice[]> {
  const res = await fetch(`${API}/voices?languageCode=vi-VN&key=${key}`)
  if (!res.ok) throw new Error(`voices: ${res.status} ${await res.text()}`)
  const body = (await res.json()) as { voices?: Voice[] }
  return (body.voices ?? []).sort((a, b) => a.name.localeCompare(b.name))
}

export type Encoding = 'MP3' | 'LINEAR16'

export async function synthesize(
  key: string,
  voice: string,
  text: string,
  speakingRate: number,
  encoding: Encoding = 'MP3',
): Promise<Buffer> {
  const request = (rate?: number) =>
    fetch(`${API}/text:synthesize?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'vi-VN', name: voice },
        audioConfig: { audioEncoding: encoding, ...(encoding === 'LINEAR16' ? { sampleRateHertz: SAMPLE_RATE } : {}), ...(rate ? { speakingRate: rate } : {}) },
      }),
    })
  let rate: number | undefined = speakingRate
  let res = await request(rate)
  // Some voice families reject speakingRate; fall back to the default speed for them.
  if (res.status === 400) res = await request((rate = undefined))
  // Chirp3-HD voices have a low per-minute quota: wait and retry instead of failing.
  for (let attempt = 0, wait = 15; res.status === 429 && attempt < 6; attempt++, wait *= 2) {
    console.log(`  hết quota trong phút, chờ ${wait}s rồi thử lại (${voice})`)
    await new Promise((r) => setTimeout(r, wait * 1000))
    res = await request(rate)
  }
  if (!res.ok) throw new Error(`synthesize "${text}" (${voice}): ${res.status} ${await res.text()}`)
  const body = (await res.json()) as { audioContent: string }
  return Buffer.from(body.audioContent, 'base64')
}

// Run tasks with a small concurrency limit to stay well under the API quota.
export async function pool<T>(items: T[], size: number, run: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items]
  await Promise.all(
    Array.from({ length: size }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await run(item)
    }),
  )
}
