'use client'

import { useEffect, useRef, useState } from 'react'
import { AboutSecondaryActions, type PanelKey } from '@/components/about-secondary-actions'
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
  const [activePanel, setActivePanel] = useState<PanelKey>(null)

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
            <div className="grid gap-6 md:gap-6 mt-2">
              <p className="about-copy">
                <span className="about-placeholder">
                  MadEnroll is an <a className="about-inline-link"
                                     href="https://github.com/jingmozhiyu/mad-enroll"
                                     rel="noreferrer"
                                     target="_blank"><strong>open-source</strong></a> UW-Madison enrollment tool that tracks course status and sends <strong>real-time </strong>email alerts when seats open up.
                </span>
              </p>


              <p className="about-copy">
                <span className="about-placeholder">
                  It also includes grade distributions as a secondary tool, so
                  you can compare course options while deciding what to monitor.
                </span>
              </p>

              <p className="about-copy">
                <span className="about-placeholder">
                  For more information, check{' '}
                  <button
                    className="bg-transparent p-0 text-[var(--color-airi)]"
                    onClick={() => setActivePanel('faq')}
                    style={{
                      textDecoration: 'underline',
                      textDecorationColor: 'var(--color-airi)',
                      textDecorationThickness: '1px',
                      textUnderlineOffset: '0.18em',
                    }}
                    type="button"
                  >
                    FAQ
                  </button>{' '}
                  below.{' '}
                  <button
                    className="bg-transparent p-0 text-[var(--color-haruka)]"
                    onClick={() => setActivePanel('feedback')}
                    style={{
                      textDecoration: 'underline',
                      textDecorationColor: 'var(--color-haruka)',
                      textDecorationThickness: '1px',
                      textUnderlineOffset: '0.18em',
                    }}
                    type="button"
                  >
                    Feedback
                  </button>{' '}
                  would be highly appreciated.
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
                  </a>  for{' '}
                    <a
                    className="about-inline-link"
                    href="https://cs571.org"
                    rel="noreferrer"
                    target="_blank"
                >
                    CS 571
                  </a>{' '}
                  Web Project.
                </span>
              </p>

              <p className="about-copy">
                <span className="about-placeholder">
                  Special thanks to:<br/> Professor{' '}
                  <a
                    className="about-inline-link"
                    href="https://coletnelson.us/"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Cole Nelson
                  </a>,{' '}
                  for special guidance on Web Dev;<span><br/></span>{' '}
                  <a
                    className="about-inline-link"
                    href="https://madgrades.com/"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Madgrades.com
                  </a>,{' '}
                  for providing the{' '}
                  <a
                    className="about-inline-link"
                    href="https://api.madgrades.com/"
                    rel="noreferrer"
                    target="_blank"
                  >
                    API
                  </a>{' '}
                  and Linking Card that powers this project.
                </span>
              </p>
            </div>
          </div>

        </div>
          <AboutSecondaryActions
            activePanel={activePanel}
            onActivePanelChange={setActivePanel}
          />

        <div
          className={revealClass(
            hasEntered,
            'translate-y-6 opacity-0',
            'translate-y-0 opacity-100',
            'delay-200',
          )}
        >

        </div>
      </div>
    </section>
  )
}
