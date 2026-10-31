import { Howl } from 'howler'

// Pre-generated Google TTS files (npm run tts:build) are listed in this manifest.
// A sentence missing from it falls back to the browser's Vietnamese voice so the app
// stays usable in development before audio has been generated.
type Manifest = { voice: string; files: Record<string, string> }

let manifest: Manifest | null = null
const howls = new Map<string, Howl>()
let current: { stop: () => void } | null = null
let token = 0

export async function loadAudioManifest(): Promise<void> {
  try {
    const res = await fetch('/audio/manifest.json')
    if (res.ok) manifest = (await res.json()) as Manifest
  } catch {
    manifest = null
  }
}

function playFile(file: string): Promise<void> {
  return new Promise((resolve) => {
    let howl = howls.get(file)
    if (!howl) {
      howl = new Howl({ src: [`/audio/${file}`], html5: false })
      howls.set(file, howl)
    }
    const h = howl
    const id = h.play()
    const done = () => resolve()
    h.once('end', done, id)
    h.once('playerror', done, id)
    h.once('loaderror', done)
    current = { stop: () => { h.stop(id); resolve() } }
  })
}

function viVoice(): SpeechSynthesisVoice | undefined {
  return speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('vi'))
}

function playSynth(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'vi-VN'
    u.rate = 0.85
    const voice = viVoice()
    if (voice) u.voice = voice
    // Some browsers never fire onend (no voice installed, tab in background), so a
    // sentence must not be able to stall the lesson.
    const timeout = setTimeout(resolve, 2000 + text.length * 120)
    const finish = () => {
      clearTimeout(timeout)
      resolve()
    }
    u.onend = finish
    u.onerror = finish
    speechSynthesis.speak(u)
    current = { stop: () => { speechSynthesis.cancel(); finish() } }
  })
}

export function hasRecordedAudio(text: string): boolean {
  return Boolean(manifest?.files[text])
}

// Speak sentences one after another. A new call interrupts whatever is playing.
export async function speak(...texts: (string | undefined)[]): Promise<void> {
  stopSpeaking()
  const mine = ++token
  for (const text of texts) {
    if (!text || mine !== token) return
    const file = manifest?.files[text]
    await (file ? playFile(file) : playSynth(text))
  }
}

// Like speak(), but calls onStep before each sentence so the screen can follow along.
// Resolves to false if interrupted by another speak call.
export async function speakSteps(texts: string[], onStep: (index: number) => void, gapMs = 250): Promise<boolean> {
  stopSpeaking()
  const mine = ++token
  for (let i = 0; i < texts.length; i++) {
    if (mine !== token) return false
    onStep(i)
    const file = manifest?.files[texts[i]]
    await (file ? playFile(file) : playSynth(texts[i]))
    if (mine !== token) return false
    await new Promise((r) => setTimeout(r, gapMs))
  }
  return mine === token
}

export function stopSpeaking(): void {
  token++
  current?.stop()
  current = null
}

// Short effects synthesised with Web Audio so no asset files are needed.
let ctx: AudioContext | null = null

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', volume = 0.2) {
  ctx ??= new AudioContext()
  const t = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(volume, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + duration)
}

export const sfx = {
  correct() {
    tone(659, 0, 0.15)
    tone(880, 0.1, 0.25)
  },
  wrong() {
    tone(220, 0, 0.2, 'triangle', 0.15)
  },
  tap() {
    tone(520, 0, 0.06, 'sine', 0.1)
  },
  fanfare() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3))
  },
}
