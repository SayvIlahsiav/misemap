import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, Eye, Pin } from 'lucide-react'
import { Btn, Bdg, FCBadge, InfoBox } from '../UIPrimitives.jsx'
import { useUI } from '../../context/UIContext.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { calcPricing } from '../../utils.js'
import { FT_COLOR_MAP } from '../../constants.js'
import { BatchImportMIModal, MIModal } from '../modals.jsx'
import { PricingCells } from './PricingCells.jsx'

export const MIPage = ({mis, setMis, rms, setRms, ints, setInts, pc, logEvent, profile, customCats, addCustomCat, pinnedItems, togglePin}) => {
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
                {['','Item','Category','Type','Food Cost','Dine-In Price','Takeaway Price','Delivery Price','Dine-In FC%','Takeaway FC%','Delivery FC%',''].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:'var(--text-light)',fontSize:11,whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m=>(
                <tr key={m.id} style={{borderTop:'1px solid var(--border-color)'}}
                  onMouseOver={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'10px 14px', width: 30}}>
                    <button onClick={()=>togglePin('mis', m.id)} style={{background:'none', border:'none', cursor:'pointer', color:pinnedItems?.mis?.includes(m.id)?'var(--primary)':'var(--text-light)', display:'flex'}}>
                      <Pin size={12} fill={pinnedItems?.mis?.includes(m.id)?'var(--primary)':'none'}/>
                    </button>
                  </td>
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
      {modal && modal!=='import' && <MIModal item={modal==='new'?null:modal} onSave={save} onClose={()=>setModal(null)} rms={rms} setRms={setRms} ints={ints} setInts={setInts} pc={pc} mis={mis} customCats={customCats} addCustomCat={addCustomCat} readOnly={!allowEdit}/>}
    </div>
  )
}
