import {
  ArrowRight,
  BookOpenCheck,
  BotMessageSquare,
  CircleAlert,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { LoadingBlock } from '../components/LoadingBlock'
import { StatusBadge } from '../components/StatusBadge'
import { ApiError, api } from '../services/api'
import type { ContactListItem, OpportunityListItem } from '../types/api'
import { formatPriority, formatStage, getDisplayName, shortId } from '../utils/format'
import type { PageId } from '../components/AppShell'

interface OverviewPageProps {
  onNavigate: (page: PageId) => void
  onSelectOpportunity: (id: string) => void
}

export function OverviewPage({ onNavigate, onSelectOpportunity }: OverviewPageProps) {
  const [contacts, setContacts] = useState<ContactListItem[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [contactData, opportunityData] = await Promise.all([api.listContacts(), api.listOpportunities()])
      setContacts(contactData)
      setOpportunities(opportunityData)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el panel.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const metrics = useMemo(() => {
    const high = opportunities.filter((item) => item.priority_label === 'alta').length
    const review = opportunities.filter((item) => ['calificando', 'listo_para_asesor', 'educando'].includes(item.funnel_stage)).length
    return { high, review }
  }, [opportunities])

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel__copy">
          <span className="eyebrow eyebrow--accent">NexoFin IA · operación en tiempo real</span>
          <h1>Convierte conversaciones en decisiones comerciales verificables.</h1>
          <p>
            Un espacio único para calificar prospectos, enseñar conceptos financieros con fuentes aprobadas y mantener cada siguiente acción bajo revisión humana.
          </p>
          <div className="hero-panel__actions">
            <button className="button button--primary" type="button" onClick={() => onNavigate('commercial')}>
              Abrir agente comercial <ArrowRight size={17} />
            </button>
            <button className="button button--secondary" type="button" onClick={() => onNavigate('reviews')}>
              Revisar propuestas
            </button>
          </div>
        </div>
        <div className="hero-panel__signal" aria-label="Flujo del producto">
          <div className="signal-orbit">
            <span className="signal-orbit__center">IA</span>
            <span className="signal-orbit__item signal-orbit__item--one">Lead</span>
            <span className="signal-orbit__item signal-orbit__item--two">CRM</span>
            <span className="signal-orbit__item signal-orbit__item--three">Tutor</span>
          </div>
          <div className="signal-caption">
            <ShieldCheck size={18} />
            <span>Gemini estructura; el equipo decide.</span>
          </div>
        </div>
      </section>

      {error && (
        <div className="alert alert--danger" role="alert">
          <CircleAlert size={18} />
          <span>{error}</span>
          <button className="text-button" type="button" onClick={() => void load()}>Reintentar</button>
        </div>
      )}

      <section className="metric-strip" aria-label="Métricas del CRM">
        <article>
          <span>Contactos registrados</span>
          <strong>{loading || error ? '—' : contacts.length}</strong>
          <small>Identidad y contexto por sesión</small>
        </article>
        <article>
          <span>Oportunidades activas</span>
          <strong>{loading || error ? '—' : opportunities.length}</strong>
          <small>Calificación en escala 0–5</small>
        </article>
        <article>
          <span>Prioridad alta</span>
          <strong>{loading || error ? '—' : metrics.high}</strong>
          <small>Listas para atención comercial</small>
        </article>
        <article>
          <span>En seguimiento</span>
          <strong>{loading || error ? '—' : metrics.review}</strong>
          <small>Requieren una siguiente acción</small>
        </article>
      </section>

      <section className="split-layout split-layout--wide">
        <div className="section-block">
          <header className="section-heading">
            <div>
              <span className="eyebrow">Flujo de extremo a extremo</span>
              <h2>Tres agentes, una misma memoria comercial</h2>
            </div>
          </header>
          <div className="flow-list">
            <button type="button" onClick={() => onNavigate('commercial')}>
              <span className="flow-list__number">01</span>
              <span className="flow-list__icon"><BotMessageSquare size={21} /></span>
              <span className="flow-list__copy">
                <strong>Calificación conversacional</strong>
                <small>Detecta B2B/B2C, interpreta interés, presupuesto, perfil y urgencia.</small>
              </span>
              <ArrowRight size={18} />
            </button>
            <button type="button" onClick={() => onNavigate('tutor')}>
              <span className="flow-list__number">02</span>
              <span className="flow-list__icon"><BookOpenCheck size={21} /></span>
              <span className="flow-list__copy">
                <strong>Aprendizaje con fuente</strong>
                <small>Responde desde la base aprobada y transforma interés educativo en señal consentida.</small>
              </span>
              <ArrowRight size={18} />
            </button>
            <button type="button" onClick={() => onNavigate('reviews')}>
              <span className="flow-list__number">03</span>
              <span className="flow-list__icon"><ListChecks size={21} /></span>
              <span className="flow-list__copy">
                <strong>Derivación supervisada</strong>
                <small>Propone el siguiente paso; un ejecutivo aprueba, edita o rechaza.</small>
              </span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <aside className="section-block section-block--inset">
          <header className="section-heading section-heading--compact">
            <div>
              <span className="eyebrow">Pulso del pipeline</span>
              <h2>Oportunidades recientes</h2>
            </div>
            <button className="icon-button" type="button" onClick={() => void load()} aria-label="Actualizar" title="Actualizar">
              <RefreshCw size={17} />
            </button>
          </header>

          {loading ? (
            <LoadingBlock lines={4} />
          ) : error ? (
            <EmptyState
              compact
              icon={CircleAlert}
              title="No se pudo cargar"
              description="Revisa la conexión con el backend y vuelve a intentarlo."
            />
          ) : opportunities.length === 0 ? (
            <EmptyState
              compact
              icon={UsersRound}
              title="Aún no hay oportunidades"
              description="Inicia una conversación comercial para poblar el CRM."
              action={
                <button className="button button--secondary button--small" type="button" onClick={() => onNavigate('commercial')}>
                  Abrir agente comercial
                </button>
              }
            />
          ) : (
            <div className="opportunity-mini-list">
              {opportunities.slice(0, 5).map((opportunity) => {
                const contact = contacts.find((item) => item.id === opportunity.contact_id)
                return (
                  <button
                    key={opportunity.id}
                    type="button"
                    onClick={() => {
                      onSelectOpportunity(opportunity.id)
                      onNavigate('reviews')
                    }}
                  >
                    <span>
                      <strong>{getDisplayName(contact?.name ?? null, contact?.company ?? null, `Lead ${shortId(opportunity.contact_id)}`)}</strong>
                      <small>{formatStage(opportunity.funnel_stage)}</small>
                    </span>
                    <span className="opportunity-mini-list__meta">
                      <StatusBadge tone={opportunity.priority_label === 'alta' ? 'warning' : opportunity.priority_label === 'media' ? 'info' : 'neutral'}>
                        {formatPriority(opportunity.priority_label)}
                      </StatusBadge>
                      <b>{opportunity.priority_score.toFixed(1)}</b>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}