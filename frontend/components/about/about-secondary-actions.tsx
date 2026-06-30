'use client'

import Image from 'next/image'
import {useEffect, useSyncExternalStore, type ReactNode} from 'react'
import {createPortal} from 'react-dom'
import {useAboutPanels, type PanelKey} from '@/components/about/use-about-panels'

export type {PanelKey}

type FaqItem = {
    question: string
    answer: string
}

function useHasMounted() {
    return useSyncExternalStore(
        () => () => {
        },
        () => true,
        () => false,
    )
}

const developerLogEntries = [
    {
        title: 'Interface and API cleanup',
        date: 'June 21, 2026',
        body: [
            'MadEnroll now has a much clearer UI than before.',
            'The frontend API layer and CSS structure were reorganized so future changes are easier to make safely.',
        ],
    },
    {
        title: 'MadEnroll is released!',
        date: 'April 5, 2026',
        body: [
            'Welcome to MadEnroll. Snipe popular courses as you wish.',
        ],
    }
]


const faqItems: FaqItem[] = [
    {
        question: 'When will I receive an email alert?',
        answer:
            'You will receive an email when a section becomes more available, for example, when it changes from closed to waitlist, closed to open, or waitlist to open.\n\nBecause seats can disappear quickly, one alert does not guarantee successful enrollment. If the section becomes available again later, another alert may be sent.',
    },
    {
        question: 'When is MadEnroll most useful?',
        answer:
            'MadEnroll is most useful when a course or section has no waitlist, when departments release seats in batches during SOAR, or when seats reappear during the add/drop period.',
    },
    {
        question: 'Does MadEnroll replace the official waitlist?',
        answer:
            'No. MadEnroll is not a replacement for the official waitlist. It is a separate alert tool for cases where waitlists are limited, unavailable, or not enough for the specific section you want.',
    },
    {
        question: 'What information do I need to create an account?',
        answer:
            'To use seat alerts, you only need an email address and a password. You can browse grade distributions without creating an account.\n\nYour email is used only for alert-related messages, and your password is stored as a secure hash.',
    },
]

function ModalShell({
                        title,
                        onClose,
                        children,
                    }: {
    title: string
    onClose: () => void
    children: ReactNode
}) {
    const hasMounted = useHasMounted()

    useEffect(() => {
        function handleKeydown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeydown)
        return () => window.removeEventListener('keydown', handleKeydown)
    }, [onClose])

    useEffect(() => {
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        return () => {
            document.body.style.overflow = previousOverflow
        }
    }, [])

    if (!hasMounted) {
        return null
    }

    return createPortal(
        <div
            className="overlay-backdrop fixed inset-0 z-50 flex items-center justify-center px-4 py-6 backdrop-blur-sm">
            <div className="surface-panel-strong relative max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-[14px]">
                <div
                    className="subtle-panel-divider flex items-center justify-between gap-4 border-b px-6 py-4 md:px-8">
                    <div>
                        <h2 className="text-2xl font-semibold text-[var(--color-ink)] md:text-3xl">
                            {title}
                        </h2>
                    </div>
                    <button
                        className="button-ghost min-w-[96px] focus:outline-none focus-visible:outline-none"
                        onClick={onClose}
                        type="button"
                    >
                        Close
                    </button>
                </div>

                <div className="max-h-[calc(88vh-5.75rem)] overflow-y-auto px-6 py-5 md:px-8">
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    )
}

function InlineAction({
                          label,
                          onClick,
                      }: {
    label: string
    onClick: () => void
}) {
    return (
        <button
            className="bg-transparent p-0 text-sm font-medium text-[var(--color-ink-soft)] underline decoration-[var(--about-inline-decoration)] underline-offset-[0.24em] transition hover:text-[var(--color-ink)] hover:decoration-[var(--about-inline-decoration-hover)] focus:outline-none focus-visible:outline-none"
            onClick={onClick}
            type="button"
        >
            {label}
        </button>
    )
}

function AccordionItem({
                           item,
                           isOpen,
                           onToggle,
                       }: {
    item: FaqItem
    isOpen: boolean
    onToggle: () => void
}) {
    return (
        <div className="border-b border-[var(--surface-divider)] last:border-b-0">
            <button
                className="flex w-full items-center justify-between gap-4 py-4 text-left focus:outline-none focus-visible:outline-none"
                onClick={onToggle}
                type="button"
            >
                <div>
                    <p className="text-base font-semibold text-[var(--color-ink)]">
                        {item.question}
                    </p>
                </div>
                <span className="text-xl leading-none text-[var(--color-ink-soft)]">
          {isOpen ? '−' : '+'}
        </span>
            </button>

            {isOpen ? (
                <div className="pb-5">
                    <p className="whitespace-pre-line text-md leading-7 text-[var(--color-ink-soft)]">
                        {item.answer}
                    </p>
                </div>
            ) : null}
        </div>
    )
}

function ThankYouToast({visible}: { visible: boolean }) {
    const hasMounted = useHasMounted()

    if (!hasMounted) {
        return null
    }

    return createPortal(
        <div
            className={[
                'pointer-events-none fixed inset-x-0 top-10 z-[60] flex justify-center px-4 transition-all duration-500',
                visible ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0',
            ].join(' ')}
        >
            <div className="surface-toast flex w-full max-w-lg items-center gap-5 rounded-[8px] px-5 py-4">
                <div
                    className="surface-panel-muted flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[8px]">
                    <Image alt="Thank you" height={112} src="/img.png" width={112}/>
                </div>
                <div>
                    <p className="text-lg font-semibold text-[var(--color-ink)]">Thank you for the note.</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--color-ink-soft)]">
                        Developer will receive the feedback immediately.
                    </p>
                </div>
            </div>
        </div>,
        document.body,
    )
}

export function AboutSecondaryActions({
                                          activePanel: controlledActivePanel,
                                          onActivePanelChange,
                                      }: {
    activePanel?: PanelKey
    onActivePanelChange?: (panel: PanelKey) => void
} = {}) {
    const {
        activePanel,
        closePanel,
        feedbackError,
        feedbackForm,
        handleFeedbackSubmit,
        isSubmitting,
        openFaqIndex,
        setActivePanel,
        setOpenFaqIndex,
        showThankYou,
        updateFeedbackMessage,
    } = useAboutPanels({
        activePanel: controlledActivePanel,
        onActivePanelChange,
    })

    return (
        <>
            <div className="flex flex-wrap items-center justify-center gap-0 pt-4 text-center">
                <InlineAction label="📖 Developer Log" onClick={() => setActivePanel('developer-log')}/>
                <span className="px-3 text-[var(--inline-muted)]">|</span>
                <InlineAction label="❓ FAQ" onClick={() => setActivePanel('faq')}/>
                <span className="px-3 text-[var(--inline-muted)]">|</span>
                <InlineAction label="💡 Send Feedback" onClick={() => setActivePanel('feedback')}/>
            </div>

            {activePanel === 'developer-log' ? (
                <ModalShell onClose={closePanel} title="Developer Log">
                    <div className="grid border-y border-[var(--surface-divider)]">
                        {developerLogEntries.map((entry) => (
                            <article
                                className="border-b border-[var(--surface-divider)] py-5 last:border-b-0"
                                key={entry.title}
                            >
                                <div className="flex flex-wrap items-baseline justify-between gap-3">
                                    <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                                        {entry.title}
                                    </h3>
                                    <p className="text-sm font-semibold text-[var(--color-deep-teal)]">
                                        {entry.date}
                                    </p>
                                </div>
                                <div className="mt-3 grid gap-3">
                                    {entry.body.map((paragraph) => (
                                        <p key={paragraph} className="text-base leading-8 text-[var(--color-ink-soft)]">
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                </ModalShell>
            ) : null}

            {activePanel === 'faq' ? (
                <ModalShell onClose={closePanel} title="Frequently asked questions">
                    <div className="border-y border-[var(--surface-divider)]">
                        {faqItems.map((item, index) => (
                            <AccordionItem
                                key={item.question}
                                isOpen={openFaqIndex === index}
                                item={item}
                                onToggle={() => setOpenFaqIndex((current) => (current === index ? -1 : index))}
                            />
                        ))}
                    </div>
                </ModalShell>
            ) : null}

            {activePanel === 'feedback' ? (
                <ModalShell onClose={closePanel} title="Send a quick note">
                    <form className="grid gap-5" onSubmit={handleFeedbackSubmit}>
                        {feedbackError ? (
                            <div
                                className="status-alert-error rounded-[10px] px-4 py-3 text-sm text-[var(--color-ink)]">
                                {feedbackError}
                            </div>
                        ) : null}

                        <label className="grid gap-2">
                            <span className="text-sm font-bold text-[var(--color-ink-soft)]">Feedback</span>
                            <textarea
                                className="input-shell min-h-[220px] resize-y"
                                onChange={(event) =>
                                    updateFeedbackMessage(event.target.value)
                                }
                                placeholder="Tell me what felt good, what felt confusing, or what should be improved next..."
                                required
                                value={feedbackForm.message}
                            />
                        </label>

                        <div className="flex justify-end">
                            <button className="button-primary min-w-[144px]" disabled={isSubmitting} type="submit">
                                {isSubmitting ? 'Sending...' : 'Submit'}
                            </button>
                        </div>
                    </form>
                </ModalShell>
            ) : null}

            <ThankYouToast visible={showThankYou}/>
        </>
    )
}
