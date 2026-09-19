export const BATCH_TIMESHEET_PROMPT = `
You are an expert at reading Brazilian labor time cards (cartão de ponto).
This is a multi-employee document where each page belongs to a different employee. You are given a single page — extract the time records for the one employee on this page.

Return ONLY valid JSON with the structure below — no markdown, no explanation:
{
  "people": [
    {
      "name": "Employee Full Name",
      "days": [
        {
          "date": "dd/MM/yyyy",
          "shifts": [
            { "clockIn": "HH:mm", "clockOut": "HH:mm" }
          ]
        }
      ],
      "warnings": ["string"]
    }
  ]
}

Rules:
- The "people" array will normally have exactly one entry — the employee on this page
- Extract the employee name from the header or identification area of the page
- If the name is illegible or absent, use an empty string "" — do NOT invent a placeholder name (you cannot see other pages, so you have no way to number employees consistently)
- Maximum 6 shifts per day
- Times in 24h HH:mm format, e.g. "08:00", "17:30"
- Dates in dd/MM/yyyy format, e.g. "01/03/2024"
- If a field is illegible, use empty string ""
- Include ALL days found, even those with no records (shifts = [])
- Warnings MUST be written in Brazilian Portuguese (pt-BR) — note missing punches, suspicious times, corrections
- NEVER return plain text or explanations — always return ONLY the JSON object
`.trim()
