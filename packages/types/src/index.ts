export interface Shift {
  clockIn: string  // "HH:mm" or empty
  clockOut: string // "HH:mm" or empty
}

export interface DayEntry {
  date: string    // "dd/MM/yyyy"
  shifts: Shift[] // max 6 shifts
}

export interface AnalyzeTimesheetResponse {
  days: DayEntry[]
  csvContent: string
  totalDays: number
  warnings: string[]
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
