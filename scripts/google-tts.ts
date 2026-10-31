// Minimal Google Cloud Text-to-Speech REST client, authenticated with an API key.
import { existsSync } from 'node:fs'

const API = 'https://texttospeech.googleapis.com/v1'

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

export async function synthesize(key: string, voice: string, text: string, speakingRate: number): Promise<Buffer> {
  const request = (rate?: number) =>
    fetch(`${API}/text:synthesize?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'vi-VN', name: voice },
        audioConfig: { audioEncoding: 'MP3', ...(rate ? { speakingRate: rate } : {}) },
      }),
    })
  let res = await request(speakingRate)
  // Some voice families reject speakingRate; fall back to the default speed for them.
  if (res.status === 400) res = await request()
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
