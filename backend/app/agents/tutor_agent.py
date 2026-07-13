"""
Tutor IA para Futuro Academy.

Cubre la Historia de Usuario 2: "Tutor financiero que convierte
aprendizaje en intención".

Mitigación de alucinaciones (criterio de evaluación 3 de la guía):
el agente SOLO puede responder con contenido de app/agents/knowledge_base.py
y siempre debe citar la fuente. Si el tema no está en la base aprobada,
lo dice explícitamente en lugar de inventar información financiera.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.agents.knowledge_base import KNOWLEDGE_BASE, find_topic, list_topics
from app.gemini_client import gemini_client
from app.schemas import Quiz
from app.tools import crm_tools

TUTOR_SYSTEM_PROMPT = """Eres el Tutor IA de Futuro Academy, especializado en educación
financiera básica. Debes:
- Responder ÚNICAMENTE usando el contenido aprobado que se te entrega en el mensaje
  (etiquetado como CONTENIDO_APROBADO). No agregues datos, cifras, tasas ni promesas
  de rendimiento que no estén en ese contenido.
- Explicar el concepto de forma sencilla, en 2 a 4 frases, para alguien sin experiencia
  previa en inversiones.
- Terminar SIEMPRE indicando la fuente exacta que se te dio.
- Si CONTENIDO_APROBADO está vacío, dilo explícitamente: no tienes contenido aprobado
  sobre ese tema y sugieres reformular la pregunta o hablar con un asesor.
"""

QUIZ_SYSTEM_PROMPT = """Eres el Tutor IA de Futuro Academy. Genera un quiz corto de
exactamente 3 preguntas de opción múltiple sobre el CONTENIDO_APROBADO que se te entrega,
para reforzar el aprendizaje. Basa las preguntas y respuestas correctas únicamente en ese
contenido, sin agregar información externa."""


class TutorAgent:
    def __init__(self, client=None):
        self.client = client or gemini_client

    def ask(self, db: Session, contact_id: Optional[str], message: str) -> dict:
        entry = find_topic(message)

        if entry is None:
            answer = (
                "Todavía no tengo contenido aprobado por Futuro Academy sobre ese tema "
                "específico, así que prefiero no improvisar una respuesta financiera. "
                f"Puedo ayudarte con estos temas: {', '.join(list_topics())}. "
                "Si prefieres, también puedo derivarte con un asesor humano."
            )
            return {
                "contact_id": contact_id,
                "topic_detected": None,
                "answer": answer,
                "source": None,
                "found_in_kb": False,
                "quiz": None,
                "suggested_learning_path": list_topics()[:3],
            }

        prompt = (
            f"CONTENIDO_APROBADO (fuente: {entry.source}):\n{entry.content}\n\n"
            f"Pregunta del usuario: {message}"
        )
        result = self.client.generate_text(input_text=prompt, system_instruction=TUTOR_SYSTEM_PROMPT)

        if contact_id:
            crm_tools.log_conversation(
                db,
                contact_id=contact_id,
                message=f"[tutor] {message}",
                role="user",
                channel="tutor_ia",
            )
            crm_tools.log_conversation(
                db,
                contact_id=contact_id,
                message=result["text"],
                role="agent",
                channel="tutor_ia",
            )

        return {
            "contact_id": contact_id,
            "topic_detected": entry.topic,
            "answer": result["text"],
            "source": entry.source,
            "found_in_kb": True,
            "quiz": None,
            "suggested_learning_path": list_topics()[:3],

            # Solicitar consentimiento para CRM (solo aplica si hay contacto)
            "requires_consent": bool(contact_id),
            "consent_topic": entry.topic,
        }

    def generate_quiz(self, topic: str) -> Optional[dict]:
        entry = next((e for e in KNOWLEDGE_BASE if e.topic == topic), None)
        if entry is None:
            return None
        prompt = f"CONTENIDO_APROBADO (fuente: {entry.source}):\n{entry.content}\n\nTema: {entry.topic}"
        result = self.client.generate_structured(
            input_text=prompt,
            schema=Quiz.model_json_schema(),
            system_instruction=QUIZ_SYSTEM_PROMPT,
        )
        return Quiz.model_validate(result["data"]).model_dump()

    def register_consent_signal(self, db: Session, contact_id: str, topic: str, consent: bool):
        """
        Historia 2, criterio 3: registrar el tema de interés como señal
        comercial en el CRM, únicamente si el usuario dio su consentimiento.
        """
        return crm_tools.register_learning_signal(db, contact_id, topic, consent)


tutor_agent = TutorAgent()