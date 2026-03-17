import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'

function AppLayout() {
  return (
    <div className="app-shell">
      <div className="app-shell__backdrop app-shell__backdrop--mint" />
      <div className="app-shell__backdrop app-shell__backdrop--peach" />
      <div className="app-shell__backdrop app-shell__backdrop--blue" />
      <div className="app-shell__inner">
        <Navbar />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
