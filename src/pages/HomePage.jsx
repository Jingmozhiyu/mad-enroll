import { Link } from 'react-router-dom'

function HomePage() {
  return (
    <section className="hero-card">
      <div className="hero-card__content">
        <p className="section-heading__eyebrow">Welcome</p>
        <h2>Course monitor frontend has been split into React pages and components.</h2>
        <p className="hero-card__text">
          The old static HTML, inline styles, and global JavaScript are now intended to
          live behind a routed interface. Use the monitor page to manage login, search,
          and course tracking tasks.
        </p>
        <div className="hero-card__actions">
          <Link className="btn btn--accent" to="/monitor">
            Open Monitor
          </Link>
        </div>
      </div>
      <div className="hero-card__visual" aria-hidden="true">
        <div className="orb orb--green" />
        <div className="orb orb--pink" />
        <div className="orb orb--blue" />
      </div>
    </section>
  )
}

export default HomePage
