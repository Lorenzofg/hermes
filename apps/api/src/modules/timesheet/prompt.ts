export const TIMESHEET_PROMPT = `
You are an expert at reading Brazilian labor time cards (cartão de ponto).
You are given a single page (either one page of a PDF or a standalone image). Extract every time record found on this page.

Return ONLY valid JSON with the structure below — no markdown, no explanation:
{
  "days": [
    {
      "date": "dd/MM/yyyy",
      "shifts": [
        { "clockIn": "HH:mm", "clockOut": "HH:mm" }
      ]
    }
  ],
  "leaves": [{ "from": "dd/MM/yyyy", "to": "dd/MM/yyyy", "reason": "string" }],
  "warnings": ["string"]
}

Rules:
- Maximum 6 shifts per day
- Times in 24h HH:mm format, e.g. "08:00", "17:30"
- Dates in dd/MM/yyyy format, e.g. "01/03/2024"
- If a field is illegible, use empty string ""
- Include ALL days found on this page, even those with no records
- Days with no records: shifts = []
- Do NOT warn about days that simply aren't on this page, nor about a page/period with no punches at all — missing months are detected in code across all pages. "Ponto incompleto" is only for a day with some punches but not all (e.g. clock-in without clock-out); a worked day with no intrajornada break is "Horário suspeito"
- "leaves": vacation or leave periods written on this page (férias, atestado, licença, afastamento), with dates in dd/MM/yyyy and the reason as written, e.g. {"from":"01/03/2025","to":"31/03/2025","reason":"Férias"}. If only a month is given, use its first and last day. Empty list when there is none
- Warnings MUST be written in Brazilian Portuguese (pt-BR). Note missing punches, suspicious times, corrections, etc.
- Start EVERY warning with exactly one of these categories followed by ": " — "Ponto incompleto" (missing punch), "Horário suspeito" (implausible or out-of-pattern time), "Correção manual" (handwritten change, erasure, overwritten time), "Ilegível" (unreadable field), e.g. "Ponto incompleto: 10/03/2025 — falta o registro de saída". Use no prefix only when none fits
- If the document contains no time records, still return the JSON structure with days = [] and a warning explaining why
- NEVER return plain text or explanations — always return ONLY the JSON object
`.trim()
