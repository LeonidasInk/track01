import {
  ArrowUp,
  BookOpenCheck,
  Check,
  CircleAlert,
  ClipboardCheck,
  Copy,
  HeartPulse,
  LayoutDashboard,
  Link2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Brand } from '../components/Brand'
import { Modal } from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import { ApiError, api } from '../services/api'
import type { Quiz, UnifiedChatOut } from '../types/api'
import { topicLabel } from '../utils/format'

interface ChatBubble {
  id: string
  role: 'user' | 'agent'
  text: string
  channel?: 'chat_comercial' | 'tutor_ia'
  source?: string | null
  topicDetected?: string | null
  requiresConsent?: boolean
  consentTopic?: string | null
}

const SESSION_STORAGE_KEY = 'nexofin:lead-session'
const makeSessionId = () => `lead-${crypto.randomUUID()}`

function sessionIdFromHash(): string | null {
  const match = window.location.hash.match(/^#\/chat\/(.+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

export function LeadChatPage() {
  const [sessionId, setSessionId] = useState(
    () => sessionIdFromHash() || localStorage.getItem(SESSION_STORAGE_KEY) || makeSessionId(),
  )
  const [messages, setMessages] = useState<ChatBubble[]>([
    {
      id: 'welcome',
      role: 'agent',
      text:
        'Hola, soy el asistente de NexoFin. Puedo ayudarte a encontrar la solución financiera que buscas o ' +
        'enseñarte conceptos básicos de inversión. Cuéntame en qué te puedo ayudar.',
    },
  ])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [contactId, setContactId] = useState<string | null>(null)
  const [consentStatus, setConsentStatus] = useState<Record<string, 'saved' | 'declined'>>({})
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [showResults, setShowResults] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
    if (window.location.hash !== `#/chat/${sessionId}`) {
      window.history.replaceState(null, '', `#/chat/${sessionId}`)
    }
  }, [sessionId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, loading])

  const retentionLink = useMemo(() => {
    const url = new URL(window.location.href)
    url.hash = `#/chat/${sessionId}`
    return url.toString()
  }, [sessionId])

  const sendMessage = async () => {
    const trimmed = message.trim()
    if (!trimmed || loading) return

    const userMessage: ChatBubble = { id: crypto.randomUUID(), role: 'user', text: trimmed }
    setMessages((current) => [...current, userMessage])
    setMessage('')
    setLoading(true)
    setError('')

    try {
      const response: UnifiedChatOut = await api.sendUnifiedMessage({ session_id: sessionId, message: trimmed })
      setContactId(response.contact_id)
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'agent',
          text: response.reply,
          channel: response.channel,
          source: response.source,
          topicDetected: response.topic_detected,
          requiresConsent: response.requires_consent,
          consentTopic: response.consent_topic,
        },
      ])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo procesar el mensaje.')
      setMessages((current) => current.filter((item) => item.id !== userMessage.id))
      setMessage(trimmed)
    } finally {
      setLoading(false)
    }
  }

  const registerConsent = async (contactId: string, topic: string, consent: boolean) => {
    setError('')
    try {
      const response = await api.registerConsent({ contact_id: contactId, topic, consent })
      setConsentStatus((current) => ({ ...current, [topic]: response.registered ? 'saved' : 'declined' }))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el consentimiento.')
    }
  }

  const openQuiz = async (topic: string) => {
    setQuizLoading(true)
    setError('')
    try {
      const data = await api.getQuiz(topic)
      setQuiz(data)
      setAnswers({})
      setShowResults(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo generar el quiz.')
    } finally {
      setQuizLoading(false)
    }
  }

  const startNewConversation = () => {
    const newSession = makeSessionId()
    setSessionId(newSession)
    setContactId(null)
    setConsentStatus({})
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'agent',
        text: 'Nueva conversación iniciada. Cuéntame qué necesitas.',
      },
    ])
    setError('')
  }

  const copyRetentionLink = async () => {
    try {
      await navigator.clipboard.writeText(retentionLink)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      setError('No se pudo copiar el enlace. Selecciónalo y cópialo manualmente.')
    }
  }

  const correctAnswers = quiz?.questions.reduce((total, q, index) => total + (answers[index] === q.correct_option_index ? 1 : 0), 0) ?? 0

  return (
    <div className="lead-chat-page">
      <header className="lead-chat-page__header">
        <Brand />
        <div className="lead-chat-page__header-actions">
          <StatusBadge tone="success">
            <HeartPulse size={14} /> Control humano activo
          </StatusBadge>

          <a
            href="#/panel/commercial"
            className="button button--secondary button--small"
            title="Ir al panel comercial"
          >
            <LayoutDashboard size={15} />
            CRM Comercial
          </a>

          <button
            className="button button--secondary button--small"
            type="button"
            onClick={startNewConversation}
          >
            <RotateCcw size={15} />
            Nueva conversación
          </button>
        </div>
      </header>

      <div className="lead-chat-page__body">
        <section className="chat-surface" aria-label="Conversación con NexoFin">
          <header className="chat-surface__header">
            <div className="agent-identity">
              <span><Sparkles size={20} /></span>
              <div>
                <strong>Asistente NexoFin</strong>
                <small>Ventas y educación financiera en un solo chat</small>
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
                <div>
                  <p>{item.text}</p>
                  {item.channel === 'tutor_ia' && item.source && (
                    <div className="source-line">
                      <StatusBadge tone="info"><BookOpenCheck size={13} /> Futuro Academy</StatusBadge>
                      <span>{item.source}</span>
                    </div>
                  )}
                  {item.channel === 'tutor_ia' && item.topicDetected && (
                    <div className="tutor-actions">
                      <button
                        className="button button--secondary button--small"
                        type="button"
                        onClick={() => void openQuiz(item.topicDetected!)}
                        disabled={quizLoading}
                      >
                        <ClipboardCheck size={15} /> Quiz de 3 preguntas
                      </button>
                      {item.requiresConsent && item.consentTopic && contactId && (
                        consentStatus[item.consentTopic] === 'saved' ? (
                          <StatusBadge tone="success"><Check size={14} /> Interés registrado</StatusBadge>
                        ) : consentStatus[item.consentTopic] === 'declined' ? (
                          <StatusBadge tone="neutral">No registrado</StatusBadge>
                        ) : (
                          <div className="consent-controls">
                            <span>¿Guardar "{topicLabel(item.consentTopic)}" como interés para un asesor?</span>
                            <button
                              className="button button--approve button--small"
                              type="button"
                              onClick={() => void registerConsent(contactId, item.consentTopic!, true)}
                            >
                              Sí
                            </button>
                            <button
                              className="button button--secondary button--small"
                              type="button"
                              onClick={() => void registerConsent(contactId, item.consentTopic!, false)}
                            >
                              No
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-message chat-message--agent">
                <span className="chat-message__avatar"><Sparkles size={17} /></span>
                <div className="typing-indicator" aria-label="El asistente está respondiendo">
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
              placeholder="Escribe tu mensaje… puedes pedir información comercial o hacer una pregunta educativa"
              rows={3}
              disabled={loading}
              aria-label="Mensaje para el asistente"
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
        {contactId && (
          <section className="lead-summary">
            <div className="lead-summary__header">
              <h2>📋 Lead Analizado por IA</h2>
              <StatusBadge tone="success">
                <Check size={14} />
                Registrado
              </StatusBadge>
            </div>

            <div className="lead-summary__card">
              <div className="lead-summary__row">
                <span>Estado</span>
                <strong>Lead capturado</strong>
              </div>

              <div className="lead-summary__row">
                <span>Canal</span>
                <strong>NexoFin IA</strong>
              </div>

              <div className="lead-summary__row">
                <span>Contacto</span>
                <strong>{contactId}</strong>
              </div>

              <div className="lead-summary__row">
                <span>Clasificación</span>
                <strong>Pendiente de revisión comercial</strong>
              </div>

              <div className="lead-summary__row">
                <span>Próxima acción</span>
                <strong>Seguimiento comercial</strong>
              </div>

              <div className="lead-summary__actions">

                <button
                  className="button button--approve"
                  type="button"
                >
                  Solicitar asesor
                </button>

                <a
                  href="#/panel/commercial"
                  className="button button--primary"
                >
                  <LayoutDashboard size={16} />
                  Ver Lead en CRM
                </a>

              </div>
            </div>
          </section>
        )}
        <aside className="lead-chat-sidebar">
          <section className="session-retention">
            <div className="panel-title">
              <span className="panel-title__icon"><Link2 size={18} /></span>
              <div>
                <span className="eyebrow">Guarda tu progreso</span>
                <h2>Enlace para continuar</h2>
              </div>
            </div>
            <p className="muted-copy">Guarda o comparte este enlace para retomar la conversación desde cualquier dispositivo.</p>
            <button className="button button--secondary button--full" type="button" onClick={() => void copyRetentionLink()}>
              {linkCopied ? <Check size={16} /> : <Copy size={16} />} {linkCopied ? 'Enlace copiado' : 'Copiar enlace'}
            </button>
          </section>

          <div className="info-callout">
            <ShieldCheck size={18} />
            <p>Tus datos se usan solo para responderte mejor. Nunca compartimos promesas de rendimiento ni ejecutamos acciones sin revisión humana.</p>
          </div>
        </aside>
      </div>

      <Modal
        open={quiz !== null}
        title={quiz ? `Quiz · ${topicLabel(quiz.topic)}` : 'Quiz'}
        onClose={() => setQuiz(null)}
        footer={quiz && (
          <>
            {showResults && <strong className="quiz-score">Resultado: {correctAnswers}/3</strong>}
            <button className="button button--secondary" type="button" onClick={() => setQuiz(null)}>Cerrar</button>
            {!showResults && (
              <button
                className="button button--primary"
                type="button"
                onClick={() => setShowResults(true)}
                disabled={Object.keys(answers).length !== quiz.questions.length}
              >
                Revisar respuestas
              </button>
            )}
          </>
        )}
      >
        {quiz && (
          <div className="quiz-list">
            {quiz.questions.map((question, questionIndex) => (
              <fieldset key={question.question}>
                <legend>{questionIndex + 1}. {question.question}</legend>
                {question.options.map((option, optionIndex) => {
                  const selected = answers[questionIndex] === optionIndex
                  const correct = question.correct_option_index === optionIndex
                  return (
                    <label key={option} className={`quiz-option ${selected ? 'is-selected' : ''} ${showResults && correct ? 'is-correct' : ''} ${showResults && selected && !correct ? 'is-wrong' : ''}`}>
                      <input type="radio" name={`question-${questionIndex}`} checked={selected} onChange={() => setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))} disabled={showResults} />
                      <span>{option}</span>
                    </label>
                  )
                })}
                {showResults && <p className="quiz-explanation">{question.explanation}</p>}
              </fieldset>
            ))}

          </div>
        )}

      </Modal>

    </div>
  )
}
