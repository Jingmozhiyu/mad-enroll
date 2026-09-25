'use client'

import type {CSSProperties} from 'react'
import {ProgressLink} from '@/components/navigation-progress'
import styles from './welcome-hero.module.css'

const clovers = [
    {side: 'left', top: '3%', inset: '-24px', size: 150, angle: -28, opacity: 0.13, duration: 19, delay: -4},
    {side: 'left', top: '22%', inset: '42%', size: 46, angle: 24, opacity: 0.27, duration: 14, delay: -9},
    {side: 'left', top: '38%', inset: '4%', size: 92, angle: -12, opacity: 0.18, duration: 17, delay: -6},
    {side: 'left', top: '60%', inset: '-45px', size: 205, angle: 38, opacity: 0.08, duration: 23, delay: -12},
    {side: 'left', top: '83%', inset: '48%', size: 38, angle: -42, opacity: 0.23, duration: 16, delay: -3},
    {side: 'right', top: '1%', inset: '34%', size: 60, angle: 32, opacity: 0.2, duration: 16, delay: -8},
    {side: 'right', top: '19%', inset: '-34px', size: 190, angle: -35, opacity: 0.1, duration: 22, delay: -5},
    {side: 'right', top: '47%', inset: '46%', size: 44, angle: 17, opacity: 0.26, duration: 13, delay: -10},
    {side: 'right', top: '63%', inset: '3%', size: 108, angle: 48, opacity: 0.16, duration: 18, delay: -7},
    {side: 'right', top: '87%', inset: '-18px', size: 72, angle: -18, opacity: 0.12, duration: 20, delay: -14},
]

function CloverBackground() {
    return (
        <div className={styles.cloverBackground} aria-hidden="true">
            {['left', 'right'].map(side => (
                <div key={side} className={`${styles.cloverSide} ${side === 'left' ? styles.cloverLeft : styles.cloverRight}`}>
                    {clovers.filter(clover => clover.side === side).map((clover, index) => (
                        <span
                            key={index}
                            className={styles.clover}
                            style={{
                                '--clover-top': clover.top,
                                '--clover-inset': clover.inset,
                                '--clover-size': `${clover.size}px`,
                                '--clover-angle': `${clover.angle}deg`,
                                '--clover-opacity': clover.opacity,
                                '--clover-duration': `${clover.duration}s`,
                                '--clover-delay': `${clover.delay}s`,
                            } as CSSProperties}
                        />
                    ))}
                </div>
            ))}
        </div>
    )
}

function Arrow() {
    return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h16m-6-6 6 6-6 6"/>
    </svg>
}

export function WelcomeHero() {
    return (
        <div className={`welcome-hero ${styles.home}`}>
            <CloverBackground/>
            <section className={styles.hero} aria-labelledby="welcome-title">
                <div className={styles.copy}>
                    <h1 id="welcome-title">Get <span className={styles.enhance}>instant</span>
                        <sup style={{fontSize:40,color:"var(--color-airi)",marginRight: 3}}>*</sup>
                        email for course seats by using Mad<span className={styles.enhance}>Enroll</span>.
                    </h1>

                    <p className={styles.description}>Full class? Keep your plans open. We are tracking seats availability.</p>


                    <div className={styles.actions}>
                        <ProgressLink className={styles.primary} href="/monitor">Set Seat Alerts <Arrow/></ProgressLink>
                        <ProgressLink className={styles.secondary} href="/search">Browse Courses <Arrow/></ProgressLink>
                    </div>

                    <aside className={styles.proof} aria-label="Enrollment update">
                        <div className={styles.proofMark} aria-hidden="true">↗</div>
                        <p>We have sent <strong>1,800+ email alerts</strong> during Fall 2026 enrollment.</p>
                    </aside>
                </div>

            </section>
            <section className={styles.news} aria-labelledby="home-news-title">
                <h2 id="home-news-title">News</h2>
                <p>Fall 2026 enrollment report coming soon.</p>
            </section>

            <section className={styles.compl}>
                <p><span>*</span>MadEnroll detects each seat opening at 28 seconds in Avg.</p>
                <p>Source: MadEnroll Semester Report (FA26).</p>
            </section>
        </div>
    )
}
