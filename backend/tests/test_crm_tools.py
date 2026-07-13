from app import models
from app.tools import crm_tools


def test_get_or_create_contact_creates_new(db_session):
    contact = crm_tools.get_or_create_contact(db_session, session_id="s1", lead_type="B2C", name="Ana")
    assert contact.id is not None
    assert contact.name == "Ana"
    assert contact.lead_type == "B2C"


def test_get_or_create_contact_is_idempotent(db_session):
    c1 = crm_tools.get_or_create_contact(db_session, session_id="s1", name="Ana")
    c2 = crm_tools.get_or_create_contact(db_session, session_id="s1", email="ana@example.com")
    assert c1.id == c2.id
    assert c2.email == "ana@example.com"
    assert db_session.query(models.Contact).count() == 1


def test_update_opportunity_qualification_sets_priority(db_session):
    contact = crm_tools.get_or_create_contact(db_session, session_id="s2")
    opp = crm_tools.get_or_create_opportunity(db_session, contact.id)
    updated = crm_tools.update_opportunity_qualification(
        db_session, opp, interes=5, presupuesto=5, perfil=4, urgencia=4, necesidad="Ahorro para retiro"
    )
    assert updated.priority_label in (models.PriorityLabel.ALTA, models.PriorityLabel.MEDIA)
    assert updated.necesidad == "Ahorro para retiro"
    assert updated.funnel_stage == models.FunnelStage.CALIFICANDO


def test_register_learning_signal_requires_consent(db_session):
    contact = crm_tools.get_or_create_contact(db_session, session_id="s3")
    without_consent = crm_tools.register_learning_signal(db_session, contact.id, "diversificacion", consent=False)
    with_consent = crm_tools.register_learning_signal(db_session, contact.id, "diversificacion", consent=True)

    assert without_consent is None
    assert with_consent is not None
    logs = db_session.query(models.ConversationLog).filter_by(contact_id=contact.id).all()
    assert len(logs) == 1
    assert logs[0].topic_of_interest == "diversificacion"


def test_action_approval_workflow(db_session):
    contact = crm_tools.get_or_create_contact(db_session, session_id="s4")
    opp = crm_tools.get_or_create_opportunity(db_session, contact.id)
    action = crm_tools.create_pending_action(
        db_session, opp.id, action_type="enviar_material", payload={"mensaje_propuesto": "Hola"}
    )
    assert action.status == models.ActionStatus.PENDIENTE

    approved = crm_tools.resolve_action(db_session, action, decision="aprobar")
    assert approved.status == models.ActionStatus.APROBADA

    action2 = crm_tools.create_pending_action(db_session, opp.id, action_type="agendar_reunion", payload={})
    rejected = crm_tools.resolve_action(db_session, action2, decision="rechazar", reviewer_note="No aplica")
    assert rejected.status == models.ActionStatus.RECHAZADA
    assert rejected.reviewer_note == "No aplica"
