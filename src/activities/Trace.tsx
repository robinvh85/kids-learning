import { useEffect, useRef, useState } from 'react'
import type { ActivityOf } from '../content/schema.ts'
import { FEEDBACK, promptOf } from '../content/speech.ts'
import { sfx, speak, stopSpeaking } from '../engine/audio.ts'
import { BigButton, SpeakerButton } from '../components/ui.tsx'
import type { ActivityProps } from './feedback.ts'

const SIZE = 420
const CELL = 8
const BRUSH = 22
const PASS = 0.72
// Share of the finger's path that must stay on or near the glyph (within NEAR cells),
// so scribbling over the whole box fails while neat tracing of thin letters passes.
const NEATNESS = 0.6
const NEAR = 2

function drawGuide(c: CanvasRenderingContext2D, char: string, font: string) {
  c.clearRect(0, 0, SIZE, SIZE)
  c.font = font
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillStyle = '#efe4d2'
  c.fillText(char, SIZE / 2, SIZE / 2 + 10)
  c.setLineDash([10, 10])
  c.lineWidth = 3
  c.strokeStyle = '#c9b89c'
  c.strokeText(char, SIZE / 2, SIZE / 2 + 10)
  c.setLineDash([])
}

// The glyph is drawn in the school font on an offscreen canvas; its pixels become
// a grid of target cells. Tracing passes once most cells are covered by the finger.
// This works for any letter or digit without hand-made stroke data; stroke order
// guidance can be added later.
export function Trace({ activity, onComplete }: ActivityProps<ActivityOf<'trace'>>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const targets = useRef<Set<number>>(new Set())
  const covered = useRef<Set<number>>(new Set())
  const near = useRef<Set<number>>(new Set())
  const path = useRef<Set<number>>(new Set())
  const last = useRef<{ x: number; y: number } | null>(null)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [round, setRound] = useState(0)
  const isDigit = /\d/.test(activity.char)
  const font = `700 ${isDigit ? 340 : 300}px ${isDigit ? "'Nunito Variable'" : 'Andika'}`

  useEffect(() => {
    const id = setTimeout(() => speak(...promptOf(activity)), 250)
    return () => {
      clearTimeout(id)
      stopSpeaking()
    }
  }, [activity])

  useEffect(() => {
    let cancelled = false
    document.fonts.load(font, activity.char).then(() => {
      if (cancelled) return
      const off = document.createElement('canvas')
      off.width = off.height = SIZE
      const o = off.getContext('2d')!
      o.font = font
      o.textAlign = 'center'
      o.textBaseline = 'middle'
      o.fillText(activity.char, SIZE / 2, SIZE / 2 + 10)
      const data = o.getImageData(0, 0, SIZE, SIZE).data
      const set = new Set<number>()
      for (let y = 0; y < SIZE; y += CELL)
        for (let x = 0; x < SIZE; x += CELL)
          if (data[((y + CELL / 2) * SIZE + x + CELL / 2) * 4 + 3] > 128) set.add((y / CELL) * (SIZE / CELL) + x / CELL)
      const cols = SIZE / CELL
      const around = new Set<number>()
      for (const key of set)
        for (let dy = -NEAR; dy <= NEAR; dy++) for (let dx = -NEAR; dx <= NEAR; dx++) around.add(key + dy * cols + dx)
      targets.current = set
      near.current = around
      covered.current = new Set()
      path.current = new Set()
      const c = canvasRef.current?.getContext('2d')
      if (c) drawGuide(c, activity.char, font)
    })
    return () => {
      cancelled = true
    }
  }, [activity.char, font, round])

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - rect.left) / rect.width) * SIZE, y: ((e.clientY - rect.top) / rect.height) * SIZE }
  }

  function cover(x: number, y: number) {
    const r = Math.ceil(BRUSH / CELL)
    const cx = Math.floor(x / CELL)
    const cy = Math.floor(y / CELL)
    path.current.add(cy * (SIZE / CELL) + cx)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue
        const key = (cy + dy) * (SIZE / CELL) + cx + dx
        if (targets.current.has(key)) covered.current.add(key)
      }
  }

  function stroke(from: { x: number; y: number }, to: { x: number; y: number }) {
    const c = canvasRef.current!.getContext('2d')!
    c.strokeStyle = isDigit ? '#3d8bff' : '#ff8a3d'
    c.lineWidth = BRUSH * 1.6
    c.lineCap = 'round'
    c.lineJoin = 'round'
    c.beginPath()
    c.moveTo(from.x, from.y)
    c.lineTo(to.x, to.y)
    c.stroke()
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / (CELL / 2)))
    for (let i = 0; i <= steps; i++) cover(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps)
  }

  function finishIfDone() {
    const ratio = targets.current.size ? covered.current.size / targets.current.size : 0
    setProgress(ratio)
    if (done || ratio < PASS) return
    const onPath = [...path.current].filter((key) => near.current.has(key)).length
    if (onPath / path.current.size < NEATNESS) {
      sfx.wrong()
      speak(FEEDBACK.traceMessy)
      setProgress(0)
      setRound((r) => r + 1)
      return
    }
    setDone(true)
    sfx.correct()
    speak(FEEDBACK.traceDone).then(() => setTimeout(() => onComplete(true), 400))
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className={`aspect-square w-[min(60vh,420px)] touch-none rounded-[2.5rem] border-4 bg-card ${done ? 'border-green' : 'border-line'}`}
        onPointerDown={(e) => {
          if (done) return
          e.currentTarget.setPointerCapture(e.pointerId)
          last.current = point(e)
          stroke(last.current, last.current)
        }}
        onPointerMove={(e) => {
          if (!last.current || done) return
          const p = point(e)
          stroke(last.current, p)
          last.current = p
        }}
        onPointerUp={() => {
          last.current = null
          finishIfDone()
        }}
        onPointerCancel={() => {
          last.current = null
        }}
      />
      <div className="h-4 w-72 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-green transition-all" style={{ width: `${Math.min(1, progress / PASS) * 100}%` }} />
      </div>
      <div className="flex gap-4">
        <SpeakerButton texts={promptOf(activity)} />
        <BigButton
          tint="white"
          className="text-3xl"
          aria-label="Tô lại"
          disabled={done}
          onClick={() => {
            setProgress(0)
            setRound((r) => r + 1)
          }}
        >
          🔄
        </BigButton>
      </div>
    </div>
  )
}
