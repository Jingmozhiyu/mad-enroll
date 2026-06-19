'use client'

import { useEffect, useRef, useState } from 'react'
import { ProgressLink } from '@/components/navigation-progress'
import { WelcomeCarousel, welcomeSlides } from '@/components/welcome-carousel'

const howItWorksSteps = [
  {
    number: '1',
    title: 'Search for a course',
    body: 'Browse courses and inspect individual sections.',
  },
  {
    number: '2',
    title: 'Pick the section you want',
    body: 'Track the lecture, discussion, or lab that fits your schedule.',
  },
  {
    number: '3',
    title: 'Get email alerts',
    body: 'Receive an email when that section becomes more available.',
  },
] as const

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
  const [activeSceneIndex, setActiveSceneIndex] = useState(0)

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
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px',
      },
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return (
    <section
      data-scene={activeSceneIndex}
      ref={sectionRef}
      className="welcome-hero grid min-h-[calc(100vh-7.5rem)] gap-8 px-2 py-4 md:px-4 md:py-8"
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] xl:items-center">
        <div className="flex flex-col gap-6 text-center xl:text-left">
          <div className="space-y-5">
            <h1
              className={[
                'welcome-hero-headline max-w-[14ch] text-5xl font-semibold leading-[1.06] tracking-tight max-xl:mx-auto md:text-6xl',
                revealClass(
                  hasEntered,
                  'translate-y-3 opacity-0 blur-[4px]',
                  'translate-y-0 opacity-100 blur-0',
                  'delay-75',
                ),
              ].join(' ')}
            >
              Track seat openings for UW courses.
            </h1>
            <p
              className={[
                'welcome-hero-body max-w-2xl text-base leading-8 max-xl:mx-auto md:text-xl',
                revealClass(
                  hasEntered,
                  'translate-y-3 opacity-0 blur-[3px]',
                  'translate-y-0 opacity-100 blur-0',
                  'delay-100',
                ),
              ].join(' ')}
            >
              Get email alerts when a course or section becomes available. Especially useful for switching to a <span className="welcome-hero-accent">preferred section</span>, catching <span className="welcome-hero-accent">seat drops during SOAR</span> and the <span className="welcome-hero-accent">add/drop
                period.</span>
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 xl:justify-start">
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
              Set Seat Alerts
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
              Browse Grades
            </ProgressLink>
          </div>
        </div>

        <div
          className={revealClass(
            hasEntered,
            'translate-y-8 opacity-0 blur-[6px]',
            'translate-y-0 opacity-100 blur-0',
            'delay-[320ms]',
          )}
        >
          <div className="mx-auto w-full max-w-2xl xl:ml-auto xl:mr-0">
            <WelcomeCarousel
              activeIndex={activeSceneIndex}
              onActiveIndexChange={(index) => setActiveSceneIndex(index % welcomeSlides.length)}
            />
          </div>
        </div>
      </div>

      <div
        className={revealClass(
          hasEntered,
          'translate-y-8 opacity-0 blur-[6px]',
          'translate-y-0 opacity-100 blur-0',
          'delay-[420ms]',
        )}
      >
        <div className="grid gap-4">
          <h2 className="text-center text-3xl font-semibold leading-[1.06] tracking-tight text-[var(--color-ink)] md:text-4xl">
            How it works
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
          {howItWorksSteps.map((step) => (
            <article
              key={step.number}
              className="feature-card-shell rounded-[24px] p-px"
            >
              <div className="feature-card-body h-full rounded-[23px] px-5 py-5 text-left">
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-semibold leading-none text-[var(--color-miku)]">
                    {step.number}
                  </p>
                  <h2 className="text-lg font-semibold text-[var(--color-ink)]">
                    {step.title}
                  </h2>
                </div>
                <p className="mt-3 text-md leading-7 text-[var(--color-ink-soft)]">
                  {step.body}
                </p>
              </div>
            </article>
          ))}
          </div>
        </div>
      </div>

      <div
        className={revealClass(
          hasEntered,
          'translate-y-8 opacity-0 blur-[6px]',
          'translate-y-0 opacity-100 blur-0',
          'delay-[500ms]',
        )}
      >
        <p className="text-center text-lg leading-7 text-[var(--color-ink-soft)]">
          <span className="font-semibold text-[var(--color-ink)]">
            Also included: grade distributions.
          </span>{' '}
          Charts are available as a secondary tool while you browse
          courses.
        </p>
      </div>
    </section>
  )
}
