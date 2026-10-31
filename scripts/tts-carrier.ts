// Some syllables come out wrong when the voice is given them alone: "be" is read as
// the English word "bee", "ê" as "i", and a bare "a" or "e" comes back as silence.
// These are said inside a short Vietnamese phrase instead, and the syllable is cut out.
// Needs ffmpeg (with libmp3lame) on the PATH.
import { spawnSync } from 'node:child_process'
import { SAMPLE_RATE, synthesize } from './google-tts.ts'

// Syllables in a phrase are separated by commas so the voice pauses between them;
// `take` is the index of the syllable to keep.
export type Carrier = { text: string; take: number }

export const CARRIERS: Record<string, Carrier> = {
  a: { text: 'bờ, a, ba.', take: 1 },
  e: { text: 'bờ, e, be.', take: 1 },
  ê: { text: 'bờ, ê, bê.', take: 1 },
  be: { text: 'bờ, e, be.', take: 2 },
  // Also English words, so said inside their own spelling the same way.
  he: { text: 'hờ, e, he.', take: 2 },
  me: { text: 'mờ, e, me.', take: 2 },
  so: { text: 'sờ, o, so.', take: 2 },
  // Came back as silence when said alone.
  ư: { text: 'cờ, ư, cư.', take: 1 },
  ke: { text: 'ca, e, ke.', take: 2 },
  hư: { text: 'hờ, ư, hư.', take: 2 },
}

const FRAME = SAMPLE_RATE / 100 // 10 ms
const MIN_GAP = 15 // frames of quiet that separate two syllables
const MIN_SYLLABLE = 8 // frames; anything shorter is a click, not a syllable

export async function synthesizeInCarrier(key: string, voice: string, carrier: Carrier, rate: number): Promise<Buffer> {
  const expected = carrier.text.split(',').length
  let found = 0
  for (let attempt = 0; attempt < 3; attempt++) {
    const pcm = pcmOf(await synthesize(key, voice, carrier.text, rate, 'LINEAR16'))
    const syllables = split(pcm)
    found = syllables.length
    if (found === expected) {
      const [from, to] = syllables[carrier.take]
      return toMp3(pcm.subarray(Math.max(0, from - 3) * FRAME, (to + 6) * FRAME))
    }
  }
  throw new Error(`"${carrier.text}" (${voice}): expected ${expected} syllables, heard ${found}`)
}

// LINEAR16 responses are a WAV file: return the samples of its "data" chunk.
function pcmOf(wav: Buffer): Int16Array {
  let at = 12
  while (at + 8 <= wav.length) {
    const id = wav.toString('ascii', at, at + 4)
    const size = wav.readUInt32LE(at + 4)
    if (id === 'data') {
      const data = wav.subarray(at + 8, at + 8 + size)
      return new Int16Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.length))
    }
    at += 8 + size
  }
  throw new Error('LINEAR16 response has no data chunk')
}

// [first frame, last frame] of each stretch of sound between pauses.
function split(pcm: Int16Array): [number, number][] {
  const rms: number[] = []
  for (let i = 0; i + FRAME <= pcm.length; i += FRAME) {
    let sum = 0
    for (let j = i; j < i + FRAME; j++) sum += pcm[j] * pcm[j]
    rms.push(Math.sqrt(sum / FRAME))
  }
  const threshold = Math.max(...rms) * 0.05
  const out: [number, number][] = []
  let start = -1
  let last = -1
  rms.forEach((v, i) => {
    if (v > threshold) {
      if (start < 0) start = i
      last = i
    } else if (start >= 0 && i - last > MIN_GAP) {
      out.push([start, last])
      start = -1
    }
  })
  if (start >= 0) out.push([start, last])
  return out.filter(([a, b]) => b - a > MIN_SYLLABLE)
}

function toMp3(pcm: Int16Array): Buffer {
  const fade = 'afade=t=in:d=0.01,areverse,afade=t=in:d=0.03,areverse'
  const args = ['-loglevel', 'error', '-f', 's16le', '-ar', String(SAMPLE_RATE), '-ac', '1', '-i', 'pipe:0']
  const run = spawnSync('ffmpeg', [...args, '-af', fade, '-codec:a', 'libmp3lame', '-q:a', '4', '-f', 'mp3', 'pipe:1'], {
    input: Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength),
    maxBuffer: 16 * 1024 * 1024,
  })
  if (run.error) throw new Error(`ffmpeg is needed to cut syllables out of a phrase: ${run.error.message}`)
  if (run.status !== 0) throw new Error(`ffmpeg: ${run.stderr.toString()}`)
  return run.stdout
}
