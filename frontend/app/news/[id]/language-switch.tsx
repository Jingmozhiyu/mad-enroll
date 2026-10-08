'use client'

import Link from 'next/link'
import {usePathname, useRouter} from 'next/navigation'
import {useTransition} from 'react'
import styles from './page.module.css'

export function LanguageSwitch({isChinese}: {isChinese: boolean}) {
    const pathname = usePathname()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const targetLanguage = isChinese ? 'en-us' : 'zh-cn'
    const href = `${pathname}?lang=${targetLanguage}`

    return (
        <Link
            className={styles.languageSwitch}
            href={href}
            hrefLang={targetLanguage}
            lang={targetLanguage}
            aria-label={isChinese ? 'Switch to English' : '切换为中文'}
            aria-busy={isPending}
            onClick={event => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                    return
                }
                event.preventDefault()
                if (isPending) {
                    return
                }
                startTransition(() => router.push(href, {scroll: false}))
            }}
        >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h12M9 3v2M12 5c-1 6-4 9-9 11M5 8c2 4 4 6 8 8M14 21l4-10 4 10M15.5 17h5"/>
            </svg>
        </Link>
    )
}
