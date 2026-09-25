import type {HTMLAttributes} from 'react'

type BrandMarkProps = HTMLAttributes<HTMLSpanElement> & {
    variant?: 'default' | 'colorful'
}

const colorfulBrandLetters = [
    {letter: 'M', color: 'var(--color-miku)'},
    {letter: 'a', color: 'var(--color-miku)'},
    {letter: 'd', color: 'var(--color-miku)'},
    {letter: 'E', color: 'var(--color-shizuku)'},
    {letter: 'n', color: 'var(--color-mmj)'},
    {letter: 'r', color: 'var(--color-haruka)'},
    {letter: 'o', color: 'var(--color-monori)'},
    {letter: 'l', color: 'var(--color-airi)'},
    {letter: 'l', color: 'var(--color-airi)'},
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

    if (variant === 'default') {
        return (
            <span aria-label="MadEnroll" className={className} {...props}>
                <span className="brand-mark-letter">Mad</span>
                <span className="brand-accent-gradient">Enroll</span>
            </span>
        )
    }

    return (
        <span aria-label="MadEnroll" className={className} {...props}>
      {colorfulBrandLetters.map(({letter, color}, index) => (
          <span key={`${letter}-${index}`} className="brand-mark-letter" style={{color}}>
          {letter}
        </span>
      ))}
    </span>
    )
}
