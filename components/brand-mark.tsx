import type { HTMLAttributes } from 'react'

type BrandMarkProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'colorful'
}

const colorfulBrandLetters = [
  { letter: 'M', color: '#33ccbb' },
  { letter: 'a', color: '#33ccbb' },
  { letter: 'd', color: '#33ccbb' },
  { letter: 'E', color: '#9aeede' },
  { letter: 'n', color: '#6ccb20' },
  { letter: 'r', color: '#99cdff' },
  { letter: 'o', color: '#ffcdac' },
  { letter: 'l', color: '#ffa9cc' },
  { letter: 'l', color: '#ffa9cc' },
] as const

const defaultBrandLetters = [
  { letter: 'M', color: 'currentColor' },
  { letter: 'a', color: 'currentColor' },
  { letter: 'd', color: 'currentColor' },
  { letter: 'E', color: '#33ccbb' },
  { letter: 'n', color: '#33ccbb' },
  { letter: 'r', color: '#33ccbb' },
  { letter: 'o', color: '#33ccbb' },
  { letter: 'l', color: '#33ccbb' },
  { letter: 'l', color: '#33ccbb' },
] as const

export function BrandMark({
  className,
  variant = 'default',
  ...props
}: BrandMarkProps) {
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
