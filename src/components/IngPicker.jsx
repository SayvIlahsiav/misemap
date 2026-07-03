import { useState, useMemo } from 'react'
import { Search, Trash2, Package, FlaskConical } from 'lucide-react'
import { Label } from './UIPrimitives.jsx'
import { fc, rmUC, intUC } from '../utils.js'

export const IngPicker = ({ings, setIngs, rms, ints, noInts=false, readOnly}) => {
  const [q, setQ] = useState('')
  const all = useMemo(() => [
    ...rms.map(r=>({...r,type:'raw',du:r.usage_unit})),
    ...(noInts?[]:ints.map(i=>({...i,type:'intermediate',du:i.yield_unit}))),
  ],[rms,ints,noInts])
  const filtered = q ? all.filter(i=>(i?.name || '').toLowerCase().includes(q.toLowerCase())) : []

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
          {q&&(
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
              maxHeight:220,
              overflowY:'auto'
            }}>
              {filtered.length===0&&<div style={{padding:'12px 16px',fontSize:13,color:'var(--text-light)'}}>No items found</div>}
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
