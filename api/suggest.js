export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(455).json({ error: 'Method not allowed' });
  }

  const { name, type } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: 'Ingredient or item name is required' });
  }

  const isRM = type === 'raw';
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
- Output ONLY the JSON object.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
  }

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError = null;
  let responseData = null;
  let modelUsed = '';

  for (const model of models) {
    try {
      const apiResponse = await fetch(
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
      );

      if (apiResponse.ok) {
        responseData = await apiResponse.json();
        modelUsed = model;
        break;
      } else {
        const errJson = await apiResponse.json().catch(() => ({}));
        lastError = new Error(errJson?.error?.message || `Status ${apiResponse.status}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (!responseData) {
    return res.status(502).json({
      error: lastError?.message || 'All Gemini model queries failed.'
    });
  }

  const txt = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Clean potential markdown wrapper formatting (fallback safety)
  const cleanTxt = txt.replace(/```json\n?|```/g, '').trim();
  
  // Extract JSON block between first { and last } (fallback safety)
  const start = cleanTxt.indexOf('{');
  const end = cleanTxt.lastIndexOf('}');
  const jsonStr = (start !== -1 && end !== -1 && end > start) ? cleanTxt.substring(start, end + 1) : cleanTxt;
  
  try {
    const parsed = JSON.parse(jsonStr);
    return res.status(200).json(parsed);
  } catch (e) {
    try {
      const repaired = repairJson(jsonStr);
      const parsed = JSON.parse(repaired);
      return res.status(200).json(parsed);
    } catch (err) {
      return res.status(500).json({
        error: 'Failed to parse AI response as JSON',
        rawResponse: txt
      });
    }
  }
}

function repairJson(str) {
  str = str.trim();
  if (!str) return '{}';
  if (!str.startsWith('{')) return '{}';
  
  let openQuotes = false;
  let escaped = false;
  let repaired = '';
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"' && !escaped) {
      openQuotes = !openQuotes;
    }
    if (char === '\\' && openQuotes) {
      escaped = !escaped;
    } else {
      escaped = false;
    }
    repaired += char;
  }
  
  if (openQuotes) {
    repaired += '"';
  }
  
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let esc = false;
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (char === '"' && !esc) {
      inString = !inString;
    }
    if (char === '\\' && inString) {
      esc = !esc;
    } else {
      esc = false;
    }
    
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;
    }
  }
  
  if (!inString) {
    repaired = repaired.trim().replace(/,\s*$/, '');
  }
  
  while (bracketCount > 0) {
    repaired += ']';
    bracketCount--;
  }
  while (braceCount > 0) {
    repaired += '}';
    braceCount--;
  }
  
  return repaired;
}
