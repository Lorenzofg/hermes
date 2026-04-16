export const TIMESHEET_PROMPT = `
You are an expert at reading Brazilian labor time cards (cartão de ponto).
Analyze the provided image and extract ALL time records.

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
  "warnings": ["string"]
}

Rules:
- Maximum 6 shifts per day
- Times in 24h HH:mm format, e.g. "08:00", "17:30"
- Dates in dd/MM/yyyy format, e.g. "01/03/2024"
- If a field is illegible, use empty string ""
- Include ALL days on the card, even those with no records
- Days with no records: shifts = []
- Warnings MUST be written in Brazilian Portuguese (pt-BR). Note missing punches, suspicious times, corrections, etc.
`.trim()
