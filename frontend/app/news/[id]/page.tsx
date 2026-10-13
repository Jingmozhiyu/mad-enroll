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
const reportPath = `/news/${reportId}`
const publishedAt = '2026-09-30'

const reportDescription = {
    en: 'MadEnroll Fall 2026 enrollment report: 1,883 seat alerts across 137 UW–Madison courses, '
        + 'the most followed courses, alerts by hour, and an estimated 28-second average seat detection delay.',
    zh: 'MadEnroll 2026 秋季选课报告：137 门威斯康星大学麦迪逊分校课程、1,883 封课位提醒、'
        + '热门课程、提醒时段分布，以及约 28 秒的平均课位检测延迟。',
}

export function generateStaticParams() {
    return [{id: reportId}]
}

export async function generateMetadata({params, searchParams}: NewsPageProps): Promise<Metadata> {
    if ((await params).id !== reportId) {
        notFound()
    }

    const isChinese = (await searchParams).lang === 'zh-cn'
    const title = isChinese ? '2026 秋季学期报告 | MadEnroll' : 'Fall 2026 Report | MadEnroll'
    const description = isChinese ? reportDescription.zh : reportDescription.en
    return {
        title,
        description,
        alternates: {
            canonical: isChinese ? `${reportPath}?lang=zh-cn` : reportPath,
            languages: {en: reportPath, 'zh-CN': `${reportPath}?lang=zh-cn`},
        },
        openGraph: {
            type: 'article',
            title,
            description,
            url: isChinese ? `${reportPath}?lang=zh-cn` : reportPath,
            publishedTime: publishedAt,
            authors: ['Yinwen Gong'],
            siteName: 'MadEnroll',
        },
    }
}

export default async function NewsArticlePage({params, searchParams}: NewsPageProps) {
    if ((await params).id !== reportId) {
        notFound()
    }

    const isChinese = (await searchParams).lang === 'zh-cn'
    const backLabel = isChinese ? '← 返回首页' : '← Back to Home'

    // Structured data so search engines can attribute the report's figures to MadEnroll.
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Report',
        headline: isChinese ? 'MadEnroll 学期报告 -- FA26' : 'MadEnroll Semester Report -- FA26',
        description: isChinese ? reportDescription.zh : reportDescription.en,
        datePublished: publishedAt,
        inLanguage: isChinese ? 'zh-CN' : 'en',
        url: `https://madenroll.com${reportPath}${isChinese ? '?lang=zh-cn' : ''}`,
        author: {'@type': 'Person', name: 'Yinwen Gong', url: 'https://pages.cs.wisc.edu/~ygong68/'},
        publisher: {'@type': 'Organization', name: 'MadEnroll', url: 'https://madenroll.com'},
        about: 'Course enrollment at the University of Wisconsin–Madison',
    }

    return (
        <article className={styles.article} lang={isChinese ? 'zh-CN' : 'en'}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}/>
            <header className={styles.header}>
                <div className={styles.toolbar}>
                    <ProgressLink className={styles.back} href="/">{backLabel}</ProgressLink>
                    <LanguageSwitch isChinese={isChinese}/>
                </div>
                <h1>{isChinese ? 'MadEnroll 学期报告 -- FA26' : 'MadEnroll Semester Report -- FA26'}</h1>
                <time className={styles.date} dateTime={publishedAt}>
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
