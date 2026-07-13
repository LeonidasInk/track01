"""
test_agent.py

Confirma que los agentes responden algo coherente, usando un mock de la
API del LLM (Gemini) para poder correr los tests sin depender de una
GEMINI_API_KEY real ni de la disponibilidad del servicio, tal como pide
el nivel intermedio de la guía de evaluación del hackathon.
"""
from app.agents.comercial_agent import ComercialAgent
from app.agents.tutor_agent import TutorAgent
from app.gemini_client import GeminiUnavailableError
from app.tools import crm_tools


class FailingGeminiClient:
    """Doble de prueba que simula que Gemini no está disponible."""

    def generate_structured(self, input_text, schema, system_instruction=None, previous_interaction_id=None):
        raise GeminiUnavailableError("El servicio de IA de Gemini no está disponible temporalmente.")

    def generate_text(self, input_text, system_instruction=None, previous_interaction_id=None):
        raise GeminiUnavailableError("El servicio de IA de Gemini no está disponible temporalmente.")


class FakeGeminiClient:
    """Doble de prueba que reemplaza a GeminiClient sin llamar a la red."""

    def generate_structured(self, input_text, schema, system_instruction=None, previous_interaction_id=None):
        # Detecta qué schema se pidió para devolver una respuesta coherente y válida.
        props = schema.get("properties", {})
        if "accion_sugerida" in props:
            data = {
                "necesidad": "El prospecto quiere empezar a invertir para su retiro.",
                "perfil": "Persona natural, perfil moderado.",
                "objeciones": "Le preocupa el riesgo de perder dinero.",
                "etapa_embudo": "listo_para_asesor",
                "accion_sugerida": "agendar_reunion",
                "justificacion_accion": "El lead tiene alta prioridad y ya fue calificado.",
                "mensaje_propuesto": "Hola, ¿te gustaría agendar una breve llamada con un asesor?",
            }
        elif "lead_type" in props:
            data = {
                "lead_type": "B2C",
                "interes": 4,
                "presupuesto": 3,
                "perfil": 4,
                "urgencia": 2,
                "necesidad": "Quiere aprender a invertir sus ahorros.",
                "siguiente_pregunta": "¿Cuál es tu horizonte de tiempo para invertir?",
                "reply_to_user": "¡Genial! Cuéntame, ¿en cuánto tiempo te gustaría ver resultados?",
            }
        elif "questions" in props:
            data = {
                "topic": "diversificacion",
                "questions": [
                    {
                        "question": "¿Qué es diversificar?",
                        "options": ["Invertir todo en un activo", "Repartir el dinero entre varios activos"],
                        "correct_option_index": 1,
                        "explanation": "Diversificar reduce el impacto de un mal desempeño individual.",
                    },
                    {
                        "question": "¿Diversificar elimina el riesgo por completo?",
                        "options": ["Sí", "No"],
                        "correct_option_index": 1,
                        "explanation": "Reduce el riesgo pero no lo elimina.",
                    },
                    {
                        "question": "¿Qué ayuda a suavizar la variabilidad de una cartera?",
                        "options": ["Diversificación", "Concentración"],
                        "correct_option_index": 0,
                        "explanation": "La diversificación suaviza la variabilidad en el tiempo.",
                    },
                ],
            }
        else:
            data = {}
        return {"interaction_id": "fake-id", "data": data}

    def generate_text(self, input_text, system_instruction=None, previous_interaction_id=None):
        return {
            "interaction_id": "fake-id",
            "text": (
                "Invertir es destinar tu dinero hoy esperando un beneficio futuro, asumiendo "
                "cierto riesgo. Fuente: Futuro Academy - Módulo 1: Fundamentos de Inversión."
            ),
        }


def test_comercial_agent_produces_coherent_reply(db_session):
    agent = ComercialAgent(client=FakeGeminiClient())
    result = agent.handle_message(
        db=db_session, session_id="test-session-1", message="Hola, quiero invertir mis ahorros"
    )
    assert result["reply"]  # el agente responde algo, no vacío
    assert isinstance(result["reply"], str)
    assert result["lead_type"] == "B2C"
    assert 0 <= result["priority_score"] <= 5
    assert result["priority_label"] in ("alta", "media", "baja")


def test_comercial_agent_summary_creates_pending_action(db_session):
    agent = ComercialAgent(client=FakeGeminiClient())
    chat_result = agent.handle_message(db=db_session, session_id="test-session-2", message="Quiero invertir")
    summary_result = agent.summarize_and_suggest(db_session, chat_result["opportunity_id"])
    assert summary_result["action_status"] == "pendiente"
    assert summary_result["summary"]["accion_sugerida"] in (
        "agendar_reunion",
        "enviar_material",
        "derivar_especialista",
    )


def test_tutor_agent_answers_with_source_for_known_topic(db_session):
    agent = TutorAgent(client=FakeGeminiClient())
    contact = crm_tools.get_or_create_contact(db_session, session_id="test-session-3")
    result = agent.ask(db_session, contact_id=contact.id, message="¿Qué es invertir?")
    assert result["found_in_kb"] is True
    assert result["source"] is not None
    assert "Futuro Academy" in result["source"]
    assert len(result["answer"]) > 0


def test_tutor_agent_answers_known_topic_without_contact_id(db_session):
    """Regresión: antes, si el tema SÍ estaba en la KB pero no había contact_id
    (ej. usuario anónimo probando el tutor antes de dejar sus datos), el método
    no retornaba nada (None) y el router truena al validar la respuesta."""
    agent = TutorAgent(client=FakeGeminiClient())
    result = agent.ask(db_session, contact_id=None, message="¿Qué es invertir?")
    assert result is not None
    assert result["found_in_kb"] is True
    assert result["contact_id"] is None
    assert result["requires_consent"] is False
    assert result["source"] is not None


def test_tutor_agent_declines_unknown_topic_instead_of_hallucinating(db_session):
    agent = TutorAgent(client=FakeGeminiClient())
    result = agent.ask(db_session, contact_id=None, message="¿Cuál va a ser el precio del oro en 2030?")
    assert result["found_in_kb"] is False
    assert result["source"] is None
    assert "no tengo" in result["answer"].lower() or "no improvisar" in result["answer"].lower()


def test_tutor_agent_quiz_has_three_questions():
    agent = TutorAgent(client=FakeGeminiClient())
    quiz = agent.generate_quiz("diversificacion")
    assert quiz is not None
    assert len(quiz["questions"]) == 3
    for q in quiz["questions"]:
        assert 0 <= q["correct_option_index"] < len(q["options"])


def test_comercial_agent_surfaces_gemini_unavailable_error(db_session):
    """Si Gemini falla, el agente debe dejar propagar GeminiUnavailableError
    (no un error genérico) para que el router lo traduzca a un 503 claro
    en vez de un 500 sin contexto."""
    import pytest

    agent = ComercialAgent(client=FailingGeminiClient())

    with pytest.raises(GeminiUnavailableError):
        agent.handle_message(db_session, session_id="test-session-fail", message="Hola")


def test_tutor_agent_surfaces_gemini_unavailable_error(db_session):
    """Igual que con el agente comercial: si Gemini falla, TutorAgent debe
    dejar propagar GeminiUnavailableError en vez de devolver un texto de
    respaldo silencioso."""
    import pytest

    agent = TutorAgent(client=FailingGeminiClient())

    with pytest.raises(GeminiUnavailableError):
        agent.ask(db=db_session, contact_id=None, message="¿qué es la diversificación?")