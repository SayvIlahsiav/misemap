import { useState, useMemo } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { Label } from './UIPrimitives.jsx'
import { fc, rmUC, intUC, ingCost } from '../utils.js'

export const IngPicker = ({ings, setIngs, rms, ints, noInts=false}) => {
  const [q, setQ] = useState('')
  const all = useMemo(() => [
    ...rms.map(r=>({...r,type:'raw',du:r.usage_unit})),
    ...(noInts?[]:ints.map(i=>({...i,type:'intermediate',du:i.yield_unit}))),
  ],[rms,ints,noInts])
  const filtered = q ? all.filter(i=>(i?.name || '').toLowerCase().includes(q.toLowerCase())) : []

  const add = item => {
    if (ings.find(i=>i.id===item.id)) return
    setIngs([...ings,{id:item.id,type:item.type,qty:1,unit:item.du}])
    setQ('')
  }
  const remove = idx => setIngs(ings.filter((_,i)=>i!==idx))
  const updQty = (idx,qty) => { const u=[...ings]; u[idx]={...u[idx],qty:parseFloat(qty)||0}; setIngs(u) }
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
      <div style={{position:'relative'}}>
        <Search size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#d1d5db'}}/>
        <input value={q} onChange={e=>setQ(e.target.value)}
          placeholder={`Search to add ${noInts?'raw materials':'raw materials or intermediates'}…`}
          style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 10px 8px 32px',fontSize:13,outline:'none'}}/>
        {q&&(
          <div style={{position:'absolute',zIndex:30,top:'calc(100% + 4px)',left:0,right:0,background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,0.12)',maxHeight:220,overflowY:'auto'}}>
            {filtered.length===0&&<div style={{padding:'12px 16px',fontSize:13,color:'#9ca3af'}}>No items found</div>}
            {filtered.map(it=>{
              const uc = it.type==='raw'?rmUC(it):intUC(it,rms,ints)
              return (
                <button key={it.id} onClick={()=>add(it)}
                  style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',border:'none',background:'none',cursor:'pointer',textAlign:'left'}}
                  onMouseOver={e=>e.currentTarget.style.background='#f0fdfa'} onMouseOut={e=>e.currentTarget.style.background='none'}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'#111'}}>{it.name}</div>
                    <div style={{fontSize:11,color:'#9ca3af'}}>{it.type==='raw'?'Raw material':'Intermediate'} · per {it.du}</div>
                  </div>
                  <div style={{textAlign:'right',fontSize:11}}>
                    <div style={{fontWeight:600,color:'#374151'}}>{fc(uc)}</div>
                    <div style={{color:'#9ca3af'}}>/{it.du}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
      {ings.length>0?(
        <div style={{border:'1px solid #e5e7eb',borderRadius:12,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:'#f9fafb'}}>
                {['Ingredient','Unit Cost','Qty','Unit','Line Cost',''].map(h=>(
                  <th key={h} style={{padding:'8px 12px',textAlign:h==='Qty'||h==='Unit Cost'||h==='Line Cost'?'right':'left',fontWeight:600,color:'#9ca3af',fontSize:11}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ings.map((ing,idx)=>{
                const info=getInfo(ing), uc=getUC(ing)
                return (
                  <tr key={ing.id} style={{borderTop:'1px solid #f3f4f6'}}>
                    <td style={{padding:'8px 12px'}}>
                      <div style={{fontWeight:600,color:'#111'}}>{info?.name||'?'}</div>
                      <div style={{fontSize:10,color:'#9ca3af'}}>{ing.type==='raw'?'Raw':'Intermediate'}</div>
                    </td>
                    <td style={{padding:'8px 12px',textAlign:'right',color:'#6b7280'}}>{fc(uc)}</td>
                    <td style={{padding:'8px 12px',textAlign:'right'}}>
                      <input type='number' value={ing.qty} min='0' step='any'
                        onChange={e=>updQty(idx,e.target.value)}
                        style={{width:72,border:'1px solid #e5e7eb',borderRadius:6,padding:'4px 8px',textAlign:'right',fontSize:12,outline:'none'}}/>
                    </td>
                    <td style={{padding:'8px 12px',color:'#6b7280'}}>{ing.unit}</td>
                    <td style={{padding:'8px 12px',textAlign:'right',fontWeight:700,color:'#374151'}}>{fc(uc*(ing.qty||0))}</td>
                    <td style={{padding:'8px 12px'}}>
                      <button onClick={()=>remove(idx)} style={{border:'none',background:'none',cursor:'pointer',color:'#d1d5db',display:'flex',padding:2}}
                        onMouseOver={e=>e.currentTarget.style.color='#ef4444'} onMouseOut={e=>e.currentTarget.style.color='#d1d5db'}>
                        <Trash2 size={12}/>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{background:'#f0fdfa',borderTop:'1px solid #99f6e4'}}>
                <td colSpan='4' style={{padding:'8px 12px',fontSize:12,fontWeight:700,color:'#134e4a'}}>Total ingredient cost</td>
                <td style={{padding:'8px 12px',textAlign:'right',fontSize:14,fontWeight:800,color:'#0f766e'}}>{fc(total)}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>
      ):(
        <div style={{border:'2px dashed #f1f1f1',borderRadius:12,padding:24,textAlign:'center',fontSize:13,color:'#d1d5db'}}>
          Search above to add ingredients
        </div>
      )}
    </div>
  )
}
