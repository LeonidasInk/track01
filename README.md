# NexoFin IA

## Descripción

NexoFin IA es una solución desarrollada para el **Hackathon de Agentes Financieros IA – Track 1: Inteligencia Conversacional para Ventas y Gestión de Clientes (CRM)**.

El sistema integra dos agentes de inteligencia artificial que trabajan de manera coordinada:

- **Agente Comercial IA**, encargado de calificar prospectos B2B y B2C, calcular la prioridad del lead y registrar la información comercial en un CRM simulado.
- **Tutor IA de Futuro Academy**, que responde únicamente con contenido aprobado, propone rutas de aprendizaje y registra, con consentimiento del usuario, señales comerciales relacionadas con los temas de interés.

Todas las acciones sensibles requieren aprobación humana antes de ejecutarse, cumpliendo con los criterios establecidos por el hackathon.

---

# Tecnologías utilizadas

## Backend

- FastAPI
- Python
- SQLAlchemy
- SQLite
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
NexoFin-IA/
│
├── backend/
│   ├── app/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.example
│
└── README.md
```

---

# Variables de entorno

## Backend

Crear un archivo `.env` dentro de `backend/`.

```
GEMINI_API_KEY=TU_API_KEY
```

## Frontend

Crear un archivo `.env` dentro de `frontend/`.

```
VITE_API_URL=http://localhost:8000
```

---

# Ejecución local

## 1. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Editar .env y agregar GEMINI_API_KEY
uvicorn app.main:app --reload
```

## 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Una vez iniciado:

- Frontend: http://localhost:5173
- Backend FastAPI: http://localhost:8000
- Documentación Swagger: http://localhost:8000/docs

---

# Arquitectura general

La solución está compuesta por dos aplicaciones independientes:

- **Frontend** desarrollado con React y TypeScript.
- **Backend** desarrollado con FastAPI.

El frontend consume los servicios REST del backend.

El backend utiliza:

- Gemini Interactions API para los agentes conversacionales.
- SQLite para almacenar contactos, oportunidades, conversaciones y acciones.
- CRM simulado para registrar el contexto comercial.
- Base de conocimiento de Futuro Academy para responder únicamente con contenido aprobado.

---

# Funcionalidades principales

- Calificación conversacional de prospectos B2B y B2C.
- Identificación de necesidades del cliente.
- Cálculo automático de prioridad del lead.
- Registro automático de contactos y oportunidades.
- Tutor financiero basado únicamente en contenido aprobado.
- Ruta de aprendizaje y evaluación diagnóstica.
- Registro de temas de interés únicamente cuando existe consentimiento del usuario.
- Resumen automático de oportunidades.
- Propuesta de acciones comerciales.
- Flujo de aprobación humana antes de ejecutar acciones.

---

# Pruebas automatizadas

## Backend

Ejecutar:

```bash
cd backend
pytest tests -q
```

Resultado esperado:

```
43 passed
```

Actualmente existen **43 pruebas automatizadas** distribuidas en cinco archivos.

| Archivo | Cobertura |
|----------|-----------|
| `test_agent.py` | Agente Comercial IA y Tutor IA: respuestas coherentes, creación de acciones pendientes, uso de la base de conocimiento y manejo de errores del proveedor de IA. |
| `test_router_agent.py` | Clasificación de intención, enrutamiento entre agentes, continuidad de sesión y separación entre conversación y señales comerciales. |
| `test_crm_tools.py` | Persistencia del CRM, creación de contactos, oportunidades, consentimiento, registro de señales educativas y aprobación de acciones. |
| `test_lead_scoring.py` | Algoritmo de prioridad de leads utilizando interés, presupuesto, perfil y urgencia. |
| `test_ecuador_ids.py` | Validación de cédulas y RUC ecuatorianos, incluyendo casos válidos e inválidos. |

## Aislamiento de pruebas

Las pruebas utilizan una base SQLite completamente en memoria mediante `conftest.py`, evitando modificar la base de datos principal del proyecto.

Las llamadas a Gemini se reemplazan mediante clientes simulados (*FakeGeminiClient*), permitiendo ejecutar todas las pruebas sin depender de Internet ni de una API Key.

Esto garantiza pruebas reproducibles, rápidas y completamente deterministas.

---

## Frontend

Actualmente el frontend se valida mediante:

```bash
cd frontend
npm run build
```

Este proceso ejecuta:

- Verificación de tipos mediante TypeScript.
- Compilación completa del proyecto para producción.

---

# Verificaciones realizadas

Se verificaron correctamente los siguientes módulos:

- Estado del servicio (Health Check).
- Agente Comercial IA.
- Tutor IA.
- Evaluación diagnóstica (Quiz).
- Registro de consentimiento.
- Registro de señales comerciales.
- Gestión de contactos.
- Gestión de oportunidades.
- Generación automática de resúmenes.
- Flujo de acciones comerciales.
- Proceso de aprobación o rechazo por parte del ejecutivo.

---

# Capturas del sistema

Se recomienda incluir capturas de:

- Agente Comercial IA.
- Tutor IA.
- CRM.
- Gestión de oportunidades.
- Flujo de aprobación de acciones.

---

# Licencia

Proyecto desarrollado con fines académicos para el **Hackathon de Agentes Financieros IA 2026**.