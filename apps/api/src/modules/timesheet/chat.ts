import type { DayEntry, Shift, AIProvider } from '@hermes/types'
import { callAIText, type ProviderCredentials, type TokenUsage } from '../../shared/ai.js'
import { CHAT_PROMPT } from './chat-prompt.js'
import { ADJUSTMENT_PROMPT } from './adjust-prompt.js'
import { applyAdjustment, resolveCycle, type Adjustment } from './adjust.js'
import { ADD_PERIOD_PROMPT } from './add-period-prompt.js'
import { addPeriodDays } from './add-period.js'
import { PRESUME_MISSING_PROMPT } from './presume-missing-prompt.js'
import { fillMissingMonths, type PresumedSchedule } from './presume-missing.js'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatVersionRef {
  version: number
  source: string
  totalDays: number
  createdAt: string
}

export interface ChatChange {
  op: string
  summary: string
  ok: boolean
}

export interface ChatResult {
  reply: string
  days: DayEntry[]
  warnings: string[]
  changes: ChatChange[]
  usage: TokenUsage
}

interface ChatAction {
  op: string
  text?: string
  startDate?: string
  dateFrom?: string
  dateTo?: string
  months?: string[]
  date?: string
  shifts?: Shift[]
  version?: number
}

const MAX_DAYS_IN_CONTEXT = 400
const MAX_ACTIONS = 3
const MAX_HISTORY = 12
const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/

// The chat never computes anything: it picks actions and the server runs the
// very same code the on-screen buttons use. This is the executor.
export async function runChat(params: {
  days: DayEntry[]
  warnings: string[]
  messages: ChatMessage[]
  provider: AIProvider
  credentials: ProviderCredentials
  versions?: ChatVersionRef[]
  loadVersion?: (version: number) => Promise<{ days: DayEntry[]; warnings: string[] } | null>
}): Promise<ChatResult> {
  const { days, warnings, messages, provider, credentials } = params

  let inputTokens = 0
  let outputTokens = 0
  const addUsage = (usage: TokenUsage) => {
    inputTokens += usage.inputTokens
    outputTokens += usage.outputTokens
  }

  const userText = [
    buildContext(days, warnings, params.versions ?? []),
    '--- Conversa ---',
    ...messages.slice(-MAX_HISTORY).map((m) => `${m.role === 'user' ? 'Usuária' : 'Assistente'}: ${m.content}`),
  ].join('\n\n')

  let plan
  try {
    plan = await callAIText<{ reply?: string; actions?: ChatAction[] }>(CHAT_PROMPT, userText, provider, credentials)
  } catch (err: any) {
    return {
      reply: `Não consegui interpretar o pedido: ${err?.message ?? 'falha na IA'}.`,
      days,
      warnings,
      changes: [],
      usage: { inputTokens, outputTokens },
    }
  }

  addUsage(plan.usage)

  let current = days
  let currentWarnings = warnings
  const changes: ChatChange[] = []
  const notes: string[] = []

  for (const action of (plan.data.actions ?? []).slice(0, MAX_ACTIONS)) {
    let result: ActionResult
    try {
      result = await executeAction(action, current, currentWarnings, params, provider, credentials, addUsage)
    } catch (err: any) {
      result = { error: err?.message ?? 'Falha ao executar a ação.' }
    }
    if ('error' in result) {
      changes.push({ op: action.op, ok: false, summary: result.error })
      notes.push(result.error)
      continue
    }
    changes.push({ op: action.op, ok: true, summary: result.summary })
    current = result.days
    currentWarnings = result.warnings
  }

  const reply = [plan.data.reply?.trim(), ...notes].filter(Boolean).join('\n\n')

  return {
    reply: reply || 'Não entendi o pedido. Pode reformular?',
    days: current,
    warnings: currentWarnings,
    changes,
    usage: { inputTokens, outputTokens },
  }
}

type ActionResult = { days: DayEntry[]; warnings: string[]; summary: string } | { error: string }

async function executeAction(
  action: ChatAction,
  days: DayEntry[],
  warnings: string[],
  params: { loadVersion?: (version: number) => Promise<{ days: DayEntry[]; warnings: string[] } | null> },
  provider: AIProvider,
  credentials: ProviderCredentials,
  addUsage: (usage: TokenUsage) => void,
): Promise<ActionResult> {
  switch (action.op) {
    case 'adjust':
      return runAdjust(action, days, warnings, provider, credentials, addUsage)
    case 'add-period':
      return runAddPeriod(action, days, provider, credentials, addUsage)
    case 'presume-missing':
      return runPresumeMissing(action, days, warnings, provider, credentials, addUsage)
    case 'set-day':
      return runSetDay(action, days, warnings)
    case 'restore-version':
      return runRestore(action, params, warnings)
    default:
      return { error: `Ação não suportada: ${action.op}.` }
  }
}

async function runAdjust(
  action: ChatAction,
  days: DayEntry[],
  warnings: string[],
  provider: AIProvider,
  credentials: ProviderCredentials,
  addUsage: (usage: TokenUsage) => void,
): Promise<ActionResult> {
  if (!action.text?.trim()) return { error: 'Faltou o texto da determinação para ajustar.' }
  if (action.startDate && !DATE_RE.test(action.startDate)) return { error: 'Início da determinação inválido.' }
  if (action.dateFrom && !DATE_RE.test(action.dateFrom)) return { error: 'Data inicial inválida.' }
  if (action.dateTo && !DATE_RE.test(action.dateTo)) return { error: 'Data final inválida.' }

  const parsed = await callAIText<{ startDate?: string; cycleWeeks?: number; adjustments?: Adjustment[]; warnings?: string[] }>(
    ADJUSTMENT_PROMPT,
    action.text,
    provider,
    credentials,
  )
  addUsage(parsed.usage)

  const adjustments = parsed.data.adjustments ?? []
  if (adjustments.length === 0) {
    return { error: parsed.data.warnings?.[0] ?? 'Não identifiquei um ajuste aplicável no texto.' }
  }

  const cycle = resolveCycle(action.startDate ?? parsed.data.startDate, parsed.data.cycleWeeks)
  if (cycle.error) return { error: cycle.error }

  const adjusted = applyAdjustment(days, adjustments, action.dateFrom || undefined, action.dateTo || undefined, cycle)
  const changed = countChangedDays(days, adjusted)
  const extra = [...(parsed.data.warnings ?? [])]
  if (cycle.startDate && cycle.cycleWeeks > 1 && !isMonday(cycle.startDate)) {
    extra.push(`O início informado (${cycle.startDate}) não é segunda-feira; as semanas foram contadas a partir dele.`)
  }

  return {
    days: adjusted,
    warnings: [...warnings, ...extra],
    summary: changed === 0
      ? 'Nenhum dia foi alterado pelo ajuste.'
      : `Ajuste aplicado em ${changed} dia${changed === 1 ? '' : 's'}.`,
  }
}

async function runAddPeriod(
  action: ChatAction,
  days: DayEntry[],
  provider: AIProvider,
  credentials: ProviderCredentials,
  addUsage: (usage: TokenUsage) => void,
): Promise<ActionResult> {
  if (!action.text?.trim()) return { error: 'Faltou o texto da determinação para acrescentar o período.' }

  const parsed = await callAIText<{ dateFrom?: string; dateTo?: string; startDate?: string; cycleWeeks?: number; schedules?: PresumedSchedule[]; warnings?: string[] }>(
    ADD_PERIOD_PROMPT,
    action.text,
    provider,
    credentials,
  )
  addUsage(parsed.usage)

  const { dateFrom = '', dateTo = '' } = parsed.data
  const schedules = (parsed.data.schedules ?? []).filter((s) => s.weekdays?.length && s.shifts?.length)
  if (!dateFrom || !dateTo || schedules.length === 0) {
    return { error: parsed.data.warnings?.[0] ?? 'Não identifiquei o período e a jornada no texto.' }
  }

  const cycle = resolveCycle(
    action.startDate ?? parsed.data.startDate ?? dateFrom,
    parsed.data.cycleWeeks ?? Math.max(1, ...schedules.map((s) => s.week ?? 1)),
  )
  if (cycle.error) return { error: cycle.error }

  const filled = addPeriodDays(days, dateFrom, dateTo, schedules, cycle)
  const added = countChangedDays(days, filled)
  return {
    days: filled,
    warnings: [...(parsed.data.warnings ?? []), `Período acrescentado: ${dateFrom} a ${dateTo}.`],
    summary: `Período de ${dateFrom} a ${dateTo} acrescentado (${added} dia${added === 1 ? '' : 's'}).`,
  }
}

async function runPresumeMissing(
  action: ChatAction,
  days: DayEntry[],
  warnings: string[],
  provider: AIProvider,
  credentials: ProviderCredentials,
  addUsage: (usage: TokenUsage) => void,
): Promise<ActionResult> {
  if (!action.text?.trim()) return { error: 'Faltou o texto da determinação para presumir os meses.' }
  const months = (action.months ?? []).filter((m) => /^\d{2}\/\d{4}$/.test(m))
  if (months.length === 0) return { error: 'Quais meses faltantes devem ser presumidos (MM/AAAA)?' }

  const parsed = await callAIText<{ startDate?: string; cycleWeeks?: number; schedules?: PresumedSchedule[]; warnings?: string[] }>(
    PRESUME_MISSING_PROMPT,
    action.text,
    provider,
    credentials,
  )
  addUsage(parsed.usage)

  const schedules = (parsed.data.schedules ?? []).filter((s) => s.weekdays?.length && s.shifts?.length)
  if (schedules.length === 0) {
    return { error: parsed.data.warnings?.[0] ?? 'Não identifiquei uma jornada no texto.' }
  }

  const cycle = resolveCycle(
    action.startDate ?? parsed.data.startDate,
    parsed.data.cycleWeeks ?? Math.max(1, ...schedules.map((s) => s.week ?? 1)),
  )
  if (cycle.error) return { error: cycle.error }

  const filled = fillMissingMonths(days, months, schedules, cycle)
  const generated = countChangedDays(days, filled)
  return {
    days: filled,
    warnings: [...warnings, ...(parsed.data.warnings ?? []), ...months.map((m) => `Mês presumido: ${m} — jornada presumida pela determinação`)],
    summary: `Presumidos: ${months.join(', ')} (${generated} dia${generated === 1 ? '' : 's'} gerado${generated === 1 ? '' : 's'}).`,
  }
}

function runSetDay(action: ChatAction, days: DayEntry[], warnings: string[]): ActionResult {
  if (!action.date || !DATE_RE.test(action.date)) return { error: 'Informe a data do dia a editar (DD/MM/AAAA).' }
  if (!Array.isArray(action.shifts)) return { error: 'Informe os horários do dia.' }

  const shifts = action.shifts
    .filter((s) => s && typeof s.clockIn === 'string' && typeof s.clockOut === 'string')
    .slice(0, 6)
    .map((s) => ({ clockIn: s.clockIn.trim(), clockOut: s.clockOut.trim() }))

  const next = days.filter((d) => d.date !== action.date)
  next.push({ date: action.date, shifts })
  return { days: next, warnings, summary: `Dia ${action.date} atualizado.` }
}

async function runRestore(
  action: ChatAction,
  params: { loadVersion?: (version: number) => Promise<{ days: DayEntry[]; warnings: string[] } | null> },
  warnings: string[],
): Promise<ActionResult> {
  if (!params.loadVersion) return { error: 'Esta conversa não está ligada a uma análise salva.' }
  if (!action.version || !Number.isInteger(action.version)) return { error: 'Qual versão devo restaurar?' }

  const snapshot = await params.loadVersion(action.version)
  if (!snapshot) return { error: `Versão ${action.version} não encontrada.` }

  return {
    days: snapshot.days,
    warnings: snapshot.warnings,
    summary: `Versão ${action.version} carregada na tabela (${snapshot.days.length} dias). Salve para gravar.`,
  }
}

function buildContext(days: DayEntry[], warnings: string[], versions: ChatVersionRef[]): string {
  const lines: string[] = []

  lines.push(`Tabela atual: ${days.length} dia${days.length === 1 ? '' : 's'}.`)

  const months = new Map<string, number>()
  for (const day of days) {
    const [, mm, yyyy] = day.date.split('/')
    if (!mm || !yyyy) continue
    const key = `${mm}/${yyyy}`
    months.set(key, (months.get(key) ?? 0) + 1)
  }
  if (months.size > 0) {
    lines.push('Meses: ' + [...months.entries()].sort((a, b) => a[0].slice(3).localeCompare(b[0].slice(3)) || a[0].slice(0, 2).localeCompare(b[0].slice(0, 2)))
      .map(([m, n]) => `${m} (${n} dias)`).join(', ') + '.')
  }

  if (warnings.length > 0) {
    lines.push('Avisos da análise: ' + warnings.slice(0, 10).join(' | '))
  }

  if (versions.length > 0) {
    lines.push('Versões: ' + versions.map((v) => `v${v.version} (${v.source}, ${v.totalDays} dias)`).join(', ') + '.')
  }

  const ordered = [...days].sort((a, b) => sortKey(a.date).localeCompare(sortKey(b.date)))
  const sample = ordered.length > MAX_DAYS_IN_CONTEXT ? ordered.slice(-MAX_DAYS_IN_CONTEXT) : ordered
  lines.push(sample.length === ordered.length ? 'Dias:' : `Dias (últimos ${sample.length} de ${ordered.length}):`)
  for (const day of sample) {
    const shifts = day.shifts.filter((s) => s.clockIn || s.clockOut).map((s) => `${s.clockIn}-${s.clockOut}`).join(' ')
    lines.push(`${day.date} ${shifts || '(sem marcação)'}`)
  }

  return lines.join('\n')
}

function sortKey(date: string): string {
  const [dd, mm, yyyy] = date.split('/')
  return `${yyyy}${mm}${dd}`
}

function isMonday(date: string): boolean {
  const [dd, mm, yyyy] = date.split('/').map(Number)
  return new Date(Date.UTC(yyyy, mm - 1, dd)).getUTCDay() === 1
}

function countChangedDays(before: DayEntry[], after: DayEntry[]): number {
  const previous = new Map(before.map((d) => [d.date, JSON.stringify(d.shifts)]))
  return after.filter((d) => previous.get(d.date) !== JSON.stringify(d.shifts)).length
}
