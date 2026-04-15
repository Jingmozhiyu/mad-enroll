import type { HTMLAttributes } from 'react'

type BrandMarkProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'colorful'
}

const colorfulBrandLetters = [
  { letter: 'M', color: 'var(--color-miku)' },
  { letter: 'a', color: 'var(--color-miku)' },
  { letter: 'd', color: 'var(--color-miku)' },
  { letter: 'E', color: 'var(--color-shizuku)' },
  { letter: 'n', color: 'var(--color-mmj)' },
  { letter: 'r', color: 'var(--color-haruka)' },
  { letter: 'o', color: 'var(--color-monori)' },
  { letter: 'l', color: 'var(--color-airi)' },
  { letter: 'l', color: 'var(--color-airi)' },
] as const

const defaultBrandLetters = [
  { letter: 'M', color: 'currentColor' },
  { letter: 'a', color: 'currentColor' },
  { letter: 'd', color: 'currentColor' },
  { letter: 'E', color: 'var(--color-miku)' },
  { letter: 'n', color: 'var(--color-miku)' },
  { letter: 'r', color: 'var(--color-miku)' },
  { letter: 'o', color: 'var(--color-miku)' },
  { letter: 'l', color: 'var(--color-miku)' },
  { letter: 'l', color: 'var(--color-miku)' },
] as const

export function BrandMark({
  className,
  variant = 'default',
  children,
  ...props
}: BrandMarkProps) {
  if (children) {
    return (
      <span aria-label="MadEnroll brandmark" className={className} {...props}>
        {children}
      </span>
    )
  }

  const letters = variant === 'colorful' ? colorfulBrandLetters : defaultBrandLetters

  return (
    <span aria-label="MadEnroll" className={className} {...props}>
      {letters.map(({ letter, color }, index) => (
        <span key={`${letter}-${index}`} className="brand-mark-letter" style={{ color }}>
          {letter}
        </span>
      ))}
    </span>
  )
}
