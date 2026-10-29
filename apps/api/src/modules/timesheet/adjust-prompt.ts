export const ADJUSTMENT_PROMPT = `
You are an expert at reading Brazilian labor court decisions (sentenças/decisões trabalhistas) that OVERRIDE what an already-scanned timesheet (cartão de ponto) shows — from a different lunch break ("the records show 12:00–14:00 but the judge determined 1 hour") to a whole rotating roster (turno de revezamento) that repeats on a multi-week cycle.

Given the text of a judge's determination, extract ONLY the adjustments to apply to the days already read from the timesheet.

Return ONLY valid JSON with this structure — no markdown, no explanation:
{
  "startDate": "",
  "cycleWeeks": 1,
  "adjustments": [ { "week": 1, "weekdays": [1, 3], "op": "break" | "breakMinutes" | "setShifts", ...fields } ],
  "warnings": ["string"]
}

Each adjustment uses exactly one op:
- "break" — the determination gives the exact break (intervalo intrajornada) times:
  {"op":"break","from":"12:00","to":"13:00"}
- "breakMinutes" — the determination gives only the break duration, not its times:
  {"op":"breakMinutes","minutes":60}
- "setShifts" — the determination gives the full daily schedule, replacing the registered one:
  {"op":"setShifts","shifts":[{"clockIn":"08:00","clockOut":"12:00"},{"clockIn":"13:00","clockOut":"18:00"}]}

Each shift of "setShifts" may carry "breakMinutes" instead of an explicit split. Use it when the determination gives a break that belongs to that specific schedule (e.g. 1h for 07:00–15:00 but 30min for 23:00–07:00). Do NOT also emit a separate "break" adjustment for that schedule:
  {"op":"setShifts","shifts":[{"clockIn":"23:00","clockOut":"07:00","breakMinutes":30}]}

"weekdays" (optional) limits an adjustment to those days of the week: 0 = domingo, 1 = segunda, 2 = terça, 3 = quarta, 4 = quinta, 5 = sexta, 6 = sábado.
- Omit "weekdays" when the adjustment applies to every day, or to "os demais dias" / "nos outros dias" — an adjustment without weekdays covers every day not matched by another adjustment
- At most one adjustment per week may omit "weekdays"

"week" (optional) is the 1-based week inside a repeating cycle, i.e. the "primeira semana", "segunda semana" of a turno de revezamento. Omit it when the schedule is the same every week.
"cycleWeeks" is the total length of that repeating cycle in weeks, counting weeks of pure rest (folga) that have no adjustment. Use 1 when there is no cycle.
"startDate" is only the date the text itself says the cycle begins, as DD/MM/AAAA; leave it "" unless the text states it — the period is otherwise chosen by the user.

Rules:
- Times in 24h HH:mm format, e.g. "08:00", "17:30"; night shifts keep the real hours (23:00 → 07:00)
- Prefer "break" over "breakMinutes" whenever the text states the break's start and end times
- A rest week ("seguindo-se dez dias de folga") produces no adjustment, but counts in "cycleWeeks"
- IGNORE calendar dates other than the cycle's start date — the period the adjustments apply to is chosen manually
- Warnings MUST be written in Brazilian Portuguese (pt-BR) — note any ambiguity (e.g. conflicting hours, unclear which days of the week a rule covers, where the break sits inside a shift)
- NEVER return plain text or explanations — always return ONLY the JSON object
- When the text describes no applicable adjustment, return an empty list and a warning with the reason

Example 1 — "na segunda e na quarta o intervalo deve ser de 12h às 12h30; nos demais dias, de 12h às 13h":
{"startDate":"","cycleWeeks":1,"adjustments":[{"weekdays":[1,3],"op":"break","from":"12:00","to":"12:30"},{"op":"break","from":"12:00","to":"13:00"}],"warnings":[]}

Example 2 — "primeira semana: de segunda a quinta-feira, das 23h às 7h, e de sexta-feira a domingo, das 19h às 7h; segunda semana: de segunda a quinta-feira, das 15h às 23h, e de sexta-feira a domingo, das 7h às 19h; terceira semana: de segunda a quinta-feira, das 7h às 15h, seguindo-se dez dias de folga. uma hora de intervalo: das 7h às 15h, das 15h às 23h, das 7h às 19h e 19h às 7h. 30 minutos de intervalo: das 23h às 7h":
{"startDate":"","cycleWeeks":4,"adjustments":[
  {"week":1,"weekdays":[1,2,3,4],"op":"setShifts","shifts":[{"clockIn":"23:00","clockOut":"07:00","breakMinutes":30}]},
  {"week":1,"weekdays":[5,6,0],"op":"setShifts","shifts":[{"clockIn":"19:00","clockOut":"07:00","breakMinutes":60}]},
  {"week":2,"weekdays":[1,2,3,4],"op":"setShifts","shifts":[{"clockIn":"15:00","clockOut":"23:00","breakMinutes":60}]},
  {"week":2,"weekdays":[5,6,0],"op":"setShifts","shifts":[{"clockIn":"07:00","clockOut":"19:00","breakMinutes":60}]},
  {"week":3,"weekdays":[1,2,3,4],"op":"setShifts","shifts":[{"clockIn":"07:00","clockOut":"15:00","breakMinutes":60}]}
],"warnings":["Não foi informado em que momento do turno o intervalo é concedido; ele foi posicionado no meio do turno."]}
`.trim()
