import { BrandMark } from '@/components/brand-mark'

export default function AboutPage() {
  return (
    <section className="px-2 py-6 md:px-4 md:py-8">
      <div className="mx-auto flex min-h-[540px] w-full max-w-4xl flex-col items-center justify-center gap-8 md:gap-10">
        <div className="flex w-full justify-center">
          <BrandMark className="about-brand-word" variant="colorful" />
        </div>

        <div className="w-full max-w-3xl text-left">
          <div className="grid gap-10 md:gap-10">
            <p className="about-copy">
              <span className="about-placeholder">
                <strong>MadEnroll</strong> is an{' '}
                <a
                  className="about-inline-link"
                  href="https://github.com/Jingmozhiyu/mad-enroll"
                  rel="noreferrer"
                  target="_blank"
                >
                  open-source
                </a>{' '}
                web application dedicated to <strong>course enrollment</strong> for the{' '}
                <a
                  className="about-inline-link"
                  href="https://www.cs571.org/"
                  rel="noreferrer"
                  target="_blank"
                >
                  CS 571
                </a>{' '}
                Web Project. The energetic color palette is inspired by{' '}
                <a
                  className="about-inline-link-mmj italic"
                  href="https://projectsekai.fandom.com/wiki/MORE_MORE_JUMP!"
                  rel="noreferrer"
                  target="_blank"
                >
                  <span style={{ color: '#6ccb20' }}>MORE MORE JUMP!</span>
                </a>
                .
              </span>
            </p>

            <p className="about-copy">
              <span className="about-placeholder">
                Not getting a spot on the waitlist for a required class,
                or hearing rumors about a tough instructor, can stress
                students out for months. MadEnroll helps take that stress away by <strong>sending
                  real-time email alerts</strong> for open seats and showing visual grade distributions.
              </span>
            </p>

            <p className="about-copy">
              <span className="about-placeholder">
                It&apos;s built with modern tech like <strong>Next.js</strong>,{' '}
                <strong>TypeScript</strong>, and <strong>Tailwind CSS</strong>. Powered by a{' '}
                <a
                  className="about-inline-link"
                  href="https://github.com/Jingmozhiyu/uw-track"
                  rel="noreferrer"
                  target="_blank"
                >
                  custom Java backend
                </a>{' '}
                and the{' '}
                <a
                  className="about-inline-link"
                  href="https://api.madgrades.com/"
                  rel="noreferrer"
                  target="_blank"
                >
                  Madgrades API
                </a>
                , MadEnroll aims to offer a <strong>better UI</strong> and
                <strong> faster performance</strong> than any other UW course app out there.
              </span>
            </p>

            <div className="about-divider" />

            <p className="about-copy">
              <span className="about-placeholder">
                <strong>Special Thanks to:</strong>
                <br />
                Professor{' '}
                <a
                  className="about-inline-link"
                  href="https://coletnelson.us/"
                  rel="noreferrer"
                  target="_blank"
                >
                  Cole Nelson
                </a>
                , for sparking my interest in web development;
                <br />
                <a
                  className="about-inline-link"
                  href="https://madgrades.com/"
                  rel="noreferrer"
                  target="_blank"
                >
                  Madgrades.com
                </a>
                , for the open-source API and the React-based{' '}
                <a
                  className="about-inline-link"
                  href="https://github.com/Madgrades/madgrades.com"
                  rel="noreferrer"
                  target="_blank"
                >
                  project prototype
                </a>
                .
              </span>
            </p>

            <p className="about-meta">
              Created by{' '}
              <a
                className="about-inline-link"
                href="https://pages.cs.wisc.edu/~ygong68/"
                rel="noreferrer"
                target="_blank"
              >
                Yinwen Gong
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
