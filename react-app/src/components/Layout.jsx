import { NavLink, Outlet } from 'react-router-dom'
import { Home, Map as MapIcon, MessageSquare, Zap, User } from 'lucide-react'
import { PageTransition } from './PageTransition'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useState, useEffect, useRef } from 'react'
import { useToast } from '../context/ToastContext'
import { useLocation } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Feed', icon: Home, end: true },
  { to: '/map', label: 'Mapa', icon: MapIcon },
  { to: '/inbox', label: 'Inbox', icon: MessageSquare },
  { to: '/activity', label: 'Radar', icon: Zap },
  { to: '/profile', label: 'Perfil', icon: User },
]

export function Layout() {
  const { profile } = useAuth()
  const { addToast } = useToast()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)
  const currentUserAlias = profile?.alias || localStorage.getItem('alias')
  const prevConversationsRef = useRef({})
  const isFirstLoadRef = useRef(true)

  useEffect(() => {
    const checkNavVisibility = () => {
      const isMobile = window.innerWidth <= 768
      const params = new URLSearchParams(location.search)
      const isMap = location.pathname === '/map'
      const isSpecificChat = location.pathname === '/inbox' && params.has('with')
      
      if (isMobile && (isSpecificChat || isMap)) {
        document.body.classList.add('nav-hidden')
      } else {
        document.body.classList.remove('nav-hidden')
      }
    }

    checkNavVisibility()
    window.addEventListener('resize', checkNavVisibility)
    
    return () => {
      window.removeEventListener('resize', checkNavVisibility)
      document.body.classList.remove('nav-hidden')
    }
  }, [location])

  useEffect(() => {
    document.body.classList.add('has-bottom-nav')
    return () => {
      document.body.classList.remove('has-bottom-nav')
      document.body.classList.remove('nav-hidden')
    }
  }, [])

  // Escuchar mensajes no leídos
  useEffect(() => {
    if (!currentUserAlias) return undefined

    const q = query(
      collection(db, 'conversaciones'),
      where('participantes', 'array-contains', currentUserAlias),
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0
      const currentConvs = {}

      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        const id = doc.id
        currentConvs[id] = data

        const isUnread = data.visto === false && data.ultimoRemitente !== currentUserAlias
        if (isUnread) count++

        // Lógica de Toast: Solo si no es la primera carga y el estado cambió a no leído
        if (!isFirstLoadRef.current) {
          const prevState = prevConversationsRef.current[id]
          const becameUnread = isUnread && (!prevState || prevState.visto !== false || prevState.ultimoMensaje !== data.ultimoMensaje)
          
          if (becameUnread) {
            // No mostrar toast si ya estamos en la página de Inbox para este usuario
            const params = new URLSearchParams(window.location.search)
            const chatWith = params.get('with')
            const isViewingThisChat = window.location.pathname.includes('/inbox') && chatWith === data.ultimoRemitente

            if (!isViewingThisChat) {
              addToast(`MENSAJE_ENTRANTE: @${data.ultimoRemitente}`, 'info')
            }
          }
        }
      })

      setUnreadCount(count)
      prevConversationsRef.current = currentConvs
      isFirstLoadRef.current = false
    })

    return () => unsubscribe()
  }, [currentUserAlias])

  return (
    <div className="app-layout">
      <aside className="desktop-sidebar">
        <div className="sidebar-header">
          <Zap size={24} className="sidebar-logo" />
          <span className="sidebar-title">CITAS CLON v2</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                ['sidebar-link', isActive ? 'sidebar-active' : ''].filter(Boolean).join(' ')
              }
            >
              <div className="nav-icon-wrapper">
                <Icon size={20} strokeWidth={1.5} />
                {to === '/inbox' && unreadCount > 0 && <span className="nav-badge" />}
              </div>
              <span className="sidebar-label">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main-wrapper">
        <main id="main-content">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>

        <nav className="bottom-tabbar">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                ['tab-btn', isActive ? 'tab-active' : ''].filter(Boolean).join(' ')
              }
            >
              <div className="nav-icon-wrapper">
                <Icon size={22} strokeWidth={1.5} />
                {to === '/inbox' && unreadCount > 0 && <span className="nav-badge" />}
              </div>
              <span className="tab-label">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
