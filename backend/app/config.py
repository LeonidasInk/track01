"""
Configuración central de la aplicación.
Lee variables de entorno (ver .env.example) para la clave de la API de Gemini,
el modelo por defecto y la base de datos del CRM simulado.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./crm.db")
    ENV: str = os.getenv("ENV", "development")

    # Orígenes permitidos para CORS, separados por coma. En producción se
    # debe fijar explícitamente (ej. "https://nexofin.vercel.app"); en
    # desarrollo cae a los puertos típicos de Vite/CRA en localhost.
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
        ).split(",")
        if origin.strip()
    ]

    # Límite de peticiones por IP para los endpoints que consumen la API de
    # Gemini (protege la cuota ante uso abusivo o accidental). Formato de
    # la librería `limits`, ej. "20/minute", "5/second".
    RATE_LIMIT_AI_ENDPOINTS: str = os.getenv("RATE_LIMIT_AI_ENDPOINTS", "20/minute")

    # Pesos para el cálculo de prioridad de leads (Historia de Usuario 1)
    LEAD_SCORE_WEIGHTS = {
        "interes": 0.30,
        "presupuesto": 0.30,
        "perfil": 0.20,
        "urgencia": 0.20,
    }


settings = Settings()