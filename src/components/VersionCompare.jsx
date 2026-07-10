import React, { useState, useEffect, useMemo } from 'react'
import { GitCompare, ArrowRight, AlertTriangle, TrendingUp, Check, Info } from 'lucide-react'
import { Btn, Bdg, InfoBox, Sel } from './UIPrimitives.jsx'
import { storage } from '../lib/storage.js'
import { SK, DEFAULT_PC } from '../constants.js'
import { rmUC, calcPricing, fc, fp } from '../utils.js'

export const VersionCompare = ({ versions, activeVersionId, org, rms, ints, mis, pc, logEvent }) => {
  const [baseId, setBaseId] = useState('working_draft')
  const [compareId, setCompareId] = useState('')
  const [loading, setLoading] = useState(false)
  const [baseData, setBaseData] = useState(null)
  const [compareData, setCompareData] = useState(null)
  const [subTab, setSubTab] = useState('menu_items') // 'menu_items' | 'ingredients' | 'insights'

  // Pre-populate compareId if there are other versions
  useEffect(() => {
    const others = versions.filter(v => v.id !== baseId)
    if (others.length > 0 && !compareId) {
      setCompareId(others[0].id)
    }
  }, [versions, baseId])

  const fetchVersionData = async (versionId) => {
    if (versionId === activeVersionId) {
      return { rms, ints, mis, pc }
    }

    const rKey = versionId === 'working_draft' ? SK.rm : `${SK.rm}:${versionId}`
    const iKey = versionId === 'working_draft' ? SK.int : `${SK.int}:${versionId}`
    const mKey = versionId === 'working_draft' ? SK.mi : `${SK.mi}:${versionId}`
    const pKey = versionId === 'working_draft' ? SK.pc : `${SK.pc}:${versionId}`

    const [rRaw, iRaw, mRaw, pRaw] = await Promise.all([
      storage.get(rKey, org.id),
      storage.get(iKey, org.id),
      storage.get(mKey, org.id),
      storage.get(pKey, org.id),
    ])

    return {
      rms: rRaw ? JSON.parse(rRaw) : [],
      ints: iRaw ? JSON.parse(iRaw) : [],
      mis: mRaw ? JSON.parse(mRaw) : [],
      pc: pRaw ? JSON.parse(pRaw) : DEFAULT_PC,
    }
  }

  const runComparison = async () => {
    if (!baseId || !compareId) return
    setLoading(true)
    try {
      const [base, comp] = await Promise.all([
        fetchVersionData(baseId),
        fetchVersionData(compareId)
      ])
      setBaseData(base)
      setCompareData(comp)
      if (logEvent) {
        logEvent('Compared Versions', 'Menu Version', `${baseId} vs ${compareId}`, `Compared data across two version snapshots`)
      }
    } catch (e) {
      console.error('[VersionCompare] error loading comparison data:', e)
    } finally {
      setLoading(false)
    }
  }

  // Calculate comparisons
  const comparisons = useMemo(() => {
    if (!baseData || !compareData) return null

    // 1. Ingredients Comparison
    const baseRmsMap = new Map(baseData.rms.map(r => [r.id, r]))
    const compRmsMap = new Map(compareData.rms.map(r => [r.id, r]))

    const addedRms = compareData.rms.filter(r => !baseRmsMap.has(r.id))
    const removedRms = baseData.rms.filter(r => !compRmsMap.has(r.id))
    const modifiedRms = []

    compareData.rms.forEach(compRm => {
      const baseRm = baseRmsMap.get(compRm.id)
      if (baseRm) {
        const baseCost = rmUC(baseRm)
        const compCost = rmUC(compRm)
        if (Math.abs(baseCost - compCost) > 0.001) {
          modifiedRms.push({
            id: compRm.id,
            name: compRm.name,
            baseCost,
            compCost,
            diff: compCost - baseCost,
            pctDiff: baseCost > 0 ? ((compCost - baseCost) / baseCost) * 100 : 0
          })
        }
      }
    })

    // 2. Menu Items Pricing & Recipe Comparison
    const baseMisMap = new Map(baseData.mis.map(m => [m.id, m]))
    const compMisMap = new Map(compareData.mis.map(m => [m.id, m]))

    const addedMis = compareData.mis.filter(m => !baseMisMap.has(m.id))
    const removedMis = baseData.mis.filter(m => !compMisMap.has(m.id))
    const modifiedMis = []

    compareData.mis.forEach(compMi => {
      const baseMi = baseMisMap.get(compMi.id)
      if (baseMi) {
        const baseP = calcPricing(baseMi, baseData.rms, baseData.ints, baseData.pc)
        const compP = calcPricing(compMi, compareData.rms, compareData.ints, compareData.pc)

        // Compare recipes
        const baseIngs = baseMi.ingredients || []
        const compIngs = compMi.ingredients || []
        
        const baseIngMap = new Map(baseIngs.map(i => [i.id, i]))
        const compIngMap = new Map(compIngs.map(i => [i.id, i]))

        const ingChanges = []
        compIngs.forEach(ci => {
          const bi = baseIngMap.get(ci.id)
          if (!bi) {
            ingChanges.push(`Added ingredient (qty: ${ci.qty}${ci.unit || 'g'})`)
          } else if (bi.qty !== ci.qty) {
            ingChanges.push(`Changed quantity of ${ci.id} from ${bi.qty} to ${ci.qty}`)
          }
        })
        baseIngs.forEach(bi => {
          if (!compIngMap.has(bi.id)) {
            ingChanges.push(`Removed ingredient`)
          }
        })

        const costDiff = compP.food - baseP.food
        const priceDiff = compP.sp - baseP.sp
        const baseMargin = baseP.sp - baseP.food
        const compMargin = compP.sp - compP.food
        const marginDiff = compMargin - baseMargin

        if (Math.abs(costDiff) > 0.01 || Math.abs(priceDiff) > 0.01 || ingChanges.length > 0) {
          modifiedMis.push({
            id: compMi.id,
            name: compMi.name,
            category: compMi.category,
            baseP,
            compP,
            costDiff,
            priceDiff,
            marginDiff,
            ingChanges,
            fcPctDiff: compP.pct - baseP.pct
          })
        }
      }
    })

    return {
      addedRms, removedRms, modifiedRms,
      addedMis, removedMis, modifiedMis
    }
  }, [baseData, compareData])

  // Generate Insights
  const insights = useMemo(() => {
    if (!comparisons) return []
    const list = []

    comparisons.modifiedMis.forEach(m => {
      // Alert 1: Margin Compression (cost increased, selling price remained flat or fell)
      if (m.costDiff > 0 && m.priceDiff <= 0) {
        list.push({
          type: 'danger',
          title: `Margin Compression on "${m.name}"`,
          message: `Food Cost increased by ${fc(m.costDiff)} (FC% rose by ${fp(m.fcPctDiff)}), but Selling Price remained flat at ${fc(m.compP.sp)}. Margin decreased by ${fc(-m.marginDiff)}.`,
          recommendation: `Consider raising Selling Price by at least ${fc(m.costDiff * m.compP.sp / m.compP.food)} to maintain the original margin, or optimize ingredients.`
        })
      }
      // Alert 2: High Food Cost Breach
      const baseThreshold = baseData.pc.global.fc_alert_threshold
      if (m.baseP.pct <= baseThreshold && m.compP.pct > baseThreshold) {
        list.push({
          type: 'warning',
          title: `Food Cost Breach on "${m.name}"`,
          message: `Dine-In Food Cost % increased from ${fp(m.baseP.pct)} to ${fp(m.compP.pct)}, breaching your global warning threshold of ${baseThreshold}%.`,
          recommendation: `Optimize portions or adjust the Global SP Multiplier for "${m.category || 'this category'}".`
        })
      }
    })

    // Raw Material Alerts (rising commodity costs)
    if (comparisons.modifiedRms.length > 0) {
      const topSpike = [...comparisons.modifiedRms].sort((a,b) => b.diff - a.diff)[0]
      if (topSpike && topSpike.diff > 0) {
        list.push({
          type: 'info',
          title: `Price Spike on "${topSpike.name}"`,
          message: `Ingredient cost increased from ${fc(topSpike.baseCost)} to ${fc(topSpike.compCost)} per unit (${fp(topSpike.pctDiff)} increase).`,
          recommendation: `Check menu items using "${topSpike.name}" to verify if their retail pricing covers this spike.`
        })
      }
    }

    return list
  }, [comparisons, baseData, compareData])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <GitCompare size={24} style={{ color: 'var(--primary)' }} /> Version Compare
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 4 }}>Compare ingredient costs, recipe alterations, and pricing margins across different menu snapshots.</p>
      </div>

      {/* Selector controls */}
      <div className="glass-panel" style={{ padding: 18, borderRadius: 16, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
        <Sel label="Base Menu Version" v={baseId} onChange={setBaseId} opts={versions.map(v => ({ v: v.id, l: v.label }))} style={{ flex: 1, minWidth: 200 }} />
        <Sel label="Compare With Version" v={compareId} onChange={setCompareId} opts={versions.filter(v => v.id !== baseId).map(v => ({ v: v.id, l: v.label }))} ph="Select version..." style={{ flex: 1, minWidth: 200 }} />
        <Btn ch={loading ? 'Loading...' : 'Compare Menus'} onClick={runComparison} disabled={loading || !compareId} style={{ height: 38 }} />
      </div>

      {/* Comparison results */}
      {loading && (
        <div style={{ padding: '64px 0', textAlign: 'center', color: 'var(--text-light)', fontSize: 14 }}>
          Fetching and comparing version snapshots...
        </div>
      )}

      {!loading && baseData && compareData && comparisons && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Comparison summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Menu Items (Base vs Compare)</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: 'var(--text-primary)' }}>
                {baseData.mis.length} <ArrowRight size={14} style={{ display: 'inline', margin: '0 4px', color: 'var(--text-light)' }} /> {compareData.mis.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                {comparisons.addedMis.length} added · {comparisons.removedMis.length} removed
              </div>
            </div>
            
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Raw Materials (Base vs Compare)</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: 'var(--text-primary)' }}>
                {baseData.rms.length} <ArrowRight size={14} style={{ display: 'inline', margin: '0 4px', color: 'var(--text-light)' }} /> {compareData.rms.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                {comparisons.addedRms.length} added · {comparisons.removedRms.length} removed
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Modified Items Count</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: 'var(--text-primary)' }}>
                {comparisons.modifiedMis.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                Recipes or pricing overridden
              </div>
            </div>
          </div>

          {/* Sub Navigation */}
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 2 }}>
            <button onClick={() => setSubTab('menu_items')} style={{ background: 'none', border: 'none', padding: '8px 12px', fontSize: 13, fontWeight: subTab === 'menu_items' ? 700 : 500, color: subTab === 'menu_items' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: subTab === 'menu_items' ? '2px solid var(--primary)' : 'none', cursor: 'pointer' }}>
              Menu Items Comparison ({comparisons.modifiedMis.length + comparisons.addedMis.length + comparisons.removedMis.length})
            </button>
            <button onClick={() => setSubTab('ingredients')} style={{ background: 'none', border: 'none', padding: '8px 12px', fontSize: 13, fontWeight: subTab === 'ingredients' ? 700 : 500, color: subTab === 'ingredients' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: subTab === 'ingredients' ? '2px solid var(--primary)' : 'none', cursor: 'pointer' }}>
              Ingredient Costs ({comparisons.modifiedRms.length})
            </button>
            <button onClick={() => setSubTab('insights')} style={{ background: 'none', border: 'none', padding: '8px 12px', fontSize: 13, fontWeight: subTab === 'insights' ? 700 : 500, color: subTab === 'insights' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: subTab === 'insights' ? '2px solid var(--primary)' : 'none', cursor: 'pointer' }}>
              Menu Engineering Insights ({insights.length})
            </button>
          </div>

          {/* Tab Content */}
          {subTab === 'menu_items' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Added Items */}
              {comparisons.addedMis.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>+ Added Items in Compare Version</div>
                  <div className="glass-panel" style={{ borderRadius: 12, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {comparisons.addedMis.map(mi => (
                      <div key={mi.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border-color)', lastChild: { border: 0 } }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{mi.name}</span>
                        <span style={{ color: 'var(--text-light)' }}>Category: {mi.category || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Removed Items */}
              {comparisons.removedMis.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>- Removed Items from Compare Version</div>
                  <div className="glass-panel" style={{ borderRadius: 12, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {comparisons.removedMis.map(mi => (
                      <div key={mi.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border-color)', lastChild: { border: 0 } }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{mi.name}</span>
                        <span style={{ color: 'var(--text-light)' }}>Category: {mi.category || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modified Items */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Modified Recipes & Pricing</div>
                {comparisons.modifiedMis.length === 0 ? (
                  <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-light)' }}>
                    No menu item modifications found between versions.
                  </div>
                ) : (
                  <div className="glass-panel" style={{ borderRadius: 16, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-light)' }}>Item Name</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-light)' }}>Base Food Cost</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-light)' }}>Comp Food Cost</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-light)' }}>Cost Variance</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-light)' }}>Base SP</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-light)' }}>Comp SP</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-light)' }}>FC% Shift</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisons.modifiedMis.map(m => {
                          const costDiffColor = m.costDiff > 0 ? '#ef4444' : m.costDiff < 0 ? '#10b981' : 'var(--text-primary)'
                          const fcDiffColor = m.fcPctDiff > 0 ? '#ef4444' : m.fcPctDiff < 0 ? '#10b981' : 'var(--text-primary)'
                          return (
                            <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)', lastChild: { border: 0 } }}>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {m.name}
                                {m.ingChanges.length > 0 && (
                                  <div style={{ fontSize: 9, fontWeight: 500, color: 'var(--primary)', marginTop: 2 }}>
                                    {m.ingChanges.length} recipe changes
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)' }}>{fc(m.baseP.food)}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>{fc(m.compP.food)}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: costDiffColor }}>
                                {m.costDiff > 0 ? '+' : ''}{fc(m.costDiff)}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)' }}>{fc(m.baseP.sp)}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>{fc(m.compP.sp)}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: fcDiffColor }}>
                                {m.fcPctDiff > 0 ? '+' : ''}{fp(m.fcPctDiff)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {subTab === 'ingredients' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Ingredient Price Changes</div>
              {comparisons.modifiedRms.length === 0 ? (
                <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-light)' }}>
                  No ingredient price differences found between versions.
                </div>
              ) : (
                <div className="glass-panel" style={{ borderRadius: 16, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-light)' }}>Ingredient</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-light)' }}>Base Unit Cost</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-light)' }}>Comp Unit Cost</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-light)' }}>Cost Difference</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-light)' }}>% Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisons.modifiedRms.map(rm => {
                        const isSpike = rm.diff > 0
                        return (
                          <tr key={rm.id} style={{ borderBottom: '1px solid var(--border-color)', lastChild: { border: 0 } }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>{rm.name}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)' }}>{fc(rm.baseCost)}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>{fc(rm.compCost)}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: isSpike ? '#ef4444' : '#10b981' }}>
                              {isSpike ? '+' : ''}{fc(rm.diff)}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: isSpike ? '#ef4444' : '#10b981' }}>
                              {isSpike ? '+' : ''}{fp(rm.pctDiff)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {subTab === 'insights' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Menu Engineering Insights</div>
              {insights.length === 0 ? (
                <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Check size={20} style={{ color: '#10b981' }} />
                  Your margins are solid! No margin compressions or cost breaches detected between these versions.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {insights.map((insight, idx) => (
                    <div key={idx} style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderLeft: `4px solid ${insight.type === 'danger' ? '#ef4444' : insight.type === 'warning' ? '#f59e0b' : '#3b82f6'}`,
                      borderRadius: 12,
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                        <AlertTriangle size={15} style={{ color: insight.type === 'danger' ? '#ef4444' : insight.type === 'warning' ? '#f59e0b' : '#3b82f6' }} />
                        {insight.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{insight.message}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <TrendingUp size={13} /> Recommendation: {insight.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {!baseData && !loading && (
        <div style={{ padding: '80px 0', border: '2px dashed var(--border-color)', borderRadius: 16, textAlign: 'center', color: 'var(--text-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <GitCompare size={32} style={{ color: 'var(--text-muted)' }} />
          <div>Select two menu versions above and click "Compare Menus" to audit cost drifts and margin trends.</div>
        </div>
      )}
    </div>
  )
}
