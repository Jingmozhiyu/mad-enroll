import Image from 'next/image'
import type {ReactNode} from 'react'
import {ProgressLink} from '@/components/navigation-progress'
import styles from './report-entry.module.css'

type ReportEntryProps = {
    href: string
    title: string
    // ISO date for machines, label for people.
    publishedAt: string
    publishedLabel: string
    image: {src: string, alt: string, width: number, height: number}
    // Plain-text findings, so crawlers can quote the numbers without opening the chart.
    children: ReactNode
}

export function ReportEntry({href, title, publishedAt, publishedLabel, image, children}: ReportEntryProps) {
    return (
        <ProgressLink className={styles.entry} href={href}>
            <article className={styles.layout}>
                <Image
                    className={styles.thumb}
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    unoptimized
                />
                <div className={styles.text}>
                    <h3 className={styles.title}>{title}</h3>
                    {/* A div, not a p: callers pass their own paragraphs. */}
                    <div className={styles.summary}>{children}</div>
                    {publishedLabel ? (
                        <p className={styles.meta}>
                            <time dateTime={publishedAt}>{publishedLabel}</time>
                        </p>
                    ) : null}
                </div>
            </article>
        </ProgressLink>
    )
}
