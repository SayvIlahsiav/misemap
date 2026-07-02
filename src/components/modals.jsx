import { useState } from 'react'
import { Sparkles, AlertTriangle, RotateCcw, Upload, Download, Check } from 'lucide-react'
import { Modal, Btn, Bdg, Inp, Sel, InfoBox, SecTitle, FCBadge, SrcPill } from './UIPrimitives.jsx'
import { AiPanel } from './AiPanel.jsx'
import { IngPicker } from './IngPicker.jsx'
import { aiSuggest } from '../services/ai.js'
import { FOOD_TYPES, UNITS, NF, FT_COLOR_MAP } from '../constants.js'
import { uid, fc, fp, rmUC, ingCost, intUC, miFC, intNut, miNut, effVal } from '../utils.js'
import { useIsMobile } from '../hooks/useIsMobile.js'

// ─────────────────────────────────────────────────────────
// RAW MATERIAL MODAL
// ─────────────────────────────────────────────────────────
export const RMModal = ({rm, onSave, onClose}) => {
  const blank = {id:'',name:'',category:'',sub_category:'',food_type:'',buy_unit:'kg',pack_cost:0,pack_qty:1,usage_unit:'g',conversion:1000,...Object.fromEntries(NF.map(f=>[f.k,0]))}
  const [f, setF]   = useState(rm?{...blank,...rm}:{...blank,id:uid()})
  const [ai, setAi] = useState(null)
  const [aiL,setAiL]= useState(false)
  const isMobile    = useIsMobile()
  const upd = (k,v) => setF(p=>({...p,[k]:v}))
  const buc = (f.pack_cost||0)/(f.pack_qty||1)
  const uc  = rmUC(f)
  const sameUnit = f.usage_unit===f.buy_unit

  const runAI = async () => {
    if (!f.name.trim()){alert('Enter a name first.');return}
    setAiL(true)
    try { setAi(await aiSuggest(f.name,'raw')) }
    catch(e){ alert('AI suggestion failed: '+e.message) }
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
    <Modal title={rm?'Edit Raw Material':'Add Raw Material'} onClose={onClose} wide>
      <SecTitle>Basic Information</SecTitle>
      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:12}}>
        <div style={{gridColumn:'1/-1',display:'flex',gap:8,alignItems:'flex-end'}}>
          <Inp label='Ingredient Name' v={f.name} onChange={v=>upd('name',v)} ph='e.g. Prawns, Basmati Rice, Olive Oil' req style={{flex:1}}/>
          <Btn ch={<><Sparkles size={12}/>{aiL?'Thinking…':'AI Suggest'}</>} v='ai' sz='sm' onClick={runAI} disabled={aiL}/>
        </div>
        <AiPanel suggestions={ai} onApply={applyAI} onDismiss={()=>setAi(null)}/>
        <Inp label='Category' v={f.category} onChange={v=>upd('category',v)} ph='e.g. Seafood, Dairy, Vegetables' req/>
        <Inp label='Sub-Category' v={f.sub_category} onChange={v=>upd('sub_category',v)} ph='e.g. Shellfish, Leafy Greens'/>
        <Sel label='Food Type' v={f.food_type} onChange={v=>upd('food_type',v)} opts={FOOD_TYPES} ph='Select…' req style={{gridColumn: isMobile ? 'auto' : '1/-1'}}/>
      </div>

      <SecTitle>Purchase Details</SecTitle>
      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',gap:12}}>
        <Sel label='Buy Unit' v={f.buy_unit} onChange={v=>{upd('buy_unit',v);if(v===f.usage_unit)upd('conversion',1)}} opts={UNITS} req/>
        <Inp label='Pack Cost (₹)' v={f.pack_cost} onChange={v=>upd('pack_cost',parseFloat(v)||0)} type='number' min='0' step='any' req/>
        <Inp label='Qty per Pack' v={f.pack_qty} onChange={v=>upd('pack_qty',parseFloat(v)||0)} type='number' min='0' step='any' req/>
      </div>
      <div style={{marginTop:8}}><InfoBox color='gray'>Cost per {f.buy_unit||'buy unit'}: <strong>{fc(buc)}</strong></InfoBox></div>

      <SecTitle>Usage Details</SecTitle>
      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:12}}>
        <Sel label='Usage Unit (how measured in recipes)' v={f.usage_unit} onChange={v=>{upd('usage_unit',v);if(v===f.buy_unit)upd('conversion',1)}} opts={UNITS} req/>
        <Inp
          label={sameUnit?'Conversion (same unit — 1:1)':`How many ${f.usage_unit||'usage units'} per 1 ${f.buy_unit||'buy unit'}`}
          v={f.conversion} onChange={v=>upd('conversion',parseFloat(v)||0)}
          type='number' min='0' step='any' readOnly={sameUnit}/>
      </div>
      <div style={{marginTop:8}}><InfoBox color='amber'>Cost per {f.usage_unit||'usage unit'}: <strong>{fc(uc)}</strong></InfoBox></div>

      <SecTitle>Nutritional Values (per 1 {f.usage_unit||'usage unit'})</SecTitle>
      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)',gap:10}}>
        {NF.map(n=><Inp key={n.k} label={n.l} v={f[n.k]} onChange={v=>upd(n.k,parseFloat(v)||0)} type='number' min='0' step='any' unit={n.u}/>)}
      </div>

      <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:16,marginTop:8,borderTop:'1px solid #f1f1f1'}}>
        <Btn ch='Cancel' v='secondary' onClick={onClose}/>
        <Btn ch='Save Raw Material' v='primary' onClick={()=>onSave(f)} disabled={!valid}/>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// INTERMEDIATE MODAL
// ─────────────────────────────────────────────────────────
export const IntModal = ({inter, onSave, onClose, rms, ints}) => {
  const blank = {id:'',name:'',category:'',ingredients:[],yield_qty:1,yield_unit:'g'}
  const [f,setF] = useState(inter?{...blank,...inter}:{...blank,id:uid()})
  const isMobile  = useIsMobile()
  const upd = (k,v) => setF(p=>({...p,[k]:v}))
  const totalCost = f.ingredients.reduce((s,i)=>s+ingCost(i,rms,ints),0)
  const uc  = totalCost/(f.yield_qty||1)
  const nut = intNut({...f},rms,ints)
  const valid = f.name&&(f.yield_qty||0)>0&&f.ingredients.length>0

  return (
    <Modal title={inter?'Edit Intermediate':'Add Intermediate'} onClose={onClose} wide>
      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:12}}>
        <Inp label='Intermediate Name' v={f.name} onChange={v=>upd('name',v)} ph='e.g. Red Pasta Sauce, Marinated Chicken' req/>
        <Inp label='Category' v={f.category} onChange={v=>upd('category',v)} ph='e.g. Sauces, Marinades, Bases'/>
      </div>

      <SecTitle>Recipe Ingredients</SecTitle>
      <IngPicker ings={f.ingredients} setIngs={v=>upd('ingredients',v)} rms={rms} ints={ints.filter(i=>i.id!==f.id)}/>

      <SecTitle>Yield (Output produced by this recipe)</SecTitle>
      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:12}}>
        <Inp label='Yield Quantity' v={f.yield_qty} onChange={v=>upd('yield_qty',parseFloat(v)||0)} type='number' min='0' step='any' req/>
        <Sel label='Yield Unit' v={f.yield_unit} onChange={v=>upd('yield_unit',v)} opts={UNITS} req/>
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
              <div key={n.k} style={{background:'#f9fafb',borderRadius:8,padding:'8px 10px'}}>
                <div style={{fontSize:11,color:'#9ca3af'}}>{n.l}</div>
                <div style={{fontSize:13,fontWeight:700,color:'#374151'}}>{(nut[n.k]||0).toFixed(2)}<span style={{fontSize:10,color:'#9ca3af',fontWeight:400,marginLeft:2}}>{n.u}</span></div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:16,marginTop:8,borderTop:'1px solid #f1f1f1'}}>
        <Btn ch='Cancel' v='secondary' onClick={onClose}/>
        <Btn ch='Save Intermediate' v='primary' onClick={()=>onSave(f)} disabled={!valid}/>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// MENU ITEM MODAL
// ─────────────────────────────────────────────────────────
export const MIModal = ({item, onSave, onClose, rms, ints, pc}) => {
  const blank = {id:'',name:'',category:'',sub_category:'',food_type:'',ingredients:[],sp_multiplier_override:null,packaging_cost_override:null,delivery_markup_override:null,selling_price_override:null,takeaway_price_override:null,delivery_price_override:null}
  const [f,setF]   = useState(item?{...blank,...item}:{...blank,id:uid()})
  const [ai,setAi] = useState(null)
  const [aiL,setAiL]= useState(false)
  const isMobile    = useIsMobile()
  const upd = (k,v) => setF(p=>({...p,[k]:v}))

  const food = miFC(f,rms,ints)
  const eff_spm = effVal('sp_multiplier',f.id,f.category,pc)
  const eff_pkg = effVal('packaging_cost',f.id,f.category,pc)
  const eff_dm  = effVal('delivery_markup',f.id,f.category,pc)
  const act_spm = f.sp_multiplier_override ?? eff_spm.v
  const act_pkg = f.packaging_cost_override ?? eff_pkg.v
  const act_dm  = f.delivery_markup_override ?? eff_dm.v
  const sugg_sp = Math.round((food * act_spm) / 5) * 5
  const sugg_pct = sugg_sp > 0 ? (food / sugg_sp) * 100 : 0
  const sp  = f.selling_price_override ?? sugg_sp
  const sugg_tp = Math.round((sugg_sp + act_pkg) / 5) * 5
  const tp  = f.takeaway_price_override ?? sugg_tp
  const sugg_dp = Math.round(((sugg_sp + act_pkg) * (1 + act_dm/100)) / 5) * 5
  const dp  = f.delivery_price_override ?? sugg_dp
  const pct = sp>0?(food/sp)*100:0
  const takeaway_pct = tp>0?((food+act_pkg)/tp)*100:0
  const delivery_pct = dp>0?((food+act_pkg)/(dp*(1-act_dm/100)))*100:0
  const sugg_takeaway_pct = sugg_tp>0?((food+act_pkg)/sugg_tp)*100:0
  const sugg_delivery_pct = sugg_dp>0?((food+act_pkg)/(sugg_dp*(1-act_dm/100)))*100:0
  const hasCustom = f.selling_price_override != null || f.takeaway_price_override != null || f.delivery_price_override != null
  const nut = miNut(f,rms,ints)
  const threshold = pc.global.fc_alert_threshold
  const valid = f.name&&f.ingredients.length>0

  const runAI = async () => {
    if (!f.name.trim()){alert('Enter a name first.');return}
    setAiL(true)
    try { setAi(await aiSuggest(f.name,'menu')) }
    catch(e){ alert('AI suggestion failed: '+e.message) }
    finally { setAiL(false) }
  }
  const applyAI = () => { if(!ai)return; setF(p=>({...p,...ai})); setAi(null) }

  const OvrField = ({label, field, ovrKey, unit, isX}) => {
    const eff = effVal(field,f.id,f.category,pc)
    const hasOvr = f[ovrKey]!=null
    return (
      <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'flex-start' : 'center',gap: isMobile ? 6 : 12,padding:'8px 0',borderBottom:'1px solid #f9fafb'}}>
        <span style={{fontSize:12,color:'#6b7280',width:150,flexShrink:0}}>{label}</span>
        {hasOvr?(
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{position:'relative'}}>
              <input type='number' value={f[ovrKey]} min='0' step='any'
                onChange={e=>upd(ovrKey,parseFloat(e.target.value)||0)}
                style={{width:90,border:'2px solid #2dd4bf',borderRadius:6,padding:'4px 28px 4px 8px',fontSize:13,outline:'none'}}/>
              <span style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'#9ca3af'}}>{unit}</span>
            </div>
            <button onClick={()=>upd(ovrKey,null)} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'#9ca3af',border:'none',background:'none',cursor:'pointer'}}>
              <RotateCcw size={11}/> Reset
            </button>
          </div>
        ):(
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap: 'wrap'}}>
            <span style={{fontSize:13,fontWeight:700,color:'#374151'}}>{isX?`${eff.v}×`:`${unit}${eff.v}`}</span>
            <SrcPill src={eff.src}/>
            <button onClick={()=>upd(ovrKey,eff.v)} style={{fontSize:11,color:'#0d9488',fontWeight:700,border:'none',background:'none',cursor:'pointer'}}>Override</button>
          </div>
        )}
      </div>
    )
  }

  const fcBg     = pct>threshold?'#fef2f2':pct>threshold*0.85?'#fff7ed':'#f0fdf4'
  const fcBorder = pct>threshold?'#fecaca':pct>threshold*0.85?'#fed7aa':'#bbf7d0'

  return (
    <Modal title={item?'Edit Menu Item':'Add Menu Item'} onClose={onClose} wide>
      <SecTitle>Basic Information</SecTitle>
      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:12}}>
        <div style={{gridColumn:'1/-1',display:'flex',gap:8,alignItems:'flex-end'}}>
          <Inp label='Item Name' v={f.name} onChange={v=>upd('name',v)} ph='e.g. Prawn Pasta, Mango Smoothie' req style={{flex:1}}/>
          <Btn ch={<><Sparkles size={12}/>{aiL?'Thinking…':'AI Suggest'}</>} v='ai' sz='sm' onClick={runAI} disabled={aiL}/>
        </div>
        <AiPanel suggestions={ai} onApply={applyAI} onDismiss={()=>setAi(null)}/>
        <Inp label='Category' v={f.category} onChange={v=>upd('category',v)} ph='e.g. Mains, Beverages, Starters'/>
        <Inp label='Sub-Category' v={f.sub_category} onChange={v=>upd('sub_category',v)} ph='e.g. Pasta, Smoothies, Soups'/>
        <Sel label='Food Type' v={f.food_type} onChange={v=>upd('food_type',v)} opts={FOOD_TYPES} ph='Select…' style={{gridColumn: isMobile ? 'auto' : '1/-1'}}/>
      </div>

      <SecTitle>Recipe Ingredients</SecTitle>
      <IngPicker ings={f.ingredients} setIngs={v=>upd('ingredients',v)} rms={rms} ints={ints}/>

      <SecTitle>Pricing Overrides</SecTitle>
      <div style={{background:'#f9fafb',borderRadius:12,padding:'4px 16px'}}>
        <OvrField label='SP Multiplier' field='sp_multiplier' ovrKey='sp_multiplier_override' unit='×' isX/>
        <OvrField label='Packaging Cost' field='packaging_cost' ovrKey='packaging_cost_override' unit='₹'/>
        <OvrField label='Delivery Markup' field='delivery_markup' ovrKey='delivery_markup_override' unit='%'/>
        <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'flex-start' : 'center',gap: isMobile ? 6 : 12,padding:'8px 0',borderBottom:'1px solid #f3f4f6'}}>
          <span style={{fontSize:12,color:'#6b7280',width:150,flexShrink:0}}>Custom Selling Price</span>
          {f.selling_price_override != null ? (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{position:'relative'}}>
                <input type='number' value={f.selling_price_override} min='0' step='any'
                  onChange={e=>upd('selling_price_override',parseFloat(e.target.value)||0)}
                  style={{width:90,border:'2px solid #2dd4bf',borderRadius:6,padding:'4px 28px 4px 8px',fontSize:13,outline:'none'}}/>
                <span style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'#9ca3af'}}>₹</span>
              </div>
              <button onClick={()=>upd('selling_price_override',null)} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'#9ca3af',border:'none',background:'none',cursor:'pointer'}}>
                <RotateCcw size={11}/> Reset
              </button>
            </div>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap: 'wrap'}}>
              <span style={{fontSize:13,fontWeight:700,color:'#374151'}}>{fc(sugg_sp)} (Suggested)</span>
              <button onClick={()=>upd('selling_price_override',sugg_sp)} style={{fontSize:11,color:'#0d9488',fontWeight:700,border:'none',background:'none',cursor:'pointer'}}>Override</button>
            </div>
          )}
        </div>
        <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'flex-start' : 'center',gap: isMobile ? 6 : 12,padding:'8px 0',borderBottom:'1px solid #f3f4f6'}}>
          <span style={{fontSize:12,color:'#6b7280',width:150,flexShrink:0}}>Custom Takeaway Price</span>
          {f.takeaway_price_override != null ? (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{position:'relative'}}>
                <input type='number' value={f.takeaway_price_override} min='0' step='any'
                  onChange={e=>upd('takeaway_price_override',parseFloat(e.target.value)||0)}
                  style={{width:90,border:'2px solid #2dd4bf',borderRadius:6,padding:'4px 28px 4px 8px',fontSize:13,outline:'none'}}/>
                <span style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'#9ca3af'}}>₹</span>
              </div>
              <button onClick={()=>upd('takeaway_price_override',null)} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'#9ca3af',border:'none',background:'none',cursor:'pointer'}}>
                <RotateCcw size={11}/> Reset
              </button>
            </div>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap: 'wrap'}}>
              <span style={{fontSize:13,fontWeight:700,color:'#374151'}}>{fc(sugg_tp)} (Suggested)</span>
              <button onClick={()=>upd('takeaway_price_override',sugg_tp)} style={{fontSize:11,color:'#0d9488',fontWeight:700,border:'none',background:'none',cursor:'pointer'}}>Override</button>
            </div>
          )}
        </div>
        <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'flex-start' : 'center',gap: isMobile ? 6 : 12,padding:'8px 0'}}>
          <span style={{fontSize:12,color:'#6b7280',width:150,flexShrink:0}}>Custom Delivery Price</span>
          {f.delivery_price_override != null ? (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{position:'relative'}}>
                <input type='number' value={f.delivery_price_override} min='0' step='any'
                  onChange={e=>upd('delivery_price_override',parseFloat(e.target.value)||0)}
                  style={{width:90,border:'2px solid #2dd4bf',borderRadius:6,padding:'4px 28px 4px 8px',fontSize:13,outline:'none'}}/>
                <span style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'#9ca3af'}}>₹</span>
              </div>
              <button onClick={()=>upd('delivery_price_override',null)} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'#9ca3af',border:'none',background:'none',cursor:'pointer'}}>
                <RotateCcw size={11}/> Reset
              </button>
            </div>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap: 'wrap'}}>
              <span style={{fontSize:13,fontWeight:700,color:'#374151'}}>{fc(sugg_dp)} (Suggested)</span>
              <button onClick={()=>upd('delivery_price_override',sugg_dp)} style={{fontSize:11,color:'#0d9488',fontWeight:700,border:'none',background:'none',cursor:'pointer'}}>Override</button>
            </div>
          )}
        </div>
      </div>

      {f.ingredients.length>0&&(
        <>
          <SecTitle>Live Pricing Preview</SecTitle>
          <div style={{background:fcBg,border:`1px solid ${fcBorder}`,borderRadius:12,padding:16}}>
            {pct>threshold&&(
              <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#991b1b',marginBottom:12}}>
                <AlertTriangle size={13}/> FC% exceeds your {threshold}% alert threshold!
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',gap:16}}>
              {/* Suggested Column */}
              <div style={{background:'#fff',padding:12,borderRadius:10,border:'1px solid #e5e7eb'}}>
                <div style={{fontWeight:700,fontSize:12,color:'#4b5563',marginBottom:10,borderBottom:'1px solid #f3f4f6',paddingBottom:4}}>Suggested Pricing</div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  <div>
                    <div style={{fontSize:10,color:'#9ca3af',fontWeight:600}}>Dine-In</div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                      <span style={{fontSize:13,fontWeight:700,color:'#374151'}}>{fc(sugg_sp)}</span>
                      <span style={{fontSize:11,fontWeight:600,color:sugg_pct>threshold?'#dc2626':'#16a34a'}}>{fp(sugg_pct)} FC</span>
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:'#9ca3af',fontWeight:600}}>Takeaway (with Pkg)</div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                      <span style={{fontSize:13,fontWeight:700,color:'#374151'}}>{fc(sugg_tp)}</span>
                      <span style={{fontSize:11,fontWeight:600,color:sugg_takeaway_pct>threshold?'#dc2626':'#16a34a'}}>{fp(sugg_takeaway_pct)} FC</span>
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:'#9ca3af',fontWeight:600}}>Delivery (Net)</div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                      <span style={{fontSize:13,fontWeight:700,color:'#374151'}}>{fc(sugg_dp)}</span>
                      <span style={{fontSize:11,fontWeight:600,color:sugg_delivery_pct>threshold?'#dc2626':'#16a34a'}}>{fp(sugg_delivery_pct)} FC</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Column */}
              <div style={{background: hasCustom ? '#f0fdfa' : '#fafafa',padding:12,borderRadius:10,border: hasCustom ? '1px solid #99f6e4' : '1px solid #f3f4f6'}}>
                <div style={{fontWeight:700,fontSize:12,color: hasCustom ? '#0f766e' : '#9ca3af',marginBottom:10,borderBottom: hasCustom ? '1px solid #ccfbf1' : '1px solid #f3f4f6',paddingBottom:4}}>
                  {hasCustom ? 'Custom Pricing (Active)' : 'Custom Pricing (None)'}
                </div>
                {hasCustom ? (
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <div>
                      <div style={{fontSize:10,color: f.selling_price_override != null ? '#0d9488' : '#9ca3af',fontWeight:600}}>Dine-In {f.selling_price_override != null && '(Custom)'}</div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                        <span style={{fontSize:13,fontWeight:700,color: f.selling_price_override != null ? '#0d9488' : '#374151'}}>{fc(sp)}</span>
                        <span style={{fontSize:11,fontWeight:600,color:pct>threshold?'#dc2626':'#16a34a'}}>{fp(pct)} FC</span>
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:10,color: f.takeaway_price_override != null ? '#0d9488' : '#9ca3af',fontWeight:600}}>Takeaway {f.takeaway_price_override != null && '(Custom)'}</div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                        <span style={{fontSize:13,fontWeight:700,color: f.takeaway_price_override != null ? '#0d9488' : '#374151'}}>{fc(tp)}</span>
                        <span style={{fontSize:11,fontWeight:600,color:takeaway_pct>threshold?'#dc2626':'#16a34a'}}>{fp(takeaway_pct)} FC</span>
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:10,color: f.delivery_price_override != null ? '#0d9488' : '#9ca3af',fontWeight:600}}>Delivery {f.delivery_price_override != null && '(Custom)'}</div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                        <span style={{fontSize:13,fontWeight:700,color: f.delivery_price_override != null ? '#0d9488' : '#374151'}}>{fc(dp)}</span>
                        <span style={{fontSize:11,fontWeight:600,color:delivery_pct>threshold?'#dc2626':'#16a34a'}}>{fp(delivery_pct)} FC</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{fontSize:11,color:'#9ca3af',textAlign:'center',padding:'32px 0',lineHeight:1.4}}>
                    Using suggested pricing. Click Override under Pricing Overrides to set custom prices.
                  </div>
                )}
              </div>

              {/* Cost & Margins Column */}
              <div style={{background:'#fff',padding:12,borderRadius:10,border:'1px solid #e5e7eb'}}>
                <div style={{fontWeight:700,fontSize:12,color:'#4b5563',marginBottom:8,borderBottom:'1px solid #f3f4f6',paddingBottom:4}}>Cost & Markup</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div>
                    <div style={{fontSize:10,color:'#9ca3af'}}>Food Cost</div>
                    <div style={{fontSize:13,fontWeight:700,color:'#111'}}>{fc(food)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:'#9ca3af'}}>Packaging</div>
                    <div style={{fontSize:13,fontWeight:700,color:'#111'}}>{fc(act_pkg)}</div>
                  </div>
                  <div style={{gridColumn:'1/-1'}}>
                    <div style={{fontSize:10,color:'#9ca3af'}}>Delivery Markup</div>
                    <div style={{fontSize:13,fontWeight:700,color:'#111'}}>{act_dm}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <SecTitle>Total Nutrition (per serving)</SecTitle>
          <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)',gap:8}}>
            {NF.map(n=>(
              <div key={n.k} style={{background:'#f9fafb',borderRadius:8,padding:'8px 10px'}}>
                <div style={{fontSize:11,color:'#9ca3af'}}>{n.l}</div>
                <div style={{fontSize:13,fontWeight:700,color:'#374151'}}>{(nut[n.k]||0).toFixed(1)}<span style={{fontSize:10,color:'#9ca3af',fontWeight:400,marginLeft:2}}>{n.u}</span></div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:16,marginTop:8,borderTop:'1px solid #f1f1f1'}}>
        <Btn ch='Cancel' v='secondary' onClick={onClose}/>
        <Btn ch='Save Menu Item' v='primary' onClick={()=>onSave(f)} disabled={!valid}/>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// CASCADE MODAL
// ─────────────────────────────────────────────────────────
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
      <p style={{fontSize:13,color:'#6b7280',marginBottom:16}}>You changed global defaults. Select which category/item overrides to reset to the new value:</p>
      <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:300,overflowY:'auto'}}>
        {items.map(it=>(
          <label key={it.key} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',border:'1px solid #e5e7eb',borderRadius:10,cursor:'pointer',background:sel.includes(it.key)?'#f0fdfa':'#fff'}}>
            <input type='checkbox' checked={sel.includes(it.key)} onChange={()=>toggle(it.key)} style={{accentColor:'#0d9488'}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600}}>{it.label}</div>
              <div style={{fontSize:11,color:'#9ca3af'}}>{LABELS[it.field]}: {it.from} → {it.to}</div>
            </div>
          </label>
        ))}
      </div>
      <div style={{display:'flex',gap:12,margin:'8px 0'}}>
        <button onClick={()=>setSel(items.map(i=>i.key))} style={{fontSize:12,color:'#0d9488',border:'none',background:'none',cursor:'pointer'}}>Select all</button>
        <button onClick={()=>setSel([])} style={{fontSize:12,color:'#9ca3af',border:'none',background:'none',cursor:'pointer'}}>Deselect all</button>
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:16,marginTop:4,borderTop:'1px solid #f1f1f1'}}>
        <Btn ch='Skip — just save global' v='secondary' onClick={()=>onConfirm([],[])}/>
        <Btn ch={`Apply (${sel.length} selected)`} v='primary' onClick={()=>onConfirm(selCats,selItems)}/>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// BATCH IMPORT MODAL
// ─────────────────────────────────────────────────────────
export const BatchImportModal = ({rms, onSave, onClose}) => {
  const [parsed, setParsed] = useState([])
  const [fileName, setFileName] = useState('')
  const isMobile = useIsMobile()

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target.result
      try {
        const rows = parseCSV(text)
        const validated = rows.map(row => {
          const name = row.name || ''
          const category = row.category || 'General'
          const sub_category = row.sub_category || ''
          
          let food_type = row.food_type || 'Vegetarian'
          if (!FOOD_TYPES.includes(food_type)) {
            const found = FOOD_TYPES.find(f => (f || '').toLowerCase() === (food_type || '').toLowerCase())
            food_type = found || 'Vegetarian'
          }
          
          const buy_unit = row.buy_unit || 'kg'
          const pack_cost = parseFloat(row.pack_cost) || 0
          const pack_qty = parseFloat(row.pack_qty) || 1
          const usage_unit = row.usage_unit || 'g'
          const conversion = parseFloat(row.conversion) || 1
          
          const calories = parseFloat(row.calories) || 0
          const carbs = parseFloat(row.carbs) || 0
          const protein = parseFloat(row.protein) || 0
          const fats = parseFloat(row.fats) || 0
          const fiber = parseFloat(row.fiber) || 0
          const sugar = parseFloat(row.sugar) || 0
          const caffeine = parseFloat(row.caffeine) || 0

          const warnings = []
          if (!row.name) warnings.push('Missing Name')
          if (!row.pack_cost) warnings.push('Pack cost 0')
          if (!row.conversion) warnings.push('Conversion 0')

          return {
            name, category, sub_category, food_type,
            buy_unit, pack_cost, pack_qty, usage_unit, conversion,
            calories, carbs, protein, fats, fiber, sugar, caffeine,
            warnings,
            isDuplicate: rms.some(r => (r?.name || '').toLowerCase() === (name || '').toLowerCase())
          }
        }).filter(r => (r.name || '').trim())
        
        setParsed(validated)
      } catch (err) {
        alert('Failed to parse CSV: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  const downloadTemplate = () => {
    const headers = [
      'name', 'category', 'sub_category', 'food_type',
      'buy_unit', 'pack_cost', 'pack_qty', 'usage_unit', 'conversion',
      'calories', 'carbs', 'protein', 'fats', 'fiber', 'sugar', 'caffeine'
    ]
    const sampleRow = [
      'Basmati Rice', 'Grains', 'Rice', 'Vegan',
      'kg', '120', '1', 'g', '1000',
      '3.5', '0.78', '0.07', '0.01', '0.01', '0', '0'
    ]
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'misemap_ingredients_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImport = () => {
    let updated = [...rms]
    parsed.forEach(item => {
      const idx = updated.findIndex(r => (r?.name || '').toLowerCase() === (item.name || '').toLowerCase())
      const { warnings, isDuplicate, ...cleanItem } = item
      if (idx !== -1) {
        updated[idx] = { ...updated[idx], ...cleanItem }
      } else {
        updated.push({
          id: uid(),
          ...cleanItem
        })
      }
    })
    onSave(updated)
    onClose()
  }

  return (
    <Modal title="Batch Import Raw Materials" onClose={onClose} wide>
      <p style={{fontSize:13,color:'#6b7280',marginBottom:16,lineHeight:1.5}}>
        Import multiple ingredients at once using a CSV file. Duplicate ingredient names will overwrite existing ones.
      </p>

      <div style={{display:'flex',gap:12,marginBottom:20,flexDirection: isMobile ? 'column' : 'row'}}>
        <Btn ch={<><Download size={14}/>Download Template</>} v="secondary" onClick={downloadTemplate} style={{flex: isMobile ? 1 : 'none'}}/>
        <div style={{position:'relative',flex: 1}}>
          <input type="file" accept=".csv" id="csv-file-input" onChange={handleFileChange} style={{display:'none'}} />
          <label htmlFor="csv-file-input" style={{
            display:'inline-flex',alignItems:'center',gap:6,padding: isMobile ? '8px 16px' : '8px 16px',borderRadius:8,fontSize:13,
            fontWeight:600,cursor:'pointer',background:'#fff',color:'#374151',border:'1px solid #e5e7eb',boxSizing:'border-box',width: '100%',justifyContent:'center'
          }}>
            <Upload size={14}/> {fileName ? 'Change File' : 'Select CSV File'}
          </label>
        </div>
      </div>

      {fileName && <div style={{fontSize:12,color:'#374151',marginBottom:12}}>Selected: <strong>{fileName}</strong></div>}

      {parsed.length > 0 ? (
        <div>
          <SecTitle>Preview (Ready to import {parsed.length} items)</SecTitle>
          <div style={{border:'1px solid #e5e7eb',borderRadius:12,overflowX:'auto',maxHeight:240,marginBottom:20}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth: 700}}>
              <thead>
                <tr style={{background:'#f9fafb',borderBottom:'1px solid #e5e7eb'}}>
                  {['Name','Category','Food Type','Pack Cost','Conversion','Status'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:600,color:'#9ca3af',fontSize:11}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.map((item, idx)=>(
                  <tr key={idx} style={{borderBottom:'1px solid #f3f4f6'}}>
                    <td style={{padding:'8px 12px',fontWeight:700}}>{item.name}</td>
                    <td style={{padding:'8px 12px'}}>{item.category}</td>
                    <td style={{padding:'8px 12px'}}><Bdg ch={item.food_type} c={FT_COLOR_MAP[item.food_type]||'gray'}/></td>
                    <td style={{padding:'8px 12px'}}>{fc(item.pack_cost)}</td>
                    <td style={{padding:'8px 12px'}}>{item.conversion}</td>
                    <td style={{padding:'8px 12px'}}>
                      {item.warnings.length > 0 ? (
                        <span style={{color:'#d97706',display:'inline-flex',alignItems:'center',gap:4,fontWeight:600}}>
                          <AlertTriangle size={11}/> {item.warnings.join(', ')}
                        </span>
                      ) : item.isDuplicate ? (
                        <span style={{color:'#7c3aed',fontWeight:600}}>Will Overwrite</span>
                      ) : (
                        <span style={{color:'#16a34a',display:'inline-flex',alignItems:'center',gap:4,fontWeight:600}}>
                          <Check size={11}/> Ready
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:16,borderTop:'1px solid #f1f1f1'}}>
            <Btn ch="Cancel" v="secondary" onClick={onClose}/>
            <Btn ch={`Import ${parsed.length} Ingredients`} v="primary" onClick={handleImport}/>
          </div>
        </div>
      ) : fileName && (
        <div style={{textAlign:'center',padding:24,color:'#9ca3af',fontSize:13}}>No valid rows found in the selected CSV.</div>
      )}
    </Modal>
  )
}

const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length <= 1) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"\r]/g, ''))
  
  return lines.slice(1).map(line => {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())

    const row = {}
    headers.forEach((header, index) => {
      let val = result[index] || ''
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1)
      }
      row[header] = val
    })
    return row
  })
}

// ─────────────────────────────────────────────────────────
// BATCH IMPORT INTERMEDIATES MODAL
// ─────────────────────────────────────────────────────────
export const BatchImportIntModal = ({rms, ints, onSave, onClose}) => {
  const [parsed, setParsed] = useState([])
  const [fileName, setFileName] = useState('')
  const isMobile = useIsMobile()

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target.result
      try {
        const rows = parseCSV(text)
        
        // Group by recipe_name
        const groups = {}
        rows.forEach(row => {
          const recipeName = row.recipe_name || row.name || ''
          if (!recipeName.trim()) return
          
          if (!groups[recipeName]) {
            groups[recipeName] = {
              name: recipeName,
              category: row.category || 'General',
              yield_qty: parseFloat(row.yield_qty) || 1,
              yield_unit: row.yield_unit || 'g',
              ingredients: [],
              warnings: []
            }
          }
          
          const ingName = row.ingredient_name || ''
          if (ingName.trim()) {
            const ingQty = parseFloat(row.ingredient_qty) || 0
            const ingUnit = row.ingredient_unit || 'g'
            
            // Match with existing RM or Int
            const cleanIngName = ingName.trim().toLowerCase()
            const matchRM = rms.find(r => (r?.name || '').trim().toLowerCase() === cleanIngName)
            const matchInt = ints.find(i => (i?.name || '').trim().toLowerCase() === cleanIngName)
            
            if (matchRM) {
              groups[recipeName].ingredients.push({
                id: matchRM.id,
                type: 'raw',
                qty: ingQty,
                unit: ingUnit,
                name: matchRM.name
              })
            } else if (matchInt) {
              groups[recipeName].ingredients.push({
                id: matchInt.id,
                type: 'intermediate',
                qty: ingQty,
                unit: ingUnit,
                name: matchInt.name
              })
            } else {
              groups[recipeName].ingredients.push({
                id: '',
                type: 'raw',
                qty: ingQty,
                unit: ingUnit,
                name: ingName
              })
              groups[recipeName].warnings.push(`Ingredient "${ingName}" not found`)
            }
          }
        })

        const validated = Object.values(groups).map(group => {
          if (group.ingredients.length === 0) {
            group.warnings.push('No ingredients specified')
          }
          if (group.yield_qty <= 0) {
            group.warnings.push('Yield qty must be > 0')
          }
          return {
            ...group,
            isDuplicate: ints.some(i => (i?.name || '').toLowerCase() === group.name.toLowerCase())
          }
        })
        
        setParsed(validated)
      } catch (err) {
        alert('Failed to parse CSV: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  const downloadTemplate = () => {
    const headers = ['recipe_name', 'category', 'yield_qty', 'yield_unit', 'ingredient_name', 'ingredient_qty', 'ingredient_unit']
    const sampleRows = [
      ['Tomato Marinara', 'Sauces', '1000', 'g', 'Tomato Paste', '200', 'g'],
      ['Tomato Marinara', 'Sauces', '1000', 'g', 'Olive Oil', '20', 'ml']
    ]
    const csvContent = [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'misemap_intermediates_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImport = () => {
    let updated = [...ints]
    parsed.forEach(item => {
      if (item.warnings && item.warnings.length > 0) return // Skip recipes with warnings
      const idx = updated.findIndex(i => (i?.name || '').toLowerCase() === item.name.toLowerCase())
      const { warnings, isDuplicate, ...cleanItem } = item
      
      const cleanIngredients = cleanItem.ingredients
        .filter(ing => ing.id)
        .map(({name, ...rest}) => rest)
        
      const finalItem = {
        ...cleanItem,
        ingredients: cleanIngredients
      }

      if (idx !== -1) {
        updated[idx] = { ...updated[idx], ...finalItem }
      } else {
        updated.push({
          id: uid(),
          ...finalItem
        })
      }
    })
    onSave(updated)
    onClose()
  }

  const importableCount = parsed.filter(item => !item.warnings || item.warnings.length === 0).length

  return (
    <Modal title="Batch Import Intermediates" onClose={onClose} wide>
      <p style={{fontSize:13,color:'#6b7280',marginBottom:16,lineHeight:1.5}}>
        Import multiple prep recipes. Group rows with the same <strong>recipe_name</strong> to define a single intermediate with multiple ingredients.
      </p>

      <div style={{display:'flex',gap:12,marginBottom:20,flexDirection: isMobile ? 'column' : 'row'}}>
        <Btn ch={<><Download size={14}/>Download Template</>} v="secondary" onClick={downloadTemplate} style={{flex: isMobile ? 1 : 'none'}}/>
        <div style={{position:'relative',flex: 1}}>
          <input type="file" accept=".csv" id="csv-file-input-int" onChange={handleFileChange} style={{display:'none'}} />
          <label htmlFor="csv-file-input-int" style={{
            display:'inline-flex',alignItems:'center',gap:6,padding: '8px 16px',borderRadius:8,fontSize:13,
            fontWeight:600,cursor:'pointer',background:'#fff',color:'#374151',border:'1px solid #e5e7eb',boxSizing:'border-box',width: '100%',justifyContent:'center'
          }}>
            <Upload size={14}/> {fileName ? 'Change File' : 'Select CSV File'}
          </label>
        </div>
      </div>

      {fileName && <div style={{fontSize:12,color:'#374151',marginBottom:12}}>Selected: <strong>{fileName}</strong></div>}

      {parsed.length > 0 ? (
        <div>
          <SecTitle>Preview (Ready to import {importableCount} of {parsed.length} recipes)</SecTitle>
          <div style={{border:'1px solid #e5e7eb',borderRadius:12,overflowX:'auto',maxHeight:240,marginBottom:20}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth: 700}}>
              <thead>
                <tr style={{background:'#f9fafb',borderBottom:'1px solid #e5e7eb'}}>
                  {['Recipe Name','Category','Yield','Ingredients','Status'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:600,color:'#9ca3af',fontSize:11}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.map((item, idx)=>(
                  <tr key={idx} style={{borderBottom:'1px solid #f3f4f6'}}>
                    <td style={{padding:'8px 12px',fontWeight:700}}>{item.name}</td>
                    <td style={{padding:'8px 12px'}}>{item.category}</td>
                    <td style={{padding:'8px 12px'}}>{item.yield_qty} {item.yield_unit}</td>
                    <td style={{padding:'8px 12px',color:'#6b7280'}}>
                      {item.ingredients.map(ing => `${ing.name} (${ing.qty}${ing.unit})`).join(', ')}
                    </td>
                    <td style={{padding:'8px 12px'}}>
                      {item.warnings.length > 0 ? (
                        <span style={{color:'#dc2626',display:'inline-flex',alignItems:'center',gap:4,fontWeight:600}}>
                          <AlertTriangle size={11}/> Will Skip ({item.warnings.join(', ')})
                        </span>
                      ) : item.isDuplicate ? (
                        <span style={{color:'#7c3aed',fontWeight:600}}>Will Overwrite</span>
                      ) : (
                        <span style={{color:'#16a34a',display:'inline-flex',alignItems:'center',gap:4,fontWeight:600}}>
                          <Check size={11}/> Ready
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:16,borderTop:'1px solid #f1f1f1'}}>
            <Btn ch="Cancel" v="secondary" onClick={onClose}/>
            <Btn ch={`Import ${importableCount} Intermediates`} v="primary" onClick={handleImport} disabled={importableCount === 0}/>
          </div>
        </div>
      ) : fileName && (
        <div style={{textAlign:'center',padding:24,color:'#9ca3af',fontSize:13}}>No valid recipes found in the selected CSV.</div>
      )}
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// BATCH IMPORT MENU ITEMS MODAL
// ─────────────────────────────────────────────────────────
export const BatchImportMIModal = ({rms, ints, mis, onSave, onClose, pc}) => {
  const [parsed, setParsed] = useState([])
  const [fileName, setFileName] = useState('')
  const isMobile = useIsMobile()

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target.result
      try {
        const rows = parseCSV(text)
        
        // Group by item_name
        const groups = {}
        rows.forEach(row => {
          const itemName = row.item_name || row.name || ''
          if (!itemName.trim()) return
          
          if (!groups[itemName]) {
            let food_type = row.food_type || 'Vegetarian'
            if (!FOOD_TYPES.includes(food_type)) {
              const found = FOOD_TYPES.find(f => (f || '').toLowerCase() === (food_type || '').toLowerCase())
              food_type = found || 'Vegetarian'
            }

            groups[itemName] = {
              name: itemName,
              category: row.category || 'General',
              sub_category: row.sub_category || '',
              food_type,
              sp_multiplier_override: row.sp_multiplier_override ? parseFloat(row.sp_multiplier_override) : null,
              packaging_cost_override: row.packaging_cost_override ? parseFloat(row.packaging_cost_override) : null,
              delivery_markup_override: row.delivery_markup_override ? parseFloat(row.delivery_markup_override) : null,
              ingredients: [],
              warnings: []
            }
          }
          
          const ingName = row.ingredient_name || ''
          if (ingName.trim()) {
            const ingQty = parseFloat(row.ingredient_qty) || 0
            const ingUnit = row.ingredient_unit || 'g'
            
            // Match with existing RM or Int
            const cleanIngName = ingName.trim().toLowerCase()
            const matchRM = rms.find(r => (r?.name || '').trim().toLowerCase() === cleanIngName)
            const matchInt = ints.find(i => (i?.name || '').trim().toLowerCase() === cleanIngName)
            
            if (matchRM) {
              groups[itemName].ingredients.push({
                id: matchRM.id,
                type: 'raw',
                qty: ingQty,
                unit: ingUnit,
                name: matchRM.name
              })
            } else if (matchInt) {
              groups[itemName].ingredients.push({
                id: matchInt.id,
                type: 'intermediate',
                qty: ingQty,
                unit: ingUnit,
                name: matchInt.name
              })
            } else {
              groups[itemName].ingredients.push({
                id: '',
                type: 'raw',
                qty: ingQty,
                unit: ingUnit,
                name: ingName
              })
              groups[itemName].warnings.push(`Ingredient "${ingName}" not found`)
            }
          }
        })

        const validated = Object.values(groups).map(group => {
          if (group.ingredients.length === 0) {
            group.warnings.push('No ingredients specified')
          }
          return {
            ...group,
            isDuplicate: mis.some(m => (m?.name || '').toLowerCase() === group.name.toLowerCase())
          }
        })
        
        setParsed(validated)
      } catch (err) {
        alert('Failed to parse CSV: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  const downloadTemplate = () => {
    const headers = ['item_name', 'category', 'sub_category', 'food_type', 'sp_multiplier_override', 'packaging_cost_override', 'delivery_markup_override', 'ingredient_name', 'ingredient_qty', 'ingredient_unit']
    const sampleRows = [
      ['Prawn Pasta', 'Mains', 'Pasta', 'Non-Vegetarian', '3.5', '15', '10', 'Prawns', '120', 'g'],
      ['Prawn Pasta', 'Mains', 'Pasta', 'Non-Vegetarian', '3.5', '15', '10', 'Olive Oil', '15', 'ml']
    ]
    const csvContent = [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'misemap_menuitems_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImport = () => {
    let updated = [...mis]
    parsed.forEach(item => {
      if (item.warnings && item.warnings.length > 0) return // Skip items with warnings
      const idx = updated.findIndex(m => (m?.name || '').toLowerCase() === item.name.toLowerCase())
      const { warnings, isDuplicate, ...cleanItem } = item
      
      const cleanIngredients = cleanItem.ingredients
        .filter(ing => ing.id)
        .map(({name, ...rest}) => rest)
        
      const finalItem = {
        ...cleanItem,
        ingredients: cleanIngredients
      }

      if (idx !== -1) {
        updated[idx] = { ...updated[idx], ...finalItem }
      } else {
        updated.push({
          id: uid(),
          ...finalItem
        })
      }
    })
    onSave(updated)
    onClose()
  }

  const importableCount = parsed.filter(item => !item.warnings || item.warnings.length === 0).length

  return (
    <Modal title="Batch Import Menu Items" onClose={onClose} wide>
      <p style={{fontSize:13,color:'#6b7280',marginBottom:16,lineHeight:1.5}}>
        Import multiple menu items. Group rows with the same <strong>item_name</strong> to define a single menu item with multiple ingredients.
      </p>

      <div style={{display:'flex',gap:12,marginBottom:20,flexDirection: isMobile ? 'column' : 'row'}}>
        <Btn ch={<><Download size={14}/>Download Template</>} v="secondary" onClick={downloadTemplate} style={{flex: isMobile ? 1 : 'none'}}/>
        <div style={{position:'relative',flex: 1}}>
          <input type="file" accept=".csv" id="csv-file-input-mi" onChange={handleFileChange} style={{display:'none'}} />
          <label htmlFor="csv-file-input-mi" style={{
            display:'inline-flex',alignItems:'center',gap:6,padding: '8px 16px',borderRadius:8,fontSize:13,
            fontWeight:600,cursor:'pointer',background:'#fff',color:'#374151',border:'1px solid #e5e7eb',boxSizing:'border-box',width: '100%',justifyContent:'center'
          }}>
            <Upload size={14}/> {fileName ? 'Change File' : 'Select CSV File'}
          </label>
        </div>
      </div>

      {fileName && <div style={{fontSize:12,color:'#374151',marginBottom:12}}>Selected: <strong>{fileName}</strong></div>}

      {parsed.length > 0 ? (
        <div>
          <SecTitle>Preview (Ready to import {importableCount} of {parsed.length} menu items)</SecTitle>
          <div style={{border:'1px solid #e5e7eb',borderRadius:12,overflowX:'auto',maxHeight:240,marginBottom:20}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth: 700}}>
              <thead>
                <tr style={{background:'#f9fafb',borderBottom:'1px solid #e5e7eb'}}>
                  {['Item Name','Category','Sub-Category','Type','Ingredients','Status'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:600,color:'#9ca3af',fontSize:11}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.map((item, idx)=>(
                  <tr key={idx} style={{borderBottom:'1px solid #f3f4f6'}}>
                    <td style={{padding:'8px 12px',fontWeight:700}}>{item.name}</td>
                    <td style={{padding:'8px 12px'}}>{item.category}</td>
                    <td style={{padding:'8px 12px'}}>{item.sub_category || '—'}</td>
                    <td style={{padding:'8px 12px'}}><Bdg ch={item.food_type} c={FT_COLOR_MAP[item.food_type]||'gray'}/></td>
                    <td style={{padding:'8px 12px',color:'#6b7280'}}>
                      {item.ingredients.map(ing => `${ing.name} (${ing.qty}${ing.unit})`).join(', ')}
                    </td>
                    <td style={{padding:'8px 12px'}}>
                      {item.warnings.length > 0 ? (
                        <span style={{color:'#dc2626',display:'inline-flex',alignItems:'center',gap:4,fontWeight:600}}>
                          <AlertTriangle size={11}/> Will Skip ({item.warnings.join(', ')})
                        </span>
                      ) : item.isDuplicate ? (
                        <span style={{color:'#7c3aed',fontWeight:600}}>Will Overwrite</span>
                      ) : (
                        <span style={{color:'#16a34a',display:'inline-flex',alignItems:'center',gap:4,fontWeight:600}}>
                          <Check size={11}/> Ready
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:16,borderTop:'1px solid #f1f1f1'}}>
            <Btn ch="Cancel" v="secondary" onClick={onClose}/>
            <Btn ch={`Import ${importableCount} Menu Items`} v="primary" onClick={handleImport} disabled={importableCount === 0}/>
          </div>
        </div>
      ) : fileName && (
        <div style={{textAlign:'center',padding:24,color:'#9ca3af',fontSize:13}}>No valid menu items found in the selected CSV.</div>
      )}
    </Modal>
  )
}
