export type LeadType = 'B2B' | 'B2C' | 'UNKNOWN'
export type PriorityLabel = 'alta' | 'media' | 'baja'
export type FunnelStage =
  | 'nuevo'
  | 'calificando'
  | 'educando'
  | 'listo_para_asesor'
  | 'derivado'
  | 'cerrado'

export type ActionStatus = 'pendiente' | 'aprobada' | 'editada' | 'rechazada'
export type ActionDecision = 'aprobar' | 'editar' | 'rechazar'

export interface HealthResponse {
  status: string
}

export interface ChatMessageIn {
  session_id: string
  message: string
  contact_hint?: {
    lead_type?: LeadType
    name?: string
    email?: string
    phone?: string
    company?: string
  }
}

export interface ChatMessageOut {
  session_id: string
  reply: string
  contact_id: string
  opportunity_id: string
  lead_type: LeadType
  priority_label: PriorityLabel
  priority_score: number
  funnel_stage: FunnelStage
}

export interface UnifiedChatIn {
  session_id: string
  message: string
  contact_hint?: {
    name?: string
    email?: string
    phone?: string
    company?: string
  }
}

export interface UnifiedChatOut {
  session_id: string
  reply: string
  contact_id: string
  channel: 'chat_comercial' | 'tutor_ia'

  // Solo presentes cuando channel === 'tutor_ia'
  topic_detected: string | null
  source: string | null
  found_in_kb: boolean | null
  requires_consent: boolean
  consent_topic: string | null

  // Solo presentes cuando channel === 'chat_comercial'. A propósito NO
  // incluye priority_label / priority_score: esas señales internas nunca
  // deben llegar a la vista del lead.
  opportunity_id: string | null
  lead_type: LeadType | null
  funnel_stage: FunnelStage | null
}

export interface ContactListItem {
  id: string
  name: string | null
  email: string | null
  company: string | null
  lead_type: LeadType
  session_id: string
  created_at: string
}

export interface OpportunityListItem {
  id: string
  contact_id: string
  priority_label: PriorityLabel
  priority_score: number
  funnel_stage: FunnelStage
  necesidad: string
}

export interface ConversationItem {
  role: 'user' | 'agent' | string
  channel: 'chat_comercial' | 'tutor_ia' | string
  message: string
  created_at: string
}

export interface ContactDetail {
  id: string
  name: string | null
  email: string | null
  company: string | null
  lead_type: LeadType

  opportunities: Array<{
    id: string
    priority_label: PriorityLabel
    priority_score: number
    funnel_stage: FunnelStage
    necesidad: string
  }>

  conversations: ConversationItem[]

  learning_signals: Array<{
    topic: string
    consent_given: boolean
    created_at: string
    channel: string
  }>
}

export interface LearningSignal {
  topic: string
  consent_given: boolean
  created_at: string
  channel: string
}
export interface TutorAskIn {
  session_id: string
  contact_id?: string
  message: string
}

export interface QuizQuestion {
  question: string
  options: string[]
  correct_option_index: number
  explanation: string
}

export interface Quiz {
  topic: string
  questions: QuizQuestion[]
}

export interface TutorAskOut {
  contact_id: string
  topic_detected: string | null
  answer: string
  source: string | null
  found_in_kb: boolean
  quiz: Quiz | null
  suggested_learning_path: string[]
}

export interface ConsentIn {
  contact_id: string
  topic: string
  consent: boolean
}

export interface ConsentOut {
  registered: boolean
}

export interface OpportunitySummary {
  necesidad: string
  perfil: string
  objeciones: string
  etapa_embudo: FunnelStage
  accion_sugerida: 'agendar_reunion' | 'enviar_material' | 'derivar_especialista'
  justificacion_accion: string
  mensaje_propuesto: string
}

export interface SummaryResponse {
  opportunity_id: string
  summary: OpportunitySummary
  action_id: string
  action_status: ActionStatus
}

export interface ActionOut {
  id: string
  opportunity_id: string
  action_type: string
  status: ActionStatus
  payload: {
    justificacion?: string
    mensaje_propuesto?: string
    resumen?: {
      necesidad?: string
      perfil?: string
      objeciones?: string
      etapa_embudo?: FunnelStage
    }
    [key: string]: unknown
  }
  edited_payload: Record<string, unknown> | null
}

export interface ActionDecisionIn {
  decision: ActionDecision
  edited_payload?: Record<string, unknown>
  reviewer_note?: string
}
