import type {
  ActionDecisionIn,
  ActionOut,
  ChatMessageIn,
  ChatMessageOut,
  ConsentIn,
  ConsentOut,
  ContactDetail,
  ContactListItem,
  HealthResponse,
  OpportunityListItem,
  Quiz,
  SummaryResponse,
  TutorAskIn,
  TutorAskOut,
  UnifiedChatIn,
  UnifiedChatOut,
} from '../types/api'

const configuredUrl = import.meta.env.VITE_API_URL as string | undefined
export const API_BASE_URL = (configuredUrl || 'http://localhost:8000').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  detail?: unknown

  constructor(message: string, status: number, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 75_000)

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
      signal: controller.signal,
    })

    const contentType = response.headers.get('content-type') || ''
    const body = contentType.includes('application/json') ? await response.json() : await response.text()

    if (!response.ok) {
      const detail = typeof body === 'object' && body !== null && 'detail' in body ? body.detail : body
      const message = typeof detail === 'string' ? detail : `La API respondió con estado ${response.status}`
      throw new ApiError(message, response.status, detail)
    }

    return body as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('La solicitud tardó demasiado. Verifica el backend o vuelve a intentar.', 408)
    }
    throw new ApiError('No fue posible conectar con el backend FastAPI.', 0, error)
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export const api = {
  health: () => request<HealthResponse>('/health'),

  sendCommercialMessage: (payload: ChatMessageIn) =>
    request<ChatMessageOut>('/api/chat/comercial', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sendUnifiedMessage: (payload: UnifiedChatIn) =>
    request<UnifiedChatOut>('/api/chat/mensaje', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  askTutor: (payload: TutorAskIn) =>
    request<TutorAskOut>('/api/tutor/ask', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getQuiz: (topic: string) => request<Quiz>(`/api/tutor/quiz/${encodeURIComponent(topic)}`),

  registerConsent: (payload: ConsentIn) =>
    request<ConsentOut>('/api/tutor/consent', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listContacts: () => request<ContactListItem[]>('/api/crm/contacts'),

  getContact: (contactId: string) =>
    request<ContactDetail>(`/api/crm/contacts/${encodeURIComponent(contactId)}`),

  listOpportunities: () => request<OpportunityListItem[]>('/api/crm/opportunities'),

  generateOpportunitySummary: (opportunityId: string) =>
    request<SummaryResponse>(`/api/opportunities/${encodeURIComponent(opportunityId)}/summary`),

  listOpportunityActions: (opportunityId: string) =>
    request<ActionOut[]>(`/api/opportunities/${encodeURIComponent(opportunityId)}/actions`),

  decideAction: (actionId: string, payload: ActionDecisionIn) =>
    request<ActionOut>(`/api/actions/${encodeURIComponent(actionId)}/decision`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
