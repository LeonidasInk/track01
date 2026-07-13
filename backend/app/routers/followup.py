import json

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app import models
from app.agents.comercial_agent import comercial_agent
from app.config import settings
from app.database import get_db
from app.gemini_client import GeminiUnavailableError
from app.rate_limit import limiter
from app.schemas import ActionDecisionIn, ActionOut
from app.tools import crm_tools

router = APIRouter(prefix="/api", tags=["Seguimiento y derivación comercial"])


@router.get("/opportunities/{opportunity_id}/summary")
@limiter.limit(settings.RATE_LIMIT_AI_ENDPOINTS)
def get_opportunity_summary(request: Request, opportunity_id: str, db: Session = Depends(get_db)):
    """
    Historia de Usuario 3: genera el resumen (necesidad, perfil, objeciones,
    etapa del embudo) y propone una siguiente acción, que queda pendiente
    de aprobación humana como una Action.
    """
    try:
        return comercial_agent.summarize_and_suggest(db, opportunity_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except GeminiUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get("/opportunities/{opportunity_id}/actions", response_model=list[ActionOut])
def list_actions(opportunity_id: str, db: Session = Depends(get_db)):
    actions = (
        db.query(models.Action)
        .filter(models.Action.opportunity_id == opportunity_id)
        .order_by(models.Action.created_at.desc())
        .all()
    )
    return [_action_to_out(a) for a in actions]


@router.post("/actions/{action_id}/decision", response_model=ActionOut)
def decide_action(action_id: str, payload: ActionDecisionIn, db: Session = Depends(get_db)):
    """
    Historia de Usuario 3, criterio 3: "El ejecutivo puede aprobar, editar
    o rechazar la propuesta antes de enviar comunicaciones." Ninguna acción
    se ejecuta automáticamente: esto solo cambia el estado de la propuesta.
    """
    action = db.get(models.Action, action_id)
    if action is None:
        raise HTTPException(status_code=404, detail="Acción no encontrada")

    action = crm_tools.resolve_action(
        db,
        action,
        decision=payload.decision,
        edited_payload=payload.edited_payload,
        reviewer_note=payload.reviewer_note,
    )
    return _action_to_out(action)


def _action_to_out(action: models.Action) -> ActionOut:
    return ActionOut(
        id=action.id,
        opportunity_id=action.opportunity_id,
        action_type=action.action_type,
        status=action.status,
        payload=json.loads(action.payload) if action.payload else {},
        edited_payload=json.loads(action.edited_payload) if action.edited_payload else None,
    )