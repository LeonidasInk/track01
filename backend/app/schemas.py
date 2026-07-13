"""
Esquemas Pydantic.

Se usan en dos contextos:
1. Como contratos de entrada/salida de la API REST (FastAPI).
2. Como `response_format.schema` para pedirle a Gemini resultados
   estructurados (evita respuestas libres que puedan alucinar campos).
"""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Historia 1: Chat comercial / calificación de leads
# ---------------------------------------------------------------------------

class ChatMessageIn(BaseModel):
    session_id: str = Field(..., description="Identificador de sesión/hilo del chat")
    message: str = Field(..., description="Mensaje del prospecto")
    contact_hint: Optional[dict] = Field(
        default=None, description="Datos opcionales ya conocidos del contacto (nombre, email, etc.)"
    )


class ChatMessageOut(BaseModel):
    session_id: str
    reply: str
    contact_id: str
    opportunity_id: str
    lead_type: str
    priority_label: str
    priority_score: float
    funnel_stage: str


class LeadQualification(BaseModel):
    """Salida estructurada que le pedimos al modelo para calificar al lead."""
    lead_type: Literal["B2B", "B2C", "UNKNOWN"] = Field(
        description="Tipo de prospecto identificado a partir de la conversación"
    )
    interes: int = Field(ge=0, le=5, description="Nivel de interés detectado (0-5)")
    presupuesto: int = Field(ge=0, le=5, description="Señal de presupuesto/capacidad de pago (0-5)")
    perfil: int = Field(ge=0, le=5, description="Qué tanto encaja el perfil con el producto (0-5)")
    urgencia: int = Field(ge=0, le=5, description="Urgencia expresada por el prospecto (0-5)")
    necesidad: str = Field(description="Resumen breve de la necesidad del prospecto")
    siguiente_pregunta: str = Field(
        description="Siguiente pregunta de calificación que el agente debería hacer, o cadena vacía si ya tiene suficiente información"
    )
    reply_to_user: str = Field(description="Respuesta conversacional a mostrar al prospecto")


# ---------------------------------------------------------------------------
# Router: chat único que unifica Agente Comercial IA + Tutor IA
# ---------------------------------------------------------------------------

class IntentClassification(BaseModel):
    """Salida estructurada que le pedimos a Gemini para desambiguar el
    enrutamiento cuando la heurística por palabras clave no es concluyente."""
    intent: Literal["comercial", "tutor"] = Field(
        description="A qué agente debe enrutarse el mensaje del usuario"
    )
    reason: str = Field(description="Justificación breve de la clasificación")


class UnifiedChatIn(BaseModel):
    session_id: str = Field(..., description="Identificador de sesión/hilo del chat único")
    message: str = Field(..., description="Mensaje del usuario (lead)")
    contact_hint: Optional[dict] = Field(
        default=None, description="Datos opcionales ya conocidos del contacto (nombre, email, etc.)"
    )


class UnifiedChatOut(BaseModel):
    session_id: str
    reply: str
    contact_id: str
    channel: Literal["chat_comercial", "tutor_ia"]

    # Presentes solo cuando channel == "tutor_ia"
    topic_detected: Optional[str] = None
    source: Optional[str] = None
    found_in_kb: Optional[bool] = None
    requires_consent: bool = False
    consent_topic: Optional[str] = None

    # Presentes solo cuando channel == "chat_comercial". Nótese que a
    # propósito NO se exponen priority_label / priority_score aquí: esta
    # es la vista del lead y esas señales internas de calificación son
    # solo para el panel del ejecutivo (ver /api/crm y /api/opportunities).
    opportunity_id: Optional[str] = None
    lead_type: Optional[str] = None
    funnel_stage: Optional[str] = None


# ---------------------------------------------------------------------------
# Historia 2: Tutor financiero (Futuro Academy)
# ---------------------------------------------------------------------------

class TutorAskIn(BaseModel):
    session_id: str
    contact_id: Optional[str] = None
    message: str


class TutorAskOut(BaseModel):
    contact_id: Optional[str] = None
    topic_detected: Optional[str]
    answer: str
    source: Optional[str]
    found_in_kb: bool
    quiz: Optional["Quiz"] = None
    suggested_learning_path: List[str] = []

    # Historia de Usuario 2 - consentimiento CRM
    requires_consent: bool = False
    consent_topic: Optional[str] = None

class QuizQuestion(BaseModel):
    question: str
    options: List[str] = Field(min_length=2, max_length=5)
    correct_option_index: int = Field(ge=0)
    explanation: str


class Quiz(BaseModel):
    topic: str
    questions: List[QuizQuestion] = Field(min_length=3, max_length=3)


class ConsentIn(BaseModel):
    contact_id: str
    topic: str
    consent: bool


# ---------------------------------------------------------------------------
# Historia 3: Resumen y derivación comercial
# ---------------------------------------------------------------------------

class NextActionType(str):
    AGENDAR_REUNION = "agendar_reunion"
    ENVIAR_MATERIAL = "enviar_material"
    DERIVAR_ESPECIALISTA = "derivar_especialista"


class OpportunitySummary(BaseModel):
    """Salida estructurada del resumen que genera el agente para el ejecutivo."""
    necesidad: str
    perfil: str
    objeciones: str
    etapa_embudo: Literal[
        "nuevo", "calificando", "educando", "listo_para_asesor", "derivado", "cerrado"
    ]
    accion_sugerida: Literal["agendar_reunion", "enviar_material", "derivar_especialista"]
    justificacion_accion: str
    mensaje_propuesto: str = Field(
        description="Borrador del mensaje/comunicación a enviar al prospecto, pendiente de aprobación humana"
    )


class ActionDecisionIn(BaseModel):
    decision: Literal["aprobar", "editar", "rechazar"]
    edited_payload: Optional[dict] = None
    reviewer_note: Optional[str] = None


class ActionOut(BaseModel):
    id: str
    opportunity_id: str
    action_type: str
    status: str
    payload: dict
    edited_payload: Optional[dict] = None


TutorAskOut.model_rebuild()