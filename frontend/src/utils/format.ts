import type { FunnelStage, PriorityLabel } from '../types/api'

export function formatDate(value: string) {
  return new Date(value).toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export const formatStage = (stage: FunnelStage | string) =>
  ({
    nuevo: 'Nuevo',
    calificando: 'Calificando',
    educando: 'Educando',
    listo_para_asesor: 'Listo para asesor',
    derivado: 'Derivado',
    cerrado: 'Cerrado',
  })[stage] || stage.replaceAll('_', ' ')

export const formatPriority = (priority: PriorityLabel | string) =>
  priority.charAt(0).toUpperCase() + priority.slice(1)

export const formatAction = (action: string) =>
  ({
    agendar_reunion: 'Agendar reunión',
    enviar_material: 'Enviar material',
    derivar_especialista: 'Derivar a especialista',
  })[action] || action.replaceAll('_', ' ')

export const topicLabel = (topic: string) =>
  ({
    que_es_invertir: 'Qué es invertir',
    perfil_de_riesgo: 'Perfil de riesgo',
    diversificacion: 'Diversificación',
    renta_fija_vs_variable: 'Renta fija vs. variable',
    interes_compuesto: 'Interés compuesto',
    fondos_de_inversion: 'Fondos de inversión',
  })[topic] || topic.replaceAll('_', ' ')

export const getDisplayName = (name: string | null, company: string | null, fallback = 'Lead sin nombre') =>
  name?.trim() || company?.trim() || fallback

export const shortId = (id: string) => (id.length > 10 ? `${id.slice(0, 8)}…` : id)
