import {
  Check,
  CircleAlert,
  FileEdit,
  ListChecks,
  RefreshCw,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { LoadingBlock } from '../components/LoadingBlock'
import { Modal } from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import { ApiError, api } from '../services/api'
import type { ActionOut, OpportunityListItem, SummaryResponse } from '../types/api'
import { formatAction, formatPriority, formatStage, shortId } from '../utils/format'
import type { PageId } from '../components/AppShell'

interface ReviewsPageProps {
  selectedOpportunityId: string
  onSelectOpportunity: (id: string) => void
  onNavigate: (page: PageId) => void
}

export function ReviewsPage({ selectedOpportunityId, onSelectOpportunity, onNavigate }: ReviewsPageProps) {
  const [opportunities, setOpportunities] = useState<OpportunityListItem[]>([])
  const [actions, setActions] = useState<ActionOut[]>([])
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionsLoading, setActionsLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingAction, setEditingAction] = useState<ActionOut | null>(null)
  const [editedMessage, setEditedMessage] = useState('')
  const [reviewerNote, setReviewerNote] = useState('')
  const [decisionLoading, setDecisionLoading] = useState(false)

  const loadOpportunities = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.listOpportunities()
      setOpportunities(data)
      if (data[0] && !data.some((opportunity) => opportunity.id === selectedOpportunityId)) onSelectOpportunity(data[0].id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las oportunidades.')
    } finally {
      setLoading(false)
    }
  }, [onSelectOpportunity, selectedOpportunityId])

  const loadActions = useCallback(async (opportunityId: string) => {
    setActionsLoading(true)
    try {
      setActions(await api.listOpportunityActions(opportunityId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las acciones.')
    } finally {
      setActionsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOpportunities()
  }, [loadOpportunities])

  useEffect(() => {
    setSummary(null)
    if (selectedOpportunityId) void loadActions(selectedOpportunityId)
    else setActions([])
  }, [loadActions, selectedOpportunityId])

  const selectedOpportunity = opportunities.find((item) => item.id === selectedOpportunityId)
  const pendingCount = useMemo(() => actions.filter((action) => action.status === 'pendiente').length, [actions])

  const generateSummary = async () => {
    if (!selectedOpportunityId || summaryLoading) return
    setSummaryLoading(true)
    setError('')
    try {
      const data = await api.generateOpportunitySummary(selectedOpportunityId)
      setSummary(data)
      await loadActions(selectedOpportunityId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo generar el resumen.')
    } finally {
      setSummaryLoading(false)
    }
  }

  const decide = async (action: ActionOut, decision: 'aprobar' | 'rechazar') => {
    setDecisionLoading(true)
    setError('')
    try {
      await api.decideAction(action.id, { decision, reviewer_note: reviewerNote.trim() || undefined })
      setReviewerNote('')
      await loadActions(action.opportunity_id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar la decisión.')
    } finally {
      setDecisionLoading(false)
    }
  }

  const submitEdit = async () => {
    if (!editingAction) return
    setDecisionLoading(true)
    setError('')
    try {
      await api.decideAction(editingAction.id, {
        decision: 'editar',
        edited_payload: {
          ...editingAction.payload,
          mensaje_propuesto: editedMessage.trim(),
        },
        reviewer_note: reviewerNote.trim() || undefined,
      })
      setEditingAction(null)
      setEditedMessage('')
      setReviewerNote('')
      await loadActions(editingAction.opportunity_id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la edición.')
    } finally {
      setDecisionLoading(false)
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Historia de usuario 3</span>
          <h1>Revisión humana</h1>
          <p>Genera un resumen y una acción sugerida, luego aprueba, edita o rechaza antes de cualquier comunicación.</p>
        </div>
        <button className="button button--secondary" type="button" onClick={() => void loadOpportunities()} disabled={loading}>
          <RefreshCw size={16} /> Actualizar
        </button>
      </header>

      {error && (
        <div className="alert alert--danger" role="alert">
          <CircleAlert size={18} /> {error}
          <button className="text-button" type="button" onClick={() => void loadOpportunities()}>Reintentar</button>
        </div>
      )}

      <section className="review-banner">
        <span><UserCheck size={24} /></span>
        <div><strong>Human-in-the-loop por diseño</strong><p>El endpoint de resumen crea una propuesta en estado pendiente; esta pantalla nunca envía comunicaciones reales.</p></div>
        <StatusBadge tone={pendingCount > 0 ? 'warning' : 'success'}>{pendingCount} pendientes</StatusBadge>
      </section>

      <div className="review-layout">
        <aside className="opportunity-rail">
          <div className="section-heading section-heading--compact"><div><span className="eyebrow">Pipeline</span><h2>Oportunidades</h2></div></div>
          {loading ? (
            <LoadingBlock lines={6} />
          ) : opportunities.length === 0 ? (
            <EmptyState
              compact
              icon={ListChecks}
              title="Sin oportunidades"
              description="Califica un lead desde el agente comercial."
              action={
                <button className="button button--secondary button--small" type="button" onClick={() => onNavigate('commercial')}>
                  Abrir agente comercial
                </button>
              }
            />
          ) : (
            <div className="opportunity-select-list">
              {opportunities.map((opportunity) => (
                <button key={opportunity.id} className={selectedOpportunityId === opportunity.id ? 'is-active' : ''} type="button" onClick={() => onSelectOpportunity(opportunity.id)}>
                  <span><strong>{shortId(opportunity.id)}</strong><small>{formatStage(opportunity.funnel_stage)}</small></span>
                  <span><StatusBadge tone={opportunity.priority_label === 'alta' ? 'warning' : opportunity.priority_label === 'media' ? 'info' : 'neutral'}>{formatPriority(opportunity.priority_label)}</StatusBadge><b>{opportunity.priority_score.toFixed(1)}</b></span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="review-workspace">
          {!selectedOpportunity ? (
            <EmptyState icon={ListChecks} title="Selecciona una oportunidad" description="Podrás generar su resumen y administrar las propuestas de seguimiento." />
          ) : (
            <>
              <header className="review-workspace__header">
                <div>
                  <span className="eyebrow">Oportunidad {shortId(selectedOpportunity.id)}</span>
                  <h2>{selectedOpportunity.necesidad || 'Necesidad en proceso de calificación'}</h2>
                  <div className="inline-badges"><StatusBadge>{formatStage(selectedOpportunity.funnel_stage)}</StatusBadge><StatusBadge tone={selectedOpportunity.priority_label === 'alta' ? 'warning' : 'info'}>{formatPriority(selectedOpportunity.priority_label)} · {selectedOpportunity.priority_score.toFixed(1)}</StatusBadge></div>
                </div>
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => void generateSummary()}
                  disabled={summaryLoading || pendingCount > 0}
                  title={pendingCount > 0 ? 'Ya hay una propuesta pendiente. Apruébala, edítala o recházala primero.' : undefined}
                >
                  <Sparkles size={16} /> {summaryLoading ? 'Generando…' : 'Generar resumen y propuesta'}
                </button>
              </header>

              <div className="review-note">
                <CircleAlert size={17} />
                <p>
                  {pendingCount > 0
                    ? 'Ya existe una propuesta pendiente para esta oportunidad. Resuélvela antes de generar otra.'
                    : 'Cada clic en "Generar" invoca el endpoint existente y crea una nueva acción pendiente.'}
                </p>
              </div>

              {summary && (
                <section className="summary-sheet">
                  <header><div><span className="eyebrow">Síntesis de Gemini</span><h3>Contexto para el ejecutivo</h3></div><StatusBadge tone="warning">{summary.action_status}</StatusBadge></header>
                  <div className="summary-grid">
                    <article><span>Necesidad</span><p>{summary.summary.necesidad}</p></article>
                    <article><span>Perfil</span><p>{summary.summary.perfil}</p></article>
                    <article><span>Objeciones</span><p>{summary.summary.objeciones}</p></article>
                    <article><span>Etapa</span><p>{formatStage(summary.summary.etapa_embudo)}</p></article>
                  </div>
                  <div className="proposed-action"><span className="eyebrow">Acción sugerida</span><strong>{formatAction(summary.summary.accion_sugerida)}</strong><p>{summary.summary.justificacion_accion}</p><blockquote>{summary.summary.mensaje_propuesto}</blockquote></div>
                </section>
              )}

              <section className="action-section">
                <div className="section-heading section-heading--compact"><div><span className="eyebrow">Bitácora de control</span><h3>Acciones propuestas</h3></div><button className="icon-button" type="button" onClick={() => void loadActions(selectedOpportunity.id)} aria-label="Actualizar acciones" title="Actualizar acciones"><RefreshCw size={17} /></button></div>
                {actionsLoading ? (
                  <LoadingBlock lines={5} />
                ) : actions.length === 0 ? (
                  <EmptyState compact icon={ListChecks} title="Sin acciones" description="Genera el resumen para crear la primera propuesta pendiente." />
                ) : (
                  <div className="action-list">
                    {actions.map((action) => (
                      <article key={action.id}>
                        <header>
                          <div><span className="eyebrow">{formatAction(action.action_type)}</span><strong>{shortId(action.id)}</strong></div>
                          <StatusBadge tone={action.status === 'pendiente' ? 'warning' : action.status === 'aprobada' ? 'success' : action.status === 'rechazada' ? 'danger' : 'info'}>{action.status}</StatusBadge>
                        </header>
                        <p>{String(action.payload.justificacion || 'Propuesta generada por el agente comercial.')}</p>
                        <blockquote>{String(action.payload.mensaje_propuesto || '')}</blockquote>
                        {action.edited_payload && <div className="edited-copy"><span>Versión editada</span><p>{String(action.edited_payload.mensaje_propuesto || JSON.stringify(action.edited_payload))}</p></div>}
                        {action.status === 'pendiente' && (
                          <footer>
                            <button className="button button--approve button--small" type="button" onClick={() => void decide(action, 'aprobar')} disabled={decisionLoading}><Check size={15} /> Aprobar</button>
                            <button className="button button--secondary button--small" type="button" onClick={() => { setEditingAction(action); setEditedMessage(String(action.payload.mensaje_propuesto || '')) }} disabled={decisionLoading}><FileEdit size={15} /> Editar</button>
                            <button className="button button--reject button--small" type="button" onClick={() => void decide(action, 'rechazar')} disabled={decisionLoading}><X size={15} /> Rechazar</button>
                          </footer>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      </div>

      <Modal
        open={editingAction !== null}
        title="Editar comunicación propuesta"
        onClose={() => setEditingAction(null)}
        footer={<><button className="button button--secondary" type="button" onClick={() => setEditingAction(null)}>Cancelar</button><button className="button button--primary" type="button" onClick={() => void submitEdit()} disabled={!editedMessage.trim() || decisionLoading}>Guardar decisión</button></>}
      >
        <div className="edit-form">
          <label className="field"><span>Mensaje propuesto</span><textarea rows={7} value={editedMessage} onChange={(event) => setEditedMessage(event.target.value)} /></label>
          <label className="field"><span>Nota del revisor</span><textarea rows={3} value={reviewerNote} onChange={(event) => setReviewerNote(event.target.value)} placeholder="Explica el ajuste para dejar trazabilidad…" /></label>
        </div>
      </Modal>
    </div>
  )
}