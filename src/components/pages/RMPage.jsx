import React, { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, Eye, Pin } from 'lucide-react'
import { Btn, Bdg } from '../UIPrimitives.jsx'
import { useUI } from '../../context/UIContext.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { fc, rmUC } from '../../utils.js'
import { FT_COLOR_MAP } from '../../constants.js'
import { BatchImportModal, RMModal } from '../modals.jsx'

export const RMPage = ({rms, setRms, logEvent, profile, pc, customCats, addCustomCat, pinnedItems, togglePin}) => {
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
                {['','Name & Category','Type','Buy Unit','Pack Cost','Qty / Pack','Usage Unit','Unit Cost',''].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:'var(--text-light)',fontSize:11,whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(rm=>(
                <tr key={rm.id} style={{borderTop:'1px solid var(--border-color)'}}
                  onMouseOver={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'10px 14px', width: 30}}>
                    <button onClick={()=>togglePin('rms', rm.id)} style={{background:'none', border:'none', cursor:'pointer', color:pinnedItems?.rms?.includes(rm.id)?'var(--primary)':'var(--text-light)', display:'flex'}}>
                      <Pin size={12} fill={pinnedItems?.rms?.includes(rm.id)?'var(--primary)':'none'}/>
                    </button>
                  </td>
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
      {modal && modal!=='import' && <RMModal rm={modal==='new'?null:modal} onSave={save} onClose={()=>setModal(null)} rms={rms} customCats={customCats} addCustomCat={addCustomCat} readOnly={!allowEdit}/>}
    </div>
  )
}
