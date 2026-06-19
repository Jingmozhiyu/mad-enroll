'use client'

import Link, { type LinkProps } from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type ReactNode,
} from 'react'

type RouteProgressContextValue = {
  start: (href?: string) => void
  done: () => void
}

type RouterNavigateOptions = {
  scroll?: boolean
}

const RouteProgressContext = createContext<RouteProgressContextValue | null>(null)

const INITIAL_PROGRESS = 0.12
const FAST_PROGRESS = 0.28
const SLOW_PROGRESS_CEILING = 0.88
const COMPLETE_PROGRESS = 1
const RESET_DELAY_MS = 220
const SLOW_ADVANCE_DELAY_MS = 180

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

export function RouteProgressProvider({
  children,
  shouldTrackNavigation,
}: {
  children: ReactNode
  shouldTrackNavigation?: (href: string) => boolean
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const locationKey = useMemo(() => {
    const query = searchParams.toString()
    return query ? `${pathname}?${query}` : pathname
  }, [pathname, searchParams])

  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [complete, setComplete] = useState(false)
  const hasMounted = useRef(false)
  const isNavigating = useRef(false)
  const previousLocationKey = useRef(locationKey)
  const slowAdvanceTimer = useRef<number | null>(null)
  const resetTimer = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (slowAdvanceTimer.current !== null) {
      window.clearTimeout(slowAdvanceTimer.current)
      slowAdvanceTimer.current = null
    }
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current)
      resetTimer.current = null
    }
  }, [])

  const scheduleSlowAdvance = useCallback(() => {
    if (typeof window === 'undefined') {
      return
    }

    function advance() {
      setProgress((current) => {
        if (!isNavigating.current || current >= SLOW_PROGRESS_CEILING) {
          return current
        }

        const remaining = SLOW_PROGRESS_CEILING - current
        const step = Math.max(0.012, remaining * 0.22)
        return Math.min(SLOW_PROGRESS_CEILING, current + step)
      })

      slowAdvanceTimer.current = window.setTimeout(advance, SLOW_ADVANCE_DELAY_MS)
    }

    slowAdvanceTimer.current = window.setTimeout(advance, SLOW_ADVANCE_DELAY_MS)
  }, [])

  const start = useCallback((href = '') => {
    if (shouldTrackNavigation && !shouldTrackNavigation(href)) {
      return
    }

    clearTimers()
    isNavigating.current = true
    setVisible(true)
    setComplete(false)
    setProgress((current) => (current > INITIAL_PROGRESS ? current : INITIAL_PROGRESS))

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        setProgress((current) => Math.max(current, FAST_PROGRESS))
      })
    }

    scheduleSlowAdvance()
  }, [clearTimers, scheduleSlowAdvance, shouldTrackNavigation])

  const done = useCallback(() => {
    if (!isNavigating.current) {
      return
    }

    clearTimers()
    isNavigating.current = false
    setComplete(true)
    setProgress(COMPLETE_PROGRESS)

    if (typeof window !== 'undefined') {
      resetTimer.current = window.setTimeout(() => {
        setVisible(false)
        setComplete(false)
        setProgress(0)
      }, RESET_DELAY_MS)
    }
  }, [clearTimers])

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      previousLocationKey.current = locationKey
      return
    }

    if (isNavigating.current && previousLocationKey.current !== locationKey) {
      previousLocationKey.current = locationKey
      const frameId = window.requestAnimationFrame(() => {
        done()
      })
      return () => window.cancelAnimationFrame(frameId)
    }

    previousLocationKey.current = locationKey
  }, [done, locationKey])

  useEffect(() => clearTimers, [clearTimers])

  return (
    <RouteProgressContext.Provider value={{ start, done }}>
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px]"
      >
        <div
          className="progress-indicator h-full origin-left transition-[transform,opacity] duration-200 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: `scaleX(${progress})`,
            transitionDuration: complete ? '160ms' : '220ms',
          }}
        />
      </div>
    </RouteProgressContext.Provider>
  )
}

export function useRouteProgress() {
  const context = useContext(RouteProgressContext)

  if (!context) {
    throw new Error('useRouteProgress must be used inside RouteProgressProvider.')
  }

  return context
}

export function useProgressRouter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { start, done } = useRouteProgress()
  const currentHref = useMemo(() => {
    const query = searchParams.toString()
    return query ? `${pathname}?${query}` : pathname
  }, [pathname, searchParams])

  const push = useCallback(
    (href: string, options?: RouterNavigateOptions) => {
      if (href === currentHref) {
        return
      }

      start(href)
      router.push(href, options)
    },
    [currentHref, router, start],
  )

  const replace = useCallback(
    (href: string, options?: RouterNavigateOptions) => {
      if (href === currentHref) {
        return
      }

      start(href)
      router.replace(href, options)
    },
    [currentHref, router, start],
  )

  const prefetch = useCallback(
    (href: string) => {
      void router.prefetch(href)
    },
    [router],
  )

  return {
    currentHref,
    done,
    prefetch,
    push,
    replace,
    start,
  }
}

type ProgressLinkProps = LinkProps &
  Omit<ComponentPropsWithoutRef<'a'>, 'href'> & {
    prefetchOnIntent?: boolean
  }

export function ProgressLink({
  href,
  onClick,
  onFocus,
  onMouseEnter,
  prefetch = true,
  prefetchOnIntent = true,
  target,
  ...props
}: ProgressLinkProps) {
  const { currentHref, prefetch: prefetchRoute, start } = useProgressRouter()

  function maybePrefetch() {
    if (prefetchOnIntent && typeof href === 'string') {
      prefetchRoute(href)
    }
  }

  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event)

        if (
          event.defaultPrevented ||
          isModifiedEvent(event) ||
          target === '_blank' ||
          (typeof href === 'string' && href === currentHref)
        ) {
          return
        }

        start(typeof href === 'string' ? href : '')
      }}
      onFocus={(event) => {
        onFocus?.(event)
        maybePrefetch()
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event)
        maybePrefetch()
      }}
      prefetch={prefetch}
      target={target}
    />
  )
}
