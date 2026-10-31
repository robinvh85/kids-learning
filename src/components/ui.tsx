import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { sfx, speak } from '../engine/audio.ts'

type Tint = 'orange' | 'blue' | 'green' | 'white'

const TINTS: Record<Tint, string> = {
  orange: 'bg-orange text-white shadow-[0_6px_0_#d96a22]',
  blue: 'bg-blue text-white shadow-[0_6px_0_#2a69c9]',
  green: 'bg-green text-white shadow-[0_6px_0_#1f8550]',
  white: 'bg-card text-ink shadow-[0_6px_0_var(--color-line)] border-2 border-line',
}

// Chunky button with a pressed-down effect; big enough for small fingers.
export function BigButton({
  tint = 'white',
  className = '',
  children,
  onClick,
  ...rest
}: { tint?: Tint; children: ReactNode } & HTMLMotionProps<'button'>) {
  return (
    <motion.button
      whileTap={{ y: 4, scale: 0.97 }}
      className={`rounded-3xl font-extrabold min-h-20 min-w-20 px-5 disabled:opacity-40 ${TINTS[tint]} ${className}`}
      onClick={(e) => {
        sfx.tap()
        onClick?.(e)
      }}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

export function SpeakerButton({ texts, className = '' }: { texts: (string | undefined)[]; className?: string }) {
  return (
    <BigButton tint="white" aria-label="Nghe lại" className={`text-4xl ${className}`} onClick={() => speak(...texts)}>
      🔊
    </BigButton>
  )
}

export function Emoji({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`emoji ${className}`} role="img">
      {children}
    </span>
  )
}

export function Stars({ count, max = 3, size = 'text-3xl' }: { count: number; max?: number; size?: string }) {
  return (
    <span className={`${size} whitespace-nowrap`} aria-label={`${count} sao`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`emoji ${i < count ? '' : 'opacity-20 grayscale'}`}>
          ⭐
        </span>
      ))}
    </span>
  )
}

export function Mascot({ mood = 'idle', className = '' }: { mood?: 'idle' | 'happy' | 'think'; className?: string }) {
  const animate =
    mood === 'happy' ? { y: [0, -24, 0], rotate: [0, -8, 8, 0] } : mood === 'think' ? { rotate: [0, -6, 6, 0] } : { y: [0, -6, 0] }
  return (
    <motion.div
      className={`emoji text-7xl select-none ${className}`}
      animate={animate}
      transition={{ duration: mood === 'idle' ? 2.4 : 0.7, repeat: mood === 'idle' ? Infinity : 0 }}
      aria-hidden
    >
      🦉
    </motion.div>
  )
}

export function BackButton({ onClick, label = 'Quay lại' }: { onClick: () => void; label?: string }) {
  return (
    <BigButton tint="white" aria-label={label} className="text-3xl" onClick={onClick}>
      ⬅️
    </BigButton>
  )
}
