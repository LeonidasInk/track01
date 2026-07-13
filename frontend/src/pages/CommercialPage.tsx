import {
  ArrowUp,
  Bot,
  Building2,
  CircleAlert,
  Info,
  Mail,
  MessageSquareText,
  RotateCcw,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { StatusBadge } from '../components/StatusBadge'
import { ApiError, api } from '../services/api'
import type { ChatMessageOut } from '../types/api'
import { formatPriority, formatStage } from '../utils/format'
import type { PageId } from '../components/AppShell'

interface ChatBubble {
  id: string
  role: 'user' | 'agent'
  text: string
}

interface CommercialPageProps {
  onNavigate: (page: PageId) => void
  onSelectOpportunity: (id: string) => void
  onSelectContact: (id: string) => void
}

const makeSessionId = () => `web-${crypto.randomUUID()}`

export function CommercialPage({ onNavigate, onSelectOpportunity, onSelectContact }: CommercialPageProps) {
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('nexofin:session') || makeSessionId())
  const [messages, setMessages] = useState<ChatBubble[]>([
    {
      id: 'welcome',
      role: 'agent',
      text: 'Hola, soy el agente comercial de NexoFin. Cuéntame qué buscas para tu empresa o para tus finanzas personales y avanzaremos una pregunta a la vez.',
    },
  ])
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [result, setResult] = useState<ChatMessageOut | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    localStorage.setItem('nexofin:session', sessionId)
  }, [sessionId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, loading])

  const emailLooksInvalid = useMemo(() => {
    const trimmed = email.trim()
    return trimmed.length > 0 && !/^\S+@\S+\.\S+$/.test(trimmed)
  }, [email])

  const qualificationProgress = useMemo(() => {
    if (!result) return 0
    const base = result.lead_type === 'UNKNOWN' ? 1 : 2
    const scoreSignal = result.priority_score >= 3.5 ? 2 : result.priority_score >= 2 ? 1 : 0
    return Math.min(4, base + scoreSignal)
  }, [result])

  const sendMessage = async () => {
    const trimmed = message.trim()
    if (!trimmed || loading) return

    const userMessage: ChatBubble = { id: crypto.randomUUID(), role: 'user', text: trimmed }
    setMessages((current) => [...current, userMessage])
    setMessage('')
    setLoading(true)
    setError('')

    try {
      const response = await api.sendCommercialMessage({
        session_id: sessionId,
        message: trimmed,
        contact_hint: {
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          company: company.trim() || undefined,
        },
      })
      setResult(response)
      onSelectOpportunity(response.opportunity_id)
      onSelectContact(response.contact_id)
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'agent', text: response.reply },
      ])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo procesar el mensaje.')
      setMessages((current) => current.filter((item) => item.id !== userMessage.id))
      setMessage(trimmed)
    } finally {
      setLoading(false)
    }
  }

  const resetConversation = () => {
    const newSession = makeSessionId()
    setSessionId(newSession)
    setResult(null)
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'agent',
        text: 'Nueva conversación iniciada. Cuéntame qué objetivo financiero quieres resolver.',
      },
    ])
    setError('')
  }

  return (
    <div className="page-stack page-stack--chat">
      <header className="page-header">
        <div>
          <span className="eyebrow">Historia de usuario 1</span>
          <h1>Agente comercial IA</h1>
          <p>Calificación conversacional con continuidad por sesión y registro automático en el CRM simulado.</p>
        </div>
        <button className="button button--secondary" type="button" onClick={resetConversation}>
          <RotateCcw size={16} /> Nueva conversación
        </button>
      </header>

      <div className="chat-layout">
        <section className="chat-surface" aria-label="Conversación con el agente comercial">
          <header className="chat-surface__header">
            <div className="agent-identity">
              <span><Bot size={20} /></span>
              <div>
                <strong>Agente comercial</strong>
                <small>Gemini · calificación estructurada</small>
              </div>
            </div>
            <StatusBadge tone="success"><span className="status-dot" /> Disponible</StatusBadge>
          </header>

          <div className="chat-messages" aria-live="polite">
            {messages.map((item) => (
              <div key={item.id} className={`chat-message chat-message--${item.role}`}>
                <span className="chat-message__avatar" aria-hidden="true">
                  {item.role === 'agent' ? <Sparkles size={17} /> : <UserRound size={17} />}
                </span>
                <div>{item.text}</div>
              </div>
            ))}
            {loading && (
              <div className="chat-message chat-message--agent">
                <span className="chat-message__avatar"><Sparkles size={17} /></span>
                <div className="typing-indicator" aria-label="El agente está respondiendo">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {error && (
            <div className="inline-error" role="alert"><CircleAlert size={17} /> {error}</div>
          )}

          <div className="chat-composer">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void sendMessage()
                }
              }}
              placeholder="Ej.: Soy responsable financiero de una pyme y busco opciones para gestionar excedentes…"
              rows={3}
              disabled={loading}
              aria-label="Mensaje para el agente comercial"
            />
            <button
              className="send-button"
              type="button"
              onClick={() => void sendMessage()}
              disabled={!message.trim() || loading}
              aria-label="Enviar mensaje"
              title="Enviar mensaje"
            >
              <ArrowUp size={20} />
            </button>
          </div>
          <p className="composer-hint">Enter para enviar · Shift + Enter para nueva línea</p>
        </section>

        <aside className="qualification-panel">
          <section className="qualification-panel__section">
            <div className="panel-title">
              <span className="panel-title__icon"><MessageSquareText size={18} /></span>
              <div>
                <span className="eyebrow">Contexto opcional</span>
                <h2>Datos conocidos</h2>
              </div>
            </div>
            <p className="muted-copy field-grid__hint">Solo se usan si no los mencionas en el chat; puedes dejarlos en blanco.</p>
            <div className="field-grid field-grid--single">
              <label className="field">
                <span>Nombre</span>
                <div className="field__control"><UserRound size={16} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del prospecto" /></div>
              </label>
              <label className="field">
                <span>Correo</span>
                <div className={`field__control ${emailLooksInvalid ? 'field__control--invalid' : ''}`}>
                  <Mail size={16} />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    placeholder="nombre@empresa.com"
                    aria-invalid={emailLooksInvalid}
                  />
                </div>
                {emailLooksInvalid && <small className="field__error">Revisa el formato del correo.</small>}
              </label>
              <label className="field">
                <span>Empresa</span>
                <div className="field__control"><Building2 size={16} /><input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Organización" /></div>
              </label>
            </div>
          </section>

          <section className="qualification-panel__section qualification-panel__section--signal">
            <div className="panel-title">
              <div>
                <span className="eyebrow">Señales de la conversación</span>
                <h2>Calificación actual</h2>
              </div>
              <StatusBadge tone={result?.priority_label === 'alta' ? 'warning' : result?.priority_label === 'media' ? 'info' : 'neutral'}>
                {result ? formatPriority(result.priority_label) : 'Sin evaluar'}
              </StatusBadge>
            </div>

            <div className="score-display">
              <strong>{result ? result.priority_score.toFixed(1) : '—'}</strong>
              <span>/ 5.0</span>
            </div>
            <div className="score-meter" aria-label={`Progreso de calificación ${qualificationProgress} de 4`}>
              {Array.from({ length: 4 }, (_, index) => <span key={index} className={index < qualificationProgress ? 'is-active' : ''} />)}
            </div>

            <dl className="signal-list">
              <div><dt>Tipo de lead</dt><dd>{result?.lead_type || 'UNKNOWN'}</dd></div>
              <div><dt>Etapa del embudo</dt><dd>{result ? formatStage(result.funnel_stage) : 'Sin iniciar'}</dd></div>
              <div><dt>Sesión</dt><dd title={sessionId}>{sessionId.slice(0, 12)}…</dd></div>
            </dl>

            {result && (
              <button
                className="button button--primary button--full"
                type="button"
                onClick={() => onNavigate('reviews')}
              >
                Continuar a revisión <ArrowUp className="rotate-45" size={16} />
              </button>
            )}
          </section>

          <div className="info-callout">
            <Info size={18} />
            <p>El score combina interés, presupuesto, perfil y urgencia. La interfaz no recalcula ni altera los valores devueltos por FastAPI.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}