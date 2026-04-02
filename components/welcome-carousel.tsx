'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const slides = [
  {
    src: '/monitor-panel.jpeg',
    alt: 'Monitor dashboard screenshot',
    label: 'Monitor dashboard',
  },
  {
    src: '/charts.jpeg',
    alt: 'Course analytics charts screenshot',
    label: 'Course analytics',
  },
] as const

export function WelcomeCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [])

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
            sizes="(min-width: 768px) 45vw, 100vw"
            src={slide.src}
          />
        </div>
      ))}

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
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
