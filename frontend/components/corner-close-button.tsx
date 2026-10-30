type CornerCloseButtonProps = {
    onClose: () => void
}

/** Close control cut diagonally into a panel's top-right corner. The panel must be `position: relative`. */
export function CornerCloseButton({onClose}: CornerCloseButtonProps) {
    return (
        <button aria-label="Close" className="dialog-corner-close" onClick={onClose} type="button">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round">
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/>
            </svg>
        </button>
    )
}
