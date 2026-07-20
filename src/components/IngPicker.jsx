import { useState, useMemo } from 'react'
import { Search, Trash2, Package, FlaskConical } from 'lucide-react'
import { Label } from './UIPrimitives.jsx'
import { fc, rmUC, intUC } from '../utils.js'
import { UNITS } from '../constants.js'

export const IngPicker = ({ings, setIngs, rms, setRms, ints, setInts, noInts=false, readOnly}) => {
  const [q, setQ] = useState('')
  const all = useMemo(() => [
    ...rms.map(r=>({...r,type:'raw',du:r.usage_unit})),
    ...(noInts?[]:ints.map(i=>({...i,type:'intermediate',du:i.yield_unit}))),
  ],[rms,ints,noInts])
  const filtered = q ? all.filter(i=>(i?.name || '').toLowerCase().includes(q.toLowerCase())) : []

  const [inlineCreateType, setInlineCreateType] = useState(null) // 'raw' | 'intermediate' | null
  
  // Raw Material Form States
  const [rmName, setRmName] = useState('')
  const [rmCat, setRmCat] = useState('')
  const [rmBuyUnit, setRmBuyUnit] = useState('g')
  const [rmPackCost, setRmPackCost] = useState('')
  const [rmPackQty, setRmPackQty] = useState('1')
  const [rmUsageUnit, setRmUsageUnit] = useState('g')

  // Intermediate Form States
  const [intName, setIntName] = useState('')
  const [intCat, setIntCat] = useState('')
  const [intYieldQty, setIntYieldQty] = useState('1000')
  const [intYieldUnit, setIntYieldUnit] = useState('g')

  const startInlineCreate = (type) => {
    setInlineCreateType(type)
    if (type === 'raw') {
      setRmName(q)
      setRmCat('')
      setRmBuyUnit('g')
      setRmPackCost('')
      setRmPackQty('1')
      setRmUsageUnit('g')
    } else {
      setIntName(q)
      setIntCat('')
      setIntYieldQty('1000')
      setIntYieldUnit('g')
    }
  }

  const handleSaveInlineRm = () => {
    if (!rmName || !rmPackCost) return
    const id = 'rm_' + Math.random().toString(36).substr(2, 9)
    const newRm = {
      id,
      name: rmName,
      category: rmCat || 'Uncategorized',
      buy_unit: rmBuyUnit,
      pack_cost: parseFloat(rmPackCost) || 0,
      pack_qty: parseFloat(rmPackQty) || 1,
      usage_unit: rmUsageUnit,
      food_type: 'Vegetarian',
      created_at: new Date().toISOString()
    }
    if (setRms) {
      setRms(prev => [...(prev || []), newRm])
    }
    if (!ings.find(i => i.id === newRm.id)) {
      setIngs([...ings, { id: newRm.id, type: 'raw', qty: 1, unit: newRm.usage_unit }])
    }
    setQ('')
    setInlineCreateType(null)
  }

  const handleSaveInlineInt = () => {
    if (!intName) return
    const id = 'int_' + Math.random().toString(36).substr(2, 9)
    const newInt = {
      id,
      name: intName,
      category: intCat || 'Uncategorized',
      yield_qty: parseFloat(intYieldQty) || 1000,
      yield_unit: intYieldUnit,
      ingredients: [],
      created_at: new Date().toISOString()
    }
    if (setInts) {
      setInts(prev => [...(prev || []), newInt])
    }
    if (!ings.find(i => i.id === newInt.id)) {
      setIngs([...ings, { id: newInt.id, type: 'intermediate', qty: 1, unit: newInt.yield_unit }])
    }
    setQ('')
    setInlineCreateType(null)
  }

  const add = item => {
    if (readOnly) return
    if (ings.find(i=>i.id===item.id)) return
    setIngs([...ings,{id:item.id,type:item.type,qty:1,unit:item.du}])
    setQ('')
  }
  const remove = idx => {
    if (readOnly) return
    setIngs(ings.filter((_,i)=>i!==idx))
  }
  const updQty = (idx,qty) => {
    if (readOnly) return
    const u=[...ings];
    u[idx]={...u[idx],qty:parseFloat(qty)||0};
    setIngs(u)
  }
  const getInfo = ing => ing.type==='raw' ? rms.find(r=>r.id===ing.id) : ints.find(i=>i.id===ing.id)
  const getUC   = ing => {
    if (ing.type==='raw') return rmUC(rms.find(r=>r.id===ing.id))
    const it = ints.find(i=>i.id===ing.id)
    return it ? intUC(it,rms,ints) : 0
  }
  const total = ings.reduce((s,i)=>s+getUC(i)*(i.qty||0),0)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <Label>Ingredients</Label>
      {!readOnly && (
        <div style={{position:'relative'}}>
          <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-light)'}}/>
          <input value={q} onChange={e=>setQ(e.target.value)}
            placeholder={`Search to add ${noInts?'raw materials':'raw materials or intermediates'}…`}
            className="custom-input"
            style={{
              width:'100%',
              boxSizing:'border-box',
              border:'1px solid var(--border-strong)',
              borderRadius:8,
              padding:'8px 10px 8px 32px',
              fontSize:13,
              color:'var(--text-primary)',
              background:'var(--bg-card)',
              outline:'none',
              transition:'all 0.15s ease'
            }}/>
          {(q || inlineCreateType) && (
            <div style={{
              position:'absolute',
              zIndex:30,
              top:'calc(100% + 4px)',
              left:0,
              right:0,
              background:'var(--bg-card)',
              border:'1px solid var(--border-strong)',
              borderRadius:12,
              boxShadow:'var(--shadow-lg)',
              maxHeight: inlineCreateType ? 'none' : 220,
              overflowY:'auto',
              padding: inlineCreateType ? 16 : 0
            }}>
              {inlineCreateType === 'raw' ? (
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  <div style={{fontWeight:700, fontSize:12, color:'var(--primary)', borderBottom:'1px solid var(--border-color)', paddingBottom:4, marginBottom:4}}>
                    Add New Raw Material Inline
                  </div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                    <div>
                      <label style={{fontSize:10, color:'var(--text-light)', fontWeight:600}}>Ingredient Name</label>
                      <input value={rmName} onChange={e=>setRmName(e.target.value)} placeholder="Name"
                        className="custom-input" style={{width:'100%', boxSizing:'border-box', border:'1px solid var(--border-strong)', borderRadius:6, padding:'4px 8px', fontSize:12, outline:'none', background:'var(--bg-card)', color:'var(--text-primary)'}}/>
                    </div>
                    <div>
                      <label style={{fontSize:10, color:'var(--text-light)', fontWeight:600}}>Category</label>
                      <input value={rmCat} onChange={e=>setRmCat(e.target.value)} placeholder="Category (optional)"
                        className="custom-input" style={{width:'100%', boxSizing:'border-box', border:'1px solid var(--border-strong)', borderRadius:6, padding:'4px 8px', fontSize:12, outline:'none', background:'var(--bg-card)', color:'var(--text-primary)'}}/>
                    </div>
                    <div>
                      <label style={{fontSize:10, color:'var(--text-light)', fontWeight:600}}>Pack Cost (₹)</label>
                      <input type="number" min="0" step="any" value={rmPackCost} onChange={e=>setRmPackCost(e.target.value)} placeholder="Cost"
                        className="custom-input" style={{width:'100%', boxSizing:'border-box', border:'1px solid var(--border-strong)', borderRadius:6, padding:'4px 8px', fontSize:12, outline:'none', background:'var(--bg-card)', color:'var(--text-primary)'}}/>
                    </div>
                    <div>
                      <label style={{fontSize:10, color:'var(--text-light)', fontWeight:600}}>Pack Qty</label>
                      <input type="number" min="0" step="any" value={rmPackQty} onChange={e=>setRmPackQty(e.target.value)} placeholder="Quantity"
                        className="custom-input" style={{width:'100%', boxSizing:'border-box', border:'1px solid var(--border-strong)', borderRadius:6, padding:'4px 8px', fontSize:12, outline:'none', background:'var(--bg-card)', color:'var(--text-primary)'}}/>
                    </div>
                    <div>
                      <label style={{fontSize:10, color:'var(--text-light)', fontWeight:600}}>Buy Unit</label>
                      <select value={rmBuyUnit} onChange={e=>setRmBuyUnit(e.target.value)}
                        className="custom-input" style={{width:'100%', boxSizing:'border-box', border:'1px solid var(--border-strong)', borderRadius:6, padding:'4px 8px', fontSize:12, outline:'none', background:'var(--bg-card)', color:'var(--text-primary)', cursor:'pointer'}}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{fontSize:10, color:'var(--text-light)', fontWeight:600}}>Usage Unit</label>
                      <select value={rmUsageUnit} onChange={e=>setRmUsageUnit(e.target.value)}
                        className="custom-input" style={{width:'100%', boxSizing:'border-box', border:'1px solid var(--border-strong)', borderRadius:6, padding:'4px 8px', fontSize:12, outline:'none', background:'var(--bg-card)', color:'var(--text-primary)', cursor:'pointer'}}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:8, borderTop:'1px solid var(--border-color)', paddingTop:8}}>
                    <button onClick={() => setInlineCreateType(null)} style={{background:'none', border:'1px solid var(--border-strong)', borderRadius:6, padding:'4px 10px', fontSize:11, color:'var(--text-light)', cursor:'pointer'}}>Cancel</button>
                    <button onClick={handleSaveInlineRm} disabled={!rmName || !rmPackCost} style={{background:'var(--primary)', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, color:'#fff', fontWeight:700, cursor:'pointer'}}>Save & Add</button>
                  </div>
                </div>
              ) : inlineCreateType === 'intermediate' ? (
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  <div style={{fontWeight:700, fontSize:12, color:'#8b5cf6', borderBottom:'1px solid var(--border-color)', paddingBottom:4, marginBottom:4}}>
                    Add New Intermediate Inline
                  </div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                    <div style={{gridColumn:'1/-1'}}>
                      <label style={{fontSize:10, color:'var(--text-light)', fontWeight:600}}>Recipe Name</label>
                      <input value={intName} onChange={e=>setIntName(e.target.value)} placeholder="Name"
                        className="custom-input" style={{width:'100%', boxSizing:'border-box', border:'1px solid var(--border-strong)', borderRadius:6, padding:'4px 8px', fontSize:12, outline:'none', background:'var(--bg-card)', color:'var(--text-primary)'}}/>
                    </div>
                    <div>
                      <label style={{fontSize:10, color:'var(--text-light)', fontWeight:600}}>Category</label>
                      <input value={intCat} onChange={e=>setIntCat(e.target.value)} placeholder="Category (optional)"
                        className="custom-input" style={{width:'100%', boxSizing:'border-box', border:'1px solid var(--border-strong)', borderRadius:6, padding:'4px 8px', fontSize:12, outline:'none', background:'var(--bg-card)', color:'var(--text-primary)'}}/>
                    </div>
                    <div>
                      <label style={{fontSize:10, color:'var(--text-light)', fontWeight:600}}>Yield Qty</label>
                      <input type="number" min="0" step="any" value={intYieldQty} onChange={e=>setIntYieldQty(e.target.value)} placeholder="Yield Qty"
                        className="custom-input" style={{width:'100%', boxSizing:'border-box', border:'1px solid var(--border-strong)', borderRadius:6, padding:'4px 8px', fontSize:12, outline:'none', background:'var(--bg-card)', color:'var(--text-primary)'}}/>
                    </div>
                    <div>
                      <label style={{fontSize:10, color:'var(--text-light)', fontWeight:600}}>Yield Unit</label>
                      <select value={intYieldUnit} onChange={e=>setIntYieldUnit(e.target.value)}
                        className="custom-input" style={{width:'100%', boxSizing:'border-box', border:'1px solid var(--border-strong)', borderRadius:6, padding:'4px 8px', fontSize:12, outline:'none', background:'var(--bg-card)', color:'var(--text-primary)', cursor:'pointer'}}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:8, borderTop:'1px solid var(--border-color)', paddingTop:8}}>
                    <button onClick={() => setInlineCreateType(null)} style={{background:'none', border:'1px solid var(--border-strong)', borderRadius:6, padding:'4px 10px', fontSize:11, color:'var(--text-light)', cursor:'pointer'}}>Cancel</button>
                    <button onClick={handleSaveInlineInt} disabled={!intName} style={{background:'#8b5cf6', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, color:'#fff', fontWeight:700, cursor:'pointer'}}>Save & Add</button>
                  </div>
                </div>
              ) : (
                <>
                  {filtered.length===0&&(
                    <div style={{padding:'12px 16px', display:'flex', flexDirection:'column', gap:8}}>
                      <div style={{fontSize:13,color:'var(--text-light)'}}>No items found for &quot;{q}&quot;</div>
                      <div style={{display:'flex', gap:8, marginTop:4}}>
                        <button onClick={() => startInlineCreate('raw')} style={{
                          background: 'var(--primary)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}>
                          + Add as Raw Material
                        </button>
                        {!noInts && (
                          <button onClick={() => startInlineCreate('intermediate')} style={{
                            background: '#8b5cf6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}>
                            + Add as Intermediate
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {filtered.map(it=>{
                    const uc = it.type==='raw'?rmUC(it):intUC(it,rms,ints)
                    const Icon = it.type === 'raw' ? Package : FlaskConical
                    return (
                      <button key={it.id} onClick={()=>add(it)}
                        style={{
                          width:'100%',
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'space-between',
                          padding:'10px 16px',
                          border:'none',
                          background:'none',
                          cursor:'pointer',
                          textAlign:'left',
                          transition:'background 0.1s'
                        }}
                        onMouseOver={e=>e.currentTarget.style.background='var(--bg-hover)'}
                        onMouseOut={e=>e.currentTarget.style.background='none'}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <Icon size={14} style={{color:it.type==='raw'?'#2563eb':'#8b5cf6',flexShrink:0}}/>
                          <div>
                            <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>{it.name}</div>
                            <div style={{fontSize:11,color:'var(--text-light)'}}>{it.type==='raw'?'Raw material':'Intermediate'} · per {it.du}</div>
                          </div>
                        </div>
                        <div style={{textAlign:'right',fontSize:11}}>
                          <div style={{fontWeight:600,color:'var(--text-secondary)'}}>{fc(uc)}</div>
                          <div style={{color:'var(--text-light)'}}>/{it.du}</div>
                        </div>
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>
      )}
      {ings.length>0?(
        <div style={{border:'1px solid var(--border-strong)',borderRadius:12,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:'var(--bg-hover)'}}>
                {['Ingredient','Unit Cost','Qty','Unit','Line Cost'].map(h=>(
                  <th key={h} style={{padding:'8px 12px',textAlign:h==='Qty'||h==='Unit Cost'||h==='Line Cost'?'right':'left',fontWeight:600,color:'var(--text-light)',fontSize:11}}>{h}</th>
                ))}
                {!readOnly && <th style={{padding:'8px 12px',textAlign:'left',fontWeight:600,color:'var(--text-light)',fontSize:11}} />}
              </tr>
            </thead>
            <tbody>
              {ings.map((ing,idx)=>{
                const info=getInfo(ing), uc=getUC(ing)
                const Icon = ing.type === 'raw' ? Package : FlaskConical
                return (
                  <tr key={ing.id} style={{borderTop:'1px solid var(--border-color)',background:'var(--bg-card)'}}>
                    <td style={{padding:'8px 12px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <Icon size={13} style={{color:ing.type==='raw'?'#2563eb':'#8b5cf6',flexShrink:0}}/>
                        <div>
                          <div style={{fontWeight:600,color:'var(--text-primary)'}}>{info?.name||'?'}</div>
                          <div style={{fontSize:10,color:'var(--text-light)'}}>{ing.type==='raw'?'Raw':'Intermediate'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{padding:'8px 12px',textAlign:'right',color:'var(--text-secondary)'}}>{fc(uc)}</td>
                    <td style={{padding:'8px 12px',textAlign:'right'}}>
                      <input type='number' value={ing.qty} min='0' step='any'
                        onChange={e=>updQty(idx,e.target.value)}
                        disabled={readOnly}
                        className="custom-input"
                        style={{
                          width:72,
                          border:'1px solid var(--border-strong)',
                          borderRadius:6,
                          padding:'4px 8px',
                          textAlign:'right',
                          fontSize:12,
                          color:'var(--text-primary)',
                          background:readOnly?'var(--bg-hover)':'var(--bg-card)',
                          outline:'none',
                          transition:'all 0.15s ease'
                        }}/>
                    </td>
                    <td style={{padding:'8px 12px',color:'var(--text-muted)'}}>{ing.unit}</td>
                    <td style={{padding:'8px 12px',textAlign:'right',fontWeight:700,color:'var(--text-secondary)'}}>{fc(uc*(ing.qty||0))}</td>
                    {!readOnly && (
                      <td style={{padding:'8px 12px'}}>
                        <button onClick={()=>remove(idx)} style={{border:'none',background:'none',cursor:'pointer',color:'var(--text-light)',display:'flex',padding:2,transition:'color 0.15s'}}
                          onMouseOver={e=>e.currentTarget.style.color='#ef4444'} onMouseOut={e=>e.currentTarget.style.color='var(--text-light)'}>
                          <Trash2 size={12}/>
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{background:'var(--bg-active-tab)',borderTop:'1px solid var(--primary-hover)'}}>
                <td colSpan='4' style={{padding:'8px 12px',fontSize:12,fontWeight:700,color:'var(--primary)'}}>Total ingredient cost</td>
                <td style={{padding:'8px 12px',textAlign:'right',fontSize:14,fontWeight:800,color:'var(--primary)'}}>{fc(total)}</td>
                {!readOnly && <td/>}
              </tr>
            </tfoot>
          </table>
        </div>
      ):(
        <div style={{border:'2px dashed var(--border-color)',borderRadius:12,padding:24,textAlign:'center',fontSize:13,color:'var(--text-light)'}}>
          Search above to add ingredients
        </div>
      )}
    </div>
  )
}
