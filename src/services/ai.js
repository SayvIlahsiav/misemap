export const aiSuggest = async (name, type) => {
  const isRM = type === 'raw'
  const prompt = isRM
    ? `For the ingredient "${name}", provide accurate realistic costing and nutritional data.
Return a JSON object matching this schema:
{
  "category": "string (e.g. Vegetables, Dairy, Meat, Pantry)",
  "sub_category": "string (e.g. Fresh Vegetables, Milk & Cream, Poultry)",
  "food_type": "Vegetarian" | "Non-Vegetarian" | "Vegan" | "Jain" | "Eggetarian",
  "buy_unit": "string (e.g. kg, L, pack, box)",
  "usage_unit": "string (e.g. g, ml, piece)",
  "conversion": number (how many usage_units per 1 buy_unit, e.g. 1000 for kg to g, 1000 for L to ml, 1 for pack to piece),
  "calories": number (calories per 1 usage_unit),
  "carbs": number (grams of carbohydrates per 1 usage_unit),
  "protein": number (grams of protein per 1 usage_unit),
  "fats": number (grams of fats per 1 usage_unit),
  "fiber": number (grams of fiber per 1 usage_unit),
  "sugar": number (grams of sugar per 1 usage_unit),
  "caffeine": number (milligrams of caffeine per 1 usage_unit)
}
Rules:
- conversion must be a valid positive number.
- nutritional values must be per 1 usage_unit (e.g. per 1 gram or 1 milliliter).
- Output ONLY the JSON object.`
    : `For the menu item "${name}", provide categorization and food type mapping.
Return a JSON object matching this schema:
{
  "category": "string (e.g. Mains, Beverages, Starters, Desserts)",
  "sub_category": "string (e.g. Pasta, Smoothies, Indian Breads)",
  "food_type": "Vegetarian" | "Non-Vegetarian" | "Vegan" | "Jain" | "Eggetarian"
}
Rules:
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
