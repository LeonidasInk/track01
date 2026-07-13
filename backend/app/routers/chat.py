from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.agents.comercial_agent import comercial_agent
from app.agents.router_agent import router_agent
from app.config import settings
from app.database import get_db
from app.gemini_client import GeminiUnavailableError
from app.rate_limit import limiter
from app.schemas import ChatMessageIn, ChatMessageOut, UnifiedChatIn, UnifiedChatOut

router = APIRouter(prefix="/api/chat", tags=["Agente Comercial - Chat"])


@router.post("/mensaje", response_model=UnifiedChatOut)
@limiter.limit(settings.RATE_LIMIT_AI_ENDPOINTS)
def chat_unificado(request: Request, payload: UnifiedChatIn, db: Session = Depends(get_db)):
    """
    Chat único para el lead (landing pública): un mismo hilo/session_id que
    internamente enruta cada mensaje al Agente Comercial IA (Historia 1) o
    al Tutor IA (Historia 2), sin que el usuario tenga que cambiar de
    pantalla. Este es el endpoint que debe usar el frontend público.
    """
    try:
        result = router_agent.handle_message(
            db=db,
            session_id=payload.session_id,
            message=payload.message,
            contact_hint=payload.contact_hint,
        )
    except GeminiUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return UnifiedChatOut(**result)


@router.post("/comercial", response_model=ChatMessageOut)
@limiter.limit(settings.RATE_LIMIT_AI_ENDPOINTS)
def chat_comercial(request: Request, payload: ChatMessageIn, db: Session = Depends(get_db)):
    """
    Historia de Usuario 1: Calificación conversacional de leads.
    Recibe un mensaje del prospecto, identifica B2B/B2C, hace preguntas de
    calificación y actualiza el contacto/oportunidad en el CRM.

    Se mantiene como endpoint independiente para uso interno/pruebas del
    panel; el flujo público del lead usa /api/chat/mensaje.
    """
    try:
        result = comercial_agent.handle_message(
            db=db,
            session_id=payload.session_id,
            message=payload.message,
            contact_hint=payload.contact_hint,
        )
    except GeminiUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return ChatMessageOut(**result)