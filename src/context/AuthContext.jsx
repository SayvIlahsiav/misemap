import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/storage.js'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [cafe, setCafe] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (u) => {
    setUser(u)
    try {
      // 1. Fetch user profile
      let { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .maybeSingle()

      if (profError) throw profError

      // 2. If profile doesn't exist, create one (fallback/self-healing)
      if (!prof) {
        const { data: newProf, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: u.id, role: 'member' })
          .select()
          .single()
        if (insertError) throw insertError
        prof = newProf
      }

      setProfile(prof)

      // 3. Fetch cafe if associated
      if (prof.cafe_id) {
        const { data: c, error: cafeError } = await supabase
          .from('cafes')
          .select('*')
          .eq('id', prof.cafe_id)
          .maybeSingle()
        if (cafeError) throw cafeError
        setCafe(c)
      } else {
        setCafe(null)
      }
    } catch (err) {
      console.error('[AuthContext] Error fetching profile/cafe details:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session && active) {
          await fetchProfile(session.user)
        } else if (active) {
          setUser(null)
          setProfile(null)
          setCafe(null)
          setLoading(false)
        }
      } catch (err) {
        console.error('[AuthContext] Error getting session:', err)
        if (active) setLoading(false)
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!active) return
        if (session) {
          await fetchProfile(session.user)
        } else {
          setUser(null)
          setProfile(null)
          setCafe(null)
          setLoading(false)
        }
      })

      return () => {
        subscription?.unsubscribe()
      }
    }

    initSession()

    return () => {
      active = false
    }
  }, [])

  const signIn = async (email, password) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
      throw error
    }
    return data
  }

  const signUp = async (email, password) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setLoading(false)
      throw error
    }
    if (!data.session) {
      setLoading(false)
    }
    return data
  }

  const signOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setCafe(null)
    setLoading(false)
  }

  const createCafe = async (name) => {
    if (!user) throw new Error('You must be signed in to create a cafe.')
    setLoading(true)
    try {
      const { data: newCafe, error: cafeError } = await supabase
        .from('cafes')
        .insert({ name })
        .select()
        .single()
      if (cafeError) throw cafeError

      const { data: newProf, error: profError } = await supabase
        .from('profiles')
        .update({ cafe_id: newCafe.id, role: 'owner' })
        .eq('id', user.id)
        .select()
        .single()
      if (profError) throw profError

      setProfile(newProf)
      setCafe(newCafe)
      return newCafe
    } catch (err) {
      console.error('[AuthContext] Error creating cafe:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const joinCafe = async (cafeId) => {
    if (!user) throw new Error('You must be signed in to join a cafe.')
    setLoading(true)
    try {
      const { data: targetCafe, error: cafeError } = await supabase
        .from('cafes')
        .select('*')
        .eq('id', cafeId)
        .maybeSingle()
      
      if (cafeError) throw cafeError
      if (!targetCafe) throw new Error('Cafe not found. Please verify the Cafe ID.')

      const { data: newProf, error: profError } = await supabase
        .from('profiles')
        .update({ cafe_id: targetCafe.id, role: 'member' })
        .eq('id', user.id)
        .select()
        .single()
      if (profError) throw profError

      setProfile(newProf)
      setCafe(targetCafe)
      return targetCafe
    } catch (err) {
      console.error('[AuthContext] Error joining cafe:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const renameCafe = async (newName) => {
    if (!cafe?.id) throw new Error('No active cafe connection.')
    if (profile?.role !== 'owner') throw new Error('Only the owner can rename the cafe.')
    try {
      const { data: updatedCafe, error } = await supabase
        .from('cafes')
        .update({ name: newName })
        .eq('id', cafe.id)
        .select()
        .single()
      if (error) throw error
      setCafe(updatedCafe)
      return updatedCafe
    } catch (err) {
      console.error('[AuthContext] Error renaming cafe:', err)
      throw err
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, cafe, loading, signIn, signUp, signOut, createCafe, joinCafe, renameCafe }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
