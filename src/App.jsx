import { useState } from 'react'
import {
  LayoutDashboard, Package, FlaskConical, UtensilsCrossed, Settings, ChefHat
} from 'lucide-react'
import { useShared } from './hooks/useShared.js'
import { SK, DEFAULT_PC } from './constants.js'
import { Dashboard, RMPage, IntPage, MIPage, SettingsPage } from './components/pages.jsx'

export default function App() {
  const [rms,  setRms,  rmsOk]  = useShared(SK.rm,  [])
  const [ints, setInts, intsOk] = useShared(SK.int, [])
  const [mis,  setMis,  misOk]  = useShared(SK.mi,  [])
  const [pc,   setPc,   pcOk]   = useShared(SK.pc,  DEFAULT_PC)
  const [tab,  setTab]          = useState('dashboard')

  const loading = !rmsOk||!intsOk||!misOk||!pcOk

  const NAV = [
    {id:'dashboard',     icon:LayoutDashboard,  label:'Dashboard'},
    {id:'raw',           icon:Package,           label:'Raw Materials'},
    {id:'intermediates', icon:FlaskConical,      label:'Intermediates'},
    {id:'menu',          icon:UtensilsCrossed,   label:'Menu Items'},
    {id:'settings',      icon:Settings,          label:'Settings'},
  ]

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14}}>
      <div style={{background:'#0d9488',borderRadius:16,padding:14,display:'flex'}}>
        <ChefHat size={32} style={{color:'#fff'}}/>
      </div>
      <div style={{fontSize:15,fontWeight:600,color:'#374151'}}>Loading MiseMap…</div>
      <div style={{fontSize:12,color:'#9ca3af'}}>Connecting to your shared database</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f8f7f4',display:'flex'}}>
      {/* ── Sidebar ── */}
      <div style={{width:220,background:'#fff',borderRight:'1px solid #f1f1f1',display:'flex',flexDirection:'column',padding:'20px 12px',position:'sticky',top:0,height:'100vh',flexShrink:0,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'0 8px 20px',borderBottom:'1px solid #f5f5f5',marginBottom:12}}>
          <div style={{background:'#0d9488',borderRadius:10,padding:8,display:'flex'}}>
            <ChefHat size={18} style={{color:'#fff'}}/>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:14,color:'#111'}}>MiseMap</div>
            <div style={{fontSize:10,color:'#9ca3af'}}>by Sayv Ilahsiav</div>
          </div>
        </div>

        {NAV.map(({id,icon:Icon,label})=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:8,border:'none',cursor:'pointer',marginBottom:2,
              background:tab===id?'#f0fdfa':'transparent',color:tab===id?'#0f766e':'#6b7280',
              fontWeight:tab===id?700:400,fontSize:13,transition:'all 0.15s',textAlign:'left',width:'100%'}}>
            <Icon size={16} style={{color:tab===id?'#0d9488':'#9ca3af',flexShrink:0}}/>
            {label}
          </button>
        ))}

        <div style={{marginTop:'auto',padding:'12px 8px 0',borderTop:'1px solid #f5f5f5'}}>
          <div style={{fontSize:10,color:'#d1d5db',textAlign:'center',lineHeight:1.5}}>MiseMap · Data shared via Supabase</div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{flex:1,padding:'32px 36px',maxWidth:1120,overflowX:'hidden'}}>
        {tab==='dashboard'     && <Dashboard rms={rms} ints={ints} mis={mis} pc={pc}/>}
        {tab==='raw'           && <RMPage    rms={rms} setRms={setRms}/>}
        {tab==='intermediates' && <IntPage   ints={ints} setInts={setInts} rms={rms}/>}
        {tab==='menu'          && <MIPage    mis={mis} setMis={setMis} rms={rms} ints={ints} pc={pc}/>}
        {tab==='settings'      && <SettingsPage pc={pc} setPc={setPc} mis={mis}/>}
      </div>
    </div>
  )
}