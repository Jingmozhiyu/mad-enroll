type EmptyStateProps = {
    title: string
    description: string
    bordered?: boolean
}

export function EmptyState({title, description, bordered = true}: EmptyStateProps) {
    return (
        <div className={`${bordered ? 'border-y border-[var(--surface-divider)] ' : ''}px-5 py-10 text-center`}>
            <h3 className="text-2xl font-semibold text-[var(--color-ink)]">{title}</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--color-ink-soft)]">
                {description}
            </p>
        </div>
    )
}
