import { useState, useEffect, useCallback, useRef } from 'react'
import { storage } from '../lib/storage.js'

export const useShared = (key, def, orgId) => {
  const storageKey = orgId ? `${key}:${orgId}` : key
  const defRef = useRef(def)

  useEffect(() => {
    defRef.current = def
  }, [def])

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

  // Sync state with local storage or defaults when orgId changes
  useEffect(() => {
    if (!orgId) {
      setD(defRef.current)
      setOk(false)
      return
    }
    try {
      const local = localStorage.getItem(storageKey)
      if (local) {
        setD(JSON.parse(local))
      } else {
        setD(defRef.current)
      }
    } catch (e) {
      setD(defRef.current)
    }
    setOk(false)
  }, [key, orgId, storageKey])

  // Asynchronously fetch latest data from Supabase to sync remote changes
  useEffect(() => {
    if (!orgId) return
    let active = true
    ;(async () => {
      try {
        const raw = await storage.get(key, orgId)
        if (active) {
          if (raw) {
            let parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null && !Array.isArray(parsed[0])) {
                parsed = parsed.flat(5).filter(item => item && typeof item === 'object' && !Array.isArray(item))
              }
            }
            setD(parsed)
            localStorage.setItem(storageKey, JSON.stringify(parsed))
          } else {
            setD(defRef.current)
          }
          setOk(true)
        }
      } catch (e) {
        console.warn('[useShared] Supabase load error, using local fallback:', key, e)
        if (active) setOk(true)
      }
    })()
    return () => { active = false }
  }, [key, orgId, storageKey])

  // Save to both localStorage and Supabase
  const save = useCallback(async nd => {
    if (!orgId) return
    setD(prev => {
      const resolved = typeof nd === 'function' ? nd(prev) : nd
      const raw = JSON.stringify(resolved)
      
      // Save asynchronously without blocking the local state update
      try {
        localStorage.setItem(storageKey, raw)
      } catch (e) {
        console.warn('[useShared] localStorage save error', key, e)
      }
      
      storage.set(key, raw, orgId).catch(e => {
        console.warn('[useShared] Supabase save error', key, e)
      })
      
      return resolved
    })
  }, [key, orgId, storageKey])

  return [d, save, ok]
}
