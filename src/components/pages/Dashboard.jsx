import React, { useState, useMemo } from 'react'
import {
  Package, FlaskConical, UtensilsCrossed, ShieldAlert,
  Pencil, ChevronDown, ChevronUp, GitCompare
} from 'lucide-react'
import { Btn, Bdg, FCBadge } from '../UIPrimitives.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useUI } from '../../context/UIContext.jsx'
import { FT_COLOR_MAP } from '../../constants.js'
import { fc, fp, rmUC, ingCost, calcPricing, getRmUsageDetails, getSimilarDishes } from '../../utils.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { MIModal } from '../modals.jsx'
import { PricingCells } from './PricingCells.jsx'

export const Dashboard = ({rms, setRms, ints, setInts, mis, pc, onNavigate, setMis, cardOrder, setCardOrder, chartOrder, setChartOrder, activeVersionId, versions}) => {
  const { showToast } = useUI()
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
  const [skuSearch, setSkuSearch] = useState('')
  const [skuUsageExpanded, setSkuUsageExpanded] = useState(false)
  const [similarExpanded, setSimilarExpanded] = useState(false)

  const activeVersionLabel = useMemo(() => {
    return (versions || []).find(v => v.id === activeVersionId)?.label || activeVersionId
  }, [versions, activeVersionId])

  const skuDetails = useMemo(() => {
    return getRmUsageDetails(rms, ints, mis)
  }, [rms, ints, mis])

  const sortedSkus = useMemo(() => {
    return Object.values(skuDetails.usage).sort((a, b) => b.totalCount - a.totalCount)
  }, [skuDetails])

  const topExpenseSku = useMemo(() => {
    const list = Object.values(skuDetails.usage).sort((a, b) => b.totalCost - a.totalCost)
    return list[0]
  }, [skuDetails])

  const similarDishes = useMemo(() => {
    return getSimilarDishes(mis)
  }, [mis])

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
                    <span>{name} ({ing.qty}{ing.unit})</span>
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

      {/* ── Previews Section ── */}
      <div style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:20, marginBottom:24}}>
        
        {/* Version Comparison Card */}
        <div className="glass-panel" style={{borderRadius:16, padding:18, display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
          <div>
            <h3 style={{fontSize:14, fontWeight:800, color:'var(--text-primary)', display:'flex', alignItems: 'center', gap: 6, margin: 0}}>
              <GitCompare size={16} style={{color:'var(--primary)'}}/> Menu Versioning & Audits
            </h3>
            <p style={{fontSize:12, color:'var(--text-light)', marginTop:6, lineHeight:1.4}}>
              Verify and compare menu version snapshots to trace historical ingredient price drifts, recipe modifications, and profit margins.
            </p>
            <div style={{marginTop:12, background:'var(--bg-hover)', borderRadius:10, padding:'10px 12px', fontSize:11, color:'var(--text-secondary)'}}>
              <strong>Active version:</strong> {activeVersionLabel} · <strong>Stored versions:</strong> {versions?.length || 1}
            </div>
          </div>
          <button onClick={() => onNavigate('compare')} style={{
            background: 'none',
            border: '1px solid var(--primary)',
            borderRadius: 8,
            padding: '8px 12px',
            color: 'var(--primary)',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            marginTop: 16,
            alignSelf: 'flex-start',
            transition: 'all 0.15s'
          }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
             onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--primary)'; }}>
            Go to Version Compare
          </button>
        </div>

        {/* Similar Dishes Card */}
        <div className="glass-panel" style={{borderRadius:16, padding:18, display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
          <div>
            <h3 style={{fontSize:14, fontWeight:800, color:'var(--text-primary)', display:'flex', alignItems: 'center', gap: 6, margin: 0}}>
              <UtensilsCrossed size={16} style={{color:'#10b981'}}/> Similar Recipes Engine
            </h3>
            <p style={{fontSize:12, color:'var(--text-light)', marginTop:6, lineHeight:1.4}}>
              Finds recipe variants sharing above 60% of ingredients. Useful for ingredient efficiency analysis and cross-dish profit optimization.
            </p>
            <div style={{marginTop:12, background:'var(--bg-hover)', borderRadius:10, padding:'10px 12px', fontSize:11, color:'var(--text-secondary)'}}>
              <strong>Overlapping recipe groups:</strong> {similarDishes.length} matches found
            </div>
          </div>
          <button onClick={() => setSimilarExpanded(!similarExpanded)} style={{
            background: 'none',
            border: '1px solid #10b981',
            borderRadius: 8,
            padding: '8px 12px',
            color: '#10b981',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            marginTop: 16,
            alignSelf: 'flex-start',
            transition: 'all 0.15s'
          }} onMouseEnter={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#fff'; }}
             onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#10b981'; }}>
            {similarExpanded ? 'Hide Similar Dishes' : 'Analyze Similar Dishes'}
          </button>
        </div>

        {/* SKU Usage Card */}
        <div className="glass-panel" style={{borderRadius:16, padding:18, display:'flex', flexDirection:'column', justifyContent:'space-between', gridColumn: isMobile ? 'auto' : '1/-1'}}>
          <div>
            <h3 style={{fontSize:14, fontWeight:800, color:'var(--text-primary)', display:'flex', alignItems: 'center', gap: 6, margin: 0}}>
              <Package size={16} style={{color:'#3b82f6'}}/> SKU Usage & Cost Contribution
            </h3>
            <p style={{fontSize:12, color:'var(--text-light)', marginTop:6, lineHeight:1.4}}>
              Tracks raw material consumption counts (direct usage in dishes + indirect usage inside prep recipes) and total cost distributions.
            </p>
            <div style={{marginTop:12, display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:10}}>
              <div style={{background:'var(--bg-hover)', borderRadius:10, padding:'10px 12px', fontSize:11, color:'var(--text-secondary)'}}>
                <strong>Most Used Ingredient:</strong> {sortedSkus[0]?.rm.name || '—'} (in {sortedSkus[0]?.totalCount || 0} recipes)
              </div>
              <div style={{background:'var(--bg-hover)', borderRadius:10, padding:'10px 12px', fontSize:11, color:'var(--text-secondary)'}}>
                <strong>Top Cost Contributor:</strong> {topExpenseSku?.rm.name || '—'} (menu cost contribution: {fc(topExpenseSku?.totalCost || 0)})
              </div>
            </div>
          </div>
          <button onClick={() => setSkuUsageExpanded(!skuUsageExpanded)} style={{
            background: 'none',
            border: '1px solid #3b82f6',
            borderRadius: 8,
            padding: '8px 12px',
            color: '#3b82f6',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            marginTop: 16,
            alignSelf: 'flex-start',
            transition: 'all 0.15s'
          }} onMouseEnter={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; }}
             onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#3b82f6'; }}>
            {skuUsageExpanded ? 'Hide SKU Intelligence' : 'View SKU Intelligence Report'}
          </button>
        </div>

      </div>

      {/* ── SKU Intelligence Expanded Report ── */}
      {skuUsageExpanded && (
        <div className="glass-panel" style={{borderRadius:16, padding:20, marginBottom:24}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom:16}}>
            <h4 style={{fontSize:13, fontWeight:800, color:'var(--text-primary)', margin:0}}>SKU Usage & Cost Distribution Analysis</h4>
            <input value={skuSearch} onChange={e=>setSkuSearch(e.target.value)} placeholder="Search SKUs..."
              className="custom-input" style={{padding:'6px 12px', fontSize:12, borderRadius:8, border:'1px solid var(--border-strong)', outline:'none', background:'var(--bg-card)', color:'var(--text-primary)', width: isMobile ? '100%' : '180px'}}/>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
              <thead>
                <tr style={{background:'var(--bg-hover)', borderBottom:'1px solid var(--border-color)'}}>
                  <th style={{padding:'8px 12px', textAlign:'left', color:'var(--text-light)', fontWeight:600}}>Ingredient Name</th>
                  <th style={{padding:'8px 12px', textAlign:'left', color:'var(--text-light)', fontWeight:600}}>Category</th>
                  <th style={{padding:'8px 12px', textAlign:'right', color:'var(--text-light)', fontWeight:600}}>Direct Usage</th>
                  <th style={{padding:'8px 12px', textAlign:'right', color:'var(--text-light)', fontWeight:600}}>Indirect Usage</th>
                  <th style={{padding:'8px 12px', textAlign:'right', color:'var(--text-light)', fontWeight:600}}>Total Usage Count</th>
                  <th style={{padding:'8px 12px', textAlign:'right', color:'var(--text-light)', fontWeight:600}}>Avg Qty used</th>
                  <th style={{padding:'8px 12px', textAlign:'right', color:'var(--text-light)', fontWeight:600}}>Total Cost contribution</th>
                </tr>
              </thead>
              <tbody>
                {sortedSkus.filter(s => s.rm.name.toLowerCase().includes(skuSearch.toLowerCase())).map(s => {
                  return (
                    <tr key={s.rm.id} style={{borderBottom:'1px solid var(--border-color)'}}>
                      <td style={{padding:'8px 12px', fontWeight:700, color:'var(--text-primary)'}}>{s.rm.name}</td>
                      <td style={{padding:'8px 12px', color:'var(--text-muted)'}}>{s.rm.category || '—'}</td>
                      <td style={{padding:'8px 12px', textAlign:'right', color:'var(--text-secondary)'}}>{s.directCount} recipes</td>
                      <td style={{padding:'8px 12px', textAlign:'right', color:'var(--text-secondary)'}}>{s.indirectCount} recipes</td>
                      <td style={{padding:'8px 12px', textAlign:'right', fontWeight:700, color:'var(--primary)'}}>{s.totalCount} recipes</td>
                      <td style={{padding:'8px 12px', textAlign:'right', color:'var(--text-muted)'}}>{s.avgQty.toFixed(1)}{s.rm.usage_unit}</td>
                      <td style={{padding:'8px 12px', textAlign:'right', fontWeight:700, color:'var(--text-primary)'}}>{fc(s.totalCost)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Similar Dishes Expanded Report ── */}
      {similarExpanded && (
        <div className="glass-panel" style={{borderRadius:16, padding:20, marginBottom:24}}>
          <h4 style={{fontSize:13, fontWeight:800, color:'var(--text-primary)', marginBottom:16}}>Overlapping Recipe Variant Margins</h4>
          {similarDishes.length === 0 ? (
            <div style={{fontSize:12, color:'var(--text-light)', textAlign:'center', padding:'12px 0'}}>No menu items sharing above 60% ingredients found.</div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:20}}>
              {similarDishes.map((group, idx) => {
                const pA = calcPricing(group.item, rms, ints, pc)
                const itemsToCompare = [
                  { item: group.item, p: pA, matchPct: 100 },
                  ...group.matches.map(m => ({ item: m.item, p: calcPricing(m.item, rms, ints, pc), matchPct: Math.round(m.similarity * 100) }))
                ]

                const bestItem = [...itemsToCompare].sort((a,b) => {
                  if (a.p.pct !== b.p.pct) return a.p.pct - b.p.pct
                  return (b.p.sp - b.p.food) - (a.p.sp - a.p.food)
                })[0]

                return (
                  <div key={idx} style={{border:'1px solid var(--border-color)', borderRadius:12, padding:14, background:'var(--bg-hover)'}}>
                    <div style={{fontSize:12, fontWeight:700, color:'var(--text-primary)', marginBottom:10}}>
                      Variants similar to <span style={{color:'var(--primary)'}}>{group.item.name}</span>
                    </div>
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                        <thead>
                          <tr style={{borderBottom:'1px solid var(--border-color)'}}>
                            <th style={{padding:'6px 10px', textAlign:'left', color:'var(--text-light)'}}>Dish Name</th>
                            <th style={{padding:'6px 10px', textAlign:'right', color:'var(--text-light)'}}>Ingredient Overlap</th>
                            <th style={{padding:'6px 10px', textAlign:'right', color:'var(--text-light)'}}>Food Cost %</th>
                            <th style={{padding:'6px 10px', textAlign:'right', color:'var(--text-light)'}}>Dine-In Price</th>
                            <th style={{padding:'6px 10px', textAlign:'right', color:'var(--text-light)'}}>Profit Margin</th>
                            <th style={{padding:'6px 10px', textAlign: 'center', color:'var(--text-light)'}}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemsToCompare.map(c => {
                            const isBest = c.item.id === bestItem.item.id
                            return (
                              <tr key={c.item.id} style={{borderBottom:'1px solid var(--border-color)', lastChild: { border: 0 }}}>
                                <td style={{padding:'8px 10px', fontWeight:700, color:'var(--text-primary)'}}>{c.item.name}</td>
                                <td style={{padding:'8px 10px', textAlign:'right', color:'var(--text-muted)'}}>{c.matchPct}%</td>
                                <td style={{padding:'8px 10px', textAlign:'right', fontWeight:600}}><FCBadge pct={c.p.pct} threshold={threshold}/></td>
                                <td style={{padding:'8px 10px', textAlign:'right', color:'var(--text-secondary)'}}>{fc(c.p.sp)}</td>
                                <td style={{padding:'8px 10px', textAlign:'right', fontWeight:700, color:'#10b981'}}>{fc(c.p.sp - c.p.food)}</td>
                                <td style={{padding:'8px 10px', textAlign:'center'}}>
                                  {isBest ? <Bdg ch="Recommended Variant" c="green"/> : <span style={{fontSize:10, color:'var(--text-light)'}}>—</span>}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

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
          setRms={setRms}
          ints={ints}
          setInts={setInts}
          pc={pc}
          mis={mis}
        />
      )}
    </div>
  )
}
