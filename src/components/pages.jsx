import React, { useState, useMemo, useEffect } from 'react'
import {
  Package, FlaskConical, UtensilsCrossed, ShieldAlert, AlertTriangle,
  Plus, Search, Pencil, Trash2, ChevronDown, ChevronUp, RefreshCcw,
  Eye, Sparkles, RotateCcw, Check, Copy, Lock, Mail, AlertCircle
} from 'lucide-react'
import { Btn, Bdg, FCBadge, InfoBox, Inp, Sel, Label } from './UIPrimitives.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useUI } from '../context/UIContext.jsx'
import { supabase } from '../lib/storage.js'
import { RMModal, IntModal, MIModal, CascadeModal, BatchImportModal, BatchImportIntModal, BatchImportMIModal } from './modals.jsx'
import { FT_COLOR_MAP } from '../constants.js'
import { fc, fp, rmUC, ingCost, intUC, calcPricing } from '../utils.js'
import { useIsMobile } from '../hooks/useIsMobile.js'

// ─────────────────────────────────────────────────────────
// PRICING CELLS COMMON COMPONENT
// ─────────────────────────────────────────────────────────
export const PricingCells = ({ m }) => {
  return (
    <>
      <td style={{padding:'10px 14px',fontWeight:800,color:'var(--text-primary)'}}>{fc(m.food)}</td>
      <td style={{padding:'10px 14px',fontWeight:800,color:'var(--primary)'}}>{fc(m.sp)}</td>
      <td style={{padding:'10px 14px',fontWeight:500,color:'var(--text-muted)'}}>{fc(m.tp)}</td>
      <td style={{padding:'10px 14px',fontWeight:500,color:'var(--text-muted)'}}>{fc(m.dp)}</td>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────
export const Dashboard = ({rms, ints, mis, pc, onNavigate, setMis, cardOrder, setCardOrder, chartOrder, setChartOrder}) => {
  const { confirm, showToast } = useUI()
  const { org } = useAuth()
  const threshold = pc.global.fc_alert_threshold
  const pricings  = useMemo(()=>mis.map(m=>({...m,...calcPricing(m,rms,ints,pc)})),[mis,rms,ints,pc])
  const alerts    = pricings.filter(m=>m.pct>threshold)
  const warnings  = pricings.filter(m=>m.pct>threshold*0.85&&m.pct<=threshold)
  const isMobile  = useIsMobile()

  const handleDragStart = (e, cardId) => {
    e.dataTransfer.setData('text/plain', cardId)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e, targetCardId) => {
    e.preventDefault()
    const draggedCardId = e.dataTransfer.getData('text/plain')
    if (draggedCardId === targetCardId) return

    if (['ingredients', 'menu', 'avg_cost', 'alerts'].includes(draggedCardId)) {
      const newOrder = [...cardOrder]
      const draggedIdx = newOrder.indexOf(draggedCardId)
      const targetIdx = newOrder.indexOf(targetCardId)
      
      if (draggedIdx > -1 && targetIdx > -1) {
        newOrder.splice(draggedIdx, 1)
        newOrder.splice(targetIdx, 0, draggedCardId)
        setCardOrder(newOrder)
      }
    } else if (['costs_chart', 'dietary_chart', 'expenses_chart'].includes(draggedCardId)) {
      const newOrder = [...chartOrder]
      const draggedIdx = newOrder.indexOf(draggedCardId)
      const targetIdx = newOrder.indexOf(targetCardId)
      
      if (draggedIdx > -1 && targetIdx > -1) {
        newOrder.splice(draggedIdx, 1)
        newOrder.splice(targetIdx, 0, draggedCardId)
        setChartOrder(newOrder)
      }
    }
  }

  const [expandedId, setExpandedId] = useState(null)
  const [modal, setModal]           = useState(null)

  const save = (item) => {
    setMis(mis.map(m => m.id === item.id ? item : m))
    setModal(null)
    showToast('Menu item updated successfully!', 'success')
  }

  // Average Cost Metrics
  const avgFc = useMemo(() => {
    if (pricings.length === 0) return 0
    const total = pricings.reduce((sum, item) => sum + item.pct, 0)
    return total / pricings.length
  }, [pricings])

  // Worst Performing Items (High Food Cost %)
  const worstPerformers = useMemo(() => {
    return [...pricings]
      .filter(m => m.pct > 0)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3)
  }, [pricings])

  // Dietary Breakdown Donut Calculations
  const typeCounts = useMemo(() => {
    const counts = { Vegetarian: 0, 'Non-Vegetarian': 0, Vegan: 0, Jain: 0, Eggetarian: 0 }
    mis.forEach(m => {
      if (m.food_type && counts[m.food_type] !== undefined) counts[m.food_type]++
    })
    return counts
  }, [mis])

  const donutData = useMemo(() => {
    const total = Object.values(typeCounts).reduce((a, b) => a + b, 0)
    if (total === 0) return []
    
    let cumulative = 0
    const radius = 35
    const circumference = 2 * Math.PI * radius
    
    return Object.entries(typeCounts).map(([type, count]) => {
      const percentage = (count / total) * 100
      const dashArray = `${(percentage / 100) * circumference} ${circumference}`
      const dashOffset = -(cumulative / 100) * circumference
      cumulative += percentage
      return {
        type,
        count,
        percentage,
        dashArray,
        dashOffset,
        color: FT_COLOR_MAP[type] || 'gray'
      }
    }).filter(d => d.count > 0)
  }, [typeCounts])

  // Top Expense Ingredients Calculations
  const topExpenses = useMemo(() => {
    return [...rms]
      .map(r => ({ ...r, unitCost: rmUC(r) }))
      .sort((a, b) => b.unitCost - a.unitCost)
      .slice(0, 5)
  }, [rms])

  const maxExpenseCost = useMemo(() => {
    return Math.max(...topExpenses.map(r => r.unitCost), 1)
  }, [topExpenses])

  const StatCard = ({cardId,icon:Icon,label,value,sub,color,onClick}) => {
    return (
      <div
        className="glass-panel hover-scale"
        onClick={onClick}
        draggable
        onDragStart={(e) => handleDragStart(e, cardId)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, cardId)}
        style={{
          borderRadius:16,
          padding:18,
          display:'flex',
          alignItems:'center',
          gap:14,
          cursor:'grab',
        }}
      >
        <div style={{padding:10,borderRadius:12,background:color.bg,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon size={20} style={{color:color.ico}}/></div>
        <div>
          <div style={{fontSize:26,fontWeight:800,color:'var(--text-primary)',lineHeight:1}}>{value}</div>
          <div style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginTop:2}}>{label}</div>
          <div style={{fontSize:11,color:'var(--text-light)'}}>{sub}</div>
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
      <div style={{padding: '16px 20px', background: 'var(--bg-hover)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderTop: '1px solid var(--border-color)'}}>
        <div style={{display:'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent:'space-between', alignItems:'flex-start', gap:20, marginBottom:16}}>
          {/* Ingredients Column */}
          <div style={{flex: 1, minWidth: 260}}>
            <div style={{fontWeight: 700, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', tracking: '0.05em', marginBottom: 8}}>Recipe Cost Breakdown</div>
            <div style={{borderLeft: '2px solid var(--border-strong)', paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 6}}>
              {ingDetails.map((ing, idx) => {
                const target = ing.type === 'raw' ? rms.find(r=>r.id===ing.id) : ints.find(i=>i.id===ing.id)
                const name = target?.name || 'Unknown Ingredient'
                return (
                  <div key={idx} style={{display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-secondary)'}}>
                    <span>{name} ({ing.amount}{ing.unit})</span>
                    <span style={{fontWeight: 600, color: 'var(--text-primary)'}}>{fc(ing.cost)}</span>
                  </div>
                )
              })}
              <div style={{display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:700, color:'var(--text-primary)', borderTop:'1px solid var(--border-color)', paddingTop:4, marginTop:4}}>
                <span>Total Food Cost</span>
                <span>{fc(m.food)}</span>
              </div>
            </div>
          </div>

          {/* Margins Column */}
          <div style={{flex: 1, minWidth: 260}}>
            <div style={{fontWeight: 700, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', tracking: '0.05em', marginBottom: 8}}>Channel Margins & Payouts</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              {/* Dine-In */}
              <div style={{background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <span style={{fontWeight: 700, fontSize: 11, color: 'var(--text-primary)'}}>Dine-In (SP: {fc(m.sp)})</span>
                  <div style={{fontSize: 9, color: 'var(--text-light)'}}>Cost: {fc(m.food)}</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontWeight: 700, fontSize: 12, color: '#10b981'}}>Profit: {fc(dineInMargin)}</div>
                  <div style={{fontSize: 9, color: 'var(--text-muted)'}}>FC: {fp(m.pct)}</div>
                </div>
              </div>
              {/* Takeaway */}
              <div style={{background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <span style={{fontWeight: 700, fontSize: 11, color: 'var(--text-primary)'}}>Takeaway (TP: {fc(m.tp)})</span>
                  <div style={{fontSize: 9, color: 'var(--text-light)'}}>Cost + Pkg: {fc(m.food + m.pkg)}</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontWeight: 700, fontSize: 12, color: '#10b981'}}>Profit: {fc(takeawayMargin)}</div>
                  <div style={{fontSize: 9, color: 'var(--text-muted)'}}>FC: {fp(m.takeaway_fc_pct)}</div>
                </div>
              </div>
              {/* Delivery */}
              <div style={{background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <span style={{fontWeight: 700, fontSize: 11, color: 'var(--text-primary)'}}>Delivery (DP: {fc(m.dp)})</span>
                  <div style={{fontSize: 9, color: 'var(--text-light)'}}>Net Payout: {fc(deliveryNetPayout)}</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontWeight: 700, fontSize: 12, color: deliveryMargin > 0 ? '#10b981' : '#ef4444'}}>Profit: {fc(deliveryMargin)}</div>
                  <div style={{fontSize: 9, color: 'var(--text-muted)'}}>FC: {fp(m.delivery_fc_pct)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{display:'flex', justifyContent:'flex-end', borderTop:'1px solid var(--border-color)', paddingTop:10}}>
          <Btn ch={<span style={{display:'flex', alignItems:'center', gap:4}}><Pencil size={11}/> Edit Menu Item</span>} v='secondary' onClick={(e) => { e.stopPropagation(); setModal(m) }}/>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'var(--text-primary)',margin:0}}>Dashboard</h1>
          <p style={{fontSize:13,color:'var(--text-light)',marginTop:4}}>Live overview · shared across your team</p>
        </div>
        <div style={{display:'flex', alignItems:'center', gap: 12}}>
          {((cardOrder && JSON.stringify(cardOrder) !== JSON.stringify(['ingredients', 'menu', 'avg_cost', 'alerts'])) ||
            (chartOrder && JSON.stringify(chartOrder) !== JSON.stringify(['costs_chart', 'dietary_chart', 'expenses_chart']))) && (
            <button onClick={() => {
              setCardOrder(['ingredients', 'menu', 'avg_cost', 'alerts']);
              setChartOrder(['costs_chart', 'dietary_chart', 'expenses_chart']);
            }}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              Reset Layout
            </button>
          )}
          {org?.logo_url && (
            <img src={org.logo_url} alt="Org Logo" style={{maxHeight: 40, maxWidth: 120, borderRadius: 8, objectFit: 'contain'}}/>
          )}
        </div>
      </div>
      
      {/* Stat Cards */}
      <div style={{display:'grid',gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4,1fr)',gap:12,marginBottom:24}}>
        {cardOrder.map(cardId => {
          if (cardId === 'ingredients') {
            return <StatCard key="ingredients" cardId="ingredients" icon={Package} label='Total Ingredients' value={rms.length + ints.length} sub={`${rms.length} Raw / ${ints.length} Prep`} color={{bg:'rgba(59,130,246,0.12)',ico:'#3b82f6'}} onClick={() => onNavigate('raw')}/>
          }
          if (cardId === 'menu') {
            return <StatCard key="menu" cardId="menu" icon={UtensilsCrossed} label='Menu Items' value={mis.length} sub='Items on menu' color={{bg:'rgba(139,92,246,0.12)',ico:'#8b5cf6'}} onClick={() => onNavigate('menu')}/>
          }
          if (cardId === 'avg_cost') {
            return <StatCard key="avg_cost" cardId="avg_cost" icon={FlaskConical} label='Avg Food Cost %' value={pricings.length > 0 ? `${avgFc.toFixed(1)}%` : '—'} sub={`Target: <${threshold}%`} color={{bg:'rgba(20,184,166,0.12)',ico:'#14b8a6'}} onClick={() => onNavigate('menu')}/>
          }
          if (cardId === 'alerts') {
            return <StatCard key="alerts" cardId="alerts" icon={ShieldAlert} label='FC% Alerts' value={alerts.length} sub={`${warnings.length} warnings`} color={alerts.length>0?{bg:'rgba(239,68,68,0.12)',ico:'#ef4444'}:{bg:'rgba(16,185,129,0.12)',ico:'#10b981'}} onClick={() => onNavigate('menu')}/>
          }
          return null
        })}
      </div>

      {/* Visual Analytics Charts Panel */}
      <div style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap:16, marginBottom:24}}>
        {chartOrder.map(chartId => {
          if (chartId === 'costs_chart') {
            return (
              <div key="costs_chart" draggable onDragStart={(e) => handleDragStart(e, 'costs_chart')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'costs_chart')} className="glass-panel" style={{borderRadius:16, padding:20, display:'flex', flexDirection:'column', cursor:'grab'}}>
                <div style={{fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:14}}>Menu Costs vs. Selling Price</div>
                {pricings.length === 0 ? (
                  <div style={{height: 220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-light)', fontSize:12}}>Add menu items to see comparison</div>
                ) : (
                  <div style={{maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 6, flex: 1}}>
                    {pricings.map(m => {
                      const maxVal = Math.max(...pricings.map(x => x.sp), 1)
                      const costPercent = (m.food / maxVal) * 100
                      const pricePercent = (m.sp / maxVal) * 100
                      return (
                        <div key={m.id} style={{display:'flex', alignItems:'center', gap: 10}}>
                          <div style={{width: 90, fontSize: 11, fontWeight: 600, textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap', color:'var(--text-secondary)'}}>{m.name}</div>
                          <div style={{flex: 1, display:'flex', flexDirection:'column', gap: 3}}>
                            {/* Cost Bar */}
                            <div style={{display:'flex', alignItems:'center', gap: 6}}>
                              <div style={{width: `${costPercent}%`, height: 5, background: '#ef4444', borderRadius: 3}}/>
                              <span style={{fontSize: 8, color: 'var(--text-light)'}}>{fc(m.food)}</span>
                            </div>
                            {/* Selling Price Bar */}
                            <div style={{display:'flex', alignItems:'center', gap: 6}}>
                              <div style={{width: `${pricePercent}%`, height: 5, background: 'var(--primary)', borderRadius: 3}}/>
                              <span style={{fontSize: 8, color: 'var(--text-light)'}}>{fc(m.sp)}</span>
                            </div>
                          </div>
                          <div style={{width: 50, textAlign:'right'}}>
                            <FCBadge pct={m.pct} threshold={threshold}/>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }
          if (chartId === 'expenses_chart') {
            return (
              <div key="expenses_chart" draggable onDragStart={(e) => handleDragStart(e, 'expenses_chart')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'expenses_chart')} className="glass-panel" style={{borderRadius:16, padding:20, display:'flex', flexDirection:'column', cursor:'grab'}}>
                <div style={{fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:14}}>Top Expense Ingredients</div>
                {rms.length === 0 ? (
                  <div style={{height: 220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-light)', fontSize:12}}>Add raw materials to see analytics</div>
                ) : (
                  <div style={{display:'flex', flexDirection:'column', gap: 12, flex: 1, justifyContent:'center'}}>
                    {topExpenses.map(rm => (
                      <div key={rm.id}>
                        <div style={{display:'flex', justifyContent:'space-between', fontSize: 11, marginBottom: 4}}>
                          <span style={{fontWeight:600, color:'var(--text-secondary)', textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap', maxWidth: 120}}>{rm.name}</span>
                          <span style={{fontWeight:700, color:'var(--primary)'}}>{fc(rm.unitCost)}/{rm.usage_unit}</span>
                        </div>
                        <div style={{width:'100%', height: 6, background:'var(--border-color)', borderRadius: 3, overflow:'hidden'}}>
                          <div style={{width: `${(rm.unitCost / maxExpenseCost) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), #06b6d4)', borderRadius: 3, transition:'width 0.5s ease-in-out'}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          }
          if (chartId === 'dietary_chart') {
            return (
              <div key="dietary_chart" draggable onDragStart={(e) => handleDragStart(e, 'dietary_chart')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'dietary_chart')} className="glass-panel" style={{borderRadius:16, padding:20, display:'flex', flexDirection:'column', cursor:'grab'}}>
                <div style={{fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom: 12}}>Optimizations & Segments</div>
                {mis.length === 0 ? (
                  <div style={{height: 220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-light)', fontSize:12}}>No data available</div>
                ) : (
                  <div style={{display:'flex', flexDirection:'column', gap: 14, flex: 1, justifyContent:'space-between'}}>
                    {/* Donut section */}
                    <div style={{display:'flex', alignItems:'center', gap: 10, justifyContent:'space-around'}}>
                      <svg width="64" height="64" viewBox="0 0 100 100" style={{flexShrink: 0}}>
                        {donutData.map((d) => (
                          <circle
                            key={d.type}
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke={
                              d.color === 'green' ? '#10b981' :
                              d.color === 'red' ? '#ef4444' :
                              d.color === 'teal' ? '#14b8a6' :
                              d.color === 'orange' ? '#f97316' :
                              d.color === 'yellow' ? '#eab308' : '#94a3b8'
                            }
                            strokeWidth="12"
                            strokeDasharray={d.dashArray}
                            strokeDashoffset={d.dashOffset}
                            transform="rotate(-90 50 50)"
                          />
                        ))}
                        <text x="50" y="47" textAnchor="middle" dominantBaseline="middle" style={{fontSize: 14, fontWeight: 800, fill: 'var(--text-primary)'}}>
                          {mis.length}
                        </text>
                        <text x="50" y="58" textAnchor="middle" dominantBaseline="middle" style={{fontSize: 7, fontWeight: 700, fill: 'var(--text-light)', textTransform: 'uppercase'}}>
                          Items
                        </text>
                      </svg>
                      <div style={{display:'flex', flexDirection:'column', gap: 3, maxHeight: 60, overflowY: 'auto'}}>
                        {donutData.map(d => (
                          <div key={d.type} style={{display:'flex', alignItems:'center', gap: 4, fontSize: 9}}>
                            <div style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: d.color === 'green' ? '#10b981' :
                                          d.color === 'red' ? '#ef4444' :
                                          d.color === 'teal' ? '#14b8a6' :
                                          d.color === 'orange' ? '#f97316' :
                                          d.color === 'yellow' ? '#eab308' : '#94a3b8'
                            }}/>
                            <span style={{fontWeight:600, color:'var(--text-secondary)'}}>{d.type} ({d.count})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Worst performers cost alert section */}
                    <div style={{borderTop:'1px solid var(--border-color)', paddingTop: 10}}>
                      <div style={{fontSize:10, fontWeight:700, color:'var(--text-light)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 6}}>
                        High Food Cost Alert (Optimize)
                      </div>
                      <div style={{display:'flex', flexDirection:'column', gap: 5}}>
                        {worstPerformers.length === 0 ? (
                          <div style={{fontSize: 11, color: 'var(--text-light)', textAlign:'center'}}>All item costs are normal.</div>
                        ) : (
                          worstPerformers.map(m => (
                            <div key={m.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', fontSize: 11, padding:'4px 8px', borderRadius: 6, background: m.pct > threshold ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-hover)'}}>
                              <span style={{fontWeight:600, color:'var(--text-secondary)', textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap', maxWidth: 110}}>{m.name}</span>
                              <div style={{display:'flex', alignItems:'center', gap: 8}}>
                                <span style={{fontSize: 10, color:'var(--text-light)'}}>{fc(m.food)} cost</span>
                                <FCBadge pct={m.pct} threshold={threshold}/>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          }
          return null
        })}
      </div>

      <div style={{fontWeight:700,fontSize:13,color:'var(--text-secondary)',marginBottom:12}}>All Menu Items — Pricing Overview</div>
      {pricings.length===0?(
        <div style={{textAlign:'center',padding:'64px 0',color:'var(--text-light)',border:'2px dashed var(--border-color)',borderRadius:16,fontSize:14}}>
          Add raw materials, build recipes, and your full cost analysis appears here.
        </div>
      ):(
        <div className="glass-panel" style={{borderRadius:16,overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth: 700}}>
            <thead>
              <tr style={{background:'var(--bg-hover)'}}>
                {['Item','Category','Food Type','Food Cost','Dine-In','Takeaway','Delivery','Dine-In FC%'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:'var(--text-light)',fontSize:11}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pricings.map(m=>{
                const isExpanded = expandedId === 'table-' + m.id
                return (
                  <React.Fragment key={m.id}>
                    <tr onClick={() => setExpandedId(isExpanded ? null : 'table-' + m.id)} style={{borderTop:'1px solid var(--border-color)', cursor:'pointer'}}
                      onMouseOver={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'10px 14px',fontWeight:700,color:'var(--text-primary)'}}>
                        <div style={{display:'flex', alignItems:'center', gap:6}}>
                          {isExpanded ? <ChevronUp size={14} style={{color:'var(--text-light)'}}/> : <ChevronDown size={14} style={{color:'var(--text-light)'}}/>}
                          {m.name}
                        </div>
                      </td>
                      <td style={{padding:'10px 14px',color:'var(--text-muted)'}}>{m.category||'—'}</td>
                      <td style={{padding:'10px 14px'}}><Bdg ch={m.food_type||'—'} c={FT_COLOR_MAP[m.food_type]||'gray'}/></td>
                      <PricingCells m={m} />
                      <td style={{padding:'10px 14px'}}><FCBadge pct={m.pct} threshold={threshold}/></td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${m.id}-detail`} style={{background:'var(--bg-hover)'}}>
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
          mis={mis}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// RAW MATERIALS PAGE
// ─────────────────────────────────────────────────────────
export const RMPage = ({rms, setRms, logEvent, profile, pc}) => {
  const { confirm, showToast } = useUI()
  const [modal, setModal] = useState(null)
  const [q, setQ]         = useState('')
  const [filterCat, setFCat] = useState('')
  const [sortBy, setSortBy] = useState('name-asc')
  const isMobile          = useIsMobile()

  const cats = useMemo(() => [...new Set(rms.map(r => r.category).filter(Boolean))].sort(), [rms])

  const filtered = useMemo(() => {
    let result = rms.filter(r => 
      ((r?.name || '').toLowerCase().includes(q.toLowerCase()) || (r?.category || '').toLowerCase().includes(q.toLowerCase())) &&
      (!filterCat || r.category === filterCat)
    )

    if (sortBy === 'name-asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    } else if (sortBy === 'name-desc') {
      result.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
    } else if (sortBy === 'cost-asc') {
      result.sort((a, b) => rmUC(a) - rmUC(b))
    } else if (sortBy === 'cost-desc') {
      result.sort((a, b) => rmUC(b) - rmUC(a))
    }
    return result
  }, [rms, q, filterCat, sortBy])
  
  const allowEdit = profile?.role === 'owner' || pc?.permissions?.allow_edit_ingredients !== false

  const save = rm => { 
    const isEdit = rms.some(r=>r.id===rm.id)
    const old = rms.find(r=>r.id===rm.id)
    setRms(rms.find(r=>r.id===rm.id)?rms.map(r=>r.id===rm.id?rm:r):[...rms,rm]); 
    setModal(null);
    showToast(isEdit ? 'Raw material updated!' : 'Raw material added!', 'success')
    if (logEvent) {
      logEvent(
        isEdit ? 'Updated' : 'Created',
        'Raw Material',
        rm.name,
        isEdit 
          ? `Changed Buy Unit from ${old.buy_unit} to ${rm.buy_unit}, Pack Cost from ₹${old.pack_cost} to ₹${rm.pack_cost}`
          : `Added new raw material with unit cost of ₹${rmUC(rm).toFixed(2)}/${rm.usage_unit}`
      )
    }
  }
  const saveBulk = items => { 
    setRms(items); 
    setModal(null);
    showToast('Batch imports complete!', 'success')
    if (logEvent) {
      logEvent('Imported', 'Raw Materials', 'Batch Import', `Imported ${items.length} raw materials via CSV/JSON`)
    }
  }
  const del  = async id => { 
    const old = rms.find(r => r.id === id)
    if(await confirm('Delete this raw material?', 'It may break recipes that use it.')) {
      setRms(rms.filter(r=>r.id!==id)) 
      showToast('Raw material deleted successfully.', 'success')
      if (logEvent && old) {
        logEvent('Deleted', 'Raw Material', old.name, `Removed from list of raw materials`)
      }
    }
  }

  return (
    <div>
      <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'stretch' : 'center',justifyContent:'space-between',marginBottom:20,gap: 12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'var(--text-primary)',margin:0}}>Raw Materials</h1>
          <p style={{fontSize:13,color:'var(--text-light)',marginTop:4}}>{rms.length} ingredients · the foundation of all recipes</p>
        </div>
        <div style={{display:'flex',gap:10,flexDirection: isMobile ? 'column' : 'row'}}>
          <Btn ch={<><Plus size={14}/>Add Raw Material</>} v='primary' disabled={!allowEdit} onClick={()=>setModal('new')}/>
          <Btn ch='Batch Import' v='secondary' disabled={!allowEdit} onClick={()=>setModal('import')}/>
        </div>
      </div>
      {!allowEdit && (
        <div style={{ background: 'linear-gradient(135deg, var(--bg-hover) 0%, var(--bg-app) 100%)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>⚠️ Workspace editing is locked for team members by the administrator.</span>
        </div>
      )}
      <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',gap:10,marginBottom:16}}>
        <div style={{position:'relative',flex:1}}>
          <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-light)'}}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder='Search raw materials…'
            className="custom-input"
            style={{width:'100%',boxSizing:'border-box',border:'1px solid var(--border-strong)',borderRadius:10,padding:'9px 12px 9px 34px',fontSize:13,outline:'none',color:'var(--text-primary)',background:'var(--bg-card)',transition:'all 0.15s ease'}}/>
        </div>
        <div style={{display:'flex',gap:10,width: isMobile ? '100%' : 'auto'}}>
          {cats.length>0&&(
            <select value={filterCat} onChange={e=>setFCat(e.target.value)}
              className="custom-input"
              style={{flex: isMobile ? 1 : 'none', border:'1px solid var(--border-strong)',borderRadius:10,padding:'9px 12px',fontSize:13,color:filterCat?'var(--text-secondary)':'var(--text-light)',outline:'none',background:'var(--bg-card)',minWidth: isMobile ? '0' : '150px',cursor:'pointer',transition:'all 0.15s ease'}}>
              <option value=''>All categories</option>
              {cats.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            className="custom-input"
            style={{flex: isMobile ? 1 : 'none', border:'1px solid var(--border-strong)',borderRadius:10,padding:'9px 12px',fontSize:13,color:'var(--text-secondary)',outline:'none',background:'var(--bg-card)',minWidth: isMobile ? '0' : '150px',cursor:'pointer',transition:'all 0.15s ease'}}>
            <option value='name-asc'>Name (A-Z)</option>
            <option value='name-desc'>Name (Z-A)</option>
            <option value='cost-asc'>Cost: Low to High</option>
            <option value='cost-desc'>Cost: High to Low</option>
          </select>
        </div>
      </div>
      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'64px 0',color:'var(--text-light)',border:'2px dashed var(--border-color)',borderRadius:16,fontSize:14}}>
          {rms.length===0?'No raw materials yet — add your first ingredient!':'No results found.'}
        </div>
      ):(
        <div className="glass-panel" style={{borderRadius:16,overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth: 800}}>
            <thead>
              <tr style={{background:'var(--bg-hover)'}}>
                {['Name & Category','Type','Buy Unit','Pack Cost','Qty / Pack','Usage Unit','Unit Cost',''].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:'var(--text-light)',fontSize:11,whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(rm=>(
                <tr key={rm.id} style={{borderTop:'1px solid var(--border-color)'}}
                  onMouseOver={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{fontWeight:700,color:'var(--text-primary)'}}>{rm.name}</div>
                    <div style={{fontSize:11,color:'var(--text-light)'}}>{[rm.category,rm.sub_category].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td style={{padding:'10px 14px'}}><Bdg ch={rm.food_type||'—'} c={FT_COLOR_MAP[rm.food_type]||'gray'}/></td>
                  <td style={{padding:'10px 14px',color:'var(--text-muted)'}}>{rm.buy_unit}</td>
                  <td style={{padding:'10px 14px',color:'var(--text-secondary)'}}>{fc(rm.pack_cost)}</td>
                  <td style={{padding:'10px 14px',color:'var(--text-muted)'}}>{rm.pack_qty}</td>
                  <td style={{padding:'10px 14px',color:'var(--text-muted)'}}>{rm.usage_unit}</td>
                  <td style={{padding:'10px 14px'}}>
                    <span style={{fontWeight:700,color:'var(--primary)'}}>{fc(rmUC(rm))}</span>
                    <span style={{fontSize:11,color:'var(--text-light)'}}>/{rm.usage_unit}</span>
                  </td>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={()=>setModal(rm)} style={{padding:5,border:'none',background:'none',cursor:'pointer',color:'var(--text-light)',borderRadius:6,display:'flex',transition:'all 0.1s'}}
                        onMouseOver={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseOut={e=>e.currentTarget.style.background='none'}>
                        {allowEdit ? <Pencil size={12}/> : <Eye size={12}/>}
                      </button>
                      {allowEdit && (
                        <button onClick={()=>del(rm.id)} style={{padding:5,border:'none',background:'none',cursor:'pointer',color:'var(--text-light)',borderRadius:6,display:'flex',transition:'all 0.1s'}}
                          onMouseOver={e=>e.currentTarget.style.background='rgba(239,68,68,0.1)'} onMouseOut={e=>e.currentTarget.style.background='none'}>
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal==='import' && <BatchImportModal rms={rms} onSave={saveBulk} onClose={()=>setModal(null)}/>}
      {modal && modal!=='import' && <RMModal rm={modal==='new'?null:modal} onSave={save} onClose={()=>setModal(null)} rms={rms} readOnly={!allowEdit}/>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// INTERMEDIATES PAGE
// ─────────────────────────────────────────────────────────
export const IntPage = ({ints, setInts, rms, logEvent, profile, pc}) => {
  const { confirm, showToast } = useUI()
  const [modal, setModal] = useState(null)
  const [q, setQ]         = useState('')
  const [filterCat, setFCat] = useState('')
  const [sortBy, setSortBy] = useState('name-asc')
  const isMobile          = useIsMobile()

  const cats = useMemo(() => [...new Set(ints.map(i => i.category).filter(Boolean))].sort(), [ints])

  const filtered = useMemo(() => {
    let result = ints.filter(i => 
      ((i?.name || '').toLowerCase().includes(q.toLowerCase()) || (i?.category || '').toLowerCase().includes(q.toLowerCase())) &&
      (!filterCat || i.category === filterCat)
    )

    if (sortBy === 'name-asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    } else if (sortBy === 'name-desc') {
      result.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
    } else if (sortBy === 'cost-asc') {
      result.sort((a, b) => intUC(a, rms, ints) - intUC(b, rms, ints))
    } else if (sortBy === 'cost-desc') {
      result.sort((a, b) => intUC(b, rms, ints) - intUC(a, rms, ints))
    }
    return result
  }, [ints, q, filterCat, sortBy, rms])
  
  const allowEdit = profile?.role === 'owner' || pc?.permissions?.allow_edit_ingredients !== false

  const save = it => { 
    const isEdit = ints.some(i=>i.id===it.id)
    setInts(ints.find(i=>i.id===it.id)?ints.map(i=>i.id===it.id?it:i):[...ints,it]); 
    setModal(null);
    showToast(isEdit ? 'Intermediate updated!' : 'Intermediate added!', 'success')
    if (logEvent) {
      logEvent(
        isEdit ? 'Updated' : 'Created',
        'Intermediate Recipe',
        it.name,
        isEdit
          ? `Modified recipe ingredients list (yield: ${it.yield_qty} ${it.yield_unit})`
          : `Added new preparation base recipe with ${it.ingredients.length} ingredients`
      )
    }
  }
  const saveBulk = items => { 
    setInts(items); 
    setModal(null);
    showToast('Batch imports complete!', 'success')
    if (logEvent) {
      logEvent('Imported', 'Intermediates', 'Batch Import', `Imported ${items.length} intermediate recipes via CSV/JSON`)
    }
  }
  const del  = async id => { 
    const old = ints.find(i => i.id === id)
    if(await confirm('Delete this intermediate?', 'It may break menu items that use it.')) {
      setInts(ints.filter(i=>i.id!==id)) 
      showToast('Intermediate deleted successfully.', 'success')
      if (logEvent && old) {
        logEvent('Deleted', 'Intermediate Recipe', old.name, `Removed from intermediate recipes list`)
      }
    }
  }

  return (
    <div>
      <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'stretch' : 'center',justifyContent:'space-between',marginBottom:20,gap: 12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'var(--text-primary)',margin:0}}>Intermediates</h1>
          <p style={{fontSize:13,color:'var(--text-light)',marginTop:4}}>{ints.length} prep recipes · sauces, marinades, bases</p>
        </div>
        <div style={{display:'flex',gap:10,flexDirection: isMobile ? 'column' : 'row'}}>
          <Btn ch={<><Plus size={14}/>Add Intermediate</>} v='primary' onClick={()=>setModal('new')} disabled={rms.length===0 || !allowEdit}/>
          <Btn ch='Batch Import' v='secondary' onClick={()=>setModal('import')} disabled={rms.length===0 || !allowEdit}/>
        </div>
      </div>
      {!allowEdit && (
        <div style={{ background: 'linear-gradient(135deg, var(--bg-hover) 0%, var(--bg-app) 100%)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>⚠️ Workspace editing is locked for team members by the administrator.</span>
        </div>
      )}
      {rms.length===0&&<div style={{marginBottom:16}}><InfoBox color='blue'>Add raw materials first before creating intermediates.</InfoBox></div>}
      <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',gap:10,marginBottom:16}}>
        <div style={{position:'relative',flex:1}}>
          <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-light)'}}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder='Search intermediates…'
            className="custom-input"
            style={{width:'100%',boxSizing:'border-box',border:'1px solid var(--border-strong)',borderRadius:10,padding:'9px 12px 9px 34px',fontSize:13,outline:'none',color:'var(--text-primary)',background:'var(--bg-card)',transition:'all 0.15s ease'}}/>
        </div>
        <div style={{display:'flex',gap:10,width: isMobile ? '100%' : 'auto'}}>
          {cats.length>0&&(
            <select value={filterCat} onChange={e=>setFCat(e.target.value)}
              className="custom-input"
              style={{flex: isMobile ? 1 : 'none', border:'1px solid var(--border-strong)',borderRadius:10,padding:'9px 12px',fontSize:13,color:filterCat?'var(--text-secondary)':'var(--text-light)',outline:'none',background:'var(--bg-card)',minWidth: isMobile ? '0' : '150px',cursor:'pointer',transition:'all 0.15s ease'}}>
              <option value=''>All categories</option>
              {cats.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            className="custom-input"
            style={{flex: isMobile ? 1 : 'none', border:'1px solid var(--border-strong)',borderRadius:10,padding:'9px 12px',fontSize:13,color:'var(--text-secondary)',outline:'none',background:'var(--bg-card)',minWidth: isMobile ? '0' : '150px',cursor:'pointer',transition:'all 0.15s ease'}}>
            <option value='name-asc'>Name (A-Z)</option>
            <option value='name-desc'>Name (Z-A)</option>
            <option value='cost-asc'>Cost: Low to High</option>
            <option value='cost-desc'>Cost: High to Low</option>
          </select>
        </div>
      </div>
      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'64px 0',color:'var(--text-light)',border:'2px dashed var(--border-color)',borderRadius:16,fontSize:14}}>
          {ints.length===0?'No intermediates yet.':'No results found.'}
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {filtered.map(it=>{
            const tc=it.ingredients.reduce((s,i)=>s+ingCost(i,rms,ints),0), uc=intUC(it,rms,ints)
            return (
              <div key={it.id} className="glass-panel hover-scale" style={{borderRadius:14,padding:'14px 18px'}}>
                <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'stretch' : 'flex-start',justifyContent:'space-between',gap: 12}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:'var(--text-primary)'}}>{it.name}</div>
                    <div style={{fontSize:12,color:'var(--text-light)',marginTop:2}}>{it.category||'No category'} · {it.ingredients.length} ingredient{it.ingredients.length!==1?'s':''}</div>
                  </div>
                  <div style={{display:'flex',gap:14,alignItems:'center',justifyContent: isMobile ? 'space-between' : 'flex-end',marginTop: isMobile ? 8 : 0}}>
                    <div style={{textAlign:'right'}}><div style={{fontSize:11,color:'var(--text-light)'}}>Total cost</div><div style={{fontWeight:700,fontSize:14,color:'var(--text-secondary)'}}>{fc(tc)}</div></div>
                    <div style={{textAlign:'right'}}><div style={{fontSize:11,color:'var(--text-light)'}}>Per {it.yield_unit}</div><div style={{fontWeight:700,fontSize:14,color:'var(--primary)'}}>{fc(uc)}</div></div>
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={()=>setModal(it)} style={{padding:6,border:'none',background:'var(--bg-hover)',cursor:'pointer',color:'var(--text-muted)',borderRadius:6,display:'flex',transition:'color 0.1s'}}
                        onMouseOver={e=>e.currentTarget.style.color='var(--text-primary)'}>
                        {allowEdit ? <Pencil size={12}/> : <Eye size={12}/>}
                      </button>
                      {allowEdit && (
                        <button onClick={()=>del(it.id)}   style={{padding:6,border:'none',background:'var(--bg-hover)',cursor:'pointer',color:'var(--text-muted)',borderRadius:6,display:'flex',transition:'color 0.1s'}}
                          onMouseOver={e=>e.currentTarget.style.color='#ef4444'}><Trash2 size={12}/></button>
                      )}
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
      {modal && modal!=='import' && <IntModal inter={modal==='new'?null:modal} onSave={save} onClose={()=>setModal(null)} rms={rms} ints={ints} readOnly={!allowEdit}/>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MENU ITEMS PAGE
// ─────────────────────────────────────────────────────────
export const MIPage = ({mis, setMis, rms, ints, pc, logEvent, profile}) => {
  const { confirm, showToast } = useUI()
  const [modal, setModal]   = useState(null)
  const [q, setQ]           = useState('')
  const [filterCat, setFCat]= useState('')
  const [filterType, setFType] = useState('')
  const [sortBy, setSortBy] = useState('name-asc')
  const isMobile          = useIsMobile()
  const cats      = useMemo(() => [...new Set(mis.map(m=>m.category).filter(Boolean))].sort(), [mis])
  const threshold = pc.global.fc_alert_threshold
  const pricings  = useMemo(()=>mis.map(m=>({...m,...calcPricing(m,rms,ints,pc)})),[mis,rms,ints,pc])
  
  const filtered = useMemo(() => {
    let result = pricings.filter(m =>
      ((m?.name || '').toLowerCase().includes(q.toLowerCase()) || (m?.category || '').toLowerCase().includes(q.toLowerCase())) &&
      (!filterCat || m.category === filterCat) &&
      (!filterType || m.food_type === filterType)
    )

    if (sortBy === 'name-asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    } else if (sortBy === 'name-desc') {
      result.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
    } else if (sortBy === 'price-asc') {
      result.sort((a, b) => a.sp - b.sp)
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.sp - a.sp)
    } else if (sortBy === 'cost-asc') {
      result.sort((a, b) => a.food - b.food)
    } else if (sortBy === 'cost-desc') {
      result.sort((a, b) => b.food - a.food)
    } else if (sortBy === 'fc-asc') {
      result.sort((a, b) => a.pct - b.pct)
    } else if (sortBy === 'fc-desc') {
      result.sort((a, b) => b.pct - a.pct)
    }
    return result
  }, [pricings, q, filterCat, filterType, sortBy])
  
  const allowEdit = profile?.role === 'owner' || pc?.permissions?.allow_edit_menu_items !== false

  const save = mi => { 
    const isEdit = mis.some(m=>m.id===mi.id)
    setMis(mis.find(m=>m.id===mi.id)?mis.map(m=>m.id===mi.id?mi:m):[...mis,mi]); 
    setModal(null);
    showToast(isEdit ? 'Menu item updated!' : 'Menu item added!', 'success')
    if (logEvent) {
      logEvent(
        isEdit ? 'Updated' : 'Created',
        'Menu Item',
        mi.name,
        isEdit
          ? `Updated recipes or selling prices overrides`
          : `Added new item to the menu card`
      )
    }
  }
  const saveBulk = items => { 
    setMis(items); 
    setModal(null);
    showToast('Batch imports complete!', 'success')
    if (logEvent) {
      logEvent('Imported', 'Menu Items', 'Batch Import', `Imported ${items.length} menu items via CSV/JSON`)
    }
  }
  const del  = async id => { 
    const old = mis.find(m => m.id === id)
    if(await confirm('Delete this menu item?', 'This action cannot be undone.')) {
      setMis(mis.filter(m=>m.id!==id)) 
      showToast('Menu item deleted successfully.', 'success')
      if (logEvent && old) {
        logEvent('Deleted', 'Menu Item', old.name, `Removed from the menu card list`)
      }
    }
  }

  return (
    <div>
      <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'stretch' : 'center',justifyContent:'space-between',marginBottom:20,gap: 12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'var(--text-primary)',margin:0}}>Menu Items</h1>
          <p style={{fontSize:13,color:'var(--text-light)',marginTop:4}}>{mis.length} items · full recipe costing and pricing</p>
        </div>
        <div style={{display:'flex',gap:10,flexDirection: isMobile ? 'column' : 'row'}}>
          <Btn ch={<><Plus size={14}/>Add Menu Item</>} v='primary' onClick={()=>setModal('new')} disabled={rms.length===0 || !allowEdit}/>
          <Btn ch='Batch Import' v='secondary' onClick={()=>setModal('import')} disabled={rms.length===0 || !allowEdit}/>
        </div>
      </div>
      {!allowEdit && (
        <div style={{ background: 'linear-gradient(135deg, var(--bg-hover) 0%, var(--bg-app) 100%)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>⚠️ Workspace editing is locked for team members by the administrator.</span>
        </div>
      )}
      {rms.length===0&&<div style={{marginBottom:16}}><InfoBox color='blue'>Add raw materials first before creating menu items.</InfoBox></div>}
      <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',gap:10,marginBottom:16}}>
        <div style={{position:'relative',flex:1}}>
          <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-light)'}}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder='Search menu items…'
            className="custom-input"
            style={{width:'100%',boxSizing:'border-box',border:'1px solid var(--border-strong)',borderRadius:10,padding:'9px 12px 9px 34px',fontSize:13,outline:'none',color:'var(--text-primary)',background:'var(--bg-card)',transition:'all 0.15s ease'}}/>
        </div>
        <div style={{display:'flex',gap:10,width: isMobile ? '100%' : 'auto'}}>
          {cats.length>0&&(
            <select value={filterCat} onChange={e=>setFCat(e.target.value)}
              className="custom-input"
              style={{flex: isMobile ? 1 : 'none', border:'1px solid var(--border-strong)',borderRadius:10,padding:'9px 12px',fontSize:13,color:filterCat?'var(--text-secondary)':'var(--text-light)',outline:'none',background:'var(--bg-card)',minWidth: isMobile ? '0' : '140px',cursor:'pointer',transition:'all 0.15s ease'}}>
              <option value=''>All categories</option>
              {cats.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select value={filterType} onChange={e=>setFType(e.target.value)}
            className="custom-input"
            style={{flex: isMobile ? 1 : 'none', border:'1px solid var(--border-strong)',borderRadius:10,padding:'9px 12px',fontSize:13,color:filterType?'var(--text-secondary)':'var(--text-light)',outline:'none',background:'var(--bg-card)',minWidth: isMobile ? '0' : '140px',cursor:'pointer',transition:'all 0.15s ease'}}>
            <option value=''>All Types</option>
            <option value='Vegetarian'>Vegetarian</option>
            <option value='Non-Vegetarian'>Non-Vegetarian</option>
            <option value='Vegan'>Vegan</option>
            <option value='Eggetarian'>Eggetarian</option>
            <option value='Jain'>Jain</option>
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            className="custom-input"
            style={{flex: isMobile ? 1 : 'none', border:'1px solid var(--border-strong)',borderRadius:10,padding:'9px 12px',fontSize:13,color:'var(--text-secondary)',outline:'none',background:'var(--bg-card)',minWidth: isMobile ? '0' : '140px',cursor:'pointer',transition:'all 0.15s ease'}}>
            <option value='name-asc'>Name (A-Z)</option>
            <option value='name-desc'>Name (Z-A)</option>
            <option value='price-asc'>Price: Low to High</option>
            <option value='price-desc'>Price: High to Low</option>
            <option value='cost-asc'>Food Cost: Low to High</option>
            <option value='cost-desc'>Food Cost: High to Low</option>
            <option value='fc-asc'>Food Cost %: Low to High</option>
            <option value='fc-desc'>Food Cost %: High to Low</option>
          </select>
        </div>
      </div>
      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'64px 0',color:'var(--text-light)',border:'2px dashed var(--border-color)',borderRadius:16,fontSize:14}}>
          {mis.length===0?'No menu items yet.':'No results found.'}
        </div>
      ):(
        <div className="glass-panel" style={{borderRadius:16,overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth: 800}}>
            <thead>
              <tr style={{background:'var(--bg-hover)'}}>
                {['Item','Category','Type','Food Cost','Dine-In Price','Takeaway Price','Delivery Price','Dine-In FC%','Takeaway FC%','Delivery FC%',''].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:'var(--text-light)',fontSize:11,whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m=>(
                <tr key={m.id} style={{borderTop:'1px solid var(--border-color)'}}
                  onMouseOver={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{fontWeight:700,color:'var(--text-primary)'}}>{m.name}</div>
                    {m.sub_category&&<div style={{fontSize:11,color:'var(--text-light)'}}>{m.sub_category}</div>}
                  </td>
                  <td style={{padding:'10px 14px',color:'var(--text-muted)'}}>{m.category||'—'}</td>
                  <td style={{padding:'10px 14px'}}><Bdg ch={m.food_type||'—'} c={FT_COLOR_MAP[m.food_type]||'gray'}/></td>
                  <PricingCells m={m} />
                  <td style={{padding:'10px 14px'}}><FCBadge pct={m.pct} threshold={threshold}/></td>
                  <td style={{padding:'10px 14px'}}><FCBadge pct={m.takeaway_fc_pct} threshold={threshold}/></td>
                  <td style={{padding:'10px 14px'}}><FCBadge pct={m.delivery_fc_pct} threshold={threshold}/></td>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={()=>setModal(mis.find(x=>x.id===m.id))} style={{padding:5,border:'none',background:'none',cursor:'pointer',color:'var(--text-light)',borderRadius:6,display:'flex',transition:'all 0.15s ease'}}
                        onMouseOver={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseOut={e=>e.currentTarget.style.background='none'}>
                        {allowEdit ? <Pencil size={12}/> : <Eye size={12}/>}
                      </button>
                      {allowEdit && (
                        <button onClick={()=>del(m.id)} style={{padding:5,border:'none',background:'none',cursor:'pointer',color:'var(--text-light)',borderRadius:6,display:'flex',transition:'all 0.15s ease'}}
                          onMouseOver={e=>e.currentTarget.style.background='rgba(239,68,68,0.1)'} onMouseOut={e=>e.currentTarget.style.background='none'}>
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal==='import' && <BatchImportMIModal rms={rms} ints={ints} mis={mis} onSave={saveBulk} onClose={()=>setModal(null)} pc={pc}/>}
      {modal && modal!=='import' && <MIModal item={modal==='new'?null:modal} onSave={save} onClose={()=>setModal(null)} rms={rms} ints={ints} pc={pc} mis={mis} readOnly={!allowEdit}/>}
    </div>
  )
}

const CategoryList = ({items, setItems, logType, logEvent, isMobile}) => {
  const { showToast, confirm } = useUI()
  const [editingCat, setEditingCat] = useState(null)
  const [editVal, setEditVal] = useState('')

  const catCounts = useMemo(() => {
    const counts = {}
    items.forEach(it => {
      const c = it.category || 'Uncategorized'
      counts[c] = (counts[c] || 0) + 1
    })
    return Object.entries(counts).sort((a,b) => a[0].localeCompare(b[0]))
  }, [items])

  const handleRename = (oldName, newName) => {
    if (!newName.trim() || oldName === newName) {
      setEditingCat(null)
      return
    }
    const updated = items.map(it => {
      const currentCat = it.category || 'Uncategorized'
      if (currentCat === oldName) {
        return { ...it, category: newName.trim() }
      }
      return it
    })
    setItems(updated)
    setEditingCat(null)
    showToast(`Renamed category to "${newName}"`, 'success')
    if (logEvent) {
      logEvent('Updated', `${logType} Category`, oldName, `Renamed category to "${newName}"`)
    }
  }

  const handleDelete = async (catName) => {
    if (catName === 'Uncategorized') return
    if (await confirm(`Delete category "${catName}"?`, `This will reset the category for all associated items.`)) {
      const updated = items.map(it => {
        const currentCat = it.category || 'Uncategorized'
        if (currentCat === catName) {
          return { ...it, category: '' }
        }
        return it
      })
      setItems(updated)
      showToast(`Deleted category "${catName}"`, 'warning')
      if (logEvent) {
        logEvent('Deleted', `${logType} Category`, catName, `Cleared category for all matching items`)
      }
    }
  }

  if (catCounts.length === 0) {
    return <div style={{fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0'}}>No categories found.</div>
  }

  return (
    <div style={{display:'flex', flexDirection:'column', gap:10}}>
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

// ─────────────────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────────────────
export const SettingsPage = ({pc, setPc, mis, rms, ints, profile, org, setRms, setInts, setMis, seedSampleData, invitedEmails = [], inviteMember, revokeInvite, activityLog, logEvent}) => {
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

  const loadRequests = async () => {
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
  }

  useEffect(() => {
    loadRequests()
  }, [org?.id, profile?.role])

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
                  } catch(err) {}
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
                {/* Timeline Line */}
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
                      {/* Timeline Dot */}
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
        <Card title='Workspace Category Manager'>
          <div style={{display:'flex', flexDirection:'column', gap:20}}>
            <p style={{fontSize:13, color:'var(--text-light)', margin:0}}>
              View and manage categories used across raw materials, intermediates, and menu items. Renaming a category updates all associated items.
            </p>
            
            <div style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap:16}}>
              {/* Raw Materials Categories */}
              <div className="glass-panel" style={{borderRadius:12, padding:16, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border-color)'}}>
                <div style={{fontWeight:700, fontSize:12, color:'var(--text-secondary)', marginBottom:12, borderBottom:'1px solid var(--border-color)', paddingBottom:6}}>Raw Material Categories</div>
                <CategoryList type="raw" items={rms} setItems={setRms} logType="Raw Material" logEvent={logEvent} isMobile={isMobile} />
              </div>
              
              {/* Intermediates Categories */}
              <div className="glass-panel" style={{borderRadius:12, padding:16, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border-color)'}}>
                <div style={{fontWeight:700, fontSize:12, color:'var(--text-secondary)', marginBottom:12, borderBottom:'1px solid var(--border-color)', paddingBottom:6}}>Prep Recipe Categories</div>
                <CategoryList type="int" items={ints} setItems={setInts} logType="Intermediate Recipe" logEvent={logEvent} isMobile={isMobile} />
              </div>
              
              {/* Menu Item Categories */}
              <div className="glass-panel" style={{borderRadius:12, padding:16, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border-color)'}}>
                <div style={{fontWeight:700, fontSize:12, color:'var(--text-secondary)', marginBottom:12, borderBottom:'1px solid var(--border-color)', paddingBottom:6}}>Menu Item Categories</div>
                <CategoryList type="menu" items={mis} setItems={setMis} logType="Menu Item" logEvent={logEvent} isMobile={isMobile} />
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
