import { useCallback, useEffect, useState } from 'react'
import { AppShell, type PageId } from './components/AppShell'
import { LoginGate, isPanelUnlocked, lockPanel } from './components/LoginGate'
import { api } from './services/api'
import { CommercialPage } from './pages/CommercialPage'
import { CrmPage } from './pages/CrmPage'
import { LeadChatPage } from './pages/LeadChatPage'
import { OverviewPage } from './pages/OverviewPage'
import { ReviewsPage } from './pages/ReviewsPage'
import { TutorPage } from './pages/TutorPage'

const validPanelPages: PageId[] = ['overview', 'commercial', 'tutor', 'crm', 'reviews']

function isPanelHash(): boolean {
  return window.location.hash.startsWith('#/panel')
}

function getPanelPageFromHash(): PageId {
  const value = window.location.hash.replace('#/panel/', '').replace('#/panel', '') as PageId
  return validPanelPages.includes(value) ? value : 'overview'
}

export default function App() {
  const [inPanel, setInPanel] = useState(isPanelHash)
  const [panelUnlocked, setPanelUnlocked] = useState(isPanelUnlocked)
  const [page, setPage] = useState<PageId>(getPanelPageFromHash)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(() => localStorage.getItem('nexofin:opportunity') || '')
  const [selectedContactId, setSelectedContactId] = useState(() => localStorage.getItem('nexofin:contact') || '')

  const checkHealth = useCallback(async () => {
    try {
      const response = await api.health()
      setBackendOnline(response.status === 'ok')
    } catch {
      setBackendOnline(false)
    }
  }, [])

  useEffect(() => {
    void checkHealth()
    const interval = window.setInterval(() => void checkHealth(), 30_000)
    return () => window.clearInterval(interval)
  }, [checkHealth])

  useEffect(() => {
    const handleHashChange = () => {
      setInPanel(isPanelHash())
      setPage(getPanelPageFromHash())
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    if (selectedOpportunityId) localStorage.setItem('nexofin:opportunity', selectedOpportunityId)
  }, [selectedOpportunityId])

  useEffect(() => {
    if (selectedContactId) localStorage.setItem('nexofin:contact', selectedContactId)
  }, [selectedContactId])

  const navigate = (nextPage: PageId) => {
    window.location.hash = `/panel/${nextPage}`
    setInPanel(true)
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const exitPanel = () => {
    window.location.hash = '/chat'
    setInPanel(false)
  }

  const handleLogout = () => {
    lockPanel()
    setPanelUnlocked(false)
    exitPanel()
  }

  // --- Área pública: chat único del lead (landing) ---
  if (!inPanel) {
    return <LeadChatPage />
  }

  // --- Panel interno: requiere login simple antes de mostrar CRM/Revisión ---
  if (!panelUnlocked) {
    return <LoginGate onUnlock={() => setPanelUnlocked(true)} />
  }

  return (
    <AppShell currentPage={page} onNavigate={navigate} backendOnline={backendOnline} onExitPanel={exitPanel} onLogout={handleLogout}>
      {page === 'overview' && <OverviewPage onNavigate={navigate} onSelectOpportunity={setSelectedOpportunityId} />}
      {page === 'commercial' && (
        <CommercialPage
          onNavigate={navigate}
          onSelectOpportunity={setSelectedOpportunityId}
          onSelectContact={setSelectedContactId}
        />
      )}
      {page === 'tutor' && (
        <TutorPage selectedContactId={selectedContactId} onSelectContact={setSelectedContactId} onNavigate={navigate} />
      )}
      {page === 'crm' && (
        <CrmPage
          selectedContactId={selectedContactId}
          onSelectContact={setSelectedContactId}
          onSelectOpportunity={setSelectedOpportunityId}
          onNavigate={navigate}
        />
      )}
      {page === 'reviews' && (
        <ReviewsPage selectedOpportunityId={selectedOpportunityId} onSelectOpportunity={setSelectedOpportunityId} onNavigate={navigate} />
      )}
    </AppShell>
  )
}
