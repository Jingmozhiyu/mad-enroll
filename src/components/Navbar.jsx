import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Welcome', end: true },
  { to: '/monitor', label: 'Course Monitor' },
]

function Navbar() {
  return (
    <header className="navbar">
      <div>
        <p className="navbar__eyebrow">UW Madison Course Monitor</p>
        <h1 className="navbar__title">React Frontend</h1>
      </div>
      <nav className="navbar__nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `navbar__link${isActive ? ' navbar__link--active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

export default Navbar
