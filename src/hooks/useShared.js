import { useState, useEffect, useCallback } from 'react'
import { storage } from '../lib/storage.js'

export const useShared = (key, def) => {
  const [d, setD]   = useState(def)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const raw = await storage.get(key)
        if (raw) setD(JSON.parse(raw))
      } catch (e) {
        console.warn('[useShared] load error', key, e)
      }
      setOk(true)
    })()
  }, [key])

  const save = useCallback(async nd => {
    setD(nd)
    try { await storage.set(key, JSON.stringify(nd)) }
    catch (e) { console.warn('[useShared] save error', key, e) }
  }, [key])

  return [d, save, ok]
}
