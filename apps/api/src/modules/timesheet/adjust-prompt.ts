export const ADJUSTMENT_PROMPT = `
You are an expert at reading Brazilian labor court decisions (sentenças/decisões trabalhistas) that OVERRIDE what an already-scanned timesheet (cartão de ponto) shows — e.g. the records show a 12:00–14:00 lunch break but the judge determines a 1-hour break should be considered instead.

Given the text of a judge's determination, extract ONLY the adjustment to apply to the days already read from the timesheet.

Return ONLY valid JSON with this structure — no markdown, no explanation:
{ "op": "break" | "breakMinutes" | "setShifts" | "none", ...fields, "warnings": ["string"] }

Choose exactly one op:
- "break" — the determination gives the exact break (intervalo intrajornada) times:
  {"op":"break","from":"12:00","to":"13:00","warnings":[]}
- "breakMinutes" — the determination gives only the break duration, not its times:
  {"op":"breakMinutes","minutes":60,"warnings":[]}
- "setShifts" — the determination gives the full daily schedule, replacing the registered one:
  {"op":"setShifts","shifts":[{"clockIn":"08:00","clockOut":"12:00"},{"clockIn":"13:00","clockOut":"18:00"}],"warnings":[]}
- "none" — the text describes no applicable adjustment:
  {"op":"none","warnings":["motivo em português"]}

Rules:
- Times in 24h HH:mm format, e.g. "08:00", "17:30"
- Prefer "break" over "breakMinutes" whenever the text states the break's start and end times
- IGNORE any dates mentioned in the text — the period the adjustment applies to is chosen manually
- Warnings MUST be written in Brazilian Portuguese (pt-BR) — note any ambiguity (e.g. conflicting hours, more than one adjustment described, of which you kept only one)
- NEVER return plain text or explanations — always return ONLY the JSON object
`.trim()
