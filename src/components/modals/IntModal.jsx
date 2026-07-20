import { useState } from 'react'
import { Modal, Btn, InfoBox, SecTitle, InlineAddDropdown, Sel, Inp } from '../UIPrimitives.jsx'
import { IngPicker } from '../IngPicker.jsx'
import { UNITS, NF } from '../../constants.js'
import { uid, fc, ingCost, intNut } from '../../utils.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'

export const IntModal = ({inter, onSave, onClose, rms, setRms, ints, setInts, customCats = {}, addCustomCat, readOnly}) => {
  const blank = {id:'',name:'',category:'',ingredients:[],yield_qty:1,yield_unit:'g'}
  const [f,setF] = useState(inter?{...blank,...inter}:{...blank,id:uid()})
  const isMobile  = useIsMobile()
  const upd = (k,v) => setF(p=>({...p,[k]:v}))
  const totalCost = f.ingredients.reduce((s,i)=>s+ingCost(i,rms,ints),0)
  const uc  = totalCost/(f.yield_qty||1)
  const nut = intNut({...f},rms,ints)
  
  const cats = [...new Set([
    ...(ints || []).map(i => i.category),
    ...(customCats?.int || [])
  ].filter(Boolean))].sort()

  const valid = f.name&&(f.yield_qty||0)>0&&f.ingredients.length>0

  return (
    <Modal title={readOnly ? 'Intermediate Details' : (inter?'Edit Intermediate':'Add Intermediate')} onClose={onClose} wide>
      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:12}}>
        <Inp label='Intermediate Name' v={f.name} onChange={v=>upd('name',v)} ph='e.g. Red Pasta Sauce, Marinated Chicken' req disabled={readOnly}/>
         <InlineAddDropdown label='Category' v={f.category} onChange={v=>upd('category',v)} options={cats} ph='e.g. Sauces, Marinades, Bases' disabled={readOnly}/>
      </div>

      <SecTitle>Recipe Ingredients</SecTitle>
      <IngPicker ings={f.ingredients} setIngs={v=>upd('ingredients',v)} rms={rms} setRms={setRms} ints={ints.filter(i=>i.id!==f.id)} setInts={setInts} readOnly={readOnly}/>

      <SecTitle>Yield (Output produced by this recipe)</SecTitle>
      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:12}}>
        <Inp label='Yield Quantity' v={f.yield_qty} onChange={v=>upd('yield_qty',parseFloat(v)||0)} type='number' min='0' step='any' req disabled={readOnly}/>
        <Sel label='Yield Unit' v={f.yield_unit} onChange={v=>upd('yield_unit',v)} opts={UNITS} req disabled={readOnly}/>
      </div>
      {f.yield_qty>0&&f.ingredients.length>0&&(
        <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:8,marginTop:8}}>
          <InfoBox color='gray'>Total recipe cost: <strong>{fc(totalCost)}</strong></InfoBox>
          <InfoBox color='amber'>Cost per {f.yield_unit}: <strong>{fc(uc)}</strong></InfoBox>
        </div>
      )}

      {f.ingredients.length>0&&(
        <>
          <SecTitle>Auto-Calculated Nutrition (per yield unit)</SecTitle>
          <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)',gap:8}}>
            {NF.map(n=>(
              <div key={n.k} style={{background:'#f9fafb',borderRadius:8,padding:'8px 10px'}} style={{background:'var(--bg-hover)',borderRadius:8,padding:'8px 10px'}}>
                <div style={{fontSize:11,color:'var(--text-light)'}}>{n.l}</div>
                <div style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>{(nut[n.k]||0).toFixed(2)}<span style={{fontSize:10,color:'var(--text-light)',fontWeight:400,marginLeft:2}}>{n.u}</span></div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:16,marginTop:8,borderTop:'1px solid var(--border-color)'}}>
        <Btn ch={readOnly ? 'Close' : 'Cancel'} v='secondary' onClick={onClose}/>
        {!readOnly && <Btn ch='Save Intermediate' v='primary' onClick={() => {
          if (f.category) addCustomCat?.('int', f.category);
          onSave(f);
        }} disabled={!valid}/>}
      </div>
    </Modal>
  )
}
