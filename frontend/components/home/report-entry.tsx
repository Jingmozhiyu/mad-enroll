import {ProgressLink} from '@/components/navigation-progress'
import {Arrow} from './arrow'
import styles from './report-entry.module.css'

type ReportEntryProps = {
    href: string
    title: string
}

function Newspaper() {
    return (
        <svg className={styles.newspaper} aria-hidden="true" width="144" height="120" viewBox="0 0 144 120" fill="none">
            <path d="M31 18h93v88H31z" fill="var(--color-primary-soft)" stroke="var(--surface-border-strong)" strokeWidth="1.5"/>
            <g transform="rotate(-5 70 60)">
                <path d="M19 10h101v88l-12 12H19V10Z" fill="var(--surface-background)" stroke="var(--color-ink-soft)" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M108 110V98h12" fill="var(--color-primary-soft)" stroke="var(--color-ink-soft)" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M31 24h77" stroke="var(--color-deep-teal)" strokeWidth="6"/>
                <path d="M31 34h77" stroke="var(--color-ink-soft)" strokeWidth="1.5"/>
                <path d="M31 44h35v27H31z" fill="var(--color-haruka)" fillOpacity=".4"/>
                <path d="m36 64 7-7 7 3 10-11" stroke="var(--color-deep-teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M75 46h33M75 54h33M75 62h33M75 70h24M31 81h35M31 89h35M31 97h27M75 81h33M75 89h33M75 97h24"
                      stroke="var(--color-ink-soft)" strokeWidth="2" strokeLinecap="round"/>
            </g>
        </svg>
    )
}

export function ReportEntry({href, title}: ReportEntryProps) {
    return (
        <ProgressLink className={styles.entry} href={href}>
            <Newspaper/>
            <span className={styles.title}>{title}<Arrow/></span>
        </ProgressLink>
    )
}
