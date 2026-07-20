import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Modal, Btn, InfoBox, SecTitle, InlineAddDropdown, Sel, Inp } from '../UIPrimitives.jsx'
import { AiPanel } from '../AiPanel.jsx'
import { aiSuggest } from '../../services/ai.js'
import { FOOD_TYPES, UNITS, NF } from '../../constants.js'
import { uid, fc, rmUC } from '../../utils.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { useUI } from '../../context/UIContext.jsx'

export const RMModal = ({rm, onSave, onClose, rms = [], customCats = {}, addCustomCat, readOnly}) => {
  const { showToast } = useUI()
  const blank = {id:'',name:'',category:'',sub_category:'',food_type:'',buy_unit:'kg',pack_cost:0,pack_qty:1,usage_unit:'g',conversion:1000,...Object.fromEntries(NF.map(f=>[f.k,0]))}
  const [f, setF]   = useState(rm?{...blank,...rm}:{...blank,id:uid()})
  const [ai, setAi] = useState(null)
  const [aiL,setAiL]= useState(false)
  const isMobile    = useIsMobile()
  
  const cats = [...new Set([
    ...(rms || []).map(r => r.category),
    ...(customCats?.raw || [])
  ].filter(Boolean))].sort()
  const subCats = [...new Set([
    ...(rms || []).map(r => r.sub_category),
    ...(customCats?.raw_sub || [])
  ].filter(Boolean))].sort()

  const upd = (k,v) => setF(p=>({...p,[k]:v}))
  const buc = (f.pack_cost||0)/(f.pack_qty||1)
  const uc  = rmUC(f)
  const sameUnit = f.usage_unit===f.buy_unit
 
  const runAI = async () => {
    if (!f.name.trim()){showToast('Enter a name first.', 'warning');return}
    setAiL(true)
    try { setAi(await aiSuggest(f.name,'raw')) }
    catch(e){ showToast('AI suggestion failed: '+e.message, 'error') }
    finally { setAiL(false) }
  }
  const applyAI = () => {
    if (!ai) return
    const {category,sub_category,food_type,buy_unit,usage_unit,conversion,...nut}=ai
    setF(p=>({...p,category:category||p.category,sub_category:sub_category||p.sub_category,food_type:food_type||p.food_type,buy_unit:buy_unit||p.buy_unit,usage_unit:usage_unit||p.usage_unit,conversion:conversion||p.conversion,...nut}))
    setAi(null)
  }
  const valid = f.name&&(f.pack_cost||0)>0&&(f.pack_qty||0)>0
 
  return (
    <Modal title={readOnly ? 'Raw Material Details' : (rm?'Edit Raw Material':'Add Raw Material')} onClose={onClose} wide>
      <SecTitle>Basic Information</SecTitle>
      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:12}}>
        <div style={{gridColumn:'1/-1',display:'flex',gap:8,alignItems:'flex-end'}}>
          <Inp label='Ingredient Name' v={f.name} onChange={v=>upd('name',v)} ph='e.g. Prawns, Basmati Rice, Olive Oil' req disabled={readOnly} style={{flex:1}}/>
          {!readOnly && <Btn ch={<><Sparkles size={12}/>{aiL?'Thinking…':'AI Suggest'}</>} v='ai' sz='sm' onClick={runAI} disabled={aiL}/>}
        </div>
        <AiPanel suggestions={ai} onApply={applyAI} onDismiss={()=>setAi(null)}/>
         <InlineAddDropdown label='Category' v={f.category} onChange={v=>upd('category',v)} options={cats} ph='e.g. Seafood, Dairy, Vegetables' req disabled={readOnly}/>
        <InlineAddDropdown label='Sub-Category' v={f.sub_category} onChange={v=>upd('sub_category',v)} options={subCats} ph='e.g. Shellfish, Leafy Greens' disabled={readOnly}/>
        <Sel label='Food Type' v={f.food_type} onChange={v=>upd('food_type',v)} opts={FOOD_TYPES} ph='Select…' req disabled={readOnly} style={{gridColumn: isMobile ? 'auto' : '1/-1'}}/>
      </div>

      <SecTitle>Purchase Details</SecTitle>
      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',gap:12}}>
        <Sel label='Buy Unit' v={f.buy_unit} onChange={v=>{upd('buy_unit',v);if(v===f.usage_unit)upd('conversion',1)}} opts={UNITS} req disabled={readOnly}/>
        <Inp label='Pack Cost (₹)' v={f.pack_cost} onChange={v=>upd('pack_cost',parseFloat(v)||0)} type='number' min='0' step='any' req disabled={readOnly}/>
        <Inp label='Qty per Pack' v={f.pack_qty} onChange={v=>upd('pack_qty',parseFloat(v)||0)} type='number' min='0' step='any' req disabled={readOnly}/>
      </div>
      <div style={{marginTop:8}}><InfoBox color='gray'>Cost per {f.buy_unit||'buy unit'}: <strong>{fc(buc)}</strong></InfoBox></div>

      <SecTitle>Usage Details</SecTitle>
      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:12}}>
        <Sel label='Usage Unit (how measured in recipes)' v={f.usage_unit} onChange={v=>{upd('usage_unit',v);if(v===f.buy_unit)upd('conversion',1)}} opts={UNITS} req disabled={readOnly}/>
        <Inp
          label={sameUnit?'Conversion (same unit — 1:1)':`How many ${f.usage_unit||'usage units'} per 1 ${f.buy_unit||'buy unit'}`}
          v={f.conversion} onChange={v=>upd('conversion',parseFloat(v)||0)}
          type='number' min='0' step='any' readOnly={sameUnit || readOnly} disabled={readOnly}/>
      </div>
      <div style={{marginTop:8}}><InfoBox color='amber'>Cost per {f.usage_unit||'usage unit'}: <strong>{fc(uc)}</strong></InfoBox></div>

      <details style={{ marginTop: 16 }}>
        <summary style={{ fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--primary)', outline: 'none' }}>
          Show Advanced / Nutritional Values (optional)
        </summary>
        <div style={{ marginTop: 12 }}>
          <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)',gap:10}}>
            {NF.map(n=><Inp key={n.k} label={n.l} v={f[n.k]} onChange={v=>upd(n.k,parseFloat(v)||0)} type='number' min='0' step='any' unit={n.u} disabled={readOnly}/>)}
          </div>
        </div>
      </details>

      <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:16,marginTop:8,borderTop:'1px solid #f1f1f1'}}>
        <Btn ch={readOnly ? 'Close' : 'Cancel'} v='secondary' onClick={onClose}/>
        {!readOnly && <Btn ch='Save Raw Material' v='primary' onClick={() => {
          if (f.category) addCustomCat?.('raw', f.category);
          if (f.sub_category) addCustomCat?.('raw_sub', f.sub_category);
          onSave(f);
        }} disabled={!valid}/>}
      </div>
    </Modal>
  )
}
