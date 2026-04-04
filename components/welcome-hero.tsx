'use client'

import { useEffect, useRef, useState } from 'react'
import { BrandMark } from '@/components/brand-mark'
import { ProgressLink } from '@/components/navigation-progress'
import { WelcomeCarousel } from '@/components/welcome-carousel'

function revealClass(
  hasEntered: boolean,
  hiddenClassName: string,
  visibleClassName: string,
  delayClassName = '',
) {
  return [
    'transform-gpu transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform,filter]',
    delayClassName,
    hasEntered ? visibleClassName : hiddenClassName,
  ].join(' ')
}

export function WelcomeHero() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [hasEntered, setHasEntered] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) {
      const frameId = window.requestAnimationFrame(() => {
        setHasEntered(true)
      })

      return () => window.cancelAnimationFrame(frameId)
    }

    const node = sectionRef.current
    if (!node) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting) {
          setHasEntered(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.28,
        rootMargin: '0px 0px -6% 0px',
      },
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="flex min-h-[540px] flex-col items-center gap-9 overflow-hidden px-2 py-4 text-center md:px-4 md:py-8"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="space-y-4">
          <h1
            className={[
              'max-w-[14ch] text-5xl font-semibold leading-[1.08] tracking-tight text-[var(--color-ink)] md:text-6xl',
              revealClass(
                hasEntered,
                'translate-y-3 opacity-0 blur-[4px]',
                'translate-y-0 opacity-100 blur-0',
              ),
            ].join(' ')}
          >
            <BrandMark>
              <span style={{ color: '#33ccbb' }}>Secure</span> Your Seat.{' '}
              <span style={{ color: '#33ccbb' }}>Ace</span> Your Class!
            </BrandMark>
          </h1>
          <p
            className={[
              'mx-auto max-w-4xl text-base leading-8 text-[var(--color-ink-soft)] md:text-xl',
              revealClass(
                hasEntered,
                'translate-y-3 opacity-0 blur-[3px]',
                'translate-y-0 opacity-100 blur-0',
                'delay-100',
              ),
            ].join(' ')}
          >
            Get instant notification for seats. Explore visualized grade charts.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <ProgressLink
            className={[
              'button-primary',
              revealClass(
                hasEntered,
                'translate-y-6 opacity-0',
                'translate-y-0 opacity-100',
                'delay-200',
              ),
            ].join(' ')}
            href="/monitor"
          >
            Open Monitor
          </ProgressLink>
          <ProgressLink
            className={[
              'button-info',
              revealClass(
                hasEntered,
                'translate-y-6 opacity-0',
                'translate-y-0 opacity-100',
                'delay-300',
              ),
            ].join(' ')}
            href="/search"
          >
            Open Chart
          </ProgressLink>
        </div>
      </div>

      <div
        className={[
          'mx-auto flex w-full justify-center',
          revealClass(
            hasEntered,
            'translate-y-8 opacity-0 blur-[6px]',
            'translate-y-0 opacity-100 blur-0',
            'delay-[420ms]',
          ),
        ].join(' ')}
      >
        <div className="w-[80%] min-w-[280px] max-w-5xl">
          <WelcomeCarousel />
        </div>
      </div>
    </section>
  )
}
