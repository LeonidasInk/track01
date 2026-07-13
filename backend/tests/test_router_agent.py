"""
test_router_agent.py

Verifica que el chat único enruta correctamente entre el Agente Comercial
IA y el Tutor IA, que mantiene un solo hilo (mismo contact_id) para una
misma sesión sin importar a qué agente se enrutó cada mensaje, y que la
vista del lead nunca recibe las señales internas de priorización.
"""
from app.agents.comercial_agent import ComercialAgent
from app.agents.router_agent import RouterAgent
from app.agents.tutor_agent import TutorAgent
from tests.test_agent import FakeGeminiClient


def _build_router() -> RouterAgent:
    client = FakeGeminiClient()
    return RouterAgent(
        client=client,
        comercial=ComercialAgent(client=client),
        tutor=TutorAgent(client=client),
    )


def test_classify_intent_routes_educational_question_to_tutor():
    router = _build_router()
    intent = router.classify_intent("¿Qué es diversificar una inversión?")
    assert intent == "tutor"


def test_classify_intent_routes_greeting_to_comercial():
    router = _build_router()
    intent = router.classify_intent("Hola, buenas tardes")
    assert intent == "comercial"


def test_router_handles_tutor_message_end_to_end(db_session):
    router = _build_router()
    result = router.handle_message(
        db=db_session, session_id="unified-session-1", message="¿Qué es diversificar una inversión?"
    )
    assert result["channel"] == "tutor_ia"
    assert result["found_in_kb"] is True
    assert result["source"] is not None
    assert len(result["reply"]) > 0


def test_router_handles_comercial_message_end_to_end(db_session):
    router = _build_router()
    result = router.handle_message(
        db=db_session,
        session_id="unified-session-2",
        message="Soy responsable financiero de una pyme y busco opciones de inversión",
    )
    assert result["channel"] == "chat_comercial"
    assert result["lead_type"] == "B2C"  # según la respuesta fija del FakeGeminiClient
    assert result["opportunity_id"] is not None


def test_router_keeps_single_thread_across_channels(db_session):
    """Un mismo session_id debe resolver siempre al mismo contact_id, sin
    importar si el mensaje se enrutó al tutor o al comercial: esto es lo
    que garantiza que el usuario vea un solo chat continuo."""
    router = _build_router()
    session_id = "unified-session-3"

    first = router.handle_message(db=db_session, session_id=session_id, message="Hola, quiero invertir")
    second = router.handle_message(
        db=db_session, session_id=session_id, message="¿Qué es diversificar una inversión?"
    )

    assert first["channel"] == "chat_comercial"
    assert second["channel"] == "tutor_ia"
    assert first["contact_id"] == second["contact_id"]


def test_router_never_leaks_internal_priority_signals(db_session):
    """La vista del lead (chat único) no debe exponer priority_label ni
    priority_score: esas señales son solo para el panel interno."""
    router = _build_router()
    result = router.handle_message(
        db=db_session, session_id="unified-session-4", message="Quiero invertir mis ahorros"
    )
    assert "priority_label" not in result
    assert "priority_score" not in result
