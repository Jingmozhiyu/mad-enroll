'use client'

import {useEffect, useState, type FormEvent} from 'react'
import {submitFeedback} from '@/lib/api/client/feedback'
import {getErrorMessage} from '@/lib/api/client/http'

export type PanelKey = 'developer-log' | 'faq' | 'feedback' | null

type FeedbackFormState = {
    message: string
}

type UseAboutPanelsOptions = {
    activePanel?: PanelKey
    onActivePanelChange?: (panel: PanelKey) => void
}

const initialFeedbackForm: FeedbackFormState = {
    message: '',
}

export function useAboutPanels({
                                   activePanel: controlledActivePanel,
                                   onActivePanelChange,
                               }: UseAboutPanelsOptions = {}) {
    const [internalActivePanel, setInternalActivePanel] = useState<PanelKey>(null)
    const [openFaqIndex, setOpenFaqIndex] = useState<number>(0)
    const [feedbackForm, setFeedbackForm] = useState(initialFeedbackForm)
    const [feedbackError, setFeedbackError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showThankYou, setShowThankYou] = useState(false)
    const activePanel = controlledActivePanel ?? internalActivePanel

    function setActivePanel(panel: PanelKey) {
        if (controlledActivePanel === undefined) {
            setInternalActivePanel(panel)
        }

        onActivePanelChange?.(panel)
    }

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

    function updateFeedbackMessage(message: string) {
        setFeedbackForm((current) => ({...current, message}))
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

    return {
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
    }
}
