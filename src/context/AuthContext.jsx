import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/storage.js'
import { useUI } from './UIContext.jsx'
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
  const [pendingInvitation, setPendingInvitation] = useState(null)
  const [invitedEmails, setInvitedEmails] = useState([])
  const [loading, setLoading] = useState(true)

  const { showToast } = useUI()

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
        setPendingInvitation(null)

        // Fetch invited emails list from kv_store
        const { data: inviteData } = await supabase
          .from('kv_store')
          .select('value')
          .eq('org_id', prof.org_id)
          .eq('key', 'invited_emails')
          .maybeSingle()
        if (inviteData?.value) {
          try {
            setInvitedEmails(JSON.parse(inviteData.value))
          } catch(e) {
            setInvitedEmails([])
          }
        } else {
          setInvitedEmails([])
        }
      } else {
        setOrg(null)
        setInvitedEmails([])

        // Check for active join request
        const { data: req, error: reqError } = await supabase
          .from('org_join_requests')
          .select('*, organizations(name)')
          .eq('user_id', u.id)
          .eq('status', 'pending')
          .maybeSingle()
        if (reqError) throw reqError
        setPendingRequest(req)

        // If not in an org, check for invitations matching user email
        const { data: invites, error: inviteError } = await supabase
          .from('kv_store')
          .select('org_id, value')
          .eq('key', 'invited_emails')

        if (!inviteError && invites) {
          const myInvite = invites.find(inv => {
            try {
              const emails = JSON.parse(inv.value)
              return Array.isArray(emails) && emails.includes(u.email.trim().toLowerCase())
            } catch(e) {
              return false
            }
          })

          if (myInvite) {
            const { data: o } = await supabase
              .from('organizations')
              .select('name')
              .eq('id', myInvite.org_id)
              .maybeSingle()
            setPendingInvitation({ org_id: myInvite.org_id, name: o?.name || 'an organization' })
          } else {
            setPendingInvitation(null)
          }
        } else {
          setPendingInvitation(null)
        }
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
          setPendingInvitation(null)
          setInvitedEmails([])
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
          setPendingInvitation(null)
          setInvitedEmails([])
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
      // Fire-and-forget to clear server session, but do not await network resolution
      supabase.auth.signOut().catch(err => console.warn('[AuthContext] async signOut error:', err))
    } catch (err) {
      console.warn('[AuthContext] Error during signOut:', err)
    } finally {
      setUser(null)
      setProfile(null)
      setOrg(null)
      setPendingRequest(null)
      setPendingInvitation(null)
      setInvitedEmails([])
      setLoading(false)
    }
  }

  const makeId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  const seedSampleData = async (orgId) => {
    try {
      const rms = parseCSV(sampleIngredientsCsv).map((row, idx) => ({
        id: `rm_${idx + 1}`,
        name: row.name || 'Unnamed Ingredient',
        category: row.category || 'Other',
        sub_category: row.sub_category || '',
        food_type: row.food_type || 'Vegetarian',
        buy_unit: row.buy_unit || 'kg',
        pack_cost: parseFloat(row.pack_cost) || 0,
        pack_qty: parseFloat(row.pack_qty) || 1,
        usage_unit: row.usage_unit || 'g',
        conversion: parseFloat(row.conversion) || 1000,
        calories: parseFloat(row.calories) || 0,
        carbs: parseFloat(row.carbs) || 0,
        protein: parseFloat(row.protein) || 0,
        fats: parseFloat(row.fats) || 0,
        fiber: parseFloat(row.fiber) || 0,
        sugar: parseFloat(row.sugar) || 0,
        caffeine: parseFloat(row.caffeine) || 0,
      }))

      const ints = parseCSV(sampleIntermediatesCsv).map((row, idx) => {
        let ings = []
        try {
          ings = JSON.parse(row.ingredients || '[]')
        } catch (e) {
          ings = []
        }
        return {
          id: `int_${idx + 1}`,
          name: row.name || 'Unnamed Intermediate',
          category: row.category || 'Other',
          yield_qty: parseFloat(row.yield_qty) || 1000,
          yield_unit: row.yield_unit || 'g',
          ingredients: ings
        }
      })

      const mis = parseCSV(sampleMenuItemsCsv).map((row, idx) => {
        let ings = []
        try {
          ings = JSON.parse(row.ingredients || '[]')
        } catch (e) {
          ings = []
        }
        return {
          id: `mi_${idx + 1}`,
          name: row.name || 'Unnamed Menu Item',
          category: row.category || 'Other',
          sub_category: row.sub_category || '',
          food_type: row.food_type || 'Vegetarian',
          dine_in_sp: parseFloat(row.dine_in_sp) || 0,
          takeaway_sp: parseFloat(row.takeaway_sp) || 0,
          delivery_sp: parseFloat(row.delivery_sp) || 0,
          ingredients: ings
        }
      })

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
      const orgId = makeId()
      const newOrg = { id: orgId, name, owner_id: user.id }
      const { error: err1 } = await supabase.from('organizations').insert(newOrg)
      if (err1) throw err1
      
      const { error: err2 } = await supabase.from('profiles').update({ org_id: orgId, role: 'owner' }).eq('id', user.id)
      if (err2) throw err2

      if (shouldSeed) {
        await seedSampleData(newOrg.id)
      }
      await refreshProfile()
    } catch (err) {
      showToast(err.message || 'Failed to create organization', 'error')
    } finally {
      setLoading(false)
    }
  }

  const joinOrg = async (orgId) => {
    if (!user) throw new Error('You must be signed in to join an organization.')
    setLoading(true)
    try {
      const { data: o, error: err1 } = await supabase.from('organizations').select('id').eq('id', orgId).single()
      if (err1 || !o) throw new Error('Organization ID not found.')
      const { error: err2 } = await supabase.from('org_join_requests').insert({ org_id: orgId, user_id: user.id, status: 'pending' })
      if (err2) throw err2
      await refreshProfile()
    } catch (err) {
      showToast(err.message || 'Failed to request joining organization', 'error')
    } finally {
      setLoading(false)
    }
  }

  const cancelJoinRequest = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { error } = await supabase.from('org_join_requests').delete().eq('user_id', user.id).eq('status', 'pending')
      if (error) throw error
      await refreshProfile()
    } catch (err) {
      showToast(err.message || 'Failed to cancel join request', 'error')
    } finally {
      setLoading(false)
    }
  }

  const inviteMember = async (email) => {
    if (!org?.id) throw new Error('No active organization connection.')
    if (profile?.role !== 'owner') throw new Error('Only the owner can invite members.')
    
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) throw new Error('Please enter a valid email.')
    
    const { data, error: getErr } = await supabase
      .from('kv_store')
      .select('value')
      .eq('org_id', org.id)
      .eq('key', 'invited_emails')
      .maybeSingle()
    
    if (getErr) throw getErr
    
    let emails = []
    if (data?.value) {
      try {
        emails = JSON.parse(data.value)
        if (!Array.isArray(emails)) emails = []
      } catch (e) {
        emails = []
      }
    }
    
    if (emails.includes(cleanEmail)) throw new Error('This email has already been invited.')
    
    const newEmails = [...emails, cleanEmail]
    
    const { error: setErr } = await supabase
      .from('kv_store')
      .upsert({ org_id: org.id, key: 'invited_emails', value: JSON.stringify(newEmails) }, { onConflict: 'org_id,key' })
      
    if (setErr) throw setErr
    setInvitedEmails(newEmails)
    showToast(`Invitation sent to ${cleanEmail}!`, 'success')
  }

  const revokeInvite = async (email) => {
    if (!org?.id) throw new Error('No active organization connection.')
    if (profile?.role !== 'owner') throw new Error('Only the owner can manage invitations.')
    
    const cleanEmail = email.trim().toLowerCase()
    const { data, error: getErr } = await supabase
      .from('kv_store')
      .select('value')
      .eq('org_id', org.id)
      .eq('key', 'invited_emails')
      .maybeSingle()
      
    if (getErr) throw getErr
    
    let emails = []
    if (data?.value) {
      try {
        emails = JSON.parse(data.value)
      } catch (e) {
        emails = []
      }
    }
    
    const newEmails = emails.filter(e => e !== cleanEmail)
    
    const { error: setErr } = await supabase
      .from('kv_store')
      .upsert({ org_id: org.id, key: 'invited_emails', value: JSON.stringify(newEmails) }, { onConflict: 'org_id,key' })
      
    if (setErr) throw setErr
    setInvitedEmails(newEmails)
    showToast(`Invitation revoked.`, 'info')
  }

  const acceptInvitation = async () => {
    if (!user || !pendingInvitation) return
    try {
      const orgId = pendingInvitation.org_id
      
      const { error: linkErr } = await supabase
        .from('profiles')
        .update({ org_id: orgId, role: 'member' })
        .eq('id', user.id)
        
      if (linkErr) throw linkErr
      
      const { data, error: getErr } = await supabase
        .from('kv_store')
        .select('value')
        .eq('org_id', orgId)
        .eq('key', 'invited_emails')
        .maybeSingle()
        
      if (!getErr && data?.value) {
        try {
          let emails = JSON.parse(data.value)
          emails = emails.filter(e => e !== user.email.trim().toLowerCase())
          await supabase
            .from('kv_store')
            .upsert({ org_id: orgId, key: 'invited_emails', value: JSON.stringify(emails) }, { onConflict: 'org_id,key' })
        } catch(e) {}
      }
      
      setPendingInvitation(null)
      await fetchProfile(user)
    } catch (err) {
      showToast(err.message || 'Failed to accept invitation', 'error')
      throw err
    }
  }

  const declineInvitation = async () => {
    if (!user || !pendingInvitation) return
    try {
      const orgId = pendingInvitation.org_id
      
      const { data, error: getErr } = await supabase
        .from('kv_store')
        .select('value')
        .eq('org_id', orgId)
        .eq('key', 'invited_emails')
        .maybeSingle()
        
      if (!getErr && data?.value) {
        try {
          let emails = JSON.parse(data.value)
          emails = emails.filter(e => e !== user.email.trim().toLowerCase())
          await supabase
            .from('kv_store')
            .upsert({ org_id: orgId, key: 'invited_emails', value: JSON.stringify(emails) }, { onConflict: 'org_id,key' })
        } catch(e) {}
      }
      
      setPendingInvitation(null)
      await fetchProfile(user)
    } catch (err) {
      showToast(err.message || 'Failed to decline invitation', 'error')
      throw err
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
      await fetchProfile(user)
    }
  }

  return (
    <AuthContext.Provider value={{
      user, profile, org, pendingRequest, pendingInvitation, invitedEmails, loading,
      signIn, signUp, signInWithGoogle, signOut,
      createOrg, joinOrg, cancelJoinRequest, renameOrg, refreshProfile, seedSampleData,
      inviteMember, revokeInvite, acceptInvitation, declineInvitation
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
