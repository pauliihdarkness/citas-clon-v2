import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { PageTransition } from './PageTransition'

const NAV = [
  { to: '/', label: 'Feed', className: 'nav-btn-home', end: true },
  { to: '/map', label: 'Mapa', className: 'nav-btn-map' },
  { to: '/explorer', label: 'Explorer', className: '' },
  { to: '/storage', label: 'Storage', className: '' },
  { to: '/inbox', label: 'Inbox', className: 'nav-btn-inbox' },
  { to: '/chat', label: 'Global', className: 'nav-btn-chat' },
  { to: '/activity', label: 'Actividad', className: 'nav-btn-activity' },
  { to: '/profile', label: 'Perfil', className: 'nav-btn-profile' },
]

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navRef = useRef(null)
  const toggleRef = useRef(null)

  useEffect(() => {
    document.body.classList.add('has-nav')
    return () => document.body.classList.remove('has-nav')
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    function onDocClick(e) {
      if (!menuOpen) return
      const nav = navRef.current
      const btn = toggleRef.current
      if (nav && !nav.contains(e.target) && btn && !btn.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [menuOpen])

  function closeMenu() {
    setMenuOpen(false)
  }

  function toggleMenu() {
    setMenuOpen((o) => !o)
  }

  return (
    <>
      <nav ref={navRef} className={menuOpen ? 'menu-open' : ''}>
        <div className="nav-header">
          <span className="nav-logo">SYS</span>
          <button
            ref={toggleRef}
            type="button"
            id="menu-toggle"
            className={`hamburger-btn${menuOpen ? ' active' : ''}`}
            aria-expanded={menuOpen}
            aria-label="Abrir menú"
            onClick={(e) => {
              e.stopPropagation()
              toggleMenu()
            }}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
        <div className="nav-links">
          {NAV.map(({ to, label, className, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [className, isActive ? 'nav-active' : ''].filter(Boolean).join(' ')
              }
              onClick={closeMenu}
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main id="main-content">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </>
  )
}
