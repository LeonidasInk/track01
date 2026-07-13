"""
Agente Comercial IA (CRM y Chat).

Cubre:
- Historia de Usuario 1: Calificación conversacional de leads.
- Historia de Usuario 3: Seguimiento y derivación comercial.

Diseño: la lógica de negocio (scoring, persistencia) vive en
app/tools/crm_tools.py; este módulo solo orquesta el prompt hacia Gemini
y traduce su salida estructurada a llamadas del CRM. Esto separa
"lógica" de "interfaz/modelo", tal como pide el criterio de arquitectura
de la guía.
"""
import json
from typing import Optional

from sqlalchemy.orm import Session

from app import models
from app.gemini_client import gemini_client
from app.schemas import LeadQualification, OpportunitySummary
from app.tools import crm_tools

SYSTEM_PROMPT = """Eres el Agente Comercial IA de una empresa de servicios financieros.
Tu trabajo es conversar con un prospecto (B2B o B2C), identificar su tipo,
hacerle preguntas relevantes y configurables, y calificar su interés,
presupuesto, ajuste de perfil y urgencia en una escala de 0 a 5.

Reglas:
- Si el mensaje sugiere una empresa, un cargo corporativo, un volumen de negocio
  o necesidades organizacionales, clasifica como B2B. Si suena a una persona
  hablando de sus finanzas personales, clasifica como B2C. Si no es claro, usa UNKNOWN.
- Nunca inventes datos financieros específicos (tasas, montos garantizados, rendimientos).
  Si no tienes esa información, dilo y ofrece derivar a un asesor humano.
- Sé breve, profesional y cálido. Haz una pregunta de calificación a la vez.
- No propongas ejecutar acciones reguladas (transferencias, aperturas de cuenta, etc.);
  eso siempre queda como propuesta para el ejecutivo humano.
"""

SUMMARY_SYSTEM_PROMPT = """Eres el Agente Comercial IA. Vas a resumir una oportunidad
comercial para un ejecutivo humano, a partir del historial de conversación y del
estado de calificación del lead. Debes:
- Resumir la necesidad, el perfil y las objeciones detectadas.
- Indicar en qué etapa del embudo está.
- Sugerir UNA acción concreta: agendar_reunion, enviar_material o derivar_especialista.
- Redactar un borrador de mensaje para el prospecto, que el ejecutivo podrá aprobar,
  editar o rechazar antes de enviarlo. Nunca lo envíes tú mismo ni prometas resultados
  financieros específicos.
"""


class ComercialAgent:
    def __init__(self, client=None):
        self.client = client or gemini_client

    # ------------------------------------------------------------------
    # Historia 1: calificación conversacional
    # ------------------------------------------------------------------
    def handle_message(
        self, db: Session, session_id: str, message: str, contact_hint: Optional[dict] = None
    ) -> dict:
        contact_hint = contact_hint or {}
        contact = crm_tools.get_or_create_contact(db, session_id=session_id, **contact_hint)
        opportunity = crm_tools.get_or_create_opportunity(db, contact.id)

        crm_tools.log_conversation(db, contact.id, message, role="user")

        history_context = self._build_history_context(db, contact.id)
        prompt = (
            f"{history_context}\n\n"
            f"Estado actual del lead: tipo={contact.lead_type}, "
            f"interes={opportunity.interes}, presupuesto={opportunity.presupuesto}, "
            f"perfil={opportunity.perfil}, urgencia={opportunity.urgencia}.\n\n"
            f"Nuevo mensaje del prospecto: {message}"
        )

        result = self.client.generate_structured(
            input_text=prompt,
            schema=LeadQualification.model_json_schema(),
            system_instruction=SYSTEM_PROMPT,
        )
        qualification = LeadQualification.model_validate(result["data"])

        if qualification.lead_type != "UNKNOWN":
            contact.lead_type = qualification.lead_type
            db.commit()

        opportunity = crm_tools.update_opportunity_qualification(
            db,
            opportunity,
            interes=qualification.interes or opportunity.interes,
            presupuesto=qualification.presupuesto or opportunity.presupuesto,
            perfil=qualification.perfil or opportunity.perfil,
            urgencia=qualification.urgencia or opportunity.urgencia,
            necesidad=qualification.necesidad,
        )

        crm_tools.log_conversation(db, contact.id, qualification.reply_to_user, role="agent")

        return {
            "session_id": session_id,
            "reply": qualification.reply_to_user,
            "contact_id": contact.id,
            "opportunity_id": opportunity.id,
            "lead_type": contact.lead_type,
            "priority_label": opportunity.priority_label,
            "priority_score": opportunity.priority_score,
            "funnel_stage": opportunity.funnel_stage,
        }

    # ------------------------------------------------------------------
    # Historia 3: resumen + siguiente acción propuesta
    # ------------------------------------------------------------------
    def summarize_and_suggest(self, db: Session, opportunity_id: str) -> dict:
        opportunity = db.get(models.Opportunity, opportunity_id)
        if opportunity is None:
            raise ValueError(f"Oportunidad no encontrada: {opportunity_id}")

        history_context = self._build_history_context(db, opportunity.contact_id, limit=50)
        prompt = (
            f"{history_context}\n\n"
            f"Datos de calificación: interes={opportunity.interes}, "
            f"presupuesto={opportunity.presupuesto}, perfil={opportunity.perfil}, "
            f"urgencia={opportunity.urgencia}, prioridad={opportunity.priority_label}."
        )

        result = self.client.generate_structured(
            input_text=prompt,
            schema=OpportunitySummary.model_json_schema(),
            system_instruction=SUMMARY_SYSTEM_PROMPT,
        )
        summary = OpportunitySummary.model_validate(result["data"])

        opportunity.necesidad = summary.necesidad
        opportunity.objeciones = summary.objeciones
        opportunity.resumen = summary.mensaje_propuesto
        opportunity.funnel_stage = summary.etapa_embudo
        db.commit()
        db.refresh(opportunity)

        action = crm_tools.create_pending_action(
            db,
            opportunity_id=opportunity.id,
            action_type=summary.accion_sugerida,
            payload={
                "justificacion": summary.justificacion_accion,
                "mensaje_propuesto": summary.mensaje_propuesto,
                "resumen": {
                    "necesidad": summary.necesidad,
                    "perfil": summary.perfil,
                    "objeciones": summary.objeciones,
                    "etapa_embudo": summary.etapa_embudo,
                },
            },
        )

        return {
            "opportunity_id": opportunity.id,
            "summary": summary.model_dump(),
            "action_id": action.id,
            "action_status": action.status,
        }

    @staticmethod
    def _build_history_context(db: Session, contact_id: str, limit: int = 12) -> str:
        logs = (
            db.query(models.ConversationLog)
            .filter(models.ConversationLog.contact_id == contact_id)
            .order_by(models.ConversationLog.created_at.asc())
            .limit(limit)
            .all()
        )
        if not logs:
            return "Historial de conversación: (sin mensajes previos)"
        lines = [f"[{log.role}] {log.message}" for log in logs]
        return "Historial de conversación:\n" + "\n".join(lines)


comercial_agent = ComercialAgent()