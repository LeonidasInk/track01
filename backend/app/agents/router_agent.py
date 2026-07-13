"""
Agente Enrutador (Router Agent).

Une el Agente Comercial IA y el Tutor IA en una única conversación
continua, tal como pide el criterio de "continuidad de la conversación"
del track. El usuario nunca ve dos chats separados: escribe en un solo
hilo (mismo session_id) y el router decide, mensaje a mensaje, si debe
responder el agente comercial (calificación de lead) o el tutor
(educación financiera con contenido aprobado).

Diseño:
- Clasificación rápida y barata primero (heurística de palabras clave
  sobre la base de conocimiento del tutor), para no gastar una llamada a
  Gemini en casos obvios y para que la demo no dependa de la latencia del
  modelo en el camino crítico de UX.
- Si la heurística no encuentra una señal clara, se usa una clasificación
  estructurada con Gemini como respaldo.
- El router NUNCA responde directamente: siempre delega en
  `comercial_agent` o `tutor_agent`, que ya tienen su propio prompt de
  sistema y su propia lógica de persistencia. Esto evita duplicar lógica
  de negocio y mantiene la separación "lógica vs. orquestación" del resto
  del proyecto.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.agents.comercial_agent import comercial_agent
from app.agents.knowledge_base import find_topic
from app.agents.tutor_agent import tutor_agent
from app.gemini_client import gemini_client
from app.schemas import IntentClassification
from app.tools import crm_tools

ROUTER_SYSTEM_PROMPT = """Eres un clasificador de intención para el chat único de NexoFin.
Debes decidir si el ÚLTIMO mensaje del usuario corresponde a:
- "comercial": el usuario habla de su situación financiera, presupuesto, empresa,
  interés en contratar/invertir, o responde una pregunta de calificación. También
  usa "comercial" para saludos genéricos o mensajes ambiguos sin una pregunta
  educativa explícita.
- "tutor": el usuario hace una pregunta educativa sobre conceptos de inversión
  (qué es invertir, riesgo, diversificación, renta fija/variable, interés
  compuesto, fondos de inversión), o pide que le expliquen/enseñen algo.

Responde solo con la clasificación estructurada solicitada.
"""

# Palabras que casi siempre indican que el usuario quiere que le "enseñen"
# algo, independientemente de si el tema coincide con la base aprobada.
_TEACHING_HINTS = (
    "qué es",
    "que es",
    "explica",
    "explícame",
    "enséñame",
    "ensename",
    "cómo funciona",
    "como funciona",
    "diferencia entre",
    "puedes enseñarme",
    "puedo aprender",
)


class RouterAgent:
    def __init__(self, client=None, comercial=None, tutor=None):
        self.client = client or gemini_client
        self.comercial = comercial or comercial_agent
        self.tutor = tutor or tutor_agent

    # ------------------------------------------------------------------
    # Clasificación de intención
    # ------------------------------------------------------------------
    def classify_intent(self, message: str) -> str:
        text = message.lower()

        # 1) Heurística barata: si el mensaje coincide con un tema de la
        #    base aprobada Y además "suena" a pregunta educativa, es tutor.
        matched_topic = find_topic(message)
        looks_like_question = "?" in text or any(hint in text for hint in _TEACHING_HINTS)
        if matched_topic is not None and looks_like_question:
            return "tutor"

        # 2) Si no hay coincidencia con la base aprobada, casi seguro es
        #    comercial (el tutor no tendría contenido que ofrecer igual).
        if matched_topic is None:
            return "comercial"

        # 3) Caso ambiguo (coincide con un tema pero no parece pregunta):
        #    se resuelve con Gemini para no perder señal educativa real,
        #    con fallback seguro a "comercial" si el modelo no está disponible.
        try:
            result = self.client.generate_structured(
                input_text=f"Mensaje del usuario: {message}",
                schema=IntentClassification.model_json_schema(),
                system_instruction=ROUTER_SYSTEM_PROMPT,
            )
            classification = IntentClassification.model_validate(result["data"])
            return classification.intent
        except Exception:
            return "comercial"

    # ------------------------------------------------------------------
    # Orquestación del mensaje unificado
    # ------------------------------------------------------------------
    def handle_message(
        self, db: Session, session_id: str, message: str, contact_hint: Optional[dict] = None
    ) -> dict:
        contact_hint = contact_hint or {}
        # Aseguramos que exista un contacto asociado a esta sesión desde el
        # primer mensaje, sin importar a qué agente se enrute: así el tutor
        # siempre tiene un contact_id disponible para registrar señales de
        # interés con consentimiento (Historia 2).
        contact = crm_tools.get_or_create_contact(db, session_id=session_id, **contact_hint)

        intent = self.classify_intent(message)

        if intent == "tutor":
            tutor_result = self.tutor.ask(db=db, contact_id=contact.id, message=message)
            return {
                "session_id": session_id,
                "reply": tutor_result["answer"],
                "contact_id": contact.id,
                "channel": "tutor_ia",
                "topic_detected": tutor_result["topic_detected"],
                "source": tutor_result["source"],
                "found_in_kb": tutor_result["found_in_kb"],
                "requires_consent": tutor_result["requires_consent"],
                "consent_topic": tutor_result["consent_topic"],
                "opportunity_id": None,
                "lead_type": contact.lead_type,
                "funnel_stage": None,
            }

        comercial_result = self.comercial.handle_message(
            db=db, session_id=session_id, message=message, contact_hint=contact_hint
        )
        return {
            "session_id": session_id,
            "reply": comercial_result["reply"],
            "contact_id": comercial_result["contact_id"],
            "channel": "chat_comercial",
            "topic_detected": None,
            "source": None,
            "found_in_kb": None,
            "requires_consent": False,
            "consent_topic": None,
            "opportunity_id": comercial_result["opportunity_id"],
            "lead_type": comercial_result["lead_type"],
            "funnel_stage": comercial_result["funnel_stage"],
            # Nota: priority_label / priority_score existen en comercial_result
            # pero se descartan deliberadamente aquí: el chat unificado es la
            # vista del lead y esas señales internas no deben filtrarse a la
            # persona que las genera.
        }


router_agent = RouterAgent()
