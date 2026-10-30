'use client'

import {useEffect, useRef, type ComponentProps} from 'react'
import {CornerCloseButton} from '@/components/corner-close-button'
import {MonitorAuthCard} from '@/components/monitor/monitor-sections'

type MonitorAuthOverlayProps = {
    open: boolean
    onClose: () => void
    authCardProps: ComponentProps<typeof MonitorAuthCard>
}

export function MonitorAuthOverlay({open, onClose, authCardProps}: MonitorAuthOverlayProps) {
    const dialogRef = useRef<HTMLDialogElement | null>(null)

    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return

        if (!open) {
            if (dialog.open) dialog.close()
            return
        }

        const previousFocus = document.activeElement as HTMLElement | null
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        if (!dialog.open) dialog.showModal()
        dialog.querySelector<HTMLInputElement>('#monitor-email')?.focus()

        return () => {
            if (dialog.open) dialog.close()
            document.body.style.overflow = previousOverflow
            if (previousFocus?.isConnected) previousFocus.focus()
        }
    }, [open])

    return (
        <dialog
            aria-labelledby="monitor-auth-heading"
            className="monitor-auth-dialog"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose()
            }}
            onCancel={(event) => {
                event.preventDefault()
                onClose()
            }}
            ref={dialogRef}
        >
            <CornerCloseButton onClose={onClose}/>
            {/* Right padding keeps the title clear of the corner close tab. */}
            <div className="border-b border-[var(--surface-divider)] py-4 pr-12 pl-5 md:pl-6">
                <h2 id="monitor-auth-heading" className="text-xl font-semibold text-[var(--color-ink)]">Welcome!</h2>
            </div>
            <div className="px-5 py-6 md:px-6">
                <MonitorAuthCard {...authCardProps}/>
            </div>
        </dialog>
    )
}
