export const ADJUSTMENT_PROMPT = `
You are an expert at reading Brazilian labor court decisions (sentenças/decisões trabalhistas) that OVERRIDE what an already-scanned timesheet (cartão de ponto) shows — e.g. the records show a 12:00–14:00 lunch break but the judge determines a 1-hour break should be considered instead.

Given the text of a judge's determination, extract ONLY the adjustments to apply to the days already read from the timesheet.

Return ONLY valid JSON with this structure — no markdown, no explanation:
{ "adjustments": [ { "weekdays": [1, 3], "op": "break" | "breakMinutes" | "setShifts", ...fields } ], "warnings": ["string"] }

Each adjustment uses exactly one op:
- "break" — the determination gives the exact break (intervalo intrajornada) times:
  {"op":"break","from":"12:00","to":"13:00"}
- "breakMinutes" — the determination gives only the break duration, not its times:
  {"op":"breakMinutes","minutes":60}
- "setShifts" — the determination gives the full daily schedule, replacing the registered one:
  {"op":"setShifts","shifts":[{"clockIn":"08:00","clockOut":"12:00"},{"clockIn":"13:00","clockOut":"18:00"}]}

"weekdays" (optional) limits an adjustment to those days of the week: 0 = domingo, 1 = segunda, 2 = terça, 3 = quarta, 4 = quinta, 5 = sexta, 6 = sábado.
- Omit "weekdays" when the adjustment applies to every day, or to "os demais dias" / "nos outros dias" — an adjustment without weekdays covers every day not matched by another adjustment
- At most one adjustment may omit "weekdays"

Example — "na segunda e na quarta o intervalo deve ser de 12h às 12h30; nos demais dias, de 12h às 13h":
{"adjustments":[{"weekdays":[1,3],"op":"break","from":"12:00","to":"12:30"},{"op":"break","from":"12:00","to":"13:00"}],"warnings":[]}

When the text describes no applicable adjustment, return an empty list:
{"adjustments":[],"warnings":["motivo em português"]}

Rules:
- Times in 24h HH:mm format, e.g. "08:00", "17:30"
- Prefer "break" over "breakMinutes" whenever the text states the break's start and end times
- IGNORE any calendar dates mentioned in the text — the period the adjustments apply to is chosen manually
- Warnings MUST be written in Brazilian Portuguese (pt-BR) — note any ambiguity (e.g. conflicting hours, unclear which days of the week a rule covers)
- NEVER return plain text or explanations — always return ONLY the JSON object
`.trim()
