// Unused repairJson helper removed.

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

