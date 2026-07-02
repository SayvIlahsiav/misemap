import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/storage.js'
import sampleIngredientsCsv from '../../sample_ingredients.csv?raw'
import sampleIntermediatesCsv from '../../sample_intermediates.csv?raw'
import sampleMenuItemsCsv from '../../sample_menuitems.csv?raw'

const AuthContext = createContext(null)

const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length <= 1) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"\r]/g, ''))
  
  return lines.slice(1).map(line => {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    
    const row = {}
    headers.forEach((header, index) => {
      let val = result[index] || ''
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1)
      }
      row[header] = val
    })
    return row
  })
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [org, setOrg] = useState(null)
  const [pendingRequest, setPendingRequest] = useState(null)
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

      // 2. Fallback creation of profile
      if (!prof) {
        const { data: newProf, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: u.id, email: u.email, role: 'member' })
          .select()
          .single()
        if (insertError) throw insertError
        prof = newProf
      }

      setProfile(prof)

      // 3. Fetch org if associated
      if (prof.org_id) {
        const { data: o, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', prof.org_id)
          .maybeSingle()
        if (orgError) throw orgError
        setOrg(o)
        setPendingRequest(null)
      } else {
        setOrg(null)
        // If not in an org, check for a pending join request
        const { data: req, error: reqError } = await supabase
          .from('org_join_requests')
          .select('*, organizations(name)')
          .eq('user_id', u.id)
          .eq('status', 'pending')
          .maybeSingle()
        if (reqError) throw reqError
        setPendingRequest(req)
      }
    } catch (err) {
      console.error('[AuthContext] Error fetching profile/org/requests:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    let subscription = null

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!active) return
        if (session) {
          await fetchProfile(session.user)
        } else {
          setUser(null)
          setProfile(null)
          setOrg(null)
          setPendingRequest(null)
          setLoading(false)
        }
      } catch (err) {
        console.error('[AuthContext] Error getting session:', err)
        if (active) setLoading(false)
      }

      if (!active) return

      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!active) return
        if (session) {
          await fetchProfile(session.user)
        } else {
          setUser(null)
          setProfile(null)
          setOrg(null)
          setPendingRequest(null)
          setLoading(false)
        }
      })
      subscription = data.subscription
    }

    initSession()

    return () => {
      active = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const signIn = async (email, password) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setLoading(false)
      throw error
    }
    return data
  }

  const signUp = async (email, password) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
    if (error) {
      setLoading(false)
      throw error
    }
    if (!data.session) {
      setLoading(false)
    }
    return data
  }

  const signInWithGoogle = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) {
      setLoading(false)
      throw error
    }
    return data
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('[AuthContext] Error during signOut:', err)
    } finally {
      setUser(null)
      setProfile(null)
      setOrg(null)
      setPendingRequest(null)
      setLoading(false)
    }
  }

  const seedSampleData = async (orgId) => {
    try {
      // 1. Parse CSV Files
      const rawIngredients = parseCSV(sampleIngredientsCsv)
      const rawIntermediates = parseCSV(sampleIntermediatesCsv)
      const rawMenuItems = parseCSV(sampleMenuItemsCsv)

      // Helper to generate a unique item ID
      const makeId = () => `id${Date.now()}${Math.random().toString(36).slice(2, 7)}`

      // 2. Map & Save Raw Materials (mm_rm)
      const rms = rawIngredients.map((row) => ({
        id: makeId(),
        name: row.name,
        category: row.category || 'General',
        sub_category: row.sub_category || '',
        food_type: row.food_type || 'Vegetarian',
        buy_unit: row.buy_unit || 'kg',
        pack_cost: parseFloat(row.pack_cost) || 0,
        pack_qty: parseFloat(row.pack_qty) || 1,
        usage_unit: row.usage_unit || 'g',
        conversion: parseFloat(row.conversion) || 1,
        calories: parseFloat(row.calories) || 0,
        carbs: parseFloat(row.carbs) || 0,
        protein: parseFloat(row.protein) || 0,
        fats: parseFloat(row.fats) || 0,
        fiber: parseFloat(row.fiber) || 0,
        sugar: parseFloat(row.sugar) || 0,
        caffeine: parseFloat(row.caffeine) || 0
      }))

      // 3. Map & Save Intermediates (mm_int)
      const intermediatesGrouped = {}
      rawIntermediates.forEach(row => {
        if (!row.recipe_name) return
        if (!intermediatesGrouped[row.recipe_name]) {
          intermediatesGrouped[row.recipe_name] = []
        }
        intermediatesGrouped[row.recipe_name].push(row)
      })

      const ints = Object.keys(intermediatesGrouped).map(recipeName => {
        const rows = intermediatesGrouped[recipeName]
        const ingredients = rows.map(r => {
          const matchedRm = rms.find(rm => rm.name.toLowerCase() === r.ingredient_name.toLowerCase())
          return {
            id: matchedRm ? matchedRm.id : makeId(),
            qty: parseFloat(r.ingredient_qty) || 0,
            unit: r.ingredient_unit || 'g'
          }
        })
        return {
          id: makeId(),
          name: recipeName,
          category: rows[0].category || 'General',
          yield_qty: parseFloat(rows[0].yield_qty) || 1,
          yield_unit: rows[0].yield_unit || 'g',
          ingredients
        }
      })

      // 4. Map & Save Menu Items (mm_mi)
      const menuItemsGrouped = {}
      rawMenuItems.forEach(row => {
        if (!row.item_name) return
        if (!menuItemsGrouped[row.item_name]) {
          menuItemsGrouped[row.item_name] = []
        }
        menuItemsGrouped[row.item_name].push(row)
      })

      const mis = Object.keys(menuItemsGrouped).map(itemName => {
        const rows = menuItemsGrouped[itemName]
        const ingredients = rows.map(r => {
          // Check raw materials first, then intermediates
          const matchedRm = rms.find(rm => rm.name.toLowerCase() === r.ingredient_name.toLowerCase())
          const matchedInt = ints.find(i => i.name.toLowerCase() === r.ingredient_name.toLowerCase())
          return {
            id: matchedRm ? matchedRm.id : (matchedInt ? matchedInt.id : makeId()),
            qty: parseFloat(r.ingredient_qty) || 0,
            unit: r.ingredient_unit || 'g'
          }
        })
        return {
          id: makeId(),
          name: itemName,
          category: rows[0].category || 'General',
          sub_category: rows[0].sub_category || '',
          food_type: rows[0].food_type || 'Vegetarian',
          ingredients,
          sp_multiplier_override: rows[0].sp_multiplier_override ? parseFloat(rows[0].sp_multiplier_override) : null,
          packaging_cost_override: rows[0].packaging_cost_override ? parseFloat(rows[0].packaging_cost_override) : null,
          delivery_markup_override: rows[0].delivery_markup_override ? parseFloat(rows[0].delivery_markup_override) : null
        }
      })

      // Write parsed templates to Supabase for the new org
      const { error: errorRm } = await supabase.from('kv_store').upsert({ org_id: orgId, key: 'mm_rm', value: JSON.stringify(rms) }, { onConflict: 'org_id,key' })
      if (errorRm) throw errorRm

      const { error: errorInt } = await supabase.from('kv_store').upsert({ org_id: orgId, key: 'mm_int', value: JSON.stringify(ints) }, { onConflict: 'org_id,key' })
      if (errorInt) throw errorInt

      const { error: errorMi } = await supabase.from('kv_store').upsert({ org_id: orgId, key: 'mm_mi', value: JSON.stringify(mis) }, { onConflict: 'org_id,key' })
      if (errorMi) throw errorMi

    } catch (err) {
      console.error('[AuthContext] Error seeding sample database:', err)
      throw new Error('Failed to seed sample kitchen data: ' + err.message)
    }
  }

  const createOrg = async (name, shouldSeed = false) => {
    if (!user) throw new Error('You must be signed in to create an organization.')
    setLoading(true)
    try {
      // 1. Create org
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({ name })
        .select()
        .single()
      if (orgError) throw orgError

      // 2. Set current user as Owner
      const { data: newProf, error: profError } = await supabase
        .from('profiles')
        .update({ org_id: newOrg.id, role: 'owner' })
        .eq('id', user.id)
        .select()
        .single()
      if (profError) throw profError

      // 3. Optionally seed demo data
      if (shouldSeed) {
        await seedSampleData(newOrg.id)
      }

      setProfile(newProf)
      setOrg(newOrg)
      return newOrg
    } catch (err) {
      console.error('[AuthContext] Error creating organization:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const joinOrg = async (orgId) => {
    if (!user) throw new Error('You must be signed in to request joining.')
    setLoading(true)
    try {
      // 1. Verify organization exists
      const { data: targetOrg, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .maybeSingle()
      
      if (orgError) throw orgError
      if (!targetOrg) throw new Error('Organization not found. Please verify the ID.')

      // 2. Create pending join request
      const { data: req, error: reqError } = await supabase
        .from('org_join_requests')
        .upsert({ org_id: targetOrg.id, user_id: user.id, status: 'pending' })
        .select('*, organizations(name)')
        .single()
      if (reqError) throw reqError

      setPendingRequest(req)
      return req
    } catch (err) {
      console.error('[AuthContext] Error submitting join request:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const cancelJoinRequest = async () => {
    if (!user || !pendingRequest) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('org_join_requests')
        .delete()
        .eq('id', pendingRequest.id)
      if (error) throw error
      setPendingRequest(null)
    } catch (err) {
      console.error('[AuthContext] Error cancelling request:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const renameOrg = async (newName) => {
    if (!org?.id) throw new Error('No active organization connection.')
    if (profile?.role !== 'owner') throw new Error('Only the owner can rename the organization.')
    try {
      const { data: updatedOrg, error } = await supabase
        .from('organizations')
        .update({ name: newName })
        .eq('id', org.id)
        .select()
        .single()
      if (error) throw error
      setOrg(updatedOrg)
      return updatedOrg
    } catch (err) {
      console.error('[AuthContext] Error renaming organization:', err)
      throw err
    }
  }

  const refreshProfile = async () => {
    if (user) {
      setLoading(true)
      await fetchProfile(user)
    }
  }

  return (
    <AuthContext.Provider value={{
      user, profile, org, pendingRequest, loading,
      signIn, signUp, signInWithGoogle, signOut,
      createOrg, joinOrg, cancelJoinRequest, renameOrg, refreshProfile
    }}>
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
