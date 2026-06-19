'use client'

import { useEffect, useMemo, useState } from 'react'

export type SearchEntityOption = {
  key: string
  label: string
  sublabel?: string
}

type EntityMultiSelectProps = {
  title: string
  placeholder: string
  selected: SearchEntityOption[]
  onChange: (nextValue: SearchEntityOption[]) => void
  searcher: (query: string) => Promise<SearchEntityOption[]>
}

export function EntityMultiSelect({
  title,
  placeholder,
  selected,
  onChange,
  searcher,
}: EntityMultiSelectProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<SearchEntityOption[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (query.trim().length < 2) {
      setOptions([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const results = await searcher(query.trim())
        setOptions(results)
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => window.clearTimeout(timer)
  }, [query, searcher])

  const filteredOptions = useMemo(
    () => options.filter((option) => !selected.some((item) => item.key === option.key)),
    [options, selected],
  )

  function addOption(option: SearchEntityOption) {
    onChange([...selected, option])
    setQuery('')
    setOptions([])
    setOpen(false)
  }

  function removeOption(key: string) {
    onChange(selected.filter((item) => item.key !== key))
  }

  return (
    <div className="relative grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-bold text-[var(--color-ink-soft)]">{title}</label>
        {selected.length > 0 ? (
          <button
            className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-deep-teal)]"
            onClick={() => onChange([])}
            type="button"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="surface-panel rounded-[22px] p-3">
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <span
              key={item.key}
              className="selected-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-[var(--color-ink)]"
            >
              {item.label}
              <button
                className="text-[var(--color-ink-soft)]"
                onClick={() => removeOption(item.key)}
                type="button"
              >
                ×
              </button>
            </span>
          ))}

          <input
            className="min-w-[180px] flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-soft)]"
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 120)
            }}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            value={query}
          />
        </div>
      </div>

      {open && query.trim().length >= 2 ? (
        <div className="surface-dropdown absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-[22px]">
          {loading ? (
            <div className="px-4 py-4 text-sm text-[var(--color-ink-soft)]">Searching...</div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-4 py-4 text-sm text-[var(--color-ink-soft)]">
              No matches found.
            </div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.key}
                className="interactive-row flex w-full items-start justify-between gap-3 border-b border-[var(--surface-border)] px-4 py-3 text-left last:border-b-0"
                onClick={() => addOption(option)}
                type="button"
              >
                <span>
                  <span className="block text-sm font-semibold text-[var(--color-ink)]">
                    {option.label}
                  </span>
                  {option.sublabel ? (
                    <span className="block text-xs text-[var(--color-ink-soft)]">
                      {option.sublabel}
                    </span>
                  ) : null}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-deep-teal)]">
                  Add
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
