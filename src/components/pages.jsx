import { useState, useMemo } from 'react'
import {
  Package, FlaskConical, UtensilsCrossed, ShieldAlert, AlertTriangle,
  Plus, Search, Pencil, Trash2, ChevronDown, ChevronUp
} from 'lucide-react'
import { Btn, Bdg, FCBadge, InfoBox, Inp, Sel } from './UIPrimitives.jsx'
import { RMModal, IntModal, MIModal, CascadeModal, BatchImportModal, BatchImportIntModal, BatchImportMIModal } from './modals.jsx'
import { FT_COLOR_MAP } from '../constants.js'
import { fc, fp, rmUC, ingCost, intUC, calcPricing } from '../utils.js'
import { useIsMobile } from '../hooks/useIsMobile.js'

// ─────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────
export const Dashboard = ({rms, ints, mis, pc, onNavigate, setMis}) => {
  const threshold = pc.global.fc_alert_threshold
  const pricings  = useMemo(()=>mis.map(m=>({...m,...calcPricing(m,rms,ints,pc)})),[mis,rms,ints,pc])
  const alerts    = pricings.filter(m=>m.pct>threshold)
  const warnings  = pricings.filter(m=>m.pct>threshold*0.85&&m.pct<=threshold)
  const isMobile  = useIsMobile()

  const [expandedId, setExpandedId] = useState(null)
  const [modal, setModal]           = useState(null)

  const save = (item) => {
    setMis(mis.map(m => m.id === item.id ? item : m))
    setModal(null)
  }

  const StatCard = ({icon:Icon,label,value,sub,color,onClick}) => {
    const [hover, setHover] = useState(false)
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background:'#fff',
          border:'1px solid #f1f1f1',
          borderRadius:16,
          padding:18,
          display:'flex',
          alignItems:'center',
          gap:14,
          cursor:'pointer',
          transform: hover ? 'translateY(-2px)' : 'none',
          boxShadow: hover ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
          transition:'all 0.2s ease'
        }}
      >
        <div style={{padding:10,borderRadius:12,background:color.bg}}><Icon size={20} style={{color:color.ico}}/></div>
        <div>
          <div style={{fontSize:26,fontWeight:800,color:'#111',lineHeight:1}}>{value}</div>
          <div style={{fontSize:12,fontWeight:600,color:'#374151',marginTop:2}}>{label}</div>
          <div style={{fontSize:11,color:'#9ca3af'}}>{sub}</div>
        </div>
      </div>
    )
  }

  const DetailPanel = ({m}) => {
    const ingDetails = m.ingredients.map(ing => {
      const cost = ingCost(ing, rms, ints)
      return { ...ing, cost }
    })
    
    const dineInMargin = m.sp - m.food
    const takeawayMargin = m.tp - (m.food + m.pkg)
    const deliveryNetPayout = m.dp * (1 - m.dm / 100)
    const deliveryMargin = deliveryNetPayout - (m.food + m.pkg)

    return (
      <div style={{padding: '16px 20px', background: '#fafbfc', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderTop: '1px solid #f3f4f6'}}>
        <div style={{display:'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent:'space-between', alignItems:'flex-start', gap:20, marginBottom:16}}>
          {/* Ingredients Column */}
          <div style={{flex: 1, minWidth: 260}}>
            <div style={{fontWeight: 700, fontSize: 11, color: '#374151', textTransform: 'uppercase', tracking: '0.05em', marginBottom: 8}}>Recipe Cost Breakdown</div>
            <div style={{borderLeft: '2px solid #e5e7eb', paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 6}}>
              {ingDetails.map((ing, idx) => {
                const target = ing.type === 'raw' ? rms.find(r=>r.id===ing.id) : ints.find(i=>i.id===ing.id)
                const name = target?.name || 'Unknown Ingredient'
                return (
                  <div key={idx} style={{display:'flex', justifyContent:'space-between', fontSize:11, color:'#4b5563'}}>
                    <span>{name} ({ing.amount}{ing.unit})</span>
                    <span style={{fontWeight: 600, color: '#111'}}>{fc(ing.cost)}</span>
                  </div>
                )
              })}
              <div style={{display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:700, color:'#111', borderTop:'1px solid #f3f4f6', paddingTop:4, marginTop:4}}>
                <span>Total Food Cost</span>
                <span>{fc(m.food)}</span>
              </div>
            </div>
          </div>

          {/* Margins Column */}
          <div style={{flex: 1, minWidth: 260}}>
            <div style={{fontWeight: 700, fontSize: 11, color: '#374151', textTransform: 'uppercase', tracking: '0.05em', marginBottom: 8}}>Channel Margins & Payouts</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              {/* Dine-In */}
              <div style={{background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <span style={{fontWeight: 700, fontSize: 11, color: '#374151'}}>Dine-In (SP: {fc(m.sp)})</span>
                  <div style={{fontSize: 9, color: '#9ca3af'}}>Cost: {fc(m.food)}</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontWeight: 700, fontSize: 12, color: '#16a34a'}}>Profit: {fc(dineInMargin)}</div>
                  <div style={{fontSize: 9, color: '#6b7280'}}>FC: {fp(m.pct)}</div>
                </div>
              </div>
              {/* Takeaway */}
              <div style={{background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <span style={{fontWeight: 700, fontSize: 11, color: '#374151'}}>Takeaway (TP: {fc(m.tp)})</span>
                  <div style={{fontSize: 9, color: '#9ca3af'}}>Cost + Pkg: {fc(m.food + m.pkg)}</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontWeight: 700, fontSize: 12, color: '#16a34a'}}>Profit: {fc(takeawayMargin)}</div>
                  <div style={{fontSize: 9, color: '#6b7280'}}>FC: {fp(m.takeaway_fc_pct)}</div>
                </div>
              </div>
              {/* Delivery */}
              <div style={{background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <span style={{fontWeight: 700, fontSize: 11, color: '#374151'}}>Delivery (DP: {fc(m.dp)})</span>
                  <div style={{fontSize: 9, color: '#9ca3af'}}>Net Payout: {fc(deliveryNetPayout)}</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontWeight: 700, fontSize: 12, color: deliveryMargin > 0 ? '#16a34a' : '#dc2626'}}>Profit: {fc(deliveryMargin)}</div>
                  <div style={{fontSize: 9, color: '#6b7280'}}>FC: {fp(m.delivery_fc_pct)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{display:'flex', justifyContent:'flex-end', borderTop:'1px solid #f3f4f6', paddingTop:10}}>
          <Btn ch={<span style={{display:'flex', alignItems:'center', gap:4}}><Pencil size={11}/> Edit Menu Item</span>} v='secondary' onClick={(e) => { e.stopPropagation(); setModal(m) }}/>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:800,color:'#111',margin:0}}>Dashboard</h1>
        <p style={{fontSize:13,color:'#9ca3af',marginTop:4}}>Live overview · shared across your team</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)',gap:12,marginBottom:24}}>
        <StatCard icon={Package}        label='Raw Materials' value={rms.length} sub='ingredients tracked'              color={{bg:'#eff6ff',ico:'#2563eb'}} onClick={() => onNavigate('raw')}/>
        <StatCard icon={FlaskConical}   label='Intermediates' value={ints.length} sub='prep recipes'                   color={{bg:'#ccfbf1',ico:'#0d9488'}} onClick={() => onNavigate('intermediates')}/>
        <StatCard icon={UtensilsCrossed}label='Menu Items'    value={mis.length} sub='on your menu'                    color={{bg:'#ccfbf1',ico:'#0d9488'}} onClick={() => onNavigate('menu')}/>
        <StatCard icon={ShieldAlert}    label='FC% Alerts'    value={alerts.length} sub={`${warnings.length} warnings`} color={alerts.length>0?{bg:'#fee2e2',ico:'#dc2626'}:{bg:'#dcfce7',ico:'#16a34a'}} onClick={() => onNavigate('menu')}/>
      </div>

      {alerts.length>0&&(
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:14,padding:16,marginBottom:20}}>
          <div style={{display:'flex',alignItems:'center',gap:8,fontWeight:700,fontSize:13,color:'#991b1b',marginBottom:12}}>
            <AlertTriangle size={15}/> {alerts.length} item{alerts.length!==1?'s':''} exceed{alerts.length===1?'s':''} your {threshold}% FC% threshold
          </div>
          {alerts.map(m=>{
            const isExpanded = expandedId === m.id
            return (
              <div key={m.id} style={{background:'#fff',border:'1px solid #fecaca',borderRadius:10,marginBottom:6,overflow:'hidden'}}>
                <div onClick={() => setExpandedId(isExpanded ? null : m.id)} style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'stretch' : 'center',justifyContent:'space-between',padding:'10px 14px',cursor:'pointer',gap: isMobile ? 8 : 0}}
                  onMouseOver={e=>e.currentTarget.style.background='#fafafa'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    {isExpanded ? <ChevronUp size={14} style={{color:'#dc2626'}}/> : <ChevronDown size={14} style={{color:'#dc2626'}}/>}
                    <span style={{fontWeight:700,fontSize:13}}>{m.name}</span>
                    {m.category&&<Bdg ch={m.category} c='gray'/>}
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,fontSize:12}}>
                    <span style={{color:'#6b7280'}}>FC: <strong style={{color:'#111'}}>{fc(m.food)}</strong></span>
                    <span style={{color:'#6b7280'}}>SP: <strong style={{color:'#111'}}>{fc(m.sp)}</strong></span>
                    <FCBadge pct={m.pct} threshold={threshold}/>
                  </div>
                </div>
                {isExpanded && <DetailPanel m={m} />}
              </div>
            )
          })}
        </div>
      )}

      <div style={{fontWeight:700,fontSize:13,color:'#374151',marginBottom:12}}>All Menu Items — Pricing Overview</div>
      {pricings.length===0?(
        <div style={{textAlign:'center',padding:'64px 0',color:'#d1d5db',border:'2px dashed #f1f1f1',borderRadius:16,fontSize:14}}>
          Add raw materials, build recipes, and your full cost analysis appears here.
        </div>
      ):(
        <div style={{background:'#fff',border:'1px solid #f1f1f1',borderRadius:16,overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth: 700}}>
            <thead>
              <tr style={{background:'#f9fafb'}}>
                {['Item','Category','Food Type','Food Cost','Dine-In','Takeaway','Delivery','Dine-In FC%'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:'#9ca3af',fontSize:11}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pricings.map(m=>{
                const isExpanded = expandedId === m.id
                return (
                  <React.Fragment key={m.id}>
                    <tr onClick={() => setExpandedId(isExpanded ? null : m.id)} style={{borderTop:'1px solid #f9fafb', cursor:'pointer'}}
                      onMouseOver={e=>e.currentTarget.style.background='#fafafa'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'10px 14px',fontWeight:700,color:'#111'}}>
                        <div style={{display:'flex', alignItems:'center', gap:6}}>
                          {isExpanded ? <ChevronUp size={14} style={{color:'#9ca3af'}}/> : <ChevronDown size={14} style={{color:'#9ca3af'}}/>}
                          {m.name}
                        </div>
                      </td>
                      <td style={{padding:'10px 14px',color:'#6b7280'}}>{m.category||'—'}</td>
                      <td style={{padding:'10px 14px'}}><Bdg ch={m.food_type||'—'} c={FT_COLOR_MAP[m.food_type]||'gray'}/></td>
                      <td style={{padding:'10px 14px',fontWeight:600}}>{fc(m.food)}</td>
                      <td style={{padding:'10px 14px',fontWeight:700}}>{fc(m.sp)}</td>
                      <td style={{padding:'10px 14px',fontWeight:700,color:'#374151'}}>{fc(m.tp)}</td>
                      <td style={{padding:'10px 14px',fontWeight:700,color:'#0f766e'}}>{fc(m.dp)}</td>
                      <td style={{padding:'10px 14px'}}><FCBadge pct={m.pct} threshold={threshold}/></td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${m.id}-detail`} style={{background:'#fafbfc'}}>
                        <td colSpan={8} style={{padding:0}}>
                          <DetailPanel m={m} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <MIModal
          item={modal}
          onSave={save}
          onClose={() => setModal(null)}
          rms={rms}
          ints={ints}
          pc={pc}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// RAW MATERIALS PAGE
// ─────────────────────────────────────────────────────────
export const RMPage = ({rms, setRms}) => {
  const [modal, setModal] = useState(null)
  const [q, setQ]         = useState('')
  const isMobile          = useIsMobile()
  const filtered = rms.filter(r=>(r?.name || '').toLowerCase().includes(q.toLowerCase())||(r?.category||'').toLowerCase().includes(q.toLowerCase()))
  const save = rm => { setRms(rms.find(r=>r.id===rm.id)?rms.map(r=>r.id===rm.id?rm:r):[...rms,rm]); setModal(null) }
  const saveBulk = items => { setRms(items); setModal(null) }
  const del  = id => { if(confirm('Delete this raw material? It may break recipes that use it.')) setRms(rms.filter(r=>r.id!==id)) }

  return (
    <div>
      <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'stretch' : 'center',justifyContent:'space-between',marginBottom:20,gap: 12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'#111',margin:0}}>Raw Materials</h1>
          <p style={{fontSize:13,color:'#9ca3af',marginTop:4}}>{rms.length} ingredients · the foundation of all recipes</p>
        </div>
        <div style={{display:'flex',gap:10,flexDirection: isMobile ? 'column' : 'row'}}>
          <Btn ch={<><Plus size={14}/>Add Raw Material</>} v='primary' onClick={()=>setModal('new')}/>
          <Btn ch='Batch Import' v='secondary' onClick={()=>setModal('import')}/>
        </div>
      </div>
      <div style={{position:'relative',marginBottom:16}}>
        <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#d1d5db'}}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder='Search by name or category…'
          style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:10,padding:'9px 12px 9px 34px',fontSize:13,outline:'none'}}/>
      </div>
      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'64px 0',color:'#d1d5db',border:'2px dashed #f1f1f1',borderRadius:16,fontSize:14}}>
          {rms.length===0?'No raw materials yet — add your first ingredient!':'No results found.'}
        </div>
      ):(
        <div style={{background:'#fff',border:'1px solid #f1f1f1',borderRadius:16,overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth: 800}}>
            <thead>
              <tr style={{background:'#f9fafb'}}>
                {['Name & Category','Type','Buy Unit','Pack Cost','Qty / Pack','Usage Unit','Unit Cost',''].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:'#9ca3af',fontSize:11,whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(rm=>(
                <tr key={rm.id} style={{borderTop:'1px solid #f9fafb'}}
                  onMouseOver={e=>e.currentTarget.style.background='#fafafa'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{fontWeight:700,color:'#111'}}>{rm.name}</div>
                    <div style={{fontSize:11,color:'#9ca3af'}}>{[rm.category,rm.sub_category].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td style={{padding:'10px 14px'}}><Bdg ch={rm.food_type||'—'} c={FT_COLOR_MAP[rm.food_type]||'gray'}/></td>
                  <td style={{padding:'10px 14px',color:'#6b7280'}}>{rm.buy_unit}</td>
                  <td style={{padding:'10px 14px'}}>{fc(rm.pack_cost)}</td>
                  <td style={{padding:'10px 14px',color:'#6b7280'}}>{rm.pack_qty}</td>
                  <td style={{padding:'10px 14px',color:'#6b7280'}}>{rm.usage_unit}</td>
                  <td style={{padding:'10px 14px'}}>
                    <span style={{fontWeight:700,color:'#0f766e'}}>{fc(rmUC(rm))}</span>
                    <span style={{fontSize:11,color:'#9ca3af'}}>/{rm.usage_unit}</span>
                  </td>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={()=>setModal(rm)} style={{padding:5,border:'none',background:'none',cursor:'pointer',color:'#9ca3af',borderRadius:6,display:'flex'}}
                        onMouseOver={e=>e.currentTarget.style.background='#f3f4f6'} onMouseOut={e=>e.currentTarget.style.background='none'}>
                        <Pencil size={12}/>
                      </button>
                      <button onClick={()=>del(rm.id)} style={{padding:5,border:'none',background:'none',cursor:'pointer',color:'#9ca3af',borderRadius:6,display:'flex'}}
                        onMouseOver={e=>e.currentTarget.style.background='#fee2e2'} onMouseOut={e=>e.currentTarget.style.background='none'}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal==='import' && <BatchImportModal rms={rms} onSave={saveBulk} onClose={()=>setModal(null)}/>}
      {modal && modal!=='import' && <RMModal rm={modal==='new'?null:modal} onSave={save} onClose={()=>setModal(null)}/>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// INTERMEDIATES PAGE
// ─────────────────────────────────────────────────────────
export const IntPage = ({ints, setInts, rms}) => {
  const [modal, setModal] = useState(null)
  const [q, setQ]         = useState('')
  const isMobile          = useIsMobile()
  const filtered = ints.filter(i=>(i?.name || '').toLowerCase().includes(q.toLowerCase())||(i?.category||'').toLowerCase().includes(q.toLowerCase()))
  const save = it => { setInts(ints.find(i=>i.id===it.id)?ints.map(i=>i.id===it.id?it:i):[...ints,it]); setModal(null) }
  const saveBulk = items => { setInts(items); setModal(null) }
  const del  = id => { if(confirm('Delete this intermediate? It may break menu items that use it.')) setInts(ints.filter(i=>i.id!==id)) }

  return (
    <div>
      <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'stretch' : 'center',justifyContent:'space-between',marginBottom:20,gap: 12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'#111',margin:0}}>Intermediates</h1>
          <p style={{fontSize:13,color:'#9ca3af',marginTop:4}}>{ints.length} prep recipes · sauces, marinades, bases</p>
        </div>
        <div style={{display:'flex',gap:10,flexDirection: isMobile ? 'column' : 'row'}}>
          <Btn ch={<><Plus size={14}/>Add Intermediate</>} v='primary' onClick={()=>setModal('new')} disabled={rms.length===0}/>
          <Btn ch='Batch Import' v='secondary' onClick={()=>setModal('import')} disabled={rms.length===0}/>
        </div>
      </div>
      {rms.length===0&&<div style={{marginBottom:16}}><InfoBox color='blue'>Add raw materials first before creating intermediates.</InfoBox></div>}
      <div style={{position:'relative',marginBottom:16}}>
        <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#d1d5db'}}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder='Search intermediates…'
          style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:10,padding:'9px 12px 9px 34px',fontSize:13,outline:'none'}}/>
      </div>
      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'64px 0',color:'#d1d5db',border:'2px dashed #f1f1f1',borderRadius:16,fontSize:14}}>
          {ints.length===0?'No intermediates yet.':'No results found.'}
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {filtered.map(it=>{
            const tc=it.ingredients.reduce((s,i)=>s+ingCost(i,rms,ints),0), uc=intUC(it,rms,ints)
            return (
              <div key={it.id} style={{background:'#fff',border:'1px solid #f1f1f1',borderRadius:14,padding:'14px 18px'}}>
                <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'stretch' : 'flex-start',justifyContent:'space-between',gap: 12}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:'#111'}}>{it.name}</div>
                    <div style={{fontSize:12,color:'#9ca3af',marginTop:2}}>{it.category||'No category'} · {it.ingredients.length} ingredient{it.ingredients.length!==1?'s':''}</div>
                  </div>
                  <div style={{display:'flex',gap:14,alignItems:'center',justifyContent: isMobile ? 'space-between' : 'flex-end',marginTop: isMobile ? 8 : 0}}>
                    <div style={{textAlign:'right'}}><div style={{fontSize:11,color:'#9ca3af'}}>Total cost</div><div style={{fontWeight:700,fontSize:14,color:'#374151'}}>{fc(tc)}</div></div>
                    <div style={{textAlign:'right'}}><div style={{fontSize:11,color:'#9ca3af'}}>Per {it.yield_unit}</div><div style={{fontWeight:700,fontSize:14,color:'#0f766e'}}>{fc(uc)}</div></div>
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={()=>setModal(it)} style={{padding:6,border:'none',background:'#f9fafb',cursor:'pointer',color:'#6b7280',borderRadius:6,display:'flex'}}><Pencil size={12}/></button>
                      <button onClick={()=>del(it.id)}   style={{padding:6,border:'none',background:'#f9fafb',cursor:'pointer',color:'#6b7280',borderRadius:6,display:'flex'}}><Trash2 size={12}/></button>
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                  {it.ingredients.map(ing=>{
                    const info=ing.type==='raw'?rms.find(r=>r.id===ing.id):ints.find(i=>i.id===ing.id)
                    return <Bdg key={ing.id} ch={`${info?.name||'?'} (${ing.qty} ${ing.unit})`} c='gray'/>
                  })}
                  <Bdg ch={`Yield: ${it.yield_qty} ${it.yield_unit}`} c='amber'/>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {modal==='import' && <BatchImportIntModal rms={rms} ints={ints} onSave={saveBulk} onClose={()=>setModal(null)}/>}
      {modal && modal!=='import' && <IntModal inter={modal==='new'?null:modal} onSave={save} onClose={()=>setModal(null)} rms={rms} ints={ints}/>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MENU ITEMS PAGE
// ─────────────────────────────────────────────────────────
export const MIPage = ({mis, setMis, rms, ints, pc}) => {
  const [modal, setModal]   = useState(null)
  const [q, setQ]           = useState('')
  const [filterCat, setFCat]= useState('')
  const isMobile          = useIsMobile()
  const cats      = [...new Set(mis.map(m=>m.category).filter(Boolean))].sort()
  const threshold = pc.global.fc_alert_threshold
  const pricings  = useMemo(()=>mis.map(m=>({...m,...calcPricing(m,rms,ints,pc)})),[mis,rms,ints,pc])
  const filtered  = pricings.filter(m=>
    ((m?.name || '').toLowerCase().includes(q.toLowerCase())||(m?.category||'').toLowerCase().includes(q.toLowerCase()))
    &&(!filterCat||m.category===filterCat)
  )
  const save = mi => { setMis(mis.find(m=>m.id===mi.id)?mis.map(m=>m.id===mi.id?mi:m):[...mis,mi]); setModal(null) }
  const saveBulk = items => { setMis(items); setModal(null) }
  const del  = id => { if(confirm('Delete this menu item?')) setMis(mis.filter(m=>m.id!==id)) }

  return (
    <div>
      <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'stretch' : 'center',justifyContent:'space-between',marginBottom:20,gap: 12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'#111',margin:0}}>Menu Items</h1>
          <p style={{fontSize:13,color:'#9ca3af',marginTop:4}}>{mis.length} items · full recipe costing and pricing</p>
        </div>
        <div style={{display:'flex',gap:10,flexDirection: isMobile ? 'column' : 'row'}}>
          <Btn ch={<><Plus size={14}/>Add Menu Item</>} v='primary' onClick={()=>setModal('new')} disabled={rms.length===0}/>
          <Btn ch='Batch Import' v='secondary' onClick={()=>setModal('import')} disabled={rms.length===0}/>
        </div>
      </div>
      {rms.length===0&&<div style={{marginBottom:16}}><InfoBox color='blue'>Add raw materials first before creating menu items.</InfoBox></div>}
      <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',gap:10,marginBottom:16}}>
        <div style={{position:'relative',flex:1}}>
          <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#d1d5db'}}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder='Search menu items…'
            style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:10,padding:'9px 12px 9px 34px',fontSize:13,outline:'none'}}/>
        </div>
        {cats.length>0&&(
          <select value={filterCat} onChange={e=>setFCat(e.target.value)}
            style={{border:'1px solid #e5e7eb',borderRadius:10,padding:'9px 12px',fontSize:13,color:filterCat?'#374151':'#9ca3af',outline:'none',background:'#fff',minWidth: 160}}>
            <option value=''>All categories</option>
            {cats.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>
      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'64px 0',color:'#d1d5db',border:'2px dashed #f1f1f1',borderRadius:16,fontSize:14}}>
          {mis.length===0?'No menu items yet.':'No results found.'}
        </div>
      ):(
        <div style={{background:'#fff',border:'1px solid #f1f1f1',borderRadius:16,overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth: 800}}>
            <thead>
              <tr style={{background:'#f9fafb'}}>
                {['Item','Category','Type','Food Cost','Dine-In Price','Takeaway Price','Delivery Price','Dine-In FC%','Takeaway FC%','Delivery FC%',''].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:'#9ca3af',fontSize:11,whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m=>(
                <tr key={m.id} style={{borderTop:'1px solid #f9fafb'}}
                  onMouseOver={e=>e.currentTarget.style.background='#fafafa'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{fontWeight:700,color:'#111'}}>{m.name}</div>
                    {m.sub_category&&<div style={{fontSize:11,color:'#9ca3af'}}>{m.sub_category}</div>}
                  </td>
                  <td style={{padding:'10px 14px',color:'#6b7280'}}>{m.category||'—'}</td>
                  <td style={{padding:'10px 14px'}}><Bdg ch={m.food_type||'—'} c={FT_COLOR_MAP[m.food_type]||'gray'}/></td>
                  <td style={{padding:'10px 14px',fontWeight:600}}>{fc(m.food)}</td>
                  <td style={{padding:'10px 14px',fontWeight:800,color:'#111'}}>{fc(m.sp)}</td>
                  <td style={{padding:'10px 14px',fontWeight:700,color:'#374151'}}>{fc(m.tp)}</td>
                  <td style={{padding:'10px 14px',fontWeight:800,color:'#0f766e'}}>{fc(m.dp)}</td>
                  <td style={{padding:'10px 14px'}}><FCBadge pct={m.pct} threshold={threshold}/></td>
                  <td style={{padding:'10px 14px'}}><FCBadge pct={m.takeaway_fc_pct} threshold={threshold}/></td>
                  <td style={{padding:'10px 14px'}}><FCBadge pct={m.delivery_fc_pct} threshold={threshold}/></td>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={()=>setModal(mis.find(x=>x.id===m.id))} style={{padding:5,border:'none',background:'none',cursor:'pointer',color:'#9ca3af',borderRadius:6,display:'flex'}}
                        onMouseOver={e=>e.currentTarget.style.background='#f3f4f6'} onMouseOut={e=>e.currentTarget.style.background='none'}>
                        <Pencil size={12}/>
                      </button>
                      <button onClick={()=>del(m.id)} style={{padding:5,border:'none',background:'none',cursor:'pointer',color:'#9ca3af',borderRadius:6,display:'flex'}}
                        onMouseOver={e=>e.currentTarget.style.background='#fee2e2'} onMouseOut={e=>e.currentTarget.style.background='none'}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal==='import' && <BatchImportMIModal rms={rms} ints={ints} mis={mis} onSave={saveBulk} onClose={()=>setModal(null)} pc={pc}/>}
      {modal && modal!=='import' && <MIModal item={modal==='new'?null:modal} onSave={save} onClose={()=>setModal(null)} rms={rms} ints={ints} pc={pc}/>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────────────────
export const SettingsPage = ({pc, setPc, mis}) => {
  const [draft, setDraft]     = useState(()=>JSON.parse(JSON.stringify(pc)))
  const [cascade, setCascade] = useState(null)
  const [flash, setFlash]     = useState(false)
  const isMobile              = useIsMobile()

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
    setTimeout(()=>setFlash(false),2200)
  }

  const Card = ({title,children}) => (
    <div style={{background:'#fff',border:'1px solid #f1f1f1',borderRadius:16,overflow:'hidden',marginBottom:20}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid #f9fafb',fontSize:13,fontWeight:700,color:'#374151'}}>{title}</div>
      <div style={{padding:'16px 20px'}}>{children}</div>
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'stretch' : 'center',justifyContent:'space-between',marginBottom:24,gap: 12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'#111',margin:0}}>Settings</h1>
          <p style={{fontSize:13,color:'#9ca3af',marginTop:4}}>Global defaults → category overrides → per-item rules</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,justifyContent: isMobile ? 'space-between' : 'flex-end'}}>
          {flash&&<span style={{fontSize:12,color:'#166534',background:'#dcfce7',padding:'4px 12px',borderRadius:8,fontWeight:600}}>Saved!</span>}
          <Btn ch='Save All Settings' v='primary' onClick={saveGlobal}/>
        </div>
      </div>

      <Card title='Global Defaults'>
        <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)',gap:12}}>
          {FIELDS.map(f=>(
            <Inp key={f.k} label={f.l} v={draft.global[f.k]} onChange={v=>updG(f.k,v)} type='number' min='0' step={f.step} unit={f.u}/>
          ))}
          <Inp label='FC% Alert Threshold' v={draft.global.fc_alert_threshold} onChange={v=>updG('fc_alert_threshold',v)} type='number' min='0' step='1' unit='%'/>
        </div>
        <div style={{marginTop:12}}>
          <InfoBox color='gray'>
            SP = Food Cost × {draft.global.sp_multiplier}× &nbsp;·&nbsp; Delivery = (SP + ₹{draft.global.packaging_cost}) × (1 + {draft.global.delivery_markup}%) &nbsp;·&nbsp; Alert fires above {draft.global.fc_alert_threshold}% FC
          </InfoBox>
        </div>
      </Card>

      <Card title='Category Overrides (leave blank to inherit global)'>
        {cats.length===0?(
          <p style={{fontSize:13,color:'#9ca3af'}}>No categories yet — add menu items with categories to create overrides.</p>
        ):(
          <div style={{overflowX: 'auto'}}>
            <div style={{minWidth: 600}}>
              <div style={{display:'grid',gridTemplateColumns:'1.5fr repeat(3,1fr)',gap:10,padding:'6px 0',borderBottom:'1px solid #f1f1f1',marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:700,color:'#9ca3af'}}>CATEGORY</span>
                {FIELDS.map(f=><span key={f.k} style={{fontSize:11,fontWeight:700,color:'#9ca3af'}}>{f.l.toUpperCase()} ({f.u})</span>)}
              </div>
              {cats.map(cat=>(
                <div key={cat} style={{display:'grid',gridTemplateColumns:'1.5fr repeat(3,1fr)',gap:10,padding:'10px 0',borderBottom:'1px solid #f9fafb',alignItems:'center'}}>
                  <span style={{fontSize:13,fontWeight:600,color:'#374151'}}>{cat}</span>
                  {FIELDS.map(f=>{
                    const ov=draft.category_overrides[cat]?.[f.k]
                    return (
                      <div key={f.k} style={{position:'relative'}}>
                        <input type='number' min='0' step={f.step} placeholder={String(draft.global[f.k])} value={ov!=null?ov:''}
                          onChange={e=>updCat(cat,f.k,e.target.value===''?null:e.target.value)}
                          style={{width:'100%',boxSizing:'border-box',border:`1px solid ${ov!=null?'#2dd4bf':'#e5e7eb'}`,borderRadius:6,padding:'5px 28px 5px 8px',fontSize:12,outline:'none',background:ov!=null?'#f0fdfa':'#fff'}}/>
                        <span style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'#9ca3af'}}>{f.u}</span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <p style={{fontSize:11,color:'#9ca3af',marginTop:8}}>Highlighted fields are active overrides. Blank = uses global default.</p>
          </div>
        )}
      </Card>

      <Card title='Per-Item Overrides (leave blank to inherit category or global)'>
        {mis.length===0?(
          <p style={{fontSize:13,color:'#9ca3af'}}>No menu items yet.</p>
        ):(
          <div style={{overflowX: 'auto'}}>
            <div style={{minWidth: 700}}>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr repeat(3,1fr)',gap:10,padding:'6px 0',borderBottom:'1px solid #f1f1f1',marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:700,color:'#9ca3af'}}>ITEM</span>
                <span style={{fontSize:11,fontWeight:700,color:'#9ca3af'}}>CATEGORY</span>
                {FIELDS.map(f=><span key={f.k} style={{fontSize:11,fontWeight:700,color:'#9ca3af'}}>{f.l.toUpperCase()} ({f.u})</span>)}
              </div>
              {mis.map(mi=>(
                <div key={mi.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr repeat(3,1fr)',gap:10,padding:'10px 0',borderBottom:'1px solid #f9fafb',alignItems:'center'}}>
                  <span style={{fontSize:13,fontWeight:600,color:'#374151'}}>{mi.name}</span>
                  <span style={{fontSize:12,color:'#9ca3af'}}>{mi.category||'—'}</span>
                  {FIELDS.map(f=>{
                    const ov=draft.item_overrides[mi.id]?.[f.k]
                    const catV=draft.category_overrides[mi.category]?.[f.k]
                    const ph=catV!=null?`${catV} (cat)`:`${draft.global[f.k]} (glb)`
                    return (
                      <div key={f.k} style={{position:'relative'}}>
                        <input type='number' min='0' step={f.step} placeholder={ph} value={ov!=null?ov:''}
                          onChange={e=>updItem(mi.id,f.k,e.target.value===''?null:e.target.value)}
                          style={{width:'100%',boxSizing:'border-box',border:`1px solid ${ov!=null?'#a78bfa':'#e5e7eb'}`,borderRadius:6,padding:'5px 28px 5px 8px',fontSize:12,outline:'none',background:ov!=null?'#faf5ff':'#fff'}}/>
                        <span style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'#9ca3af'}}>{f.u}</span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <p style={{fontSize:11,color:'#9ca3af',marginTop:8}}>Yellow = category override · Purple = item override · Blank = inherits from category or global</p>
          </div>
        )}
      </Card>

      {cascade&&<CascadeModal data={cascade} onConfirm={doSave} onClose={()=>setCascade(null)} mis={mis}/>}
    </div>
  )
}
