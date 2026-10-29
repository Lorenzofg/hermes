export type AIProvider = 'claude' | 'gpt' | 'gemini' | 'openrouter'

export interface Shift {
  clockIn: string  // "HH:mm" or empty
  clockOut: string // "HH:mm" or empty
}

// One entry per PDF page processed by the AI — lets the user see which pages
// failed and why, since a multi-page document is now analyzed page by page.
export interface PageLogEntry {
  page: number
  status: 'ok' | 'error'
  detail?: string // raw AI error text when status is 'error'
}

export interface DayEntry {
  date: string    // "dd/MM/yyyy"
  shifts: Shift[] // max 6 shifts
}

// Floating assistant: the user talks, the AI answers with actions that the
// backend runs with the same code as the on-screen panels.
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatChange {
  op: string
  summary: string
  ok: boolean
}

export interface ChatResponse {
  reply: string
  days: DayEntry[]
  warnings: string[]
  changes: ChatChange[]
  usage: { inputTokens: number; outputTokens: number }
}

export interface AnalyzeTimesheetResponse {
  days: DayEntry[]
  csvContent: string
  totalDays: number
  warnings: string[]
  pageLog: PageLogEntry[]
}

export interface PjeCalcRow {
  date: string
  clockIn1: string;  clockOut1: string
  clockIn2: string;  clockOut2: string
  clockIn3: string;  clockOut3: string
  clockIn4: string;  clockOut4: string
  clockIn5: string;  clockOut5: string
  clockIn6: string;  clockOut6: string
}

// Batch timesheet types
export interface BatchPersonResult {
  name: string
  days: DayEntry[]
  warnings: string[]
}

export interface AnalyzeBatchTimesheetResponse {
  people: BatchPersonResult[]
  fileName: string
  usage: { inputTokens: number; outputTokens: number }
  pageLog: PageLogEntry[]
}

// Payslip types
export interface PayslipEarning {
  description: string
  reference: string  // hours, days, or percentage
  value: number
}

export interface PayslipDeduction {
  description: string
  reference: string
  value: number
}

export interface Payslip {
  // Identification
  competence: string       // MM/yyyy
  employeeName: string
  cpf: string
  role: string
  admissionDate: string    // dd/MM/yyyy

  // Earnings
  baseSalary: number
  earnings: PayslipEarning[]
  totalEarnings: number

  // Deductions
  deductions: PayslipDeduction[]
  totalDeductions: number

  // Totals
  netSalary: number
  fgtsBase: number
  fgtsAmount: number
}

export interface AnalyzePayslipResponse {
  payslip: Payslip
  warnings: string[]
}
