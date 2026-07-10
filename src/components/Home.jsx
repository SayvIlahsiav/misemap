import React, { useState, useMemo } from 'react'
import { Plus, Package, FlaskConical, UtensilsCrossed, Pin, Clock, Activity, ArrowRight } from 'lucide-react'
import { Btn, Bdg, InfoBox } from './UIPrimitives.jsx'
import { RMModal, IntModal, MIModal } from './modals.jsx'
import { rmUC, intUC, miFC, calcPricing, fc } from '../utils.js'

export const HomeTab = ({
  rms, ints, mis, setRms, setInts, setMis,
  customCats, addCustomCat, pc, pinnedItems, togglePin,
  onNavigate, logEvent, profile, activityLog
}) => {
  const [modal, setModal] = useState(null)
  
  // Combine all items to find recently modified
  const recentlyModified = useMemo(() => {
    const all = [
      ...rms.map(r => ({ ...r, type: 'raw' })),
      ...ints.map(i => ({ ...i, type: 'int' })),
      ...mis.map(m => ({ ...m, type: 'menu' }))
    ]
    return all
      .sort((a, b) => {
        const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0
        const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0
        if (timeA !== timeB) return timeB - timeA
        return (b.id || '').localeCompare(a.id || '')
      })
      .slice(0, 5)
  }, [rms, ints, mis])

  // Get pinned items
  const pinned = useMemo(() => {
    const list = []
    if (pinnedItems?.rms) {
      pinnedItems.rms.forEach(id => {
        const item = rms.find(r => r.id === id)
        if (item) list.push({ ...item, type: 'raw' })
      })
    }
    if (pinnedItems?.ints) {
      pinnedItems.ints.forEach(id => {
        const item = ints.find(i => i.id === id)
        if (item) list.push({ ...item, type: 'int' })
      })
    }
    if (pinnedItems?.mis) {
      pinnedItems.mis.forEach(id => {
        const item = mis.find(m => m.id === id)
        if (item) list.push({ ...item, type: 'menu' })
      })
    }
    return list
  }, [pinnedItems, rms, ints, mis])

  const saveRm = rm => {
    const rmWithTime = { ...rm, updated_at: new Date().toISOString() }
    const isEdit = rms.some(r => r.id === rm.id)
    setRms(prev => isEdit ? prev.map(r => r.id === rm.id ? rmWithTime : r) : [...prev, rmWithTime])
    setModal(null)
    logEvent(isEdit ? 'Updated' : 'Created', 'Raw Material', rm.name, isEdit ? 'Modified from Home Quick Access' : 'Added from Home Quick Access')
  }

  const saveInt = inter => {
    const intWithTime = { ...inter, updated_at: new Date().toISOString() }
    const isEdit = ints.some(i => i.id === inter.id)
    setInts(prev => isEdit ? prev.map(i => i.id === inter.id ? intWithTime : i) : [...prev, intWithTime])
    setModal(null)
    logEvent(isEdit ? 'Updated' : 'Intermediate', inter.name, isEdit ? 'Modified from Home Quick Access' : 'Added from Home Quick Access')
  }

  const saveMi = mi => {
    const miWithTime = { ...mi, updated_at: new Date().toISOString() }
    const isEdit = mis.some(m => m.id === mi.id)
    setMis(prev => isEdit ? prev.map(m => m.id === mi.id ? miWithTime : m) : [...prev, miWithTime])
    setModal(null)
    logEvent(isEdit ? 'Updated' : 'Created', 'Menu Item', mi.name, isEdit ? 'Modified from Home Quick Access' : 'Added from Home Quick Access')
  }

  const handleItemClick = (item) => {
    setModal({ ...item, isEditMode: true })
  }

  const renderCard = (item) => {
    const Icon = item.type === 'raw' ? Package : item.type === 'int' ? FlaskConical : UtensilsCrossed
    const color = item.type === 'raw' ? '#3b82f6' : item.type === 'int' ? '#8b5cf6' : '#10b981'
    const typeLabel = item.type === 'raw' ? 'Raw Material' : item.type === 'int' ? 'Intermediate' : 'Menu Item'
    
    // Calculate cost / price depending on type
    let detailText = ''
    if (item.type === 'raw') {
      detailText = `Cost: ${fc(rmUC(item))} / ${item.usage_unit}`
    } else if (item.type === 'int') {
      detailText = `Cost: ${fc(intUC(item, rms, ints))} / ${item.yield_unit}`
    } else {
      const p = calcPricing(item, rms, ints, pc)
      detailText = `FC: ${fc(p.food)} · SP: ${fc(p.sp)}`
    }

    const isPinned = pinnedItems?.[item.type === 'raw' ? 'rms' : item.type === 'int' ? 'ints' : 'mis']?.includes(item.id)

    return (
      <div key={item.id} 
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: '12px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          gap: 12
        }}
        onClick={() => handleItemClick(item)}
        className="hover-scale"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ background: `${color}15`, color, padding: 8, borderRadius: 8, display: 'flex' }}>
            <Icon size={16} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>{typeLabel} · {detailText}</div>
          </div>
        </div>
        <button onClick={(e) => {
          e.stopPropagation()
          togglePin(item.type === 'raw' ? 'rms' : item.type === 'int' ? 'ints' : 'mis', item.id)
        }} style={{ background: 'none', border: 'none', color: isPinned ? 'var(--primary)' : 'var(--text-light)', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <Pin size={13} fill={isPinned ? 'var(--primary)' : 'none'} />
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Welcome Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Welcome to MiseMap</h1>
        <p style={{ fontSize: 14, color: 'var(--text-light)', marginTop: 4 }}>Costing, recipe analysis, and version pricing at your fingertips.</p>
      </div>

      {/* Quick Actions */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Btn sz="lg" ch={<><Plus size={16}/> Add Raw Material</>} v="secondary" onClick={() => setModal('new_rm')} style={{ border: '2px dashed var(--border-strong)', padding: '16px', borderRadius: 12, height: 'auto', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-hover)' }}>
            <Package size={22} style={{ color: '#3b82f6' }} />
          </Btn>
          <Btn sz="lg" ch={<><Plus size={16}/> Add Intermediate</>} v="secondary" onClick={() => setModal('new_int')} style={{ border: '2px dashed var(--border-strong)', padding: '16px', borderRadius: 12, height: 'auto', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-hover)' }} disabled={rms.length === 0}>
            <FlaskConical size={22} style={{ color: '#8b5cf6' }} />
          </Btn>
          <Btn sz="lg" ch={<><Plus size={16}/> Add Menu Item</>} v="secondary" onClick={() => setModal('new_mi')} style={{ border: '2px dashed var(--border-strong)', padding: '16px', borderRadius: 12, height: 'auto', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-hover)' }} disabled={rms.length === 0}>
            <UtensilsCrossed size={22} style={{ color: '#10b981' }} />
          </Btn>
        </div>
      </div>

      {/* Two Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        
        {/* Pinned & Recent Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Pinned Items */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Pin size={12} style={{ color: 'var(--primary)' }} /> Pinned Items ({pinned.length})
            </div>
            {pinned.length === 0 ? (
              <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '20px', fontSize: 12, color: 'var(--text-light)', textAlign: 'center' }}>
                No pinned items yet. Pin raw materials, intermediates, or menu items for quick access.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pinned.map(renderCard)}
              </div>
            )}
          </div>

          {/* Recently Modified */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={12} /> Recently Modified
            </div>
            {recentlyModified.length === 0 ? (
              <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '20px', fontSize: 12, color: 'var(--text-light)', textAlign: 'center' }}>
                No modifications recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentlyModified.map(renderCard)}
              </div>
            )}
          </div>

        </div>

        {/* Activity Log & Info Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Activity Log */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={12} /> Recent Activities
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activityLog.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-light)', textAlign: 'center', padding: '12px 0' }}>No recent activities.</div>
              ) : (
                activityLog.slice(0, 5).map(evt => (
                  <div key={evt.id} style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>{evt.action}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{evt.targetType}: {evt.targetName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>{evt.details}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(evt.timestamp).toLocaleTimeString()} · {evt.username || evt.user_email}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Stats Card Banner */}
          <div style={{ background: 'linear-gradient(135deg, var(--bg-hover) 0%, var(--bg-card) 100%)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Need Cost Analytics?</div>
            <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6, lineHeight: 1.4 }}>Head over to the Dashboard for complete visual charts, high food cost alert flags, and pricing overrides.</div>
            <button onClick={() => onNavigate('dashboard')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, padding: 0 }}>
              Go to Dashboard <ArrowRight size={13} />
            </button>
          </div>

        </div>

      </div>

      {/* Render Modals */}
      {modal === 'new_rm' && (
        <RMModal 
          onSave={saveRm} 
          onClose={() => setModal(null)} 
          rms={rms} 
          customCats={customCats} 
          addCustomCat={addCustomCat} 
        />
      )}
      {modal === 'new_int' && (
        <IntModal 
          onSave={saveInt} 
          onClose={() => setModal(null)} 
          rms={rms} 
          ints={ints} 
          customCats={customCats} 
          addCustomCat={addCustomCat} 
        />
      )}
      {modal === 'new_mi' && (
        <MIModal 
          onSave={saveMi} 
          onClose={() => setModal(null)} 
          rms={rms} 
          ints={ints} 
          pc={pc} 
          mis={mis} 
        />
      )}

      {/* Edit Modals */}
      {modal && typeof modal === 'object' && modal.type === 'raw' && (
        <RMModal 
          rm={modal} 
          onSave={saveRm} 
          onClose={() => setModal(null)} 
          rms={rms} 
          customCats={customCats} 
          addCustomCat={addCustomCat} 
        />
      )}
      {modal && typeof modal === 'object' && modal.type === 'int' && (
        <IntModal 
          inter={modal} 
          onSave={saveInt} 
          onClose={() => setModal(null)} 
          rms={rms} 
          ints={ints} 
          customCats={customCats} 
          addCustomCat={addCustomCat} 
        />
      )}
      {modal && typeof modal === 'object' && modal.type === 'menu' && (
        <MIModal 
          item={modal} 
          onSave={saveMi} 
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
