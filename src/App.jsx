import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Package, FlaskConical, UtensilsCrossed, Settings, ChefHat, Menu, X, LogOut, Sun, Moon, Copy, Check, User,
  Home, GitCompare, GitBranch, Pin
} from 'lucide-react'
import { useShared } from './hooks/useShared.js'
import { useIsMobile } from './hooks/useIsMobile.js'
import { SK, DEFAULT_PC } from './constants.js'
import { Dashboard, RMPage, IntPage, MIPage, SettingsPage } from './components/pages.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { UIProvider, useUI } from './context/UIContext.jsx'
import AuthPortal from './components/AuthPortal.jsx'
import { storage } from './lib/storage.js'
import { HomeTab } from './components/Home.jsx'
import { VersionCompare } from './components/VersionCompare.jsx'
import { CloneVersionModal } from './components/modals.jsx'

const getTabFromPath = () => {
  const path = window.location.pathname.replace(/^\/|\/$/g, '')
  if (path === '' || path === 'home') return 'home'
  if (['dashboard', 'raw', 'intermediates', 'menu', 'settings', 'compare'].includes(path)) return path
  return 'home'
}

export default function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </UIProvider>
  )
}

function ToastContainer() {
  const { toasts, removeToast } = useUI()
  const [copiedId, setCopiedId] = useState(null)

  if (!toasts.length) return null

  const handleCopy = (e, t) => {
    e.stopPropagation()
    navigator.clipboard.writeText(t.message)
    setCopiedId(t.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div style={{position:'fixed',top:20,right:20,zIndex:9999,display:'flex',flexDirection:'column',gap:8,maxWidth:320,width:'100%'}}>
      {toasts.map(t => {
        let bg = '#14b8a6' // teal
        if (t.type === 'error') bg = '#ef4444' // red
        if (t.type === 'warning') bg = '#f59e0b' // yellow
        if (t.type === 'info') bg = '#3b82f6' // blue
        return (
          <div key={t.id} onClick={() => removeToast(t.id)}
            style={{
              background: bg,
              color: '#fff',
              padding: '12px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
            <span style={{flex: 1, marginRight: 8}}>{t.message}</span>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {t.type === 'error' && (
                <button onClick={(e) => handleCopy(e, t)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 8px',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)' }}>
                  {copiedId === t.id ? <Check size={11}/> : <Copy size={11}/>}
                  {copiedId === t.id ? 'Copied' : 'Copy'}
                </button>
              )}
              <X size={14} style={{opacity: 0.8}}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ConfirmDialog() {
  const { confirmDialog } = useUI()
  if (!confirmDialog) return null
  const { title, message, onConfirm, onCancel } = confirmDialog
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      backdropFilter: 'blur(4px)',
      animation: 'backdropFadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 20,
        padding: 24,
        maxWidth: 400,
        width: '90%',
        boxShadow: 'var(--shadow-xl)',
        animation: 'modalZoomIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        <h3 style={{fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8}}>{title}</h3>
        <p style={{fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5}}>{message}</p>
        <div style={{display: 'flex', justifyContent: 'flex-end', gap: 10}}>
          <button onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--border-strong)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer'
            }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#ef4444',
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer'
            }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

function AppContent() {
  const { user, profile, org, loading: authLoading, signOut, seedSampleData, invitedEmails, inviteMember, revokeInvite } = useAuth()
  const { theme, toggleTheme } = useUI()
  const [versions, setVersions, versionsOk] = useShared('mm_versions', [{ id: 'working_draft', label: 'Working Draft', createdAt: new Date().toISOString() }], org?.id)
  const [activeVersionId, setActiveVersionId] = useState(() => {
    return localStorage.getItem('mm_active_version_id') || 'working_draft'
  })

  // Synchronize dynamic keys based on selected version
  const rmsKey = activeVersionId === 'working_draft' ? SK.rm : `${SK.rm}:${activeVersionId}`
  const intsKey = activeVersionId === 'working_draft' ? SK.int : `${SK.int}:${activeVersionId}`
  const misKey = activeVersionId === 'working_draft' ? SK.mi : `${SK.mi}:${activeVersionId}`
  const pcKey = activeVersionId === 'working_draft' ? SK.pc : `${SK.pc}:${activeVersionId}`

  const [rms,  setRms,  rmsOk]  = useShared(rmsKey,  [], org?.id)
  const [ints, setInts, intsOk] = useShared(intsKey, [], org?.id)
  const [mis,  setMis,  misOk]  = useShared(misKey,  [], org?.id)
  const [pc,   setPc,   pcOk]   = useShared(pcKey,  DEFAULT_PC, org?.id)
  const [activityLog, setActivityLog, activityOk] = useShared('mm_activity_log', [], org?.id)
  const [cardOrder, setCardOrder, orderOk] = useShared(SK.layout, ['ingredients', 'menu', 'avg_cost', 'alerts'], org?.id)
  const [chartOrder, setChartOrder, chartOk] = useShared(SK.layout_charts, ['costs_chart', 'dietary_chart', 'expenses_chart'], org?.id)
  const [customCats, setCustomCats, customCatsOk] = useShared(SK.custom_cats, { raw: [], int: [], menu: [], raw_sub: [], menu_sub: [] }, org?.id)
  const [pinnedItems, setPinnedItems, pinnedOk] = useShared('mm_pinned_items', { rms: [], ints: [], mis: [] }, org?.id)
  const [tab,  setTab]          = useState(getTabFromPath)
  const [cloneModalSourceId, setCloneModalSourceId] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false)

  const isMobile = useIsMobile()
  const authenticated = !!user && !!org
  const loading = authenticated && (!rmsOk || !intsOk || !misOk || !pcOk || !activityOk || !orderOk || !chartOk || !customCatsOk || !versionsOk || !pinnedOk)

  const handleVersionChange = (id) => {
    setActiveVersionId(id)
    localStorage.setItem('mm_active_version_id', id)
  }

  // Ensure activeVersionId exists in loaded versions list
  useEffect(() => {
    if (versionsOk && versions && !versions.some(v => v.id === activeVersionId)) {
      handleVersionChange('working_draft')
    }
  }, [versions, versionsOk, activeVersionId])

  const addCustomCat = (type, name) => {
    if (!name || !name.trim()) return
    const cleaned = name.trim()
    setCustomCats(prev => {
      const list = prev?.[type] || []
      if (list.includes(cleaned)) return prev
      return { ...(prev || {}), [type]: [...list, cleaned].sort() }
    })
  }

  const logEvent = (action, targetType, targetName, details) => {
    if (!org?.id) return
    const newEvent = {
      id: 'evt_' + Date.now(),
      timestamp: new Date().toISOString(),
      user_email: user?.email || 'System',
      username: profile?.username || '',
      action,
      targetType,
      targetName,
      details
    }
    setActivityLog(prev => {
      const arr = Array.isArray(prev) ? prev : []
      return [newEvent, ...arr].slice(0, 100)
    })
  }

  const handleCloneVersion = async (sourceId, label) => {
    const newId = 'ver_' + Date.now() + Math.random().toString(36).slice(2, 7)
    
    let sourceRms = []
    let sourceInts = []
    let sourceMis = []
    let sourcePc = DEFAULT_PC

    if (sourceId === activeVersionId) {
      sourceRms = rms
      sourceInts = ints
      sourceMis = mis
      sourcePc = pc
    } else {
      const rKey = sourceId === 'working_draft' ? SK.rm : `${SK.rm}:${sourceId}`
      const iKey = sourceId === 'working_draft' ? SK.int : `${SK.int}:${sourceId}`
      const mKey = sourceId === 'working_draft' ? SK.mi : `${SK.mi}:${sourceId}`
      const pKey = sourceId === 'working_draft' ? SK.pc : `${SK.pc}:${sourceId}`

      const [rRaw, iRaw, mRaw, pRaw] = await Promise.all([
        storage.get(rKey, org?.id),
        storage.get(iKey, org?.id),
        storage.get(mKey, org?.id),
        storage.get(pKey, org?.id),
      ])

      sourceRms = rRaw ? JSON.parse(rRaw) : []
      sourceInts = iRaw ? JSON.parse(iRaw) : []
      sourceMis = mRaw ? JSON.parse(mRaw) : []
      sourcePc = pRaw ? JSON.parse(pRaw) : DEFAULT_PC
    }

    const suffix = `:${newId}`
    await Promise.all([
      storage.set(SK.rm + suffix, JSON.stringify(sourceRms), org?.id),
      storage.set(SK.int + suffix, JSON.stringify(sourceInts), org?.id),
      storage.set(SK.mi + suffix, JSON.stringify(sourceMis), org?.id),
      storage.set(SK.pc + suffix, JSON.stringify(sourcePc), org?.id),
    ])

    try {
      localStorage.setItem(`${SK.rm}:${newId}:${org?.id || 'local'}`, JSON.stringify(sourceRms))
      localStorage.setItem(`${SK.int}:${newId}:${org?.id || 'local'}`, JSON.stringify(sourceInts))
      localStorage.setItem(`${SK.mi}:${newId}:${org?.id || 'local'}`, JSON.stringify(sourceMis))
      localStorage.setItem(`${SK.pc}:${newId}:${org?.id || 'local'}`, JSON.stringify(sourcePc))
    } catch (e) {
      console.warn('[handleCloneVersion] localStorage cache save error:', e)
    }

    const newVersion = { id: newId, label, createdAt: new Date().toISOString() }
    setVersions(prev => [...prev, newVersion])
    handleVersionChange(newId)
    logEvent('Cloned Version', 'Menu Version', label, `Created as a clone of version: ${versions.find(v=>v.id===sourceId)?.label || sourceId}`)
  }

  const handleDeleteVersion = async (versionId) => {
    if (versionId === 'working_draft') return
    if (activeVersionId === versionId) {
      handleVersionChange('working_draft')
    }
    
    setVersions(prev => prev.filter(v => v.id !== versionId))

    const suffix = `:${versionId}`
    Promise.all([
      storage.delete(SK.rm + suffix, org?.id),
      storage.delete(SK.int + suffix, org?.id),
      storage.delete(SK.mi + suffix, org?.id),
      storage.delete(SK.pc + suffix, org?.id),
    ]).catch(e => console.warn('[handleDeleteVersion] Supabase delete error:', e))

    try {
      localStorage.removeItem(`${SK.rm}:${versionId}:${org?.id || 'local'}`)
      localStorage.removeItem(`${SK.int}:${versionId}:${org?.id || 'local'}`)
      localStorage.removeItem(`${SK.mi}:${versionId}:${org?.id || 'local'}`)
      localStorage.removeItem(`${SK.pc}:${versionId}:${org?.id || 'local'}`)
    } catch (e) {}

    logEvent('Deleted Version', 'Menu Version', versionId, `Deleted menu version and cleared data`)
  }

  const togglePin = (type, id) => {
    setPinnedItems(prev => {
      const current = prev || { rms: [], ints: [], mis: [] }
      const list = current[type] || []
      const newList = list.includes(id) ? list.filter(x => x !== id) : [...list, id]
      return { ...current, [type]: newList }
    })
  }

  useEffect(() => {
    const handlePopState = () => {
      setTab(getTabFromPath())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleTabSelect = (id) => {
    const targetPath = id === 'home' ? '/' : `/${id}`
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath)
    }
    setTab(id)
    setMobileMenuOpen(false)
  }

  // 1. Loading state for Auth Session checking
  if (authLoading) return (
    <div style={{minHeight:'100vh',background:'var(--bg-app)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14}}>
      <div style={{background:'var(--primary)',borderRadius:16,padding:14,display:'flex',animation:'pulseGlow 2s infinite'}}>
        <ChefHat size={32} style={{color:'#fff'}}/>
      </div>
      <div style={{fontSize:15,fontWeight:600,color:'var(--text-primary)'}}>Loading MiseMap…</div>
      <div style={{fontSize:12,color:'var(--text-light)'}}>Checking authentication session...</div>
    </div>
  )

  // 2. Redirect to Auth & Onboarding if not connected to an org
  if (!authenticated) {
    return <AuthPortal />
  }

  // 3. Loading state for Org Data fetching
  if (loading) return (
    <div style={{minHeight:'100vh',background:'var(--bg-app)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14}}>
      <div style={{background:'var(--primary)',borderRadius:16,padding:14,display:'flex',animation:'pulseGlow 2s infinite'}}>
        <ChefHat size={32} style={{color:'#fff'}}/>
      </div>
      <div style={{fontSize:15,fontWeight:600,color:'var(--text-primary)'}}>Loading {org?.name}…</div>
      <div style={{fontSize:12,color:'var(--text-light)'}}>Syncing kitchen ingredients and costing data...</div>
    </div>
  )

  const NAV = [
    {id:'home',          icon:Home,              label:'Home'},
    {id:'dashboard',     icon:LayoutDashboard,  label:'Dashboard'},
    {id:'raw',           icon:Package,           label:'Raw Materials'},
    {id:'intermediates', icon:FlaskConical,      label:'Intermediates'},
    {id:'menu',          icon:UtensilsCrossed,   label:'Menu Items'},
    {id:'compare',       icon:GitCompare,        label:'Version Compare'},
    {id:'settings',      icon:Settings,          label:'Settings'},
  ]

  const sidebarStyle = isMobile ? {
    position: 'fixed',
    top: 0,
    left: mobileMenuOpen ? 0 : -240,
    width: 220,
    height: '100vh',
    zIndex: 100,
    background: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 12px',
    transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: mobileMenuOpen ? 'var(--shadow-xl)' : 'none',
  } : {
    width: 220,
    background: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 12px',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    height: '100vh',
    flexShrink: 0,
    overflowY: 'auto',
    zIndex: 80
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--bg-app)',display: 'flex', flexDirection: isMobile ? 'column' : 'row', color: 'var(--text-primary)', transition: 'background-color 0.3s ease, color 0.3s ease', position: 'relative', overflow: isMobile ? 'visible' : 'hidden'}}>


      <ToastContainer />
      <ConfirmDialog />

      {/* ── Mobile Header ── */}
      {isMobile && (
        <div className="glass-header" style={{
          height: 56,
          background: theme === 'dark' ? 'rgba(15, 22, 36, 0.75)' : 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'sticky',
          top: 0,
          zIndex: 90
        }}>
          <button onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setMobileProfileOpen(false); }} style={{background: 'none', border: 'none', padding: 6, display: 'flex', cursor: 'pointer', color: 'var(--text-secondary)'}}>
            <Menu size={20} />
          </button>
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            {org?.logo_url ? (
              <img src={org.logo_url} alt="Logo" style={{width: 24, height: 24, borderRadius: 6, objectFit: 'cover'}}/>
            ) : (
              <div style={{background: 'var(--primary)', borderRadius: 8, padding: 6, display: 'flex'}}>
                <ChefHat size={14} style={{color: '#fff'}} />
              </div>
            )}
            <span style={{fontWeight: 800, fontSize: 13, color: 'var(--text-primary)'}}>MiseMap</span>
          </div>
          <button onClick={() => { setMobileProfileOpen(!mobileProfileOpen); setMobileMenuOpen(false); }}
            style={{
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: 0
            }}>
            <User size={16} />
          </button>
        </div>
      )}

      {/* ── Overlay for Mobile Sidebar / Profile ── */}
      {isMobile && (mobileMenuOpen || mobileProfileOpen) && (
        <div onClick={() => { setMobileMenuOpen(false); setMobileProfileOpen(false); }} style={{position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', animation: 'backdropFadeIn 0.2s ease-out'}} />
      )}

      {/* ── Sidebar ── */}
      <div className="glass-sidebar" style={sidebarStyle}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'0 8px 20px',borderBottom:'1px solid var(--border-color)',marginBottom:12}}>
          {org?.logo_url ? (
            <img src={org.logo_url} alt="Logo" style={{width: 32, height: 32, borderRadius: 8, objectFit: 'cover'}}/>
          ) : (
            <div style={{background:'var(--primary)',borderRadius:10,padding:8,display:'flex'}}>
              <ChefHat size={18} style={{color:'#fff'}}/>
            </div>
          )}
          <div style={{flex: 1}}>
            <div style={{fontWeight:800,fontSize:14,color:'var(--text-primary)'}}>MiseMap</div>
            <div style={{fontSize:10,color:'var(--text-light)'}}>by Sayv Ilahsiav</div>
          </div>
          {isMobile && (
            <button onClick={() => setMobileMenuOpen(false)} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', display: 'flex', padding: 4}}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Version Picker */}
        <div style={{padding:'0 8px 12px', borderBottom:'1px solid var(--border-color)', marginBottom:12}}>
          <div style={{fontSize:10, fontWeight:700, color:'var(--text-light)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span>Menu Version</span>
            <button onClick={() => {
              setCloneModalSourceId(activeVersionId)
            }} style={{background:'none', border:'none', color:'var(--primary)', fontWeight:700, cursor:'pointer', fontSize:10, display:'flex', alignItems:'center', gap:2}}>
              <GitBranch size={10}/> + Clone
            </button>
          </div>
          <div style={{display:'flex', gap:4}}>
            <select value={activeVersionId} onChange={(e) => handleVersionChange(e.target.value)}
              style={{
                flex: 1,
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                padding: '6px 8px',
                fontSize: 12,
                color: 'var(--text-primary)',
                background: 'var(--bg-hover)',
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}>
              {versions.map(v => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
            {activeVersionId !== 'working_draft' && (
              <button onClick={async () => {
                if (confirm(`Are you sure you want to delete version "${versions.find(v => v.id === activeVersionId)?.label}"? This cannot be undone.`)) {
                  handleDeleteVersion(activeVersionId)
                }
              }} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', display:'flex', alignItems:'center', padding:4}}>
                <X size={14}/>
              </button>
            )}
          </div>
        </div>

        {NAV.map(({id,icon:Icon,label})=>(
          <button key={id} onClick={()=>handleTabSelect(id)}
            className="tab-transition"
            style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:8,border:'none',cursor:'pointer',marginBottom:2,
              background:tab===id?'var(--bg-active-tab)':'transparent',color:tab===id?'var(--primary)':'var(--text-muted)',
              fontWeight:tab===id?700:400,fontSize:13,textAlign:'left',width:'100%'}}>
            <Icon size={16} style={{color:tab===id?'var(--primary)':'var(--text-light)',flexShrink:0}}/>
            {label}
          </button>
        ))}

        {/* Organization Tenant & User Information Card */}
        <div style={{marginTop:'auto',padding:'12px 8px 0',borderTop:'1px solid var(--border-color)', display:'flex', flexDirection:'column', gap:10}}>
          
          {/* Theme Toggle */}
          <button onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-hover)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              transition: 'all 0.15s'
            }}>
            <span style={{display: 'flex', alignItems: 'center', gap: 8}}>
              {theme === 'light' ? <Sun size={13}/> : <Moon size={13}/>}
              {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
            </span>
            <span style={{fontSize: 9, color: 'var(--text-light)'}}>Toggle</span>
          </button>

          <div style={{display:'flex', flexDirection:'column', gap:2, padding:'8px 10px', background:'var(--bg-hover)', borderRadius:10, border:'1px solid var(--border-color)'}}>
            <span style={{fontWeight:700, fontSize:12, color:'var(--text-primary)', textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap'}}>{org?.name}</span>
            <span style={{fontSize:11, color:'var(--text-muted)', textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap'}}>{profile?.username || user?.email}</span>
            <span style={{fontSize:9, fontWeight:800, color:'var(--primary)', textTransform:'uppercase', letterSpacing:'0.05em', marginTop:2}}>
              {profile?.role}
            </span>
          </div>

          {!isMobile && (
            <button onClick={signOut}
              style={{
                display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'8px 10px',borderRadius:8,
                border: theme === 'dark' ? '1px solid #4a1d1d' : '1px solid #fee2e2',
                background: theme === 'dark' ? '#2d1515' : '#fef2f2',
                color: theme === 'dark' ? '#ef4444' : '#b91c1c',
                cursor:'pointer',fontSize:12,fontWeight:600,transition:'all 0.15s',width:'100%'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = theme === 'dark' ? '#3d1c1c' : '#fde2e2' }}
              onMouseLeave={e => { e.currentTarget.style.background = theme === 'dark' ? '#2d1515' : '#fef2f2' }}>
              <LogOut size={13}/>
              Sign Out
            </button>
          )}
          
          <div style={{fontSize:9,color:'var(--text-light)',textAlign:'center'}}>MiseMap · Shared via Supabase</div>
        </div>
      </div>

      {/* ── Mobile Profile Drawer ── */}
      {isMobile && (
        <div className="glass-sidebar" style={{
          position: 'fixed',
          top: 0,
          right: mobileProfileOpen ? 0 : -260,
          width: 240,
          height: '100vh',
          zIndex: 100,
          background: 'var(--bg-sidebar)',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 16px',
          transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: mobileProfileOpen ? 'var(--shadow-xl)' : 'none',
        }}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingBottom:16,borderBottom:'1px solid var(--border-color)',marginBottom:16}}>
            <span style={{fontWeight:800,fontSize:14,color:'var(--text-primary)'}}>Account Profile</span>
            <button onClick={() => setMobileProfileOpen(false)} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', display: 'flex', padding: 4}}>
              <X size={16} />
            </button>
          </div>

          <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'16px 12px', background:'var(--bg-hover)', borderRadius:12, border:'1px solid var(--border-color)', marginBottom:20}}>
            <div style={{width:48, height:48, borderRadius:'50%', background:'var(--primary)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700}}>
              {(profile?.username || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{textAlign:'center', width:'100%'}}>
              <div style={{fontWeight:700, fontSize:14, color:'var(--text-primary)', textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap'}}>{profile?.username || 'User'}</div>
              <div style={{fontSize:12, color:'var(--text-muted)', textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap'}}>{user?.email}</div>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:4, width:'100%', borderTop:'1px solid var(--border-color)', paddingTop:12, marginTop:4, fontSize:11}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span style={{color:'var(--text-light)'}}>Organization:</span>
                <span style={{fontWeight:600, color:'var(--text-secondary)', textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap', maxWidth:120}}>{org?.name}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span style={{color:'var(--text-light)'}}>Role:</span>
                <span style={{fontWeight:700, color:'var(--primary)', textTransform:'uppercase'}}>{profile?.role}</span>
              </div>
            </div>
          </div>

          <button onClick={() => { setMobileProfileOpen(false); signOut(); }}
            style={{
              display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'10px',borderRadius:10,
              border: theme === 'dark' ? '1px solid #4a1d1d' : '1px solid #fee2e2',
              background: theme === 'dark' ? '#2d1515' : '#fef2f2',
              color: theme === 'dark' ? '#ef4444' : '#b91c1c',
              cursor:'pointer',fontSize:13,fontWeight:600,transition:'all 0.15s',width:'100%',marginTop:'auto'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = theme === 'dark' ? '#3d1c1c' : '#fde2e2' }}
            onMouseLeave={e => { e.currentTarget.style.background = theme === 'dark' ? '#2d1515' : '#fef2f2' }}>
            <LogOut size={14}/>
            Sign Out
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{flex:1,padding: isMobile ? '20px 16px' : '32px 36px',marginLeft: isMobile ? 0 : 220,overflowX:'hidden'}}>
        {tab==='home'          && <HomeTab   rms={rms} ints={ints} mis={mis} setRms={setRms} setInts={setInts} setMis={setMis} customCats={customCats} addCustomCat={addCustomCat} pc={pc} pinnedItems={pinnedItems} togglePin={togglePin} onNavigate={handleTabSelect} logEvent={logEvent} profile={profile} activityLog={activityLog} />}
        {tab==='dashboard'     && <Dashboard rms={rms} ints={ints} mis={mis} pc={pc} onNavigate={handleTabSelect} setMis={setMis} logEvent={logEvent} profile={profile} cardOrder={cardOrder} setCardOrder={setCardOrder} chartOrder={chartOrder} setChartOrder={setChartOrder} activeVersionId={activeVersionId} versions={versions} />}
        {tab==='raw'           && <RMPage    rms={rms} setRms={setRms} logEvent={logEvent} profile={profile} pc={pc} customCats={customCats} addCustomCat={addCustomCat} pinnedItems={pinnedItems} togglePin={togglePin} />}
        {tab==='intermediates' && <IntPage   ints={ints} setInts={setInts} rms={rms} setRms={setRms} logEvent={logEvent} profile={profile} pc={pc} customCats={customCats} addCustomCat={addCustomCat} pinnedItems={pinnedItems} togglePin={togglePin} />}
        {tab==='menu'          && <MIPage    mis={mis} setMis={setMis} rms={rms} setRms={setRms} ints={ints} setInts={setInts} pc={pc} logEvent={logEvent} profile={profile} customCats={customCats} addCustomCat={addCustomCat} pinnedItems={pinnedItems} togglePin={togglePin} />}
        {tab==='compare'       && <VersionCompare versions={versions} activeVersionId={activeVersionId} org={org} rms={rms} ints={ints} mis={mis} pc={pc} logEvent={logEvent} />}
        {tab==='settings'      && <SettingsPage pc={pc} setPc={setPc} mis={mis} rms={rms} ints={ints} profile={profile} org={org} setRms={setRms} setInts={setInts} setMis={setMis} seedSampleData={seedSampleData} invitedEmails={invitedEmails} inviteMember={inviteMember} revokeInvite={revokeInvite} activityLog={activityLog} logEvent={logEvent} customCats={customCats} setCustomCats={setCustomCats} activeVersionId={activeVersionId} versions={versions} handleCloneVersion={handleCloneVersion} handleDeleteVersion={handleDeleteVersion} />}
      </div>
      {cloneModalSourceId && (
        <CloneVersionModal
          sourceId={cloneModalSourceId}
          versions={versions}
          onClose={() => setCloneModalSourceId(null)}
          onClone={(label) => {
            handleCloneVersion(cloneModalSourceId, label)
            setCloneModalSourceId(null)
          }}
        />
      )}
    </div>
  )
}