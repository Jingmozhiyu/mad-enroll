import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {ProgressLink} from '@/components/navigation-progress'
import {Fall2026Report} from './fall-2026-report'
import {LanguageSwitch} from './language-switch'
import styles from './page.module.css'

type NewsPageProps = {
    params: Promise<{id: string}>
    searchParams: Promise<{lang?: string | string[]}>
}

const reportId = 'fall-2026-report'

export function generateStaticParams() {
    return [{id: reportId}]
}

export async function generateMetadata({params, searchParams}: NewsPageProps): Promise<Metadata> {
    if ((await params).id !== reportId) {
        notFound()
    }

    const isChinese = (await searchParams).lang === 'zh-cn'
    return {
        title: isChinese ? '2026 秋季学期报告 | MadEnroll' : 'Fall 2026 Report | MadEnroll',
        description: isChinese
            ? '回顾 MadEnroll 在 2026 秋季选课期间的热门课程与邮件提醒。'
            : 'A look at the most followed courses and emails sent during Fall 2026 enrollment.',
    }
}

export default async function NewsArticlePage({params, searchParams}: NewsPageProps) {
    if ((await params).id !== reportId) {
        notFound()
    }

    const isChinese = (await searchParams).lang === 'zh-cn'
    const backLabel = isChinese ? '← 返回首页' : '← Back to Home'

    return (
        <article className={styles.article} lang={isChinese ? 'zh-CN' : 'en'}>
            <header className={styles.header}>
                <div className={styles.toolbar}>
                    <ProgressLink className={styles.back} href="/">{backLabel}</ProgressLink>
                    <LanguageSwitch isChinese={isChinese}/>
                </div>
                <h1>{isChinese ? 'MadEnroll 学期报告 -- FA26' : 'MadEnroll Semester Report -- FA26'}</h1>
                <time className={styles.date} dateTime="2026-09-30">
                    {isChinese ? '2026 年 9 月 30 日' : 'September 30, 2026'}
                </time>
            </header>

            <Fall2026Report isChinese={isChinese}/>

            <footer className={styles.footer}>
                <ProgressLink className={styles.back} href="/">{backLabel}</ProgressLink>
            </footer>
        </article>
    )
}
