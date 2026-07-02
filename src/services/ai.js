export const aiSuggest = async (name, type) => {
  const isRM = type === 'raw'
  const prompt = isRM
    ? `You are a food industry expert. For the ingredient "${name}", provide accurate realistic data.
Respond ONLY with valid JSON, no markdown, no extra text:
{"category":"","sub_category":"","food_type":"Vegetarian","buy_unit":"kg","usage_unit":"g","conversion":1000,"calories":0.0,"carbs":0.0,"protein":0.0,"fats":0.0,"fiber":0.0,"sugar":0.0,"caffeine":0.0}
Rules: food_type must be one of [Vegetarian, Non-Vegetarian, Vegan, Jain, Eggetarian]. conversion = how many usage_units per 1 buy_unit. All nutrition values per 1 usage_unit.`
    : `For the menu item "${name}", respond ONLY with valid JSON, no markdown:
{"category":"","sub_category":"","food_type":"Vegetarian"}
food_type must be one of [Vegetarian, Non-Vegetarian, Vegan, Jain, Eggetarian]. Use realistic restaurant categories.`

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`)
  }

  const data = await res.json()
  const txt  = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return JSON.parse(txt.replace(/```json\n?|```/g, '').trim())
}
