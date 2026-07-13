"""
Punto de entrada de la aplicación FastAPI.

Track 1 - Hackathon de Agentes Financieros IA:
"Inteligencia Conversacional para Ventas y Gestión de Clientes (CRM)".

Agentes implementados:
- Agente Comercial IA (chat.py, followup.py): Historias 1 y 3.
- Tutor IA para Futuro Academy (tutor.py): Historia 2.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.database import init_db
from app.rate_limit import limiter
from app.routers import chat, crm, followup, tutor

app = FastAPI(
    title="Agentes Financieros IA - Track 1 (CRM y Ventas)",
    description=(
        "Backend de agentes conversacionales para calificación de leads, "
        "tutoría financiera y derivación comercial, con CRM simulado."
    ),
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health", tags=["Sistema"])
def health():
    return {"status": "ok"}


app.include_router(chat.router)
app.include_router(tutor.router)
app.include_router(followup.router)
app.include_router(crm.router)