'use client'

import {useState} from 'react'
import {AboutSecondaryActions, type PanelKey} from '@/components/about/about-secondary-actions'
import {BrandMark} from '@/components/brand-mark'

export function AboutHero() {
    const [activePanel, setActivePanel] = useState<PanelKey>(null)

    return (
        <section className="mt-3 -mb-1">
            <div
                className="mx-auto flex min-h-[540px] w-full max-w-4xl flex-col items-center justify-center gap-4 md:gap-6">
                <div className="rise-in">
                    <BrandMark className="about-brand-word" variant="colorful"/>
                </div>

                <div className="rise-in w-full max-w-3xl text-left [animation-delay:100ms]">
                    <div className="about-story-shell">
                        <div className="grid gap-6 md:gap-6 mt-1">
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
                  you can compare course options while deciding which sections to set alerts for.
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
                  </button>
                    {' '}
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
                  </button>
                    {' '}
                    would be highly appreciated.
                </span>
                            </p>


                            <div className="about-divider"/>


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
            </div>
        </section>
    )
}
