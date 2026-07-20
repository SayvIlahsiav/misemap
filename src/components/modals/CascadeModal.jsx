import { useState } from 'react'
import { Modal, Btn } from '../UIPrimitives.jsx'

export const CascadeModal = ({data, onConfirm, onClose, mis}) => {
  const {changedFields, affCats, affItems, newGlobal} = data
  const [sel, setSel] = useState([])
  const toggle = key => setSel(s=>s.includes(key)?s.filter(x=>x!==key):[...s,key])
  const getName = id => mis.find(m=>m.id===id)?.name||id
  const LABELS = {sp_multiplier:'SP Multiplier',packaging_cost:'Packaging Cost',delivery_markup:'Delivery Markup'}

  const items = []
  changedFields.forEach(field=>{
    Object.entries(affCats).forEach(([cat,ov])=>{if(ov[field]!=null)items.push({key:`cat:${cat}:${field}`,label:`Category: ${cat}`,field,from:ov[field],to:newGlobal[field]})})
    Object.entries(affItems).forEach(([id,ov])=>{if(ov[field]!=null)items.push({key:`item:${id}:${field}`,label:`Item: ${getName(id)}`,field,from:ov[field],to:newGlobal[field]})})
  })

  if (items.length===0){onConfirm([],[]);return null}

  const selCats  = sel.filter(k=>k.startsWith('cat:')).map(k=>{const[,cat,field]=k.split(':');return{cat,field}})
  const selItems = sel.filter(k=>k.startsWith('item:')).map(k=>{const[,id,field]=k.split(':');return{id,field}})

  return (
    <Modal title='Update Overrides?' onClose={onClose}>
      <p style={{fontSize:13,color:'var(--text-light)',marginBottom:16}}>You changed global defaults. Select which category/item overrides to reset to the new value:</p>
      <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:300,overflowY:'auto'}}>
        {items.map(it=>(
          <label key={it.key} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',border:'1px solid var(--border-color)',borderRadius:10,cursor:'pointer',background:sel.includes(it.key)?'var(--bg-active-tab)':'var(--bg-card)'}}>
            <input type='checkbox' checked={sel.includes(it.key)} onChange={()=>toggle(it.key)} style={{accentColor:'var(--primary)'}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600}}>{it.label}</div>
              <div style={{fontSize:11,color:'var(--text-light)'}}>{LABELS[it.field]}: {it.from} → {it.to}</div>
            </div>
          </label>
        ))}
      </div>
      <div style={{display:'flex',gap:12,margin:'8px 0'}}>
        <button onClick={()=>setSel(items.map(i=>i.key))} style={{fontSize:12,color:'var(--primary)',border:'none',background:'none',cursor:'pointer',fontWeight:600}}>Select all</button>
        <button onClick={()=>setSel([])} style={{fontSize:12,color:'var(--text-light)',border:'none',background:'none',cursor:'pointer',fontWeight:600}}>Deselect all</button>
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:16,marginTop:4,borderTop:'1px solid var(--border-color)'}}>
        <Btn ch='Skip — just save global' v='secondary' onClick={()=>onConfirm([],[])}/>
        <Btn ch={`Apply (${sel.length} selected)`} v='primary' onClick={()=>onConfirm(selCats,selItems)}/>
      </div>
    </Modal>
  )
}
