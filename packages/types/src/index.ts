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
