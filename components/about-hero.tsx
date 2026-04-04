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
                <span className="about-placeholder">
                  MadEnroll is an{' '}
                  <a
                    className="about-inline-link"
                    href="https://github.com/Jingmozhiyu/mad-enroll"
                    rel="noreferrer"
                    target="_blank"
                  >
                    open-source
                  </a>{' '}
                  Web App dedicated to <strong>course enrollment</strong> for the{' '}
                  <a
                    className="about-inline-link"
                    href="https://www.cs571.org/"
                    rel="noreferrer"
                    target="_blank"
                  >
                    CS 571
                  </a>{' '}
                  Web Project. The energetic color palette is inspired by{' '}
                  <a
                    className="about-inline-link-mmj italic"
                    href="https://projectsekai.fandom.com/wiki/MORE_MORE_JUMP!"
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span style={{ color: '#6ccb20' }}>MORE MORE JUMP!</span>
                  </a>
                  .
                </span>
              </p>

              <p className="about-copy">
                <span className="about-placeholder">
                  Not getting a spot on the waitlist for a required class,
                  or hearing rumors about a tough instructor, can stress
                  students including me out for months. MadEnroll helps take that stress away.
                </span>
              </p>

              <p className="about-copy">
                <span className="about-placeholder">
                  It&apos;s built with serverless tech <strong>Next.js</strong>. Powered by a{' '}
                  <a
                    className="about-inline-link"
                    href="https://github.com/Jingmozhiyu/uw-track"
                    rel="noreferrer"
                    target="_blank"
                  >
                    custom Java backend
                  </a>{' '}
                  and the{' '}
                  <a
                    className="about-inline-link"
                    href="https://api.madgrades.com/"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Madgrades API
                  </a>
                  , MadEnroll aims to offer a <strong>better UI</strong> and
                  <strong> faster performance</strong> than other UW course app out there.
                </span>
              </p>

              <div className="about-divider" />

              <p className="about-copy">
                <span className="about-placeholder">
                  <strong>Special Thanks to:</strong>
                  <br />
                  Professor{' '}
                  <a
                    className="about-inline-link"
                    href="https://coletnelson.us/"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Cole Nelson
                  </a>
                  , for motivating my interest in web development;
                  <br />
                  <a
                    className="about-inline-link"
                    href="https://madgrades.com/"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Madgrades.com
                  </a>
                  , for the open-source API and the React-based{' '}
                  <a
                    className="about-inline-link"
                    href="https://github.com/Madgrades/madgrades.com"
                    rel="noreferrer"
                    target="_blank"
                  >
                    project prototype
                  </a>
                  .
                </span>
              </p>

              <p className="about-meta">
                Created by{' '}
                <a
                  className="about-inline-link"
                  href="https://pages.cs.wisc.edu/~ygong68/"
                  rel="noreferrer"
                  target="_blank"
                >
                  Yinwen Gong
                </a>
                .
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
