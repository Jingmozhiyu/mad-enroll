type EmptyStateProps = {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="surface-panel-dashed rounded-[28px] px-5 py-8 text-center">
      <h3 className="text-2xl font-semibold text-[var(--color-ink)]">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--color-ink-soft)]">
        {description}
      </p>
    </div>
  )
}
