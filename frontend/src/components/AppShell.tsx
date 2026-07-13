import {
  BookOpenCheck,
  BotMessageSquare,
  Gauge,
  HeartPulse,
  Info,
  ListChecks,
  LogOut,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  UsersRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { API_BASE_URL } from '../services/api'
import { Brand } from './Brand'
import { StatusBadge } from './StatusBadge'

export type PageId = 'overview' | 'commercial' | 'tutor' | 'crm' | 'reviews'

interface AppShellProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  backendOnline: boolean | null
  children: ReactNode
  onExitPanel?: () => void
  onLogout?: () => void
}

const navigation = [
  { id: 'overview' as const, label: 'Centro de control', icon: Gauge },
  { id: 'commercial' as const, label: 'Agente comercial (interno)', icon: BotMessageSquare },
  { id: 'tutor' as const, label: 'Futuro Academy (interno)', icon: BookOpenCheck },
  { id: 'crm' as const, label: 'CRM y pipeline', icon: UsersRound },
  { id: 'reviews' as const, label: 'Revisión humana', icon: ListChecks },
]

export function AppShell({ currentPage, onNavigate, backendOnline, children, onExitPanel, onLogout }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar__top">
          <Brand />
          <button
            className="icon-button icon-button--dark sidebar__collapse"
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expandir navegación' : 'Contraer navegación'}
            title={collapsed ? 'Expandir navegación' : 'Contraer navegación'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="Navegación principal">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${currentPage === id ? 'nav-item--active' : ''}`}
              type="button"
              onClick={() => onNavigate(id)}
              aria-current={currentPage === id ? 'page' : undefined}
              title={collapsed ? label : undefined}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="safety-note">
            <span className="safety-note__icon"><HeartPulse size={17} /></span>
            <div>
              <strong>Control humano activo</strong>
              <p>Ninguna acción sensible se ejecuta automáticamente.</p>
            </div>
          </div>
          {(onExitPanel || onLogout) && (
            <div className="sidebar__panel-actions">
              {onExitPanel && (
                <button className="nav-item nav-item--muted" type="button" onClick={onExitPanel} title="Volver al chat público">
                  <MessageCircle size={18} aria-hidden="true" />
                  <span>Volver al chat público</span>
                </button>
              )}
              {onLogout && (
                <button className="nav-item nav-item--muted" type="button" onClick={onLogout} title="Cerrar sesión del panel">
                  <LogOut size={18} aria-hidden="true" />
                  <span>Cerrar sesión</span>
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar__context">
            <span className="eyebrow">Track 1 · agentes financieros</span>
            <strong>Ventas, educación y gestión de clientes</strong>
          </div>
          <div className="topbar__status">
            <StatusBadge tone={backendOnline === true ? 'success' : backendOnline === false ? 'danger' : 'neutral'}>
              <span className="status-dot" aria-hidden="true" />
              {backendOnline === true ? 'API conectada' : backendOnline === false ? 'API sin conexión' : 'Verificando API'}
            </StatusBadge>
            <span className="api-host-indicator" tabIndex={0} title={`Backend: ${API_BASE_URL}`}>
              <Info size={14} aria-hidden="true" />
              <span className="sr-only">Backend: {API_BASE_URL}</span>
            </span>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}