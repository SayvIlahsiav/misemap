import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, Eye, Pin } from 'lucide-react'
import { Btn, Bdg, InfoBox } from '../UIPrimitives.jsx'
import { useUI } from '../../context/UIContext.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { fc, intUC, ingCost } from '../../utils.js'
import { BatchImportIntModal, IntModal } from '../modals.jsx'

export const IntPage = ({ints, setInts, rms, setRms, logEvent, profile, pc, customCats, addCustomCat, pinnedItems, togglePin}) => {
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
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <div style={{fontWeight:700,fontSize:14,color:'var(--text-primary)'}}>{it.name}</div>
                      <button onClick={()=>togglePin('ints', it.id)} style={{background:'none', border:'none', cursor:'pointer', color:pinnedItems?.ints?.includes(it.id)?'var(--primary)':'var(--text-light)', display:'flex', padding: 4}}>
                        <Pin size={11} fill={pinnedItems?.ints?.includes(it.id)?'var(--primary)':'none'}/>
                      </button>
                    </div>
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
      {modal && modal!=='import' && <IntModal inter={modal==='new'?null:modal} onSave={save} onClose={()=>setModal(null)} rms={rms} setRms={setRms} ints={ints} setInts={setInts} customCats={customCats} addCustomCat={addCustomCat} readOnly={!allowEdit}/>}
    </div>
  )
}
