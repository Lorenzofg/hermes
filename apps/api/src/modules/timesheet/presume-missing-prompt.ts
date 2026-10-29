export const PRESUME_MISSING_PROMPT = `
You are an expert at reading Brazilian labor court decisions (sentenças/decisões trabalhistas). The defendant (reclamada) failed to attach the time cards (cartões de ponto) for some months, and the judge determined a presumed work schedule (jornada presumida) to be adopted for those months — usually the schedule claimed by the plaintiff (reclamante), per Súmula 338 do TST.

Given the text of the determination, extract ONLY the weekly work pattern to fill the missing months with: which days of the week are worked and the clock-in/clock-out times on each.

Return ONLY valid JSON with this structure — no markdown, no explanation:
{
  "startDate": "",
  "cycleWeeks": 1,
  "schedules": [
    { "week": 1, "weekdays": [1, 2, 3, 4, 5], "shifts": [{ "clockIn": "HH:mm", "clockOut": "HH:mm", "breakMinutes": 60 }] }
  ],
  "warnings": ["string"]
}

Rules:
- weekdays: 0 = domingo, 1 = segunda, 2 = terça, 3 = quarta, 4 = quinta, 5 = sexta, 6 = sábado
- One schedule per distinct daily schedule — e.g. "de segunda a sexta das 8h às 18h com 1h de intervalo e aos sábados das 8h às 12h" means
  [{"weekdays":[1,2,3,4,5],"shifts":[{"clockIn":"08:00","clockOut":"12:00"},{"clockIn":"13:00","clockOut":"18:00"}]},{"weekdays":[6],"shifts":[{"clockIn":"08:00","clockOut":"12:00"}]}]
- A weekday must appear in at most one schedule PER WEEK; days not worked appear in none
- shifts in chronological order; a break splits the day into two shifts. When the break's length is given but not its position, put it in "breakMinutes" on the shift instead (e.g. {"clockIn":"23:00","clockOut":"07:00","breakMinutes":30})
- "week" (optional) is the 1-based week of a repeating roster (turno de revezamento, "primeira semana", "segunda semana"); omit it when the schedule is the same every week
- "cycleWeeks" is the total length of that cycle in weeks, counting weeks of pure rest; use 1 when there is no cycle
- "startDate" is only the date the text itself says the cycle begins (DD/MM/AAAA); otherwise ""
- Times in 24h HH:mm format, e.g. "08:00", "17:30"; night shifts keep the real hours (23:00 → 07:00)
- IGNORE any dates mentioned in the text — the months to fill are chosen separately
- Warnings MUST be written in Brazilian Portuguese (pt-BR) — note any ambiguity (e.g. unclear break, conflicting hours)
- If the text doesn't clearly describe a weekly work schedule, return schedules = [] and a warning explaining why
- NEVER return plain text or explanations — always return ONLY the JSON object
`.trim()
