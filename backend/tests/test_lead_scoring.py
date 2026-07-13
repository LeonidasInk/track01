"""
Tests unitarios de una función crítica: el cálculo de prioridad de leads
(Historia de Usuario 1, criterio de aceptación 2).
No dependen de la base de datos ni del LLM.
"""
from app.tools.crm_tools import calculate_priority
from app import models


def test_high_priority_lead():
    score, label = calculate_priority(interes=5, presupuesto=5, perfil=5, urgencia=5)
    assert score == 5.0
    assert label == models.PriorityLabel.ALTA


def test_low_priority_lead():
    score, label = calculate_priority(interes=0, presupuesto=0, perfil=0, urgencia=0)
    assert score == 0.0
    assert label == models.PriorityLabel.BAJA


def test_medium_priority_lead():
    score, label = calculate_priority(interes=3, presupuesto=2, perfil=2, urgencia=2)
    assert label == models.PriorityLabel.MEDIA


def test_weights_sum_to_one():
    from app.config import settings

    assert abs(sum(settings.LEAD_SCORE_WEIGHTS.values()) - 1.0) < 1e-9


def test_score_is_monotonic_in_interest():
    low_score, _ = calculate_priority(interes=1, presupuesto=3, perfil=3, urgencia=3)
    high_score, _ = calculate_priority(interes=5, presupuesto=3, perfil=3, urgencia=3)
    assert high_score > low_score
