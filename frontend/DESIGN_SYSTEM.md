# Sistema de diseño — NexoFin IA

## Propósito

NexoFin representa el punto de unión entre conversación, aprendizaje y decisión comercial. La identidad usa nodos, conexiones y señales para comunicar coordinación entre agentes sin recurrir a una plantilla bancaria genérica.

## Tokens

Todos los valores están en `src/styles/tokens.css`.

### Color

| Token | Valor | Uso |
|---|---:|---|
| `--color-ink-900` | `#121a31` | Navegación, control y acciones primarias |
| `--color-accent` | `#b7f46c` | Activación, foco conceptual y conexión |
| `--color-teal` | `#2fbfa6` | Educación y respuestas fundamentadas |
| `--color-canvas` | `#f2f5f0` | Fondo general |
| `--color-surface` | `#ffffff` | Superficies principales |
| `--color-amber` | `#e9a62d` | Pendientes y revisión |
| `--color-red` | `#d85050` | Error o rechazo |

### Tipografía

- Familia: Segoe UI Variable y fallbacks de sistema.
- Jerarquía: hero fluido, títulos compactos, cuerpo de 16 px, metadata de 12–14 px.
- No se cargan fuentes externas para reducir fallos de red y mejorar el tiempo de inicio.

### Espaciado

Escala basada en 4 px: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

### Bordes y formas

- Radios moderados de 8–28 px.
- Los pills se reservan para badges, estados y sugerencias breves.
- Las superficies operativas usan bordes de 1 px y sombras leves.

### Estados

- `neutral`, `success`, `warning`, `danger`, `info`.
- Foco visible con anillo azul.
- Skeletons para carga, empty states descriptivos y errores recuperables.
- Los botones sensibles exponen estados separados para aprobar, editar y rechazar.

## Accesibilidad

- Contraste AA en textos y controles principales.
- Navegación por teclado y `:focus-visible`.
- `aria-live` en conversaciones.
- Iconos acompañados por etiquetas o tooltips.
- Soporte para `prefers-reduced-motion`.
- Formularios con labels y estados disabled explícitos.

## Principios de composición

1. La acción principal aparece una sola vez por contexto.
2. Las métricas se presentan como una banda, no como una colección de tarjetas repetitivas.
3. La revisión humana siempre es visible en las pantallas con acciones comerciales.
4. El frontend muestra los resultados del backend y no replica el scoring ni modifica los contratos.
5. La experiencia debe funcionar en escritorio, tablet y móvil.
