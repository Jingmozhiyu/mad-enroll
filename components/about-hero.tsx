'use client'

import { useEffect, useRef, useState } from 'react'
import { AboutSecondaryActions } from '@/components/about-secondary-actions'
import { BrandMark } from '@/components/brand-mark'

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

export function AboutHero() {
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
    <section ref={sectionRef} className="px-1 py-2 md:px-2 md:py-4">
      <div className="mx-auto flex min-h-[540px] w-full max-w-4xl flex-col items-center justify-center gap-8 md:gap-10">
        <div
          className={revealClass(
            hasEntered,
            'translate-y-3 opacity-0 blur-[4px]',
            'translate-y-0 opacity-100 blur-0',
          )}
        >
          <BrandMark className="about-brand-word" variant="colorful" />
        </div>

        <div
          className={[
            'w-full max-w-3xl text-left',
            revealClass(
              hasEntered,
              'translate-y-8 opacity-0 blur-[6px]',
              'translate-y-0 opacity-100 blur-0',
              'delay-100',
            ),
          ].join(' ')}
        >
          <div className="about-story-shell">
            <div className="grid gap-6 md:gap-6">
              <p className="about-copy">
                <span className="text-lg font-semibold text-[var(--color-ink)]">What it does</span>
                <br />
                <span className="about-placeholder">
                  MadEnroll is a UW-Madison enrollment tool that tracks course and
                  section availability and sends email alerts when seats open up.
                </span>
              </p>

              <p className="about-copy">
                <span className="text-lg font-semibold text-[var(--color-ink)]">When it helps</span>
                <br />
                <span className="about-placeholder">
                  It is most useful when availability changes quickly, during
                  enrollment, SOAR, and the first week classes, especially if you are
                  watching a specific section instead of just any open seat in a
                  course.
                </span>
              </p>

              <p className="about-copy">
                <span className="text-lg font-semibold text-[var(--color-ink)]">Also included</span>
                <br />
                <span className="about-placeholder">
                  MadEnroll also includes grade distributions as a secondary tool, so
                  you can compare course options while deciding what to monitor.
                </span>
              </p>

              <div className="about-divider" />

              <p className="about-copy">
                <span className="about-placeholder">
                  Built and maintained by{' '}
                  <a
                    className="about-inline-link"
                    href="https://pages.cs.wisc.edu/~ygong68/"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Yinwen Gong
                  </a> as a project for{' '}
                    <a
                    className="about-inline-link"
                    href="https://cs571.org"
                    rel="noreferrer"
                    target="_blank"
                >
                    CS 571
                  </a>{' '}
                  Project.
                </span>
              </p>

              <p className="about-copy">
                <span className="about-placeholder">
                  Special thanks to Professor{' '}
                  <a
                    className="about-inline-link"
                    href="https://coletnelson.us/"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Cole Nelson
                  </a>{' '}
                  for encouraging this project, and to{' '}
                  <a
                    className="about-inline-link"
                    href="https://madgrades.com/"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Madgrades
                  </a>{' '}
                  for providing the{' '}
                  <a
                    className="about-inline-link"
                    href="https://api.madgrades.com/"
                    rel="noreferrer"
                    target="_blank"
                  >
                    API
                  </a>{' '}
                  that powers the grade distribution feature.
                </span>
              </p>
            </div>
          </div>
        </div>

        <div
          className={revealClass(
            hasEntered,
            'translate-y-6 opacity-0',
            'translate-y-0 opacity-100',
            'delay-200',
          )}
        >
          <AboutSecondaryActions />
        </div>
      </div>
    </section>
  )
}
