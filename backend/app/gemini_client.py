"""
Wrapper delgado sobre la Interactions API de Gemini
(https://ai.google.dev/gemini-api/docs/interactions-overview).

Se centraliza aquí toda la comunicación con el LLM para poder:
- Cambiar de modelo o proveedor en un solo lugar.
- Mockear fácilmente en los tests (ver tests/test_agent.py) sin depender
  de tener una GEMINI_API_KEY real ni de la disponibilidad del servicio.

Patrones usados de la documentación oficial:
- client.interactions.create(model=..., input=..., ...)
- Conversaciones con estado vía previous_interaction_id
- response_format con un JSON schema (Pydantic) para resultados estructurados
- tools=[{"type": "function", ...}] y el bucle de function calling
  (status == "requires_action" -> ejecutar función local -> reenviar resultado)
"""
import json
import logging
from typing import Any, Callable, Optional

from app.config import settings

logger = logging.getLogger("app.gemini_client")

try:
    from google import genai
except ImportError:  # pragma: no cover - permite correr tests sin el SDK instalado
    genai = None


class GeminiUnavailableError(RuntimeError):
    """Se lanza cuando el LLM no responde o responde algo no procesable.

    Los routers deben capturar esta excepción y devolver un 503 con un
    mensaje claro, en vez de dejar que FastAPI la convierta en un 500
    genérico sin contexto para quien consuma la API.
    """


class GeminiClient:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.model = model or settings.GEMINI_MODEL
        self._client = None
        self._api_key = api_key or settings.GEMINI_API_KEY

    @property
    def client(self):
        if self._client is None:
            if genai is None:
                raise RuntimeError(
                    "El SDK google-genai no está instalado. Ejecuta: pip install -U google-genai"
                )

            if not self._api_key:
                raise RuntimeError(
                    "Falta GEMINI_API_KEY. Define la variable de entorno o pásala al construir GeminiClient."
                )

            self._client = genai.Client(api_key=self._api_key)

        return self._client


    # ------------------------------------------------------------------
    # Texto simple / conversación con estado
    # ------------------------------------------------------------------
    def generate_text(
        self,
        input_text: str,
        system_instruction: Optional[str] = None,
        previous_interaction_id: Optional[str] = None,
    ) -> dict:

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=input_text,
                config={
                    "system_instruction": system_instruction
                }
            )

            return {
                "interaction_id": None,
                "text": response.text,
            }

        except Exception as e:
            logger.error("Error llamando a Gemini (generate_text): %s", e)
            raise GeminiUnavailableError("El servicio de IA de Gemini no está disponible temporalmente. "
        "Intenta nuevamente en unos segundos.") from e
            
    # ------------------------------------------------------------------
    # Salida estructurada (JSON Schema / Pydantic)
    # ------------------------------------------------------------------
    def generate_structured(
        self,
        input_text: str,
        schema: dict,
        system_instruction: Optional[str] = None,
        previous_interaction_id: Optional[str] = None,
    ) -> dict:
        payload = self._build_input(input_text, system_instruction)
        try:
            interaction = self.client.interactions.create(
                model=self.model,
                input=payload,
                previous_interaction_id=previous_interaction_id,
                response_format={
                    "type": "text",
                    "mime_type": "application/json",
                    "schema": schema,
                },
            )
            data = json.loads(interaction.output_text)
        except json.JSONDecodeError as e:
            logger.error("Gemini devolvió JSON inválido en generate_structured: %s", e)
            raise GeminiUnavailableError(
                "El modelo devolvió una respuesta que no se pudo interpretar. Intenta de nuevo."
            ) from e
        except Exception as e:
            logger.error("Error llamando a Gemini (generate_structured): %s", e)
            raise GeminiUnavailableError(
                "El servicio de IA de Gemini no está disponible temporalmente. "
                "Intenta nuevamente en unos segundos."
            ) from e

        return {
            "interaction_id": interaction.id,
            "data": data,
        }

    # ------------------------------------------------------------------
    # Function calling (herramientas locales, p.ej. escribir en el CRM)
    # ------------------------------------------------------------------
    def run_with_tools(
        self,
        input_text: str,
        tools: list,
        available_functions: dict[str, Callable[..., Any]],
        system_instruction: Optional[str] = None,
        previous_interaction_id: Optional[str] = None,
        max_turns: int = 6,
    ) -> dict:
        """
        Ejecuta el bucle recomendado por la guía de inicio rápido:
        1. Se envía el mensaje con las tools disponibles.
        2. Si el estado es 'requires_action', se ejecutan las funciones localmente.
        3. Se reenvían los resultados hasta que la interacción quede 'completed'.
        """
        current_input = self._build_input(input_text, system_instruction)
        previous_id = previous_interaction_id
        called_tools = []

        for _ in range(max_turns):
            try:
                interaction = self.client.interactions.create(
                    model=self.model,
                    input=current_input,
                    tools=tools,
                    previous_interaction_id=previous_id,
                )
            except Exception as e:
                logger.error("Error llamando a Gemini (run_with_tools): %s", e)
                raise GeminiUnavailableError(
                    "El servicio de IA de Gemini no está disponible temporalmente. "
                    "Intenta nuevamente en unos segundos."
                ) from e
            previous_id = interaction.id

            function_results = []
            for step in interaction.steps:
                if getattr(step, "type", None) == "function_call":
                    fn = available_functions.get(step.name)
                    if fn is None:
                        result = {"error": f"función desconocida: {step.name}"}
                    else:
                        result = fn(**step.arguments)
                    called_tools.append({"name": step.name, "arguments": step.arguments, "result": result})
                    function_results.append(
                        {
                            "type": "function_result",
                            "name": step.name,
                            "call_id": step.id,
                            "result": [{"type": "text", "text": json.dumps(result, default=str)}],
                        }
                    )

            if not function_results:
                return {
                    "interaction_id": interaction.id,
                    "text": interaction.output_text,
                    "called_tools": called_tools,
                }

            current_input = function_results

        return {
            "interaction_id": previous_id,
            "text": "",
            "called_tools": called_tools,
            "error": "max_turns alcanzado sin completar la interacción",
        }

    @staticmethod
    def _build_input(input_text: str, system_instruction: Optional[str]):
        if not system_instruction:
            return input_text
        # La Interactions API acepta bloques de contenido; anteponemos la
        # instrucción del sistema como contexto de la conversación.
        return f"[INSTRUCCIONES DEL SISTEMA]\n{system_instruction}\n\n[MENSAJE DEL USUARIO]\n{input_text}"


gemini_client = GeminiClient()