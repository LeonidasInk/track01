# NexoFin IA

## Descripción

NexoFin IA es una solución desarrollada para el **Hackathon de Agentes Financieros IA – Track 1: Inteligencia Conversacional para Ventas y Gestión de Clientes (CRM)**.

El sistema integra dos agentes de inteligencia artificial que trabajan de manera coordinada:

- **Agente Comercial IA**, encargado de calificar prospectos B2B y B2C, calcular la prioridad del lead y registrar la información comercial en una base de datos PostgreSQL administrada mediante Supabase.
- **Tutor IA de Futuro Academy**, que responde únicamente con contenido aprobado, propone rutas de aprendizaje y registra, con el consentimiento del usuario, señales comerciales relacionadas con los temas de interés.

Todas las acciones sensibles requieren aprobación humana antes de ejecutarse, cumpliendo con los criterios establecidos por el hackathon.

---

# Ejecución local

## 1. Backend

```bash
cd backend
pip install -r requirements.txt

para ejecutar:
python -m uvicorn app.main:app --reload

# Crear el archivo .env usando .env.example
uvicorn app.main:app --reload
```

## 2. Frontend

```bash
cd frontend
npm install

# Crear el archivo .env usando .env.example
npm run dev
```

Una vez iniciado:

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Documentación Swagger: http://localhost:8000/docs

---

---

# Usuarios para iniciar sesión

- **Usuario:** `equipo`
- **Contraseña:** `nexofin2026`
---

# Tecnologías utilizadas

## Backend

- FastAPI
- Python
- SQLAlchemy
- PostgreSQL (Supabase)
- Gemini Interactions API
- Pytest

## Frontend

- React
- TypeScript
- Vite
- Lucide React

---

# Estructura del proyecto

```
track01/
│
├── README.md
│
├── backend/
│   ├── .env
│   ├── .gitignore
│   ├── Dockerfile
│   ├── README.md
│   ├── requirements.txt
│   ├── crm.db
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # entrypoint FastAPI
│   │   ├── config.py                # variables de entorno
│   │   ├── database.py              # engine, sesión, init_db
│   │   ├── gemini_client.py         # wrapper sobre la API de Gemini
│   │   ├── models.py                # tablas SQLAlchemy (Contact, Opportunity, ConversationLog, Action)
│   │   ├── schemas.py                # esquemas Pydantic
│   │   ├── rate_limit.py            # configuración de slowapi
│   │   │
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── router_agent.py      # clasifica intención y orquesta el chat único
│   │   │   ├── comercial_agent.py   # Agente Comercial IA
│   │   │   ├── tutor_agent.py       # Tutor IA
│   │   │   └── knowledge_base.py    # contenido aprobado de Futuro Academy
│   │   │
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── chat.py              # /api/chat/mensaje, /api/chat/comercial
│   │   │   ├── tutor.py             # /api/tutor/*
│   │   │   ├── crm.py               # /api/crm/*
│   │   │   └── followup.py          # /api/opportunities/*, /api/actions/*
│   │   │
│   │   ├── tools/
│   │   │   ├── __init__.py
│   │   │   └── crm_tools.py         # lógica de persistencia del CRM
│   │   │
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── ecuador_ids.py       # validación de cédula y RUC
│   │
│   ├── scripts/
│   │   └── check_gemini_live.py
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py              # fixture db_session (SQLite en memoria)
│   │   ├── test_agent.py            # 8 tests
│   │   ├── test_router_agent.py     # 6 tests
│   │   ├── test_crm_tools.py        # 5 tests
│   │   ├── test_lead_scoring.py     # 5 tests
│   │   └── test_ecuador_ids.py      # 19 tests
│   │
│   ├── venv/                        # entorno virtual (dependencias, no versionar)
│   └── .pytest_cache/               # caché de pytest
│
└── frontend/
    ├── .env
    ├── .env.example
    ├── .gitignore
    ├── README.md
    ├── DESIGN_SYSTEM.md
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    │
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── vite-env.d.ts
    │   │
    │   ├── components/
    │   │   ├── AppShell.tsx
    │   │   ├── Brand.tsx
    │   │   ├── EmptyState.tsx
    │   │   ├── LoadingBlock.tsx
    │   │   ├── LoginGate.tsx
    │   │   ├── Modal.tsx
    │   │   └── StatusBadge.tsx
    │   │
    │   ├── pages/
    │   │   ├── OverviewPage.tsx      # dashboard general
    │   │   ├── CommercialPage.tsx    # Agente Comercial IA
    │   │   ├── TutorPage.tsx         # Futuro Academy
    │   │   ├── LeadChatPage.tsx      # chat unificado
    │   │   ├── CrmPage.tsx           # clientes y pipeline
    │   │   └── ReviewsPage.tsx       # resumen y aprobación de acciones
    │   │
    │   ├── services/
    │   │   └── api.ts                # cliente HTTP hacia el backend
    │   │
    │   ├── styles/
    │   │   ├── tokens.css
    │   │   ├── global.css
    │   │   └── components.css
    │   │
    │   ├── types/
    │   │   └── api.ts
    │   │
    │   └── utils/
    │       └── format.ts
    │
    └── node_modules/                 # dependencias npm (no versionar)
```
---

# Variables de entorno

## Backend

Crear un archivo `.env` dentro de `backend/`.

```env
GEMINI_API_KEY=TU_API_KEY
GEMINI_MODEL=gemini-3.5-flash
DATABASE_URL=postgresql://usuario:password@host:6543/postgres
ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Frontend

Crear un archivo `.env` dentro de `frontend/`.

```env
VITE_API_URL=http://localhost:8000
```



# Arquitectura general

La solución está compuesta por dos aplicaciones independientes que se comunican mediante una API REST.

- **Frontend** desarrollado con React y TypeScript.
- **Backend** desarrollado con FastAPI.

El backend integra dos agentes de inteligencia artificial especializados:

- Agente Comercial IA.
- Tutor IA de Futuro Academy.

Para la generación de respuestas conversacionales se utiliza **Gemini Interactions API**.

La persistencia de la información se realiza mediante **PostgreSQL administrado por Supabase**, donde se almacenan contactos, oportunidades, conversaciones y acciones comerciales utilizando SQLAlchemy como capa ORM.

El sistema implementa un CRM propio con fines demostrativos, simulando el comportamiento de una plataforma CRM empresarial sin depender de soluciones comerciales externas como Salesforce, HubSpot o Dynamics.

Las respuestas educativas del Tutor IA provienen exclusivamente de la base de conocimiento de Futuro Academy.

---

# Funcionalidades principales

- Calificación conversacional de prospectos B2B y B2C.
- Identificación de necesidades del cliente.
- Cálculo automático de prioridad del lead.
- Registro automático de contactos y oportunidades.
- Tutor financiero basado únicamente en contenido aprobado.
- Generación de rutas de aprendizaje y cuestionarios diagnósticos.
- Registro de temas de interés únicamente cuando existe consentimiento del usuario.
- Resumen automático de oportunidades comerciales.
- Propuesta automática de acciones comerciales.
- Flujo de aprobación humana antes de ejecutar cualquier acción.

---

# Pruebas automatizadas

## Backend

Ejecutar:

```bash
cd backend
pytest tests -q
```

Resultado esperado:

```text
43 passed
```

Actualmente existen **43 pruebas automatizadas** distribuidas en cinco archivos.

| Archivo | Cobertura |
|----------|-----------|
| `test_agent.py` | Agente Comercial IA y Tutor IA: respuestas, acciones pendientes, base de conocimiento y manejo de errores. |
| `test_router_agent.py` | Clasificación de intención, enrutamiento entre agentes y continuidad de conversación. |
| `test_crm_tools.py` | Persistencia del CRM, contactos, oportunidades, consentimiento y acciones comerciales. |
| `test_lead_scoring.py` | Algoritmo de priorización de leads. |
| `test_ecuador_ids.py` | Validación de cédulas y RUC ecuatorianos. |

## Aislamiento de pruebas

Las pruebas utilizan una base SQLite completamente en memoria únicamente para el entorno de pruebas, evitando modificar la base de datos PostgreSQL alojada en Supabase.

Las llamadas a Gemini son reemplazadas mediante clientes simulados (*FakeGeminiClient*), permitiendo ejecutar todas las pruebas sin depender de Internet ni consumir la API.

Esto garantiza pruebas rápidas, reproducibles y completamente deterministas.

---

## Frontend

Actualmente el frontend se valida mediante:

```bash
cd frontend
npm run build
```

---

# Despliegue

El sistema se encuentra preparado para ejecutarse en un entorno de producción utilizando servicios en la nube.

## Frontend

- Vercel

## Backend

- Render

## Base de datos

- Supabase PostgreSQL

## Variables de entorno

### Backend

- GEMINI_API_KEY
- GEMINI_MODEL
- DATABASE_URL
- ENV
- CORS_ORIGINS

### Frontend

- VITE_API_URL

---

# Licencia

Proyecto desarrollado con fines académicos para el **Hackathon de Agentes Financieros IA 2026**.
