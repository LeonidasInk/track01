"""
Modelos del CRM simulado.

Entidades (según Historia de Usuario 1 y 3 de la guía del hackathon):
- Contact: prospecto B2B o B2C
- Opportunity: oportunidad comercial asociada, con score de prioridad
- ConversationLog: resumen de cada interacción (chat comercial o tutor)
- Action: propuesta de siguiente acción que requiere aprobación humana
  ("las acciones reguladas o sensibles deben quedar como propuesta,
  alerta o solicitud de aprobación; no es necesario ejecutarlas en
  producción").
"""
import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Float, Integer, DateTime, ForeignKey, Text, Boolean, Enum
)
from sqlalchemy.orm import relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class LeadType(str, enum.Enum):
    B2B = "B2B"
    B2C = "B2C"
    UNKNOWN = "UNKNOWN"


class PriorityLabel(str, enum.Enum):
    ALTA = "alta"
    MEDIA = "media"
    BAJA = "baja"


class FunnelStage(str, enum.Enum):
    NUEVO = "nuevo"
    CALIFICANDO = "calificando"
    EDUCANDO = "educando"
    LISTO_PARA_ASESOR = "listo_para_asesor"
    DERIVADO = "derivado"
    CERRADO = "cerrado"


class ActionStatus(str, enum.Enum):
    PENDIENTE = "pendiente"
    APROBADA = "aprobada"
    EDITADA = "editada"
    RECHAZADA = "rechazada"


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    tax_id = Column(String, nullable=True)  # cédula o RUC ecuatoriano
    tax_id_type = Column(String, nullable=True)  # cedula | ruc_persona_natural | ruc_sociedad_privada | ruc_sociedad_publica | invalido
    tax_id_valid = Column(Boolean, nullable=True)
    lead_type = Column(Enum(LeadType), default=LeadType.UNKNOWN)
    session_id = Column(String, index=True)  # identifica el canal/hilo de chat
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    opportunities = relationship("Opportunity", back_populates="contact", cascade="all, delete-orphan")
    conversations = relationship("ConversationLog", back_populates="contact", cascade="all, delete-orphan")


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(String, primary_key=True, default=_uuid)
    contact_id = Column(String, ForeignKey("contacts.id"), nullable=False)

    # Señales usadas para calificar el lead (Historia 1)
    interes = Column(Integer, default=0)       # 1-5
    presupuesto = Column(Integer, default=0)   # 1-5
    perfil = Column(Integer, default=0)        # 1-5
    urgencia = Column(Integer, default=0)      # 1-5

    priority_score = Column(Float, default=0.0)
    priority_label = Column(Enum(PriorityLabel), default=PriorityLabel.BAJA)

    funnel_stage = Column(Enum(FunnelStage), default=FunnelStage.NUEVO)
    necesidad = Column(Text, default="")
    objeciones = Column(Text, default="")
    resumen = Column(Text, default="")

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    contact = relationship("Contact", back_populates="opportunities")
    actions = relationship("Action", back_populates="opportunity", cascade="all, delete-orphan")


class ConversationLog(Base):
    __tablename__ = "conversation_logs"

    id = Column(String, primary_key=True, default=_uuid)
    contact_id = Column(String, ForeignKey("contacts.id"), nullable=False)
    channel = Column(String, default="chat_comercial")  # chat_comercial | tutor_ia
    role = Column(String, default="user")  # user | agent
    message = Column(Text, default="")
    topic_of_interest = Column(String, nullable=True)  # señal educativa -> comercial
    consent_given = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)

    contact = relationship("Contact", back_populates="conversations")


class Action(Base):
    """Propuesta de siguiente acción comercial pendiente de aprobación humana."""
    __tablename__ = "actions"

    id = Column(String, primary_key=True, default=_uuid)
    opportunity_id = Column(String, ForeignKey("opportunities.id"), nullable=False)
    action_type = Column(String, default="")  # agendar_reunion | enviar_material | derivar_especialista
    payload = Column(Text, default="")  # JSON con detalle de la acción propuesta
    status = Column(Enum(ActionStatus), default=ActionStatus.PENDIENTE)
    edited_payload = Column(Text, nullable=True)
    reviewer_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    opportunity = relationship("Opportunity", back_populates="actions")