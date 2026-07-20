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
  const res = await fetch('/api/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type })
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData?.error || `Status ${res.status}`)
  }

  return await res.json()
}

