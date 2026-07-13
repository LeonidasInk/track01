"""
Base de conocimiento aprobada de "Futuro Academy".

Mecanismo de mitigación de alucinaciones (criterio de evaluación 3 de la
guía): el Tutor IA solo puede responder con contenido de esta base y debe
citar la fuente. Si el tema no está aprobado, el agente debe decirlo en
vez de inventar contenido financiero.

En un sistema real esto sería una base vectorial (RAG) sobre los
documentos oficiales de Futuro Academy; aquí se simula con un diccionario
para que el flujo se pueda demostrar de extremo a extremo, tal como
permite la guía del hackathon.
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class KBEntry:
    topic: str
    keywords: list
    content: str
    source: str


KNOWLEDGE_BASE: list[KBEntry] = [
    KBEntry(
        topic="que_es_invertir",
        keywords=["invertir", "inversión", "qué es invertir", "empezar a invertir"],
        content=(
            "Invertir es destinar una parte de tu dinero hoy a un activo con la expectativa de "
            "obtener un beneficio futuro, asumiendo un nivel de riesgo. A diferencia del ahorro "
            "tradicional, invertir busca que el dinero crezca por encima de la inflación a "
            "cambio de aceptar cierta incertidumbre sobre el resultado."
        ),
        source="Futuro Academy - Módulo 1: Fundamentos de Inversión",
    ),
    KBEntry(
        topic="perfil_de_riesgo",
        keywords=["riesgo", "perfil de riesgo", "tolerancia al riesgo", "volatilidad"],
        content=(
            "El perfil de riesgo describe cuánta variación en el valor de tus inversiones estás "
            "dispuesto a tolerar a cambio de un mayor potencial de retorno. Se suele clasificar en "
            "conservador, moderado y agresivo, y depende de tu horizonte de tiempo, tus objetivos "
            "financieros y tu situación personal."
        ),
        source="Futuro Academy - Módulo 2: Perfil del Inversionista",
    ),
    KBEntry(
    topic="diversificacion",
    keywords=[
        "diversificar una inversión",
        "diversificar una inversion",
        "diversificar",
        "diversificación",
        "diversificacion",
        "canasta",
        "no poner todos los huevos"
    ],
    content=(
        "Diversificar consiste en repartir el dinero entre distintos activos, sectores o "
        "geografías para reducir el impacto de que uno solo de ellos tenga un mal desempeño. "
        "No elimina el riesgo por completo, pero ayuda a suavizar la variabilidad de la "
        "cartera en el tiempo."
    ),
    source="Futuro Academy - Módulo 3: Construcción de Cartera",
),
    KBEntry(
        topic="renta_fija_vs_variable",
        keywords=["renta fija", "renta variable", "bonos", "acciones"],
        content=(
            "La renta fija (como bonos) ofrece pagos pactados de antemano y suele ser menos "
            "volátil, aunque no está libre de riesgo. La renta variable (como acciones) no "
            "garantiza un pago fijo: su valor sube o baja según el desempeño del emisor y del "
            "mercado, por lo que históricamente ofrece mayor potencial de retorno junto con "
            "mayor volatilidad."
        ),
        source="Futuro Academy - Módulo 4: Instrumentos de Inversión",
    ),
    KBEntry(
        topic="interes_compuesto",
        keywords=["interés compuesto", "interes compuesto", "capitalización"],
        content=(
            "El interés compuesto ocurre cuando los rendimientos generados por una inversión se "
            "reinvierten y comienzan a generar sus propios rendimientos. Con el tiempo, este "
            "efecto acelera el crecimiento del capital en comparación con el interés simple."
        ),
        source="Futuro Academy - Módulo 1: Fundamentos de Inversión",
    ),
    KBEntry(
        topic="fondos_de_inversion",
        keywords=["fondo de inversión", "fondos mutuos", "fondo mutuo", "ETF"],
        content=(
            "Un fondo de inversión reúne el dinero de varios inversionistas para comprar una "
            "canasta diversificada de activos, administrada por un gestor profesional. Permite "
            "acceder a diversificación y gestión experta con montos más pequeños que si se "
            "compraran los activos por separado."
        ),
        source="Futuro Academy - Módulo 4: Instrumentos de Inversión",
    ),
]


def find_topic(user_message: str) -> Optional[KBEntry]:
    """Búsqueda simple por palabras clave priorizando coincidencias específicas."""

    text = user_message.lower()

    best_match = None
    best_score = 0

    for entry in KNOWLEDGE_BASE:

        score = 0

        for kw in entry.keywords:
            kw_lower = kw.lower()

            if kw_lower in text:
                if len(kw_lower.split()) > 1:
                    score += 10
                else:
                    score += 1

        if score > best_score:
            best_score = score
            best_match = entry

    return best_match if best_score > 0 else None

def list_topics() -> list[str]:
    return [entry.topic for entry in KNOWLEDGE_BASE]
