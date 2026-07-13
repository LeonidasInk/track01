from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.database import get_db

router = APIRouter(prefix="/api/crm", tags=["CRM (simulado) - Consulta"])


@router.get("/contacts")
def list_contacts(db: Session = Depends(get_db)):
    contacts = db.query(models.Contact).order_by(models.Contact.created_at.desc()).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "company": c.company,
            "lead_type": c.lead_type,
            "session_id": c.session_id,
            "created_at": c.created_at,
        }
        for c in contacts
    ]


@router.get("/contacts/{contact_id}")
def get_contact(contact_id: str, db: Session = Depends(get_db)):
    contact = db.get(models.Contact, contact_id)

    if contact is None:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    return {
        "id": contact.id,
        "name": contact.name,
        "email": contact.email,
        "company": contact.company,
        "lead_type": contact.lead_type,

        "opportunities": [
            {
                "id": o.id,
                "priority_label": o.priority_label,
                "priority_score": o.priority_score,
                "funnel_stage": o.funnel_stage,
                "necesidad": o.necesidad,
            }
            for o in contact.opportunities
        ],

        # Conversación normal
        "conversations": [
            {
                "role": c.role,
                "channel": c.channel,
                "message": c.message,
                "created_at": c.created_at
            }
            for c in contact.conversations
            if c.topic_of_interest is None
        ],

        # Señales comerciales con consentimiento
        "learning_signals": [
            {
                "topic": c.topic_of_interest,
                "consent_given": c.consent_given,
                "created_at": c.created_at,
                "channel": c.channel
            }
            for c in contact.conversations
            if c.topic_of_interest is not None
        ],
    }
@router.get("/opportunities")
def list_opportunities(db: Session = Depends(get_db)):
    opportunities = (
        db.query(models.Opportunity).order_by(models.Opportunity.updated_at.desc()).all()
    )
    return [
        {
            "id": o.id,
            "contact_id": o.contact_id,
            "priority_label": o.priority_label,
            "priority_score": o.priority_score,
            "funnel_stage": o.funnel_stage,
            "necesidad": o.necesidad,
        }
        for o in opportunities
    ]