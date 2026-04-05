'use client'

import Image from 'next/image'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { getErrorMessage, submitFeedback } from '@/lib/api'

type PanelKey = 'developer-log' | 'faq' | 'feedback' | null

type FeedbackFormState = {
  message: string
}

type FaqItem = {
  question: string
  answer: string
}

const initialFeedbackForm: FeedbackFormState = {
  message: '',
}

const developerLogEntry = {
  title: 'Product Update',
  date: 'April 5, 2026',
  body: [
    'MadEnroll now centers the product around seat alerts for specific UW-Madison courses and sections.',
    'Course browsing and grade distributions still exist, but they now support that main alert workflow instead of competing with it.',
  ],
}

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
  eyebrow,
  onClose,
  children,
}: {
  title: string
  eyebrow: string
  onClose: () => void
  children: ReactNode
}) {
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

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,49,60,0.18)] px-4 py-6 backdrop-blur-sm">
      <div className="glass-card relative max-h-[88vh] w-full max-w-3xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-[rgba(154,238,222,0.2)] px-6 py-5 md:px-8">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)] md:text-3xl">
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

        <div className="max-h-[calc(88vh-6.5rem)] overflow-y-auto px-6 py-5 md:px-8">
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
      className="bg-transparent p-0 text-sm font-medium text-[var(--color-ink-soft)] underline decoration-[rgba(79,108,118,0.38)] underline-offset-[0.24em] transition hover:text-[var(--color-ink)] hover:decoration-[rgba(23,49,60,0.5)] focus:outline-none focus-visible:outline-none"
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  )
}

function AccordionItem({
  item,
  index,
  isOpen,
  onToggle,
}: {
  item: FaqItem
  index: number
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[rgba(154,238,222,0.2)] bg-white/72">
      <button
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus:outline-none focus-visible:outline-none"
        onClick={onToggle}
        type="button"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-deep-teal)]">
            FAQ {String(index + 1).padStart(2, '0')}
          </p>
          <p className="mt-1 text-base font-semibold text-[var(--color-ink)]">
            {item.question}
          </p>
        </div>
        <span className="text-xl leading-none text-[var(--color-ink-soft)]">
          {isOpen ? '−' : '+'}
        </span>
      </button>

      {isOpen ? (
        <div className="border-t border-[rgba(154,238,222,0.14)] px-5 py-5">
            <p className="whitespace-pre-line text-sm leading-7 text-[var(--color-ink-soft)]">
                {item.answer}
            </p>
        </div>
      ) : null}
    </div>
  )
}

function ThankYouToast({ visible }: { visible: boolean }) {
  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className={[
        'pointer-events-none fixed inset-x-0 top-10 z-[60] flex justify-center px-4 transition-all duration-500',
        visible ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0',
      ].join(' ')}
    >
      <div className="flex w-full max-w-lg items-center gap-5 rounded-[8px] border border-[rgba(23,49,60,0.08)] bg-white px-5 py-4 shadow-[0_14px_36px_rgba(23,49,60,0.12)]">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-white">
          <Image alt="Thank you" height={112} src="/img.png" width={112} />
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

export function AboutSecondaryActions() {
  const [activePanel, setActivePanel] = useState<PanelKey>(null)
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0)
  const [feedbackForm, setFeedbackForm] = useState(initialFeedbackForm)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)

  useEffect(() => {
    if (!showThankYou) {
      return
    }

    const hideTimer = window.setTimeout(() => {
      setShowThankYou(false)
    }, 5000)

    return () => window.clearTimeout(hideTimer)
  }, [showThankYou])

  function closePanel() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    setFeedbackError(null)
    setActivePanel(null)
  }

  async function handleFeedbackSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setIsSubmitting(true)
      setFeedbackError(null)
      await submitFeedback(feedbackForm)
      setFeedbackForm(initialFeedbackForm)
      closePanel()
      setShowThankYou(true)
    } catch (error) {
      setFeedbackError(getErrorMessage(error, 'Failed to submit feedback.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-0 pt-4 text-center">
        <InlineAction label="📖 Developer Log" onClick={() => setActivePanel('developer-log')} />
        <span className="px-3 text-[rgba(79,108,118,0.44)]">|</span>
        <InlineAction label="❓ FAQ" onClick={() => setActivePanel('faq')} />
        <span className="px-3 text-[rgba(79,108,118,0.44)]">|</span>
        <InlineAction label="💡 Send Feedback" onClick={() => setActivePanel('feedback')} />
      </div>

      {activePanel === 'developer-log' ? (
        <ModalShell eyebrow="Developer Log" onClose={closePanel} title={developerLogEntry.title}>
          <div className="grid gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-deep-teal)]">
              {developerLogEntry.date}
            </p>
            {developerLogEntry.body.map((paragraph) => (
              <p key={paragraph} className="text-base leading-8 text-[var(--color-ink-soft)]">
                {paragraph}
              </p>
            ))}
          </div>
        </ModalShell>
      ) : null}

      {activePanel === 'faq' ? (
        <ModalShell eyebrow="FAQ" onClose={closePanel} title="Frequently asked questions">
          <div className="grid gap-4">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={item.question}
                index={index}
                isOpen={openFaqIndex === index}
                item={item}
                onToggle={() => setOpenFaqIndex((current) => (current === index ? -1 : index))}
              />
            ))}
          </div>
        </ModalShell>
      ) : null}

      {activePanel === 'feedback' ? (
        <ModalShell eyebrow="Feedback" onClose={closePanel} title="Send a quick note">
          <form className="grid gap-5" onSubmit={handleFeedbackSubmit}>
            {feedbackError ? (
              <div className="rounded-[20px] border border-[rgba(255,169,204,0.35)] bg-[rgba(255,169,204,0.16)] px-4 py-3 text-sm text-[var(--color-ink)]">
                {feedbackError}
              </div>
            ) : null}

            <label className="grid gap-2">
              <span className="text-sm font-bold text-[var(--color-ink-soft)]">Feedback</span>
              <textarea
                className="input-shell min-h-[220px] resize-y"
                onChange={(event) =>
                  setFeedbackForm((current) => ({ ...current, message: event.target.value }))
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

      <ThankYouToast visible={showThankYou} />
    </>
  )
}
