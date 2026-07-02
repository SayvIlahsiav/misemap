import { useState, useEffect, useCallback } from 'react'
import { storage } from '../lib/storage.js'

export const useShared = (key, def, cafeId) => {
  const storageKey = cafeId ? `${key}:${cafeId}` : key

  // Load from localStorage synchronously so the state is immediately populated
  const [d, setD] = useState(() => {
    try {
      const local = localStorage.getItem(storageKey)
      return local ? JSON.parse(local) : def
    } catch (e) {
      return def
    }
  })
  const [ok, setOk] = useState(false)

  // Sync state with local storage or defaults when cafeId changes
  useEffect(() => {
    if (!cafeId) {
      setD(def)
      setOk(false)
      return
    }
    try {
      const local = localStorage.getItem(storageKey)
      if (local) {
        setD(JSON.parse(local))
      } else {
        setD(def)
      }
    } catch (e) {
      setD(def)
    }
    setOk(false)
  }, [key, cafeId, storageKey])

  // Asynchronously fetch latest data from Supabase to sync remote changes
  useEffect(() => {
    if (!cafeId) return
    let active = true
    ;(async () => {
      try {
        const raw = await storage.get(key, cafeId)
        if (active) {
          if (raw) {
            let parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              parsed = parsed.flat(5).filter(item => item && typeof item === 'object' && !Array.isArray(item))
            }
            setD(parsed)
            localStorage.setItem(storageKey, JSON.stringify(parsed))
          } else {
            setD(def)
          }
          setOk(true)
        }
      } catch (e) {
        console.warn('[useShared] Supabase load error, using local fallback:', key, e)
        if (active) setOk(true)
      }
    })()
    return () => { active = false }
  }, [key, cafeId, storageKey])

  // Save to both localStorage and Supabase
  const save = useCallback(async nd => {
    if (!cafeId) return
    setD(nd)
    const raw = JSON.stringify(nd)
    try {
      localStorage.setItem(storageKey, raw)
    } catch (e) {
      console.warn('[useShared] localStorage save error', key, e)
    }
    try {
      await storage.set(key, raw, cafeId)
    } catch (e) {
      console.warn('[useShared] Supabase save error', key, e)
    }
  }, [key, cafeId, storageKey])

  return [d, save, ok]
}
