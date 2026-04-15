import { stringify } from 'csv-stringify/sync'
import type { DayEntry, PjeCalcRow } from '@cris/types'

const HEADERS = [
  'data',
  'entrada1', 'saida1',
  'entrada2', 'saida2',
  'entrada3', 'saida3',
  'entrada4', 'saida4',
  'entrada5', 'saida5',
  'entrada6', 'saida6',
]

/**
 * Converts a list of DayEntry into a PJe-Calc compatible CSV.
 * 13 columns: date + 6 clockIn/clockOut pairs.
 * Delimiter: semicolon (Brazilian standard).
 */
export function generatePjeCalcCsv(days: DayEntry[]): string {
  const rows: PjeCalcRow[] = days.map((day) => {
    const shifts = [...day.shifts]
    while (shifts.length < 6) shifts.push({ clockIn: '', clockOut: '' })

    return {
      date:      day.date,
      clockIn1:  shifts[0].clockIn,  clockOut1: shifts[0].clockOut,
      clockIn2:  shifts[1].clockIn,  clockOut2: shifts[1].clockOut,
      clockIn3:  shifts[2].clockIn,  clockOut3: shifts[2].clockOut,
      clockIn4:  shifts[3].clockIn,  clockOut4: shifts[3].clockOut,
      clockIn5:  shifts[4].clockIn,  clockOut5: shifts[4].clockOut,
      clockIn6:  shifts[5].clockIn,  clockOut6: shifts[5].clockOut,
    }
  })

  // Map internal keys to PJe-Calc column names
  const csvRows = rows.map((r) => ({
    data:     r.date,
    entrada1: r.clockIn1,  saida1: r.clockOut1,
    entrada2: r.clockIn2,  saida2: r.clockOut2,
    entrada3: r.clockIn3,  saida3: r.clockOut3,
    entrada4: r.clockIn4,  saida4: r.clockOut4,
    entrada5: r.clockIn5,  saida5: r.clockOut5,
    entrada6: r.clockIn6,  saida6: r.clockOut6,
  }))

  return stringify(csvRows, {
    header: true,
    columns: HEADERS,
    delimiter: ';',
    cast: { string: (value) => ({ value: value ?? '' }) },
  })
}
