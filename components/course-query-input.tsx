'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useProgressRouter } from '@/components/navigation-progress'
import { fetchCourseSuggestions } from '@/lib/madgrades/client-api'
import type { MadgradesCourseSuggestion } from '@/lib/madgrades/types'

type CourseQueryInputProps = {
  value: string
  onValueChange: (value: string) => void
  onSubmit: (value: string) => void
  onSelectSuggestion?: (suggestion: MadgradesCourseSuggestion) => void
  placeholder: string
  inputClassName?: string
}

export function CourseQueryInput({
  value,
  onValueChange,
  onSubmit,
  onSelectSuggestion,
  placeholder,
  inputClassName,
}: CourseQueryInputProps) {
  const router = useProgressRouter()
  const [suggestions, setSuggestions] = useState<MadgradesCourseSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (value.trim().length < 2) {
      setSuggestions([])
      setActiveIndex(-1)
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const results = await fetchCourseSuggestions(value.trim())
        setSuggestions(results)
        setOpen(true)
        setActiveIndex(-1)
      } catch {
        setSuggestions([])
        setActiveIndex(-1)
      } finally {
        setLoading(false)
      }
    }, 180)

    return () => window.clearTimeout(timer)
  }, [value])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const visibleSuggestions = useMemo(() => suggestions.slice(0, 8), [suggestions])

  useEffect(() => {
    visibleSuggestions.slice(0, 4).forEach((suggestion) => {
      router.prefetch(`/courses/${suggestion.uuid}`)
    })
  }, [router, visibleSuggestions])

  function commitQuery(nextValue: string) {
    onValueChange(nextValue)
    setOpen(false)
    setActiveIndex(-1)
    onSubmit(nextValue)
  }

  function selectSuggestion(suggestion: MadgradesCourseSuggestion) {
    onValueChange(suggestion.name)
    setOpen(false)
    setActiveIndex(-1)
    if (onSelectSuggestion) {
      onSelectSuggestion(suggestion)
      return
    }
    onSubmit(suggestion.name)
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        className={inputClassName ?? 'input-shell'}
        onChange={(event) => {
          onValueChange(event.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          if (visibleSuggestions.length > 0) {
            setOpen(true)
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            if (visibleSuggestions.length > 0) {
              setOpen(true)
              setActiveIndex((current) =>
                current < visibleSuggestions.length - 1 ? current + 1 : 0,
              )
            }
            return
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault()
            if (visibleSuggestions.length > 0) {
              setOpen(true)
              setActiveIndex((current) =>
                current > 0 ? current - 1 : visibleSuggestions.length - 1,
              )
            }
            return
          }

          if (event.key === 'Escape') {
            setOpen(false)
            setActiveIndex(-1)
            return
          }

          if (event.key === 'Enter') {
            event.preventDefault()
            const highlighted = activeIndex >= 0 ? visibleSuggestions[activeIndex] : null
            if (highlighted) {
              selectSuggestion(highlighted)
            } else {
              commitQuery(value)
            }
          }
        }}
        placeholder={placeholder}
        value={value}
      />

      {open && value.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-[18px] border border-[rgba(154,238,222,0.3)] bg-white shadow-[0_20px_50px_rgba(50,90,81,0.12)]">
          {loading ? (
            <div className="px-4 py-3 text-sm text-[var(--color-ink-soft)]">Searching...</div>
          ) : visibleSuggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--color-ink-soft)]">
              No matching courses.
            </div>
          ) : (
            visibleSuggestions.map((suggestion, index) => {
              const active = index === activeIndex
              return (
                <button
                  key={`${suggestion.uuid}-${suggestion.name}`}
                  className={[
                    'flex w-full items-start justify-between gap-3 border-b border-[rgba(154,238,222,0.14)] px-4 py-3 text-left last:border-b-0',
                    active ? 'bg-[rgba(154,238,222,0.18)]' : 'hover:bg-[rgba(154,238,222,0.12)]',
                  ].join(' ')}
                  onClick={() => selectSuggestion(suggestion)}
                  onFocus={() => router.prefetch(`/courses/${suggestion.uuid}`)}
                  onMouseEnter={() => setActiveIndex(index)}
                  type="button"
                >
                  <span>
                    <span className="block text-sm font-semibold text-[var(--color-ink)]">
                      {suggestion.name}
                    </span>
                    <span className="block text-xs text-[var(--color-ink-soft)]">
                      {suggestion.displayLine}
                    </span>
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-deep-teal)]">
                    Search
                  </span>
                </button>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}
