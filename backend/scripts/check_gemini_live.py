"""
Prueba de humo contra la API REAL de Gemini (sin mocks).
Corre esto ANTES de grabar el video, para confirmar que
generate_structured() y run_with_tools() funcionan con tu
GEMINI_API_KEY real, ya que los tests solo usan un mock.

Uso:
    cd backend
    python scripts/check_gemini_live.py
"""
import sys
sys.path.insert(0, ".")

from app.gemini_client import gemini_client
from app.schemas import LeadQualification

print("1) Probando generate_text() (API estándar: models.generate_content)...")
try:
    r = gemini_client.generate_text(
        input_text="Hola, quiero invertir mis ahorros.",
        system_instruction="Responde en una frase breve.",
    )
    print("   OK ->", r["text"][:120])
except Exception as e:
    print("   FALLÓ:", repr(e))

print("\n2) Probando generate_structured() (API interactions.create + response_format)...")
try:
    r = gemini_client.generate_structured(
        input_text="Hola, soy dueño de una pyme y quiero invertir el capital de trabajo.",
        schema=LeadQualification.model_json_schema(),
        system_instruction="Clasifica el lead como B2B o B2C y califica interes/presupuesto/perfil/urgencia de 0 a 5.",
    )
    print("   OK ->", r["data"])
except Exception as e:
    print("   FALLÓ:", repr(e))
    print("   -> Si esto falla, 'interactions.create' probablemente no es el método correcto")
    print("      en tu versión instalada del SDK google-genai. Revisa la documentación")
    print("      instalada con: python -c \"from google import genai; help(genai.Client)\"")

print("\n3) Probando run_with_tools() (function calling)...")
try:
    r = gemini_client.run_with_tools(
        input_text="¿Cuánto es 2+2? Usa la herramienta 'sumar' si la necesitas.",
        tools=[{
            "type": "function",
            "name": "sumar",
            "description": "Suma dos números",
            "parameters": {
                "type": "object",
                "properties": {"a": {"type": "number"}, "b": {"type": "number"}},
                "required": ["a", "b"],
            },
        }],
        available_functions={"sumar": lambda a, b: a + b},
    )
    print("   OK ->", r.get("text"), "| tools llamadas:", r.get("called_tools"))
except Exception as e:
    print("   FALLÓ:", repr(e))