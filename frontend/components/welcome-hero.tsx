'use client'

import {useEffect, useRef, useState} from 'react'
import {ProgressLink} from '@/components/navigation-progress'

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
                threshold: 0.12,
                rootMargin: '0px 0px -8% 0px',
            },
        )

        observer.observe(node)

        return () => observer.disconnect()
    }, [])

    return (
        <section
            ref={sectionRef}
            className="welcome-hero"
        >
            <div className="welcome-hero-band">
                <div className="welcome-hero-inner">
                    <div className="welcome-hero-copy">
                        <h1
                            className={[
                                'welcome-hero-headline',
                                revealClass(
                                    hasEntered,
                                    'translate-y-3 opacity-0 blur-[4px]',
                                    'translate-y-0 opacity-100 blur-0',
                                    'delay-75',
                                ),
                            ].join(' ')}
                        >
                            MadEnroll has sent <span className="welcome-hero-stat">500+</span> email alerts since fall enrollment began.
                        </h1>

                        <div className="welcome-hero-actions">
                            <ProgressLink
                                className={[
                                    'welcome-hero-primary-button',
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
                                    'welcome-hero-secondary-button',
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
                </div>
            </div>

            <div className="welcome-hero-note">
                <div className="welcome-hero-note-inner">
                    <p
                        className={[
                            'welcome-hero-body',
                            revealClass(
                                hasEntered,
                                'translate-y-3 opacity-0 blur-[3px]',
                                'translate-y-0 opacity-100 blur-0',
                                'delay-100',
                            ),
                        ].join(' ')}
                    >
                        Get email alerts when a seat becomes available. Especially useful for switching to a <span
                        className="welcome-hero-accent">preferred section</span>, catching <span
                        className="welcome-hero-accent">seat drops during SOAR</span> and the <span
                        className="welcome-hero-accent">add/drop period.</span>
                    </p>
                    <div
                        className={[
                            'welcome-hero-note-rule mt-3',
                            revealClass(
                                hasEntered,
                                'scale-x-0 opacity-0',
                                'scale-x-100 opacity-100',
                                'delay-[360ms]',
                            ),
                        ].join(' ')}
                    />
                </div>
            </div>
        </section>
    )
}
