# NexoFin IA — Frontend React + Vite

Frontend para el backend FastAPI del Track 1: **Inteligencia Conversacional para Ventas y Gestión de Clientes (CRM)**.

## Alcance implementado

La interfaz consume los endpoints existentes sin renombrarlos ni introducir contratos alternativos:

| Método | Endpoint | Pantalla |
|---|---|---|
| `GET` | `/health` | Estado de conexión global |
| `POST` | `/api/chat/comercial` | Agente comercial |
| `POST` | `/api/tutor/ask` | Futuro Academy |
| `GET` | `/api/tutor/quiz/{topic}` | Quiz de 3 preguntas |
| `POST` | `/api/tutor/consent` | Registro consentido del interés |
| `GET` | `/api/crm/contacts` | Directorio CRM |
| `GET` | `/api/crm/contacts/{contact_id}` | Ficha e historial del contacto |
| `GET` | `/api/crm/opportunities` | Pipeline y selector de revisión |
| `GET` | `/api/opportunities/{opportunity_id}/summary` | Resumen y creación de propuesta |
| `GET` | `/api/opportunities/{opportunity_id}/actions` | Bitácora de acciones |
| `POST` | `/api/actions/{action_id}/decision` | Aprobar, editar o rechazar |

## Sistema visual

Los tokens están centralizados en `src/styles/tokens.css`:

- **Colores:** tinta nocturna para control y confianza; verde eléctrico para activación; teal para educación; ámbar y rojo para estados de revisión.
- **Tipografía:** pila de sistema basada en Segoe UI Variable para legibilidad y cero dependencia de fuentes externas.
- **Espaciado:** escala de 4 a 64 px.
- **Bordes:** líneas frías de bajo contraste y radios moderados; los pills se reservan para estados.
- **Sombras:** tres niveles, usados solo para jerarquía y superficies flotantes.
- **Estados:** foco visible, loading, vacío, error, éxito, advertencia y controles deshabilitados.
- **Accesibilidad:** navegación con teclado, `aria-live` para chats, labels, contraste y soporte de `prefers-reduced-motion`.

La identidad se aleja de un dashboard genérico mediante una composición editorial, panel de señal orbital, navegación oscura, superficies asimétricas y un lenguaje de “nodos y conexión” coherente con el concepto NexoFin.

## Puesta en marcha

```bash
npm install
cp .env.example .env
npm run dev
```

Configura la URL del backend en `.env`:

```env
VITE_API_URL=http://localhost:8000
```

Backend:

```bash
cd ../backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Frontend disponible en `http://localhost:5173` y documentación FastAPI en `http://localhost:8000/docs`.

## Build de producción

```bash
npm run build
npm run preview
```

El directorio generado es `dist/`. Para despliegue, configura `VITE_API_URL` con la URL pública de FastAPI antes de ejecutar el build.

## Nota sobre el tutor

El contrato del backend declara `contact_id` como opcional en la entrada, pero la respuesta `TutorAskOut` lo exige como `string`. Para evitar errores de validación y respetar el backend sin modificarlo, la interfaz requiere seleccionar un contacto existente antes de enviar preguntas al tutor.
