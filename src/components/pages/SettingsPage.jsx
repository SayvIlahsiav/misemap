import { useState, useMemo, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/storage.js'
import { Btn, Inp, Label, InfoBox } from '../UIPrimitives.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useUI } from '../../context/UIContext.jsx'
import { CascadeModal } from '../modals.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'

const CategoryList = ({items, setItems, type, customCats, setCustomCats, logType, logEvent, isSub}) => {
  const { showToast, confirm } = useUI()
  const [editingCat, setEditingCat] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [newCatVal, setNewCatVal] = useState('')

  const catCounts = useMemo(() => {
    const counts = {}
    const customList = customCats?.[type] || []
    customList.forEach(c => {
      counts[c] = 0
    })

    items.forEach(it => {
      const c = (isSub ? it.sub_category : it.category) || 'Uncategorized'
      counts[c] = (counts[c] || 0) + 1
    })
    return Object.entries(counts).sort((a,b) => a[0].localeCompare(b[0]))
  }, [items, customCats, type, isSub])

  const handleAddNewCat = () => {
    const cleaned = newCatVal.trim()
    if (!cleaned) return

    setCustomCats(prev => {
      const currentList = prev?.[type] || []
      if (currentList.includes(cleaned)) return prev
      return { ...prev, [type]: [...currentList, cleaned].sort() }
    })
    setNewCatVal('')
    showToast(`Added custom ${isSub ? 'sub-category' : 'category'} "${cleaned}"`, 'success')
  }

  const handleRename = (oldName, newName) => {
    if (!newName.trim() || oldName === newName) {
      setEditingCat(null)
      return
    }
    const cleanNew = newName.trim()

    const updated = items.map(it => {
      const currentCat = (isSub ? it.sub_category : it.category) || 'Uncategorized'
      if (currentCat === oldName) {
        return { ...it, [isSub ? 'sub_category' : 'category']: cleanNew }
      }
      return it
    })
    setItems(updated)

    setCustomCats(prev => {
      const currentList = prev?.[type] || []
      const updatedList = currentList.map(c => c === oldName ? cleanNew : c)
      if (!updatedList.includes(cleanNew) && cleanNew !== 'Uncategorized') {
        updatedList.push(cleanNew)
      }
      const filteredList = updatedList.filter(c => c !== oldName)
      return { ...prev, [type]: [...new Set(filteredList)].sort() }
    })

    setEditingCat(null)
    showToast(`Renamed to "${cleanNew}"`, 'success')
    if (logEvent) {
      logEvent('Updated', `${logType} Category`, oldName, `Renamed category to "${cleanNew}"`)
    }
  }

  const handleDelete = async (catName) => {
    if (catName === 'Uncategorized') return
    if (await confirm(`Delete category "${catName}"?`, `This will reset the category for all associated items.`)) {
      const updated = items.map(it => {
        const currentCat = (isSub ? it.sub_category : it.category) || 'Uncategorized'
        if (currentCat === catName) {
          return { ...it, [isSub ? 'sub_category' : 'category']: '' }
        }
        return it
      })
      setItems(updated)

      setCustomCats(prev => {
        const currentList = prev?.[type] || []
        const filteredList = currentList.filter(c => c !== catName)
        return { ...prev, [type]: filteredList }
      })

      showToast(`Deleted category "${catName}"`, 'warning')
      if (logEvent) {
        logEvent('Deleted', `${logType} Category`, catName, `Cleared category for all matching items`)
      }
    }
  }

  return (
    <div style={{display:'flex', flexDirection:'column', gap:10}}>
      <div style={{display:'flex', gap:6, marginBottom: 8}}>
        <input
          type="text"
          value={newCatVal}
          onChange={e => setNewCatVal(e.target.value)}
          placeholder={isSub ? "Add sub-category..." : "Add category..."}
          className="custom-input"
          style={{
            flex: 1,
            border: '1px solid var(--border-strong)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            outline: 'none',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
          }}
        />
        <button
          onClick={handleAddNewCat}
          style={{
            background: 'var(--primary)',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Add
        </button>
      </div>
      {catCounts.map(([cat, count]) => (
        <div key={cat} style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, fontSize:13, background:'var(--bg-hover)', padding:'8px 12px', borderRadius:8, border:'1px solid var(--border-color)'}}>
          {editingCat === cat ? (
            <div style={{display:'flex', gap:6, flex:1}}>
              <input type="text" value={editVal} onChange={e => setEditVal(e.target.value)}
                className="custom-input"
                style={{flex:1, border:'1px solid var(--border-strong)', borderRadius:6, padding:'4px 6px', fontSize:12, outline:'none', background:'var(--bg-card)', color:'var(--text-primary)'}}/>
              <button onClick={() => handleRename(cat, editVal)} style={{background:'var(--primary)', border:'none', borderRadius:6, padding:'4px 8px', color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer'}}>Save</button>
              <button onClick={() => setEditingCat(null)} style={{background:'var(--bg-hover)', border:'1px solid var(--border-color)', borderRadius:6, padding:'4px 8px', color:'var(--text-secondary)', fontSize:11, fontWeight:600, cursor:'pointer'}}>Cancel</button>
            </div>
          ) : (
            <>
              <div style={{display:'flex', flexDirection:'column'}}>
                <span style={{fontWeight:600, color:'var(--text-primary)'}}>{cat}</span>
                <span style={{fontSize:11, color:'var(--text-light)'}}>{count} {count === 1 ? 'item' : 'items'}</span>
              </div>
              {cat !== 'Uncategorized' && (
                <div style={{display:'flex', gap:6}}>
                  <button onClick={() => { setEditingCat(cat); setEditVal(cat); }} style={{background:'transparent', border:'none', color:'var(--text-light)', cursor:'pointer', fontSize:11, fontWeight:600}} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-light)'}>Rename</button>
                  <button onClick={() => handleDelete(cat)} style={{background:'transparent', border:'none', color:'var(--text-light)', cursor:'pointer', fontSize:11, fontWeight:600}} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-light)'}>Delete</button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  )
}

const Card = ({title,children}) => (
  <div className="glass-panel" style={{borderRadius:16,overflow:'hidden',marginBottom:20}}>
    <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border-color)',fontSize:13,fontWeight:700,color:'var(--text-secondary)'}}>{title}</div>
    <div style={{padding:'16px 20px'}}>{children}</div>
  </div>
)

export const SettingsPage = ({pc, setPc, mis, rms, ints, profile, org, setRms, setInts, setMis, seedSampleData, invitedEmails = [], inviteMember, revokeInvite, activityLog, logEvent, customCats, setCustomCats}) => {
  const { updateOrg, refreshProfile } = useAuth()
  const { confirm, showToast } = useUI()
  const [draft, setDraft]     = useState(()=>JSON.parse(JSON.stringify(pc)))
  const [cascade, setCascade] = useState(null)
  const [flash, setFlash]     = useState(false)
  const isMobile              = useIsMobile()
  const [resetting, setResetting] = useState(false)

  const [orgName, setOrgName] = useState(org?.name || '')
  const [logoUrl, setLogoUrl] = useState(org?.logo_url || '')
  const [savingOrg, setSavingOrg] = useState(false)
  const [copied, setCopied] = useState(false)
  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)

  // Username states
  const [username, setUsername] = useState(profile?.username || '')
  const [savingUsername, setSavingUsername] = useState(false)

  // Tab State
  const [settingsTab, setSettingsTab] = useState('preferences')

  const allowSettingsEdit = profile?.role === 'owner' || pc?.permissions?.allow_override_settings !== false

  const loadRequests = useCallback(async () => {
    if (profile?.role !== 'owner' || !org?.id) return
    setRequestsLoading(true)
    try {
      const { data, error } = await supabase
        .from('org_join_requests')
        .select('*, profiles(email)')
        .eq('org_id', org.id)
        .eq('status', 'pending')
      if (error) throw error
      setRequests(data || [])
    } catch (e) {
      console.error('[Settings] Error fetching join requests:', e)
    } finally {
      setRequestsLoading(false)
    }
  }, [org?.id, profile?.role])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleUpdateOrg = async () => {
    setSavingOrg(true)
    try {
      await updateOrg(orgName, logoUrl)
      showToast('Organization profile updated successfully!', 'success')
      if (logEvent) {
        const changes = []
        if (orgName !== org?.name) changes.push(`name to "${orgName}"`)
        if (logoUrl !== org?.logo_url) changes.push(`logo`)
        const details = changes.length > 0 ? `Updated organization ${changes.join(' and ')}` : `Updated organization profile`
        logEvent('Updated', 'Organization', orgName, details)
      }
    } catch (e) {
      showToast(e.message || 'Failed to update organization profile', 'error')
    } finally {
      setSavingOrg(false)
    }
  }

  const handleCopyId = () => {
    if (!org?.id) return
    navigator.clipboard.writeText(org.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveUsername = async () => {
    const trimmed = username.trim().toLowerCase()
    if (trimmed !== '' && (trimmed.length < 3 || trimmed.length > 20)) {
      showToast('Username must be between 3 and 20 characters.', 'warning')
      return
    }
    if (trimmed !== '' && !/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      showToast('Username can only contain letters, numbers, and underscores.', 'warning')
      return
    }
    
    setSavingUsername(true)
    try {
      if (trimmed !== '') {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', trimmed)
          .maybeSingle()
        if (error) throw error
        if (data && data.id !== profile.id) {
          showToast('Username is already taken. Please choose another.', 'warning')
          setSavingUsername(false)
          return
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ username: trimmed === '' ? null : trimmed })
        .eq('id', profile.id)
      if (error) throw error
      
      showToast('Username updated successfully!', 'success')
      await refreshProfile()
    } catch (err) {
      showToast(err.message || 'Failed to update username.', 'error')
    } finally {
      setSavingUsername(false)
    }
  }

  const handleRequestAction = async (requestId, status) => {
    try {
      const targetReq = requests.find(r => r.id === requestId)
      const targetEmail = targetReq?.profiles?.email || 'member'
      if (status === 'approved') {
        const { error } = await supabase
          .from('org_join_requests')
          .update({ status: 'approved' })
          .eq('id', requestId)
        if (error) throw error
        showToast('Request approved! The member is now linked to your organization.', 'success')
        if (logEvent) {
          logEvent('Approved', 'Membership Request', targetEmail, `Approved request to join organization`)
        }
      } else {
        const { error } = await supabase
          .from('org_join_requests')
          .delete()
          .eq('id', requestId)
        if (error) throw error
        showToast('Request rejected.', 'warning')
        if (logEvent) {
          logEvent('Rejected', 'Membership Request', targetEmail, `Rejected request to join organization`)
        }
      }
      loadRequests()
    } catch (e) {
      showToast(e.message || 'Failed to handle request action.', 'error')
    }
  }

  const handleTogglePermission = (key) => {
    const nd = {
      ...pc,
      permissions: {
        ...pc.permissions,
        [key]: !pc.permissions?.[key]
      }
    }
    setPc(nd)
    setDraft(JSON.parse(JSON.stringify(nd)))
    showToast('Permissions updated successfully!', 'success')
    if (logEvent) {
      logEvent('Updated', 'Permissions', key, `Set permission '${key}' to ${nd.permissions[key]}`)
    }
  }

  const updG   = (k,v) => setDraft(d=>({...d,global:{...d.global,[k]:parseFloat(v)||0}}))
  const updCat = (cat,k,v) => setDraft(d=>{
    const co={...d.category_overrides}
    if(!co[cat])co[cat]={}
    if(v===''||v===null){delete co[cat][k];if(!Object.keys(co[cat]).length)delete co[cat]}
    else co[cat][k]=parseFloat(v)
    return{...d,category_overrides:co}
  })
  const updItem= (id,k,v) => setDraft(d=>{
    const io={...d.item_overrides}
    if(!io[id])io[id]={}
    if(v===''||v===null){delete io[id][k];if(!Object.keys(io[id]).length)delete io[id]}
    else io[id][k]=parseFloat(v)
    return{...d,item_overrides:io}
  })

  const FIELDS = [
    {k:'sp_multiplier',l:'SP Multiplier',u:'×',step:'0.1'},
    {k:'packaging_cost',l:'Packaging Cost',u:'₹',step:'1'},
    {k:'delivery_markup',l:'Delivery Markup',u:'%',step:'1'},
  ]
  const cats = [...new Set(mis.map(m=>m.category).filter(Boolean))].sort()

  const saveGlobal = () => {
    const changedFields = FIELDS.map(f=>f.k).filter(k=>draft.global[k]!==pc.global[k])
    if(!changedFields.length){doSave();return}
    const affCats={}, affItems={}
    cats.forEach(cat=>{const ov=pc.category_overrides[cat];if(ov&&changedFields.some(f=>ov[f]!=null))affCats[cat]=ov})
    mis.forEach(mi=>{const ov=pc.item_overrides[mi.id];if(ov&&changedFields.some(f=>ov[f]!=null))affItems[mi.id]=ov})
    if(!Object.keys(affCats).length&&!Object.keys(affItems).length){doSave();return}
    setCascade({changedFields,affCats,affItems,newGlobal:draft.global})
  }

  const doSave = (selCats=[], selItems=[]) => {
    let nd={...draft}
    selCats.forEach(({cat,field})=>{nd={...nd,category_overrides:{...nd.category_overrides,[cat]:{...nd.category_overrides[cat],[field]:nd.global[field]}}}})
    selItems.forEach(({id,field})=>{nd={...nd,item_overrides:{...nd.item_overrides,[id]:{...nd.item_overrides[id],[field]:nd.global[field]}}}})
    setPc(nd)
    setDraft(JSON.parse(JSON.stringify(nd)))
    setCascade(null)
    setFlash(true)
    showToast('All settings saved successfully!', 'success')
    if (logEvent) {
      logEvent('Updated', 'Settings', 'Pricing Rules', 'Modified pricing multipliers, packaging costs, or overrides')
    }
    setTimeout(()=>setFlash(false),2200)
  }

  const handleResetDemoData = async () => {
    if (await confirm('Reset & Seed Demo Data?', 'This will replace all your current raw materials, intermediates, and menu items with a rich set of 15 ingredients, 3 preparation recipes, and 5 full-costed menu items. This cannot be undone.')) {
      setResetting(true)
      try {
        await seedSampleData(org.id)
        if (logEvent) {
          logEvent('Reset', 'Database', 'Workspace Seed', 'Reset all kitchen data and seeded rich sample data')
        }
        showToast('Demo data seeded successfully! Reloading...', 'success')
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } catch (e) {
        showToast(e.message || 'Failed to seed demo data', 'error')
      } finally {
        setResetting(false)
      }
    }
  }

  return (
    <div>
      <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'stretch' : 'center',justifyContent:'space-between',marginBottom:20,gap: 12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'var(--text-primary)',margin:0}}>Settings</h1>
          <p style={{fontSize:13,color:'var(--text-light)',marginTop:4}}>Manage workspace profile, member permissions, defaults, and logs</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,justifyContent: isMobile ? 'space-between' : 'flex-end'}}>
          {flash&&<span style={{fontSize:12,color:'#166534',background:'#dcfce7',padding:'4px 12px',borderRadius:8,fontWeight:600}}>Saved!</span>}
          {settingsTab === 'rules' && allowSettingsEdit && <Btn ch='Save All Settings' v='primary' onClick={saveGlobal}/>}
        </div>
      </div>

      {/* Tabs Selector Navigation */}
      <div style={{
        display:'flex',
        gap: 6,
        borderBottom:'1px solid var(--border-color)',
        marginBottom: 20,
        overflowX:'auto',
        paddingBottom: 4
      }}>
        {[
          { id: 'preferences', label: 'Profile & Team' },
          { id: 'categories', label: 'Category Manager' },
          { id: 'rules', label: 'Pricing Rules' },
          { id: 'permissions', label: 'Permissions' },
          { id: 'activity', label: 'Activity Logs' },
          { id: 'danger', label: 'Danger Zone' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSettingsTab(t.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: settingsTab === t.id ? 'var(--bg-active-tab)' : 'transparent',
              color: settingsTab === t.id ? 'var(--primary)' : 'var(--text-light)',
              fontWeight: 600,
              fontSize: 13,
              borderRadius: 8,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              borderBottom: settingsTab === t.id ? '2px solid var(--primary)' : '2px solid transparent'
            }}
            onMouseEnter={e => { if (settingsTab !== t.id) e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { if (settingsTab !== t.id) e.currentTarget.style.color = 'var(--text-light)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Preferences Tab Content */}
      {settingsTab === 'preferences' && (
        <>
          <Card title='Organization Profile'>
            <div style={{display:'flex', flexDirection:'column', gap:16}}>
              <div style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:16}}>
                <div>
                  <Label>Organization Name</Label>
                  <input type='text' value={orgName} onChange={e => setOrgName(e.target.value)} disabled={profile?.role !== 'owner'}
                    className="custom-input"
                    style={{width:'100%', border:'1px solid var(--border-strong)', borderRadius:8, padding:'8px 10px', fontSize:13, color:'var(--text-primary)', background:profile?.role !== 'owner' ? 'var(--bg-hover)' : 'var(--bg-card)', outline:'none',transition:'all 0.15s ease', marginTop: 4, boxSizing: 'border-box'}}/>
                </div>
                <div>
                  <Label>Organization Logo URL</Label>
                  <input type='text' value={logoUrl} onChange={e => setLogoUrl(e.target.value)} disabled={profile?.role !== 'owner'} placeholder="https://example.com/logo.png"
                    className="custom-input"
                    style={{width:'100%', border:'1px solid var(--border-strong)', borderRadius:8, padding:'8px 10px', fontSize:13, color:'var(--text-primary)', background:profile?.role !== 'owner' ? 'var(--bg-hover)' : 'var(--bg-card)', outline:'none',transition:'all 0.15s ease', marginTop: 4, boxSizing: 'border-box'}}/>
                </div>
              </div>
              
              <div style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:16}}>
                <div>
                  <Label>Organization ID (Share to invite members)</Label>
                  <div style={{display:'flex', gap:8, marginTop: 4}}>
                    <input type='text' value={org?.id || ''} readOnly
                      className="custom-input"
                      style={{flex:1, border:'1px solid var(--border-strong)', borderRadius:8, padding:'8px 10px', fontSize:13, color:'var(--text-muted)', background:'var(--bg-hover)', outline:'none', fontFamily:'monospace',transition:'all 0.15s ease'}}/>
                    <Btn ch={copied ? 'Copied!' : 'Copy'} onClick={handleCopyId} v="secondary" sz="md"/>
                  </div>
                </div>
                {profile?.role === 'owner' && (
                  <div style={{display:'flex', alignItems:'flex-end', justifyContent: 'flex-end'}}>
                    <Btn ch={savingOrg ? 'Saving...' : 'Save Profile Changes'} onClick={handleUpdateOrg} v="primary" sz="md" disabled={savingOrg || ((!orgName.trim() || orgName === org?.name) && logoUrl === (org?.logo_url || ''))} style={{width: isMobile ? '100%' : 'auto', justifyContent: 'center'}}/>
                  </div>
                )}
              </div>
              <div style={{borderTop:'1px solid var(--border-color)', paddingTop:16, marginTop: 8}}>
                <Label>Your Profile Username (Optional)</Label>
                <div style={{display:'flex', gap:8, marginTop: 4, maxWidth: isMobile ? '100%' : '50%'}}>
                  <input type='text' value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. chef_pastry"
                    className="custom-input"
                    style={{flex:1, border:'1px solid var(--border-strong)', borderRadius:8, padding:'8px 10px', fontSize:13, color:'var(--text-primary)', background:'var(--bg-card)', outline:'none',transition:'all 0.15s ease'}}/>
                  <Btn ch={savingUsername ? 'Saving...' : 'Save'} onClick={handleSaveUsername} v="secondary" sz="md" disabled={savingUsername || username === (profile?.username || '')}/>
                </div>
                <p style={{fontSize:11, color:'var(--text-light)', marginTop:6}}>A unique custom username (alphanumeric & underscores, 3-20 characters) shown in the workspace sidebar.</p>
              </div>
              <InfoBox color='gray'>
                Your role: <span style={{fontWeight:700, color:'var(--primary)'}}>{profile?.role?.toUpperCase()}</span>. 
                {profile?.role === 'owner' 
                  ? ' You can rename the organization. Other team members can join this workspace using the Organization ID above.' 
                  : ' Only the owner can rename the organization. Contact your administrator to make changes.'}
              </InfoBox>
            </div>
          </Card>

          {profile?.role === 'owner' && (
            <Card title="Invite Team Members">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  const email = e.target.elements.inviteEmail.value.trim()
                  if (!email) return
                  try {
                    await inviteMember(email)
                    e.target.reset()
                  } catch(err) {
                    showToast(err.message || 'Failed to send invite', 'error')
                  }
                }} style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="email"
                    name="inviteEmail"
                    placeholder="colleague@yourkitchen.com"
                    required
                    className="custom-input"
                    style={{ flex: 1, border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-card)', outline: 'none', transition: 'all 0.15s ease' }}
                  />
                  <Btn ch="Send Invite" type="submit" v="primary" sz="md" />
                </form>
                
                {invitedEmails.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Pending Invitations</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {invitedEmails.map(email => (
                        <div key={email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{email}</span>
                          <Btn ch="Revoke" onClick={() => revokeInvite(email)} v="secondary" sz="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Pending Membership Requests */}
          {profile?.role === 'owner' && (
            <Card title="Pending Membership Requests">
              {requestsLoading ? (
                <p style={{ fontSize: 13, color: 'var(--text-light)' }}>Loading requests...</p>
              ) : requests.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No pending membership requests.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {requests.map(req => (
                    <div key={req.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: 12, border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {req.profiles?.email || 'Unknown User'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-light)', fontFamily: 'monospace' }}>
                          ID: {req.user_id}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Btn ch="Approve" onClick={() => handleRequestAction(req.id, 'approved')} v="primary" sz="sm" />
                        <Btn ch="Reject" onClick={() => handleRequestAction(req.id, 'danger')} v="danger" sz="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* Rules Tab Content */}
      {settingsTab === 'rules' && (
        <>
          {!allowSettingsEdit && (
            <div style={{ background: 'linear-gradient(135deg, var(--bg-hover) 0%, var(--bg-app) 100%)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>⚠️ Workspace defaults are locked for team members by the administrator.</span>
            </div>
          )}
          <Card title='Global Defaults'>
            <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)',gap:12}}>
              {FIELDS.map(f=>(
                <Inp key={f.k} label={f.l} v={draft.global[f.k]} onChange={v=>updG(f.k,v)} type='number' min='0' step={f.step} unit={f.u} disabled={!allowSettingsEdit}/>
              ))}
              <Inp label='FC% Alert Threshold' v={draft.global.fc_alert_threshold} onChange={v=>updG('fc_alert_threshold',v)} type='number' min='0' step='1' unit='%' disabled={!allowSettingsEdit}/>
            </div>
            <div style={{marginTop:12}}>
              <InfoBox color='gray'>
                SP = Food Cost × {draft.global.sp_multiplier}× &nbsp;·&nbsp; Delivery = (SP + ₹{draft.global.packaging_cost}) × (1 + {draft.global.delivery_markup}%) &nbsp;·&nbsp; Alert fires above {draft.global.fc_alert_threshold}% FC
              </InfoBox>
            </div>
          </Card>

          <Card title='Category Overrides (leave blank to inherit global)'>
            {cats.length===0?(
              <p style={{fontSize:13,color:'var(--text-light)'}}>No categories yet — add menu items with categories to create overrides.</p>
            ):(
              <div style={{overflowX: 'auto'}}>
                <div style={{minWidth: 600}}>
                  <div style={{display:'grid',gridTemplateColumns:'1.5fr repeat(3,1fr)',gap:10,padding:'6px 0',borderBottom:'1px solid var(--border-color)',marginBottom:4}}>
                    <span style={{fontSize:11,fontWeight:700,color:'var(--text-light)'}}>CATEGORY</span>
                    {FIELDS.map(f=><span key={f.k} style={{fontSize:11,fontWeight:700,color:'var(--text-light)'}}>{f.l.toUpperCase()} ({f.u})</span>)}
                  </div>
                  {cats.map(cat=>(
                    <div key={cat} style={{display:'grid',gridTemplateColumns:'1.5fr repeat(3,1fr)',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border-color)',alignItems:'center'}}>
                      <span style={{fontSize:13,fontWeight:600,color:'var(--text-secondary)'}}>{cat}</span>
                      {FIELDS.map(f=>{
                        const ov=draft.category_overrides[cat]?.[f.k]
                        return (
                          <div key={f.k} style={{position:'relative'}}>
                            <input type='number' min='0' step={f.step} placeholder={String(draft.global[f.k])} value={ov!=null?ov:''}
                              disabled={!allowSettingsEdit}
                              onChange={e=>updCat(cat,f.k,e.target.value===''?null:e.target.value)}
                              className="custom-input"
                              style={{width:'100%',boxSizing:'border-box',border:`1px solid ${ov!=null?'#2dd4bf':'var(--border-strong)'}`,borderRadius:6,padding:'5px 28px 5px 8px',fontSize:12,outline:'none',background:ov!=null?'var(--bg-active-tab)':'var(--bg-card)',color:'var(--text-primary)',transition:'all 0.15s ease'}}/>
                            <span style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'var(--text-light)'}}>{f.u}</span>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
                <p style={{fontSize:11,color:'var(--text-light)',marginTop:8}}>Highlighted fields are active overrides. Blank = uses global default.</p>
              </div>
            )}
          </Card>

          <Card title='Per-Item Overrides (leave blank to inherit category or global)'>
            {mis.length===0?(
              <p style={{fontSize:13,color:'var(--text-light)'}}>No menu items yet.</p>
            ):(
              <div style={{overflowX: 'auto'}}>
                <div style={{minWidth: 700}}>
                  <div style={{display:'grid',gridTemplateColumns:'2fr 1fr repeat(3,1fr)',gap:10,padding:'6px 0',borderBottom:'1px solid var(--border-color)',marginBottom:4}}>
                    <span style={{fontSize:11,fontWeight:700,color:'var(--text-light)'}}>ITEM</span>
                    <span style={{fontSize:11,fontWeight:700,color:'var(--text-light)'}}>CATEGORY</span>
                    {FIELDS.map(f=><span key={f.k} style={{fontSize:11,fontWeight:700,color:'var(--text-light)'}}>{f.l.toUpperCase()} ({f.u})</span>)}
                  </div>
                  {mis.map(mi=>(
                    <div key={mi.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr repeat(3,1fr)',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border-color)',alignItems:'center'}}>
                      <span style={{fontSize:13,fontWeight:600,color:'var(--text-secondary)'}}>{mi.name}</span>
                      <span style={{fontSize:12,color:'var(--text-light)'}}>{mi.category||'—'}</span>
                      {FIELDS.map(f=>{
                        const ov=draft.item_overrides[mi.id]?.[f.k]
                        const catV=draft.category_overrides[mi.category]?.[f.k]
                        const ph=catV!=null?`${catV} (cat)`:`${draft.global[f.k]} (glb)`
                        const isPurple = ov!=null
                        const isYellow = !isPurple && catV!=null
                        
                        let borderStyle = '1px solid var(--border-strong)'
                        let bgStyle = 'var(--bg-card)'
                        if (isPurple) {
                          borderStyle = '1px solid #8b5cf6'
                          bgStyle = 'rgba(139,92,246,0.06)'
                        } else if (isYellow) {
                          borderStyle = '1px solid #f59e0b'
                          bgStyle = 'rgba(245,158,11,0.06)'
                        }

                        return (
                          <div key={f.k} style={{position:'relative'}}>
                            <input type='number' min='0' step={f.step} placeholder={ph} value={ov!=null?ov:''}
                              disabled={!allowSettingsEdit}
                              onChange={e=>updItem(mi.id,f.k,e.target.value===''?null:e.target.value)}
                              className="custom-input"
                              style={{
                                width:'100%',
                                boxSizing:'border-box',
                                border: borderStyle,
                                borderRadius:6,
                                padding:'5px 28px 5px 8px',
                                fontSize:12,
                                outline:'none',
                                background: bgStyle,
                                color:'var(--text-primary)',
                                transition:'all 0.15s ease'
                              }}/>
                            <span style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'var(--text-light)'}}>{f.u}</span>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
                <p style={{fontSize:11,color:'var(--text-light)',marginTop:8}}>Yellow = category override · Purple = item override · Blank = inherits from category or global</p>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Permissions Tab Content */}
      {settingsTab === 'permissions' && (
        <Card title='Team Member Permissions'>
          {profile?.role === 'owner' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 8 }}>
                Configure what actions team members are allowed to perform in this workspace. Owners always have full read/write access.
              </div>
              {[
                { key: 'allow_override_settings', label: 'Allow members to edit global defaults and overrides', desc: 'Allows team members to edit global multipliers, packaging costs, and category/item price overrides in Settings.' },
                { key: 'allow_edit_ingredients', label: 'Allow members to edit Raw Materials and Intermediates', desc: 'Allows team members to add, edit, or delete kitchen ingredients and preparation recipes.' },
                { key: 'allow_edit_menu_items', label: 'Allow members to edit Menu Costing Items', desc: 'Allows team members to add, edit, or delete items in the menu catalog.' }
              ].map(p => {
                const active = pc.permissions?.[p.key] !== false
                return (
                  <div key={p.key} className="glass-panel" style={{ padding: '16px 20px', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>{p.desc}</div>
                    </div>
                    <button
                      onClick={() => handleTogglePermission(p.key)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: active ? 'none' : '1px solid var(--border-strong)',
                        background: active ? 'var(--primary)' : 'transparent',
                        color: active ? '#fff' : 'var(--text-light)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {active ? 'Allowed' : 'Restricted'}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-light)', border: '1px solid var(--border-color)', borderRadius: 16 }}>
              <span style={{ fontSize: 24 }}>🔒</span>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)', marginTop: 12 }}>Permissions Restricted</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Workspace permissions can only be managed by the organization owner.</div>
            </div>
          )}
        </Card>
      )}

      {/* Activity Logs Tab Content */}
      {settingsTab === 'activity' && (
        <Card title='Workspace Activity Audit Trail'>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 8 }}>
              Workspace audit trail showing real-time changes made by all tenants.
            </div>
            
            {!activityLog || activityLog.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: 16, fontSize: 13 }}>
                No activities logged yet. Changes will appear here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: 20 }}>
                <div style={{
                  position: 'absolute',
                  left: 6,
                  top: 10,
                  bottom: 10,
                  width: 2,
                  background: 'var(--border-strong)'
                }} />
                
                {activityLog.map((evt, idx) => {
                  const dt = new Date(evt.timestamp)
                  const dateStr = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  const timeStr = dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                  
                  let actionColor = 'var(--primary)'
                  if (evt.action === 'Deleted') actionColor = '#ef4444'
                  if (evt.action === 'Created') actionColor = '#10b981'
                  
                  return (
                    <div key={evt.id || idx} style={{
                      position: 'relative',
                      marginBottom: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}>
                      <div style={{
                        position: 'absolute',
                        left: -19,
                        top: 5,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: actionColor,
                        border: '3px solid var(--bg-app)',
                        boxShadow: '0 0 0 1px var(--border-strong)'
                      }} />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>
                          {dateStr}, {timeStr}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {evt.username && evt.username !== 'Unknown' ? `${evt.username} (${evt.user_email})` : evt.user_email}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 700, color: actionColor, marginRight: 4 }}>{evt.action}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{evt.targetType}</span>: {evt.targetName}
                      </div>
                      
                      <div style={{ fontSize: 11, color: 'var(--text-light)', fontStyle: 'italic' }}>
                        {evt.details}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Category Manager Tab Content */}
      {settingsTab === 'categories' && (
        <Card title='Workspace Category & Sub-Category Manager'>
          <div style={{display:'flex', flexDirection:'column', gap:20}}>
            <p style={{fontSize:13, color:'var(--text-light)', margin:0}}>
              View and manage categories used across raw materials, intermediates, and menu items. Renaming a category updates all associated items.
            </p>
            
            <div style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap:16, marginBottom:20}}>
              <div className="glass-panel" style={{borderRadius:12, padding:16, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border-color)'}}>
                <div style={{fontWeight:700, fontSize:12, color:'var(--text-secondary)', marginBottom:12, borderBottom:'1px solid var(--border-color)', paddingBottom:6}}>Raw Material Categories</div>
                <CategoryList type="raw" items={rms} setItems={setRms} customCats={customCats} setCustomCats={setCustomCats} logType="Raw Material" logEvent={logEvent} isMobile={isMobile} isSub={false} />
              </div>
              
              <div className="glass-panel" style={{borderRadius:12, padding:16, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border-color)'}}>
                <div style={{fontWeight:700, fontSize:12, color:'var(--text-secondary)', marginBottom:12, borderBottom:'1px solid var(--border-color)', paddingBottom:6}}>Prep Recipe Categories</div>
                <CategoryList type="int" items={ints} setItems={setInts} customCats={customCats} setCustomCats={setCustomCats} logType="Intermediate Recipe" logEvent={logEvent} isMobile={isMobile} isSub={false} />
              </div>
              
              <div className="glass-panel" style={{borderRadius:12, padding:16, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border-color)'}}>
                <div style={{fontWeight:700, fontSize:12, color:'var(--text-secondary)', marginBottom:12, borderBottom:'1px solid var(--border-color)', paddingBottom:6}}>Menu Item Categories</div>
                <CategoryList type="menu" items={mis} setItems={setMis} customCats={customCats} setCustomCats={setCustomCats} logType="Menu Item" logEvent={logEvent} isMobile={isMobile} isSub={false} />
              </div>
            </div>

            <div style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:16}}>
              <div className="glass-panel" style={{borderRadius:12, padding:16, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border-color)'}}>
                <div style={{fontWeight:700, fontSize:12, color:'var(--text-secondary)', marginBottom:12, borderBottom:'1px solid var(--border-color)', paddingBottom:6}}>Raw Material Sub-Categories</div>
                <CategoryList type="raw_sub" items={rms} setItems={setRms} customCats={customCats} setCustomCats={setCustomCats} logType="Raw Material Sub-Category" logEvent={logEvent} isMobile={isMobile} isSub={true} />
              </div>
              
              <div className="glass-panel" style={{borderRadius:12, padding:16, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border-color)'}}>
                <div style={{fontWeight:700, fontSize:12, color:'var(--text-secondary)', marginBottom:12, borderBottom:'1px solid var(--border-color)', paddingBottom:6}}>Menu Item Sub-Categories</div>
                <CategoryList type="menu_sub" items={mis} setItems={setMis} customCats={customCats} setCustomCats={setCustomCats} logType="Menu Item Sub-Category" logEvent={logEvent} isMobile={isMobile} isSub={true} />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Danger Zone Tab Content */}
      {settingsTab === 'danger' && (
        <Card title='Workspace Data Controls (Danger Zone)'>
          {profile?.role === 'owner' ? (
            <div style={{display:'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent:'space-between', gap: 14}}>
              <div>
                <div style={{fontWeight:600, fontSize:13, color:'var(--text-secondary)'}}>Reset & Seed Full Demo Data</div>
                <div style={{fontSize:11, color:'var(--text-light)', marginTop:2}}>Overwrite current database tables with a clean, fully cost-analyzed set of sample recipes, prep bases, and ingredients.</div>
              </div>
              <Btn ch={resetting ? 'Resetting...' : 'Reset & Seed Demo Data'} onClick={handleResetDemoData} v="danger" disabled={resetting}/>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light)' }}>
              Data overrides can only be performed by the workspace owner.
            </div>
          )}
        </Card>
      )}

      {cascade&&<CascadeModal data={cascade} onConfirm={doSave} onClose={()=>setCascade(null)} mis={mis}/>}
    </div>
  )
}
