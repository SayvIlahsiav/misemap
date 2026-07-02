import { useState, useEffect, useCallback } from 'react'
import { storage } from '../lib/storage.js'

export const useShared = (key, def) => {
  // Load from localStorage synchronously so the state is immediately populated
  const [d, setD] = useState(() => {
    try {
      const local = localStorage.getItem(key)
      return local ? JSON.parse(local) : def
    } catch (e) {
      return def
    }
  })
  const [ok, setOk] = useState(false)

  // Asynchronously fetch latest data from Supabase to sync remote changes
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const raw = await storage.get(key)
        if (raw && active) {
          let parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            parsed = parsed.flat(5).filter(item => item && typeof item === 'object' && !Array.isArray(item))
          }
          setD(parsed)
          localStorage.setItem(key, JSON.stringify(parsed))
        }
      } catch (e) {
        console.warn('[useShared] Supabase load error, using local fallback:', key, e)
      }
      if (active) setOk(true)
    })()
    return () => { active = false }
  }, [key])

  // Save to both localStorage and Supabase
  const save = useCallback(async nd => {
    setD(nd)
    const raw = JSON.stringify(nd)
    try {
      localStorage.setItem(key, raw)
    } catch (e) {
      console.warn('[useShared] localStorage save error', key, e)
    }
    try {
      await storage.set(key, raw)
    } catch (e) {
      console.warn('[useShared] Supabase save error', key, e)
    }
  }, [key])

  return [d, save, ok]
}
