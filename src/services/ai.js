function repairJson(str) {
  str = str.trim()
  if (!str) return '{}'
  if (!str.startsWith('{')) return '{}'
  
  let openQuotes = false
  let escaped = false
  let repaired = ''
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if (char === '"' && !escaped) {
      openQuotes = !openQuotes
    }
    if (char === '\\' && openQuotes) {
      escaped = !escaped
    } else {
      escaped = false
    }
    repaired += char
  }
  
  if (openQuotes) {
    repaired += '"'
  }
  
  let braceCount = 0
  let bracketCount = 0
  let inString = false
  let esc = false
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i]
    if (char === '"' && !esc) {
      inString = !inString
    }
    if (char === '\\' && inString) {
      esc = !esc
    } else {
      esc = false
    }
    
    if (!inString) {
      if (char === '{') braceCount++
      if (char === '}') braceCount--
      if (char === '[') bracketCount++
      if (char === ']') bracketCount--
    }
  }
  
  // Clean trailing commas in uncompleted JSON structures
  if (!inString) {
    repaired = repaired.trim().replace(/,\s*$/, '')
  }
  
  while (bracketCount > 0) {
    repaired += ']'
    bracketCount--
  }
  while (braceCount > 0) {
    repaired += '}'
    braceCount--
  }
  
  return repaired
}

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
  const models = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
  let lastError = null
  let data = null
  let modelUsed = ''

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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

      if (res.ok) {
        data = await res.json()
        modelUsed = model
        break
      } else {
        const errJson = await res.json().catch(() => ({}))
        lastError = new Error(errJson?.error?.message || `Status ${res.status}`)
      }
    } catch (err) {
      lastError = err
    }
  }

  if (!data) {
    throw lastError || new Error('All Gemini model queries failed.')
  }

  console.log('[aiSuggest] Selected model:', modelUsed)

  const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  console.log('[aiSuggest] Raw AI response text:', txt)
  
  // Clean potential markdown wrapper formatting (fallback safety)
  const cleanTxt = txt.replace(/```json\n?|```/g, '').trim()
  
  // Extract JSON block between first { and last } (fallback safety)
  const start = cleanTxt.indexOf('{')
  const end = cleanTxt.lastIndexOf('}')
  const jsonStr = (start !== -1 && end !== -1 && end > start) ? cleanTxt.substring(start, end + 1) : cleanTxt
  
  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    try {
      // Fallback: try to repair the truncated JSON string
      const repaired = repairJson(jsonStr)
      console.log('[aiSuggest] Repaired JSON text:', repaired)
      return JSON.parse(repaired)
    } catch (err) {
      console.error('[aiSuggest] parse and repair failed. Raw response:', txt)
      throw new Error(`${e.message} (Raw Response: "${txt.length > 80 ? txt.substring(0, 80) + '...' : txt}")`)
    }
  }
}
