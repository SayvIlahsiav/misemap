import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Package, FlaskConical, UtensilsCrossed, Settings, ChefHat, Menu, X, LogOut
} from 'lucide-react'
import { useShared } from './hooks/useShared.js'
import { useIsMobile } from './hooks/useIsMobile.js'
import { SK, DEFAULT_PC } from './constants.js'
import { Dashboard, RMPage, IntPage, MIPage, SettingsPage } from './components/pages.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import AuthPortal from './components/AuthPortal.jsx'

const getTabFromPath = () => {
  const path = window.location.pathname.replace(/^\/|\/$/g, '')
  if (path === '' || path === 'dashboard') return 'dashboard'
  if (['raw', 'intermediates', 'menu', 'settings'].includes(path)) return path
  return 'dashboard'
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const { user, profile, org, loading: authLoading, signOut } = useAuth()
  const [rms,  setRms,  rmsOk]  = useShared(SK.rm,  [], org?.id)
  const [ints, setInts, intsOk] = useShared(SK.int, [], org?.id)
  const [mis,  setMis,  misOk]  = useShared(SK.mi,  [], org?.id)
  const [pc,   setPc,   pcOk]   = useShared(SK.pc,  DEFAULT_PC, org?.id)
  const [tab,  setTab]          = useState(getTabFromPath)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isMobile = useIsMobile()
  const authenticated = !!user && !!org
  const loading = authenticated && (!rmsOk || !intsOk || !misOk || !pcOk)

  useEffect(() => {
    const handlePopState = () => {
      setTab(getTabFromPath())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleTabSelect = (id) => {
    const targetPath = id === 'dashboard' ? '/' : `/${id}`
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath)
    }
    setTab(id)
    setMobileMenuOpen(false)
  }

  // 1. Loading state for Auth Session checking
  if (authLoading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14}}>
      <div style={{background:'#0d9488',borderRadius:16,padding:14,display:'flex'}}>
        <ChefHat size={32} style={{color:'#fff'}}/>
      </div>
      <div style={{fontSize:15,fontWeight:600,color:'#374151'}}>Loading MiseMap…</div>
      <div style={{fontSize:12,color:'#9ca3af'}}>Checking authentication session...</div>
    </div>
  )

  // 2. Redirect to Auth & Onboarding if not connected to an org
  if (!authenticated) {
    return <AuthPortal />
  }

  // 3. Loading state for Org Data fetching
  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14}}>
      <div style={{background:'#0d9488',borderRadius:16,padding:14,display:'flex'}}>
        <ChefHat size={32} style={{color:'#fff'}}/>
      </div>
      <div style={{fontSize:15,fontWeight:600,color:'#374151'}}>Loading {org?.name}…</div>
      <div style={{fontSize:12,color:'#9ca3af'}}>Syncing kitchen ingredients and costing data...</div>
    </div>
  )

  const NAV = [
    {id:'dashboard',     icon:LayoutDashboard,  label:'Dashboard'},
    {id:'raw',           icon:Package,           label:'Raw Materials'},
    {id:'intermediates', icon:FlaskConical,      label:'Intermediates'},
    {id:'menu',          icon:UtensilsCrossed,   label:'Menu Items'},
    {id:'settings',      icon:Settings,          label:'Settings'},
  ]

  const sidebarStyle = isMobile ? {
    position: 'fixed',
    top: 0,
    left: mobileMenuOpen ? 0 : -240,
    width: 220,
    height: '100vh',
    zIndex: 100,
    background: '#fff',
    borderRight: '1px solid #f1f1f1',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 12px',
    transition: 'left 0.3s ease-in-out',
    boxShadow: mobileMenuOpen ? '0 0 20px rgba(0,0,0,0.15)' : 'none',
  } : {
    width: 220,
    background: '#fff',
    borderRight: '1px solid #f1f1f1',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 12px',
    position: 'sticky',
    top: 0,
    height: '100vh',
    flexShrink: 0,
    overflowY: 'auto'
  }

  return (
    <div style={{minHeight:'100vh',background:'#f8f7f4',display: 'flex', flexDirection: isMobile ? 'column' : 'row'}}>
      {/* ── Mobile Header ── */}
      {isMobile && (
        <div style={{height: 56, background: '#fff', borderBottom: '1px solid #f1f1f1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', position: 'sticky', top: 0, zIndex: 90}}>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{background: 'none', border: 'none', padding: 6, display: 'flex', cursor: 'pointer', color: '#374151'}}>
            <Menu size={20} />
          </button>
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <div style={{background: '#0d9488', borderRadius: 8, padding: 6, display: 'flex'}}>
              <ChefHat size={14} style={{color: '#fff'}} />
            </div>
            <span style={{fontWeight: 800, fontSize: 13, color: '#111'}}>MiseMap</span>
          </div>
          <div style={{width: 32}} /> {/* Spacer to balance layout */}
        </div>
      )}

      {/* ── Overlay for Mobile Sidebar ── */}
      {isMobile && mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} style={{position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(0,0,0,0.3)'}} />
      )}

      {/* ── Sidebar ── */}
      <div style={sidebarStyle}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'0 8px 20px',borderBottom:'1px solid #f5f5f5',marginBottom:12}}>
          <div style={{background:'#0d9488',borderRadius:10,padding:8,display:'flex'}}>
            <ChefHat size={18} style={{color:'#fff'}}/>
          </div>
          <div style={{flex: 1}}>
            <div style={{fontWeight:800,fontSize:14,color:'#111'}}>MiseMap</div>
            <div style={{fontSize:10,color:'#9ca3af'}}>by Sayv Ilahsiav</div>
          </div>
          {isMobile && (
            <button onClick={() => setMobileMenuOpen(false)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4}}>
              <X size={16} />
            </button>
          )}
        </div>

        {NAV.map(({id,icon:Icon,label})=>(
          <button key={id} onClick={()=>handleTabSelect(id)}
            style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:8,border:'none',cursor:'pointer',marginBottom:2,
              background:tab===id?'#f0fdfa':'transparent',color:tab===id?'#0f766e':'#6b7280',
              fontWeight:tab===id?700:400,fontSize:13,transition:'all 0.15s',textAlign:'left',width:'100%'}}>
            <Icon size={16} style={{color:tab===id?'#0d9488':'#9ca3af',flexShrink:0}}/>
            {label}
          </button>
        ))}

        {/* Organization Tenant & User Information Card */}
        <div style={{marginTop:'auto',padding:'12px 8px 0',borderTop:'1px solid #f5f5f5', display:'flex', flexDirection:'column', gap:10}}>
          <div style={{display:'flex', flexDirection:'column', gap:2, padding:'8px 10px', background:'#fafafa', borderRadius:10, border:'1px solid #f0f0f0'}}>
            <span style={{fontWeight:700, fontSize:12, color:'#1f2937', textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap'}}>{org?.name}</span>
            <span style={{fontSize:11, color:'#6b7280', textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap'}}>{profile?.username || user?.email}</span>
            <span style={{fontSize:9, fontWeight:800, color:'#0d9488', textTransform:'uppercase', letterSpacing:'0.05em', marginTop:2}}>
              {profile?.role}
            </span>
          </div>
          <button onClick={signOut}
            style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'8px 10px',borderRadius:8,border:'1px solid #fee2e2',
              background:'#fef2f2',color:'#b91c1c',cursor:'pointer',fontSize:12,fontWeight:600,transition:'all 0.15s',width:'100%'}}
            onMouseEnter={e => { e.currentTarget.style.background = '#fde2e2' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2' }}>
            <LogOut size={13}/>
            Sign Out
          </button>
          <div style={{fontSize:9,color:'#d1d5db',textAlign:'center'}}>MiseMap · Shared via Supabase</div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{flex:1,padding: isMobile ? '20px 16px' : '32px 36px',maxWidth:1120,overflowX:'hidden'}}>
        {tab==='dashboard'     && <Dashboard rms={rms} ints={ints} mis={mis} pc={pc} onNavigate={handleTabSelect} setMis={setMis}/>}
        {tab==='raw'           && <RMPage    rms={rms} setRms={setRms}/>}
        {tab==='intermediates' && <IntPage   ints={ints} setInts={setInts} rms={rms}/>}
        {tab==='menu'          && <MIPage    mis={mis} setMis={setMis} rms={rms} ints={ints} pc={pc}/>}
        {tab==='settings'      && <SettingsPage pc={pc} setPc={setPc} mis={mis} profile={profile} org={org}/>}
      </div>
    </div>
  )
}