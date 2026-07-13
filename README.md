# NexoFin IA — Proyecto completo

Este directorio reúne:

- `backend/`: FastAPI + Gemini Interactions API + CRM simulado con SQLite.
- `frontend/`: React + TypeScript + Vite, conectado exactamente a los endpoints existentes.

## Ejecución local

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edita .env y agrega GEMINI_API_KEY
uvicorn app.main:app --reload
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

- Frontend: `http://localhost:5173`
- FastAPI: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

## Verificaciones realizadas

- Backend: `15 passed` con `pytest tests -q`.
- Frontend: build de producción exitoso con `npm run build`.
- Contratos cubiertos: salud, chat comercial, tutor, quiz, consentimiento, contactos, oportunidades, resumen, acciones y decisiones.

Consulta `frontend/README.md` para la matriz de endpoints y la documentación del sistema visual.
