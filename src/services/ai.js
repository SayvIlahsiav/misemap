export const aiSuggest = async (name, type) => {
  const isRM = type === 'raw'
  const prompt = isRM
    ? `For the ingredient "${name}", provide accurate realistic costing and nutritional data.
Return a JSON object matching this schema:
{
  "category": "Vegetables",
  "sub_category": "Fresh Vegetables",
  "food_type": "Vegetarian",
  "buy_unit": "kg",
  "usage_unit": "g",
  "conversion": 1000,
  "calories": 1.5,
  "carbs": 0.3,
  "protein": 0.1,
  "fats": 0.0,
  "fiber": 0.05,
  "sugar": 0.02,
  "caffeine": 0.0
}
Rules:
- food_type must be one of: Vegetarian, Non-Vegetarian, Vegan, Jain, Eggetarian
- conversion must be a valid positive number representing how many usage_units are in 1 buy_unit.
- nutritional values must be per 1 usage_unit.
- Output ONLY the JSON object.`
    : `For the menu item "${name}", provide categorization and food type mapping.
Return a JSON object matching this schema:
{
  "category": "Mains",
  "sub_category": "Pasta",
  "food_type": "Vegetarian"
}
Rules:
- food_type must be one of: Vegetarian, Non-Vegetarian, Vegan, Jain, Eggetarian
- Output ONLY the JSON object.`

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
          responseMimeType: 'application/json'
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`)
  }

  const data = await res.json()
  const txt  = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  
  // Clean potential markdown wrapper formatting (fallback safety)
  const cleanTxt = txt.replace(/```json\n?|```/g, '').trim()
  
  // Extract JSON block between first { and last } (fallback safety)
  const start = cleanTxt.indexOf('{')
  const end = cleanTxt.lastIndexOf('}')
  const jsonStr = (start !== -1 && end !== -1 && end > start) ? cleanTxt.substring(start, end + 1) : cleanTxt
  
  return JSON.parse(jsonStr)
}
