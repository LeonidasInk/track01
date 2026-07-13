"""
Configuración de la base de datos (CRM simulado con SQLite/SQLAlchemy).
Cumple con la condición de demostración de la guía: "Se permiten datos
ficticios, archivos de prueba e integraciones simuladas si el flujo
funcional se puede demostrar de extremo a extremo".
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency de FastAPI: entrega una sesión de BD y la cierra al final."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Crea las tablas si no existen. Se llama al iniciar la app."""
    from app import models  # noqa: F401 (registra los modelos en Base)
    Base.metadata.create_all(bind=engine)
