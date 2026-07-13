import {
  ArrowUp,
  BookOpenCheck,
  Check,
  CircleAlert,
  ClipboardCheck,
  GraduationCap,
  Info,
  RefreshCw,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import { ApiError, api } from '../services/api'
import type { ContactListItem, Quiz, TutorAskOut } from '../types/api'
import { getDisplayName, topicLabel } from '../utils/format'
import type { PageId } from '../components/AppShell'

interface TutorTurn {
  id: string
  question: string
  response: TutorAskOut
}

interface TutorPageProps {
  selectedContactId: string
  onSelectContact: (id: string) => void
  onNavigate: (page: PageId) => void
}

const promptExamples = [
  '¿Qué significa diversificar una inversión?',
  'Explícame el interés compuesto de forma sencilla.',
  '¿Cuál es la diferencia entre renta fija y renta variable?',
]

export function TutorPage({ selectedContactId, onSelectContact, onNavigate }: TutorPageProps) {
  const [contacts, setContacts] = useState<ContactListItem[]>([])
  const [message, setMessage] = useState('')
  const [turns, setTurns] = useState<TutorTurn[]>([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [showResults, setShowResults] = useState(false)
  const [consentStatus, setConsentStatus] = useState<Record<string, 'saved' | 'declined'>>({})

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true)
    setError('')
    try {
      const data = await api.listContacts()
      setContacts(data)
      if (data[0] && !data.some((contact) => contact.id === selectedContactId)) onSelectContact(data[0].id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los contactos.')
    } finally {
      setLoadingContacts(false)
    }
  }, [onSelectContact, selectedContactId])

  useEffect(() => {
    void loadContacts()
  }, [loadContacts])

  const ask = async () => {
    const trimmed = message.trim()
    if (!trimmed || !selectedContactId || loading) return
    setLoading(true)
    setError('')
    try {
      const response = await api.askTutor({
        session_id: `tutor-${selectedContactId}`,
        contact_id: selectedContactId,
        message: trimmed,
      })
      setTurns((current) => [...current, { id: crypto.randomUUID(), question: trimmed, response }])
      setMessage('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'El tutor no pudo responder.')
    } finally {
      setLoading(false)
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

  const registerConsent = async (topic: string, consent: boolean) => {
    if (!selectedContactId) return
    setError('')
    try {
      const response = await api.registerConsent({ contact_id: selectedContactId, topic, consent })
      setConsentStatus((current) => ({
        ...current,
        [topic]: response.registered ? 'saved' : 'declined',
      }))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el consentimiento.')
    }
  }

  const selectedContact = contacts.find((contact) => contact.id === selectedContactId)
  const correctAnswers = quiz?.questions.reduce((total, question, index) => total + (answers[index] === question.correct_option_index ? 1 : 0), 0) ?? 0

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Historia de usuario 2</span>
          <h1>Futuro Academy</h1>
          <p>Educación financiera guiada, fundamentada en contenido aprobado y conectada al CRM mediante consentimiento.</p>
        </div>
        <button className="button button--secondary" type="button" onClick={() => void loadContacts()} disabled={loadingContacts}>
          <RefreshCw size={16} /> Actualizar contactos
        </button>
      </header>

      {error && (
        <div className="alert alert--danger" role="alert">
          <CircleAlert size={18} /> {error}
          <button className="text-button" type="button" onClick={() => void loadContacts()}>Reintentar</button>
        </div>
      )}

      <section className="tutor-intro">
        <div className="tutor-intro__badge"><GraduationCap size={26} /></div>
        <div>
          <span className="eyebrow eyebrow--accent">Tutor financiero con trazabilidad</span>
          <h2>Aprender primero. Decidir después.</h2>
          <p>El tutor solo responde desde la base aprobada de Futuro Academy y muestra la fuente de cada explicación.</p>
        </div>
        <label className="field tutor-intro__contact">
          <span>Contacto asociado</span>
          <select
            value={selectedContactId}
            onChange={(event) => onSelectContact(event.target.value)}
            disabled={loadingContacts || contacts.length === 0}
          >
            <option value="">Selecciona un contacto</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {getDisplayName(contact.name, contact.company)} · {contact.lead_type}
              </option>
            ))}
          </select>
          <small>El backend exige un contacto válido para registrar el contexto educativo.</small>
        </label>
      </section>

      {contacts.length === 0 && !loadingContacts ? (
        <EmptyState
          icon={UserRound}
          title="Crea primero un contacto"
          description="El tutor registra sus respuestas y señales de interés sobre un contacto ya existente. Inicia una conversación comercial para crear uno."
          action={
            <button className="button button--secondary button--small" type="button" onClick={() => onNavigate('commercial')}>
              Abrir agente comercial
            </button>
          }
        />
      ) : (
        <div className="tutor-layout">
          <section className="tutor-conversation">
            {turns.length === 0 ? (
              <div className="tutor-empty">
                <span><BookOpenCheck size={28} /></span>
                <h2>Pregunta sobre conceptos básicos de inversión</h2>
                <p>Prueba uno de estos temas aprobados o escribe tu propia pregunta.</p>
                <div className="prompt-suggestions">
                  {promptExamples.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => setMessage(prompt)}>{prompt}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="tutor-turns" aria-live="polite">
                {turns.map((turn) => (
                  <article key={turn.id} className="tutor-turn">
                    <div className="tutor-turn__question"><UserRound size={17} /><p>{turn.question}</p></div>
                    <div className="tutor-turn__answer">
                      <span className="tutor-turn__spark"><Sparkles size={18} /></span>
                      <div>
                        <p>{turn.response.answer}</p>
                        <div className="source-line">
                          <StatusBadge tone={turn.response.found_in_kb ? 'success' : 'warning'}>
                            {turn.response.found_in_kb ? 'Base aprobada' : 'Fuera de cobertura'}
                          </StatusBadge>
                          {turn.response.source && <span>{turn.response.source}</span>}
                        </div>
                        {turn.response.topic_detected && (
                          <div className="tutor-actions">
                            <button className="button button--secondary button--small" type="button" onClick={() => void openQuiz(turn.response.topic_detected!)} disabled={quizLoading}>
                              <ClipboardCheck size={15} /> Quiz de 3 preguntas
                            </button>
                            {consentStatus[turn.response.topic_detected] === 'saved' ? (
                              <StatusBadge tone="success"><Check size={14} /> Interés registrado</StatusBadge>
                            ) : consentStatus[turn.response.topic_detected] === 'declined' ? (
                              <StatusBadge tone="neutral">No registrado</StatusBadge>
                            ) : (
                              <div className="consent-controls">
                                <span>¿Registrar "{topicLabel(turn.response.topic_detected)}" como interés comercial?</span>
                                <button
                                  className="button button--approve button--small"
                                  type="button"
                                  onClick={() => void registerConsent(turn.response.topic_detected!, true)}
                                >
                                  Sí
                                </button>
                                <button
                                  className="button button--secondary button--small"
                                  type="button"
                                  onClick={() => void registerConsent(turn.response.topic_detected!, false)}
                                >
                                  No
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="tutor-composer">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void ask()
                  }
                }}
                rows={3}
                placeholder={selectedContact ? `Pregunta como ${getDisplayName(selectedContact.name, selectedContact.company)}…` : 'Selecciona un contacto para comenzar'}
                disabled={!selectedContactId || loading}
              />
              <button className="send-button" type="button" onClick={() => void ask()} disabled={!message.trim() || !selectedContactId || loading} aria-label="Enviar pregunta" title="Enviar pregunta">
                <ArrowUp size={20} />
              </button>
            </div>
          </section>

          <aside className="learning-rail">
            <span className="eyebrow">Ruta sugerida</span>
            <h2>Fundamentos para comenzar</h2>
            <ol>
              <li><span>1</span><div><strong>Entender el objetivo</strong><small>Qué significa invertir y por qué existe riesgo.</small></div></li>
              <li><span>2</span><div><strong>Reconocer tu perfil</strong><small>Horizonte, tolerancia y situación personal.</small></div></li>
              <li><span>3</span><div><strong>Diversificar</strong><small>Cómo repartir exposición entre distintos activos.</small></div></li>
            </ol>
            <div className="info-callout info-callout--light"><Info size={18} /><p>Las respuestas educativas no constituyen asesoría financiera personalizada.</p></div>
          </aside>
        </div>
      )}

      <Modal
        open={quiz !== null}
        title={quiz ? `Quiz · ${topicLabel(quiz.topic)}` : 'Quiz'}
        onClose={() => setQuiz(null)}
        footer={quiz && (
          <>
            {showResults && <strong className="quiz-score">Resultado: {correctAnswers}/3</strong>}
            <button className="button button--secondary" type="button" onClick={() => setQuiz(null)}>Cerrar</button>
            {!showResults && (
              <button className="button button--primary" type="button" onClick={() => setShowResults(true)} disabled={Object.keys(answers).length !== quiz.questions.length}>
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