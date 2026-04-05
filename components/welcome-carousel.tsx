'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const AUTO_ROTATE_DELAY_MS = 3000

const slides = [
  {
    src: '/search-panel.jpeg',
    alt: 'Browse sections screenshot',
    label: 'Browse sections',
  },
  {
    src: '/monitor-panel.jpeg',
    alt: 'Track alerts screenshot',
    label: 'Track alerts',
  },
  {
    src: '/charts.jpeg',
    alt: 'Browse grades screenshot',
    label: 'Browse grades',
  },
] as const

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d={
          direction === 'left'
            ? 'M9.5 3.5 5 8l4.5 4.5'
            : 'M6.5 3.5 11 8l-4.5 4.5'
        }
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  )
}

export function WelcomeCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, AUTO_ROTATE_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [activeIndex])

  function showSlide(nextIndex: number) {
    setActiveIndex((nextIndex + slides.length) % slides.length)
  }

  function showPreviousSlide() {
    showSlide(activeIndex - 1)
  }

  function showNextSlide() {
    showSlide(activeIndex + 1)
  }

  return (
    <div className="glass-card relative aspect-[3/2] overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(23,49,60,0.08))]" />

      {slides.map((slide, index) => (
        <div
          key={slide.src}
          aria-hidden={index !== activeIndex}
          className={[
            'absolute inset-0 transition-opacity duration-500 ease-out',
            index === activeIndex ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          <Image
            fill
            priority={index === 0}
            alt={slide.alt}
            className="object-cover"
            sizes="(min-width: 768px) 60vw, 100vw"
            src={slide.src}
          />
        </div>
      ))}

      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-1 md:px-1.5">
        <button
          aria-label="Show previous image"
          className="pointer-events-auto inline-flex h-14 w-8 items-center justify-center text-black/10 [filter:drop-shadow(0_2px_8px_rgba(23,49,60,0.35))] transition text-black/30 focus-visible:text-black/30 focus-visible:outline-none"
          onClick={showPreviousSlide}
          type="button"
        >
          <ArrowIcon direction="left" />
        </button>

        <button
          aria-label="Show next image"
          className="pointer-events-auto inline-flex h-14 w-8 items-center justify-center text-black/10 [filter:drop-shadow(0_2px_8px_rgba(23,49,60,0.35))] transition text-black/30 focus-visible:text-black/30 focus-visible:outline-none"
          onClick={showNextSlide}
          type="button"
        >
          <ArrowIcon direction="right" />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-[linear-gradient(180deg,rgba(23,49,60,0),rgba(23,49,60,0.6))] px-5 py-4 md:px-6">
        <p className="text-sm font-semibold tracking-[0.04em] text-white/92">
          {slides[activeIndex].label}
        </p>

        <div className="flex items-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.src}
              aria-label={`Show ${slide.label}`}
              className={[
                'h-2.5 rounded-full transition-all',
                index === activeIndex ? 'w-7 bg-white' : 'w-2.5 bg-white/55 hover:bg-white/75',
              ].join(' ')}
              onClick={() => showSlide(index)}
              type="button"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
