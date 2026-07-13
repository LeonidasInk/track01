from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.agents.tutor_agent import tutor_agent
from app.config import settings
from app.database import get_db
from app.gemini_client import GeminiUnavailableError
from app.rate_limit import limiter
from app.schemas import ConsentIn, TutorAskIn, TutorAskOut

router = APIRouter(prefix="/api/tutor", tags=["Tutor IA - Futuro Academy"])


@router.post("/ask", response_model=TutorAskOut)
@limiter.limit(settings.RATE_LIMIT_AI_ENDPOINTS)
def tutor_ask(request: Request, payload: TutorAskIn, db: Session = Depends(get_db)):
    """
    Historia de Usuario 2: responde con contenido aprobado por Futuro Academy
    (indicando la fuente) y sugiere una ruta de aprendizaje.
    """
    try:
        result = tutor_agent.ask(db=db, contact_id=payload.contact_id, message=payload.message)
    except GeminiUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return TutorAskOut(**result)


@router.get("/quiz/{topic}")
@limiter.limit(settings.RATE_LIMIT_AI_ENDPOINTS)
def tutor_quiz(request: Request, topic: str):
    """Genera un quiz de 3 preguntas para un tema de la base aprobada."""
    try:
        quiz = tutor_agent.generate_quiz(topic)
    except GeminiUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    if quiz is None:
        raise HTTPException(status_code=404, detail=f"Tema no encontrado en la base aprobada: {topic}")
    return quiz


@router.post("/consent")
def tutor_consent(payload: ConsentIn, db: Session = Depends(get_db)):
    """
    Historia de Usuario 2, criterio 3: registra el tema de interés como
    señal comercial en el CRM, solo si el usuario dio su consentimiento.
    """
    log = tutor_agent.register_consent_signal(
        db, contact_id=payload.contact_id, topic=payload.topic, consent=payload.consent
    )
    return {"registered": log is not None}