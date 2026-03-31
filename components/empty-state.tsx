type EmptyStateProps = {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-[28px] border border-dashed border-[rgba(154,238,222,0.4)] bg-white/50 px-5 py-8 text-center">
      <h3 className="text-2xl font-semibold text-[var(--color-ink)]">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--color-ink-soft)]">
        {description}
      </p>
    </div>
  )
}
