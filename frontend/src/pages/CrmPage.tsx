import {
  ArrowRight,
  BriefcaseBusiness,
  CircleAlert,
  MessageSquareText,
  RefreshCw,
  Search,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { LoadingBlock } from '../components/LoadingBlock'
import { StatusBadge } from '../components/StatusBadge'
import { ApiError, api } from '../services/api'
import type { ContactDetail, ContactListItem, OpportunityListItem } from '../types/api'
import { formatDate, formatPriority, formatStage, getDisplayName, shortId } from '../utils/format'
import type { PageId } from '../components/AppShell'

interface CrmPageProps {
  selectedContactId: string
  onSelectContact: (id: string) => void
  onSelectOpportunity: (id: string) => void
  onNavigate: (page: PageId) => void
}

export function CrmPage({ selectedContactId, onSelectContact, onSelectOpportunity, onNavigate }: CrmPageProps) {
  const [contacts, setContacts] = useState<ContactListItem[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityListItem[]>([])
  const [contactDetail, setContactDetail] = useState<ContactDetail | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [contactData, opportunityData] = await Promise.all([api.listContacts(), api.listOpportunities()])
      setContacts(contactData)
      setOpportunities(opportunityData)
      if (contactData[0] && !contactData.some((contact) => contact.id === selectedContactId)) onSelectContact(contactData[0].id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el CRM.')
    } finally {
      setLoading(false)
    }
  }, [onSelectContact, selectedContactId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selectedContactId) {
      setContactDetail(null)
      return
    }
    setDetailLoading(true)
    api.getContact(selectedContactId)
      .then(setContactDetail)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'No se pudo abrir el contacto.'))
      .finally(() => setDetailLoading(false))
  }, [selectedContactId])

  const filteredContacts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return contacts
    return contacts.filter((contact) => [contact.name, contact.email, contact.company, contact.lead_type, contact.session_id].some((value) => value?.toLowerCase().includes(needle)))
  }, [contacts, query])

  const b2b = contacts.filter((item) => item.lead_type === 'B2B').length
  const interestedTopics = contactDetail?.learning_signals.filter(
    (signal) => signal.consent_given
  ) ?? []

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">CRM simulado · SQLite</span>
          <h1>Clientes y pipeline</h1>
          <p>Vista operativa del contexto persistido por los agentes sin duplicar la lógica del backend.</p>
        </div>
        <button className="button button--secondary" type="button" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} /> Sincronizar
        </button>
      </header>

      {error && (
        <div className="alert alert--danger" role="alert">
          <CircleAlert size={18} /> {error}
          <button className="text-button" type="button" onClick={() => void load()}>Reintentar</button>
        </div>
      )}

      <section className="crm-summary">
        <article>
          <span><UsersRound size={19} /></span>
          <div>
            <strong>{error ? '—' : contacts.length}</strong>
            <small>contactos</small>
          </div>
        </article>

        <article>
          <span><BriefcaseBusiness size={19} /></span>
          <div>
            <strong>{error ? '—' : opportunities.length}</strong>
            <small>oportunidades</small>
          </div>
        </article>

        <article>
          <span><UserRound size={19} /></span>
          <div>
            <strong>{error ? '—' : b2b}</strong>
            <small>leads B2B</small>
          </div>
        </article>

        <article>
          <span><MessageSquareText size={19} /></span>
          <div>
            <strong>{error ? '—' : interestedTopics.length}</strong>
            <small>temas interesados</small>
          </div>
        </article>
      </section>

      <div className="crm-layout">
        <section className="crm-directory">
          <header>
            <div><span className="eyebrow">Directorio</span><h2>Contactos</h2></div>
            <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar contacto…" aria-label="Buscar contacto" /></label>
          </header>

          {loading ? (
            <LoadingBlock lines={7} />
          ) : filteredContacts.length === 0 ? (
            <EmptyState
              compact
              icon={UsersRound}
              title="Sin resultados"
              description={contacts.length ? 'Prueba con otro término de búsqueda.' : 'El agente comercial todavía no ha creado contactos.'}
              action={
                !contacts.length ? (
                  <button className="button button--secondary button--small" type="button" onClick={() => onNavigate('commercial')}>
                    Abrir agente comercial
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="contact-list">
              {filteredContacts.map((contact) => {
                const opportunity = opportunities.find((item) => item.contact_id === contact.id)
                return (
                  <button key={contact.id} className={selectedContactId === contact.id ? 'is-active' : ''} type="button" onClick={() => onSelectContact(contact.id)}>
                    <span className="contact-avatar">{getDisplayName(contact.name, contact.company).slice(0, 2).toUpperCase()}</span>
                    <span className="contact-list__copy">
                      <strong>{getDisplayName(contact.name, contact.company)}</strong>
                      <small>{contact.email || `Sesión ${shortId(contact.session_id)}`}</small>
                    </span>
                    <span className="contact-list__meta">
                      <StatusBadge tone={contact.lead_type === 'B2B' ? 'info' : contact.lead_type === 'B2C' ? 'success' : 'neutral'}>{contact.lead_type}</StatusBadge>
                      {opportunity && <b>{opportunity.priority_score.toFixed(1)}</b>}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="contact-detail">
          {detailLoading ? (
            <LoadingBlock lines={8} />
          ) : !contactDetail ? (
            <EmptyState icon={UserRound} title="Selecciona un contacto" description="Aquí verás su oportunidad y el historial completo de conversaciones." />
          ) : (
            <>
              <header className="contact-detail__header">
                <span className="contact-avatar contact-avatar--large">{getDisplayName(contactDetail.name, contactDetail.company).slice(0, 2).toUpperCase()}</span>
                <div>
                  <span className="eyebrow">Ficha del contacto</span>
                  <h2>{getDisplayName(contactDetail.name, contactDetail.company)}</h2>
                  <p>{[contactDetail.email, contactDetail.company].filter(Boolean).join(' · ') || `ID ${shortId(contactDetail.id)}`}</p>
                </div>
                <StatusBadge tone={contactDetail.lead_type === 'B2B' ? 'info' : contactDetail.lead_type === 'B2C' ? 'success' : 'neutral'}>{contactDetail.lead_type}</StatusBadge>
              </header>

              <div className="contact-detail__section">
                <div className="section-heading section-heading--compact">
                  <div>
                    <span className="eyebrow">CRM</span>
                    <h3>Temas interesados</h3>
                  </div>
                  <small>{interestedTopics.length} registrados</small>
                </div>

                {interestedTopics.length === 0 ? (
                  <p className="muted-copy">No existen intereses con consentimiento.</p>
                ) : (
                  <div className="contact-opportunities">
                    {interestedTopics.map((signal, index) => (
                      <article key={`${signal.topic}-${index}`}>
                        <div>
                          <strong>{signal.topic}</strong>
                          <p>Consentimiento confirmado</p>
                          <small>{formatDate(signal.created_at)}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="contact-detail__section">
                <div className="section-heading section-heading--compact"><div><span className="eyebrow">Pipeline</span><h3>Oportunidades</h3></div></div>
                {contactDetail.opportunities.length === 0 ? (
                  <p className="muted-copy">No hay oportunidades asociadas.</p>
                ) : (
                  <div className="contact-opportunities">
                    {contactDetail.opportunities.map((opportunity) => (
                      <article key={opportunity.id}>
                        <div className="contact-opportunities__score"><strong>{opportunity.priority_score.toFixed(1)}</strong><small>score</small></div>
                        <div>
                          <div className="inline-badges">
                            <StatusBadge tone={opportunity.priority_label === 'alta' ? 'warning' : opportunity.priority_label === 'media' ? 'info' : 'neutral'}>{formatPriority(opportunity.priority_label)}</StatusBadge>
                            <StatusBadge>{formatStage(opportunity.funnel_stage)}</StatusBadge>
                          </div>
                          <p>{opportunity.necesidad || 'Necesidad todavía en proceso de calificación.'}</p>
                        </div>
                        <button className="icon-button" type="button" onClick={() => { onSelectOpportunity(opportunity.id); onNavigate('reviews') }} aria-label="Abrir revisión" title="Abrir revisión"><ArrowRight size={18} /></button>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="contact-detail__section contact-detail__section--timeline">
                <div className="section-heading section-heading--compact"><div><span className="eyebrow">Memoria</span><h3>Historial de conversación</h3></div><small>{contactDetail.conversations.length} mensajes</small></div>
                {contactDetail.conversations.length === 0 ? (
                  <p className="muted-copy">No hay mensajes guardados.</p>
                ) : (
                  <div className="conversation-timeline">
                    {contactDetail.conversations.map((conversation, index) => (
                      <article key={`${conversation.created_at}-${index}`}>
                        <span className={`timeline-dot timeline-dot--${conversation.role}`} />
                        <div>
                          <header><strong>{conversation.role === 'agent' ? 'Agente IA' : 'Prospecto'}</strong><span>{conversation.channel === 'tutor_ia' ? 'Futuro Academy' : 'Chat comercial'}</span><time>{formatDate(conversation.created_at)}</time></header>
                          <p>{conversation.message}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}