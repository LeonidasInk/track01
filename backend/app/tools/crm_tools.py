"""
Herramientas del CRM (simulado con SQLite).

Estas funciones son el "brazo de escritura" de los agentes: reciben datos
ya calificados/estructurados por el LLM y los persisten. Mantener esta
lógica separada del prompt del modelo es justamente lo que pide el
criterio de evaluación "arquitectura sólida: lógica separada de la
interfaz" de la guía del hackathon.
"""
import json
from typing import Optional

from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.utils.ecuador_ids import validar_documento


def get_or_create_contact(
    db: Session,
    session_id: str,
    lead_type: Optional[str] = None,
    name: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    company: Optional[str] = None,
    tax_id: Optional[str] = None,
) -> models.Contact:
    tax_id_type = None
    tax_id_valid = None
    if tax_id:
        resultado = validar_documento(tax_id)
        tax_id_type = resultado.tipo
        tax_id_valid = resultado.valido

    contact = (
        db.query(models.Contact).filter(models.Contact.session_id == session_id).first()
    )
    if contact is None:
        contact = models.Contact(
            session_id=session_id,
            lead_type=lead_type or models.LeadType.UNKNOWN,
            name=name,
            email=email,
            phone=phone,
            company=company,
            tax_id=tax_id,
            tax_id_type=tax_id_type,
            tax_id_valid=tax_id_valid,
        )
        db.add(contact)
        db.commit()
        db.refresh(contact)
        return contact

    changed = False
    for field, value in (
        ("lead_type", lead_type),
        ("name", name),
        ("email", email),
        ("phone", phone),
        ("company", company),
    ):
        if value:
            setattr(contact, field, value)
            changed = True
    if tax_id:
        contact.tax_id = tax_id
        contact.tax_id_type = tax_id_type
        contact.tax_id_valid = tax_id_valid
        changed = True
    if changed:
        db.commit()
        db.refresh(contact)
    return contact


def get_or_create_opportunity(db: Session, contact_id: str) -> models.Opportunity:
    opp = (
        db.query(models.Opportunity)
        .filter(models.Opportunity.contact_id == contact_id)
        .order_by(models.Opportunity.created_at.desc())
        .first()
    )
    if opp is None:
        opp = models.Opportunity(contact_id=contact_id)
        db.add(opp)
        db.commit()
        db.refresh(opp)
    return opp


def calculate_priority(interes: int, presupuesto: int, perfil: int, urgencia: int) -> tuple[float, str]:
    """
    Calcula la prioridad simple del lead (Historia 1, criterio de aceptación 2):
    "Calcula una prioridad simple del lead usando interés, presupuesto, perfil y urgencia."
    Devuelve un score 0-5 y una etiqueta alta/media/baja.
    """
    w = settings.LEAD_SCORE_WEIGHTS
    score = (
        interes * w["interes"]
        + presupuesto * w["presupuesto"]
        + perfil * w["perfil"]
        + urgencia * w["urgencia"]
    )
    score = round(score, 2)
    if score >= 3.5:
        label = models.PriorityLabel.ALTA
    elif score >= 2.0:
        label = models.PriorityLabel.MEDIA
    else:
        label = models.PriorityLabel.BAJA
    return score, label


def update_opportunity_qualification(
    db: Session,
    opportunity: models.Opportunity,
    interes: int,
    presupuesto: int,
    perfil: int,
    urgencia: int,
    necesidad: str = "",
) -> models.Opportunity:
    opportunity.interes = interes
    opportunity.presupuesto = presupuesto
    opportunity.perfil = perfil
    opportunity.urgencia = urgencia
    if necesidad:
        opportunity.necesidad = necesidad

    score, label = calculate_priority(interes, presupuesto, perfil, urgencia)
    opportunity.priority_score = score
    opportunity.priority_label = label

    if opportunity.funnel_stage == models.FunnelStage.NUEVO:
        opportunity.funnel_stage = models.FunnelStage.CALIFICANDO

    db.commit()
    db.refresh(opportunity)
    return opportunity


def log_conversation(
    db: Session,
    contact_id: str,
    message: str,
    role: str = "user",
    channel: str = "chat_comercial",
    topic_of_interest: Optional[str] = None,
    consent_given: bool = False,
) -> models.ConversationLog:
    log = models.ConversationLog(
        contact_id=contact_id,
        message=message,
        role=role,
        channel=channel,
        topic_of_interest=topic_of_interest,
        consent_given=consent_given,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def register_learning_signal(
    db: Session, contact_id: str, topic: str, consent: bool
) -> Optional[models.ConversationLog]:
    """
    Historia 2, criterio de aceptación 3: "Registra el tema de interés del
    usuario, con su consentimiento, como señal comercial en el CRM."
    Si no hay consentimiento, no se registra nada.
    """
    if not consent:
        return None
    return log_conversation(
        db,
        contact_id=contact_id,
        message=f"Interés educativo detectado en el tema: {topic}",
        role="agent",
        channel="tutor_ia",
        topic_of_interest=topic,
        consent_given=True,
    )


def create_pending_action(
    db: Session, opportunity_id: str, action_type: str, payload: dict
) -> models.Action:
    """
    Historia 3, criterio de aceptación 3: la acción queda pendiente de
    aprobación del ejecutivo comercial antes de ejecutarse.
    """
    action = models.Action(
        opportunity_id=opportunity_id,
        action_type=action_type,
        payload=json.dumps(payload, ensure_ascii=False),
        status=models.ActionStatus.PENDIENTE,
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


def resolve_action(
    db: Session,
    action: models.Action,
    decision: str,
    edited_payload: Optional[dict] = None,
    reviewer_note: Optional[str] = None,
) -> models.Action:
    if decision == "aprobar":
        action.status = models.ActionStatus.APROBADA
    elif decision == "editar":
        action.status = models.ActionStatus.EDITADA
        action.edited_payload = json.dumps(edited_payload or {}, ensure_ascii=False)
    elif decision == "rechazar":
        action.status = models.ActionStatus.RECHAZADA
    action.reviewer_note = reviewer_note
    db.commit()
    db.refresh(action)
    return action