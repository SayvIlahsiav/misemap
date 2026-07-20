import { useState } from 'react'
import { Sparkles, AlertTriangle, RotateCcw } from 'lucide-react'
import { Modal, Btn, Inp, Sel, SecTitle, SrcPill, InlineAddDropdown } from '../UIPrimitives.jsx'
import { AiPanel } from '../AiPanel.jsx'
import { IngPicker } from '../IngPicker.jsx'
import { aiSuggest } from '../../services/ai.js'
import { FOOD_TYPES, NF } from '../../constants.js'
import { uid, fc, fp, miFC, miNut, effVal } from '../../utils.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { useUI } from '../../context/UIContext.jsx'

export const MIModal = ({item, onSave, onClose, rms, setRms, ints, setInts, pc, mis, customCats, addCustomCat, readOnly}) => {
  const { showToast } = useUI()
  const blank = {id:'',name:'',category:'',sub_category:'',food_type:'',ingredients:[],sp_multiplier_override:null,packaging_cost_override:null,delivery_markup_override:null,selling_price_override:null,takeaway_price_override:null,delivery_price_override:null}
  const [f,setF]   = useState(item?{...blank,...item}:{...blank,id:uid()})
  const [ai,setAi] = useState(null)
  const [aiL,setAiL]= useState(false)
  const isMobile    = useIsMobile()
  const upd = (k,v) => setF(p=>({...p,[k]:v}))

  const cats = [...new Set([
    ...(mis || []).map(m => m.category),
    ...(customCats?.menu || [])
  ].filter(Boolean))].sort()
  const subCats = [...new Set([
    ...(mis || []).map(m => m.sub_category),
    ...(customCats?.menu_sub || [])
  ].filter(Boolean))].sort()

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
    if (!f.name.trim()){showToast('Enter a name first.', 'warning');return}
    setAiL(true)
    try { setAi(await aiSuggest(f.name,'menu')) }
    catch(e){ showToast('AI suggestion failed: '+e.message, 'error') }
    finally { setAiL(false) }
  }
  const applyAI = () => { if(!ai)return; setF(p=>({...p,...ai})); setAi(null) }

  const OvrField = ({label, field, ovrKey, unit, isX}) => {
    const eff = effVal(field,f.id,f.category,pc)
    const hasOvr = f[ovrKey]!=null
    return (
      <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'flex-start' : 'center',gap: isMobile ? 6 : 12,padding:'8px 0',borderBottom:'1px solid var(--border-color)'}}>
        <span style={{fontSize:12,color:'var(--text-light)',width:150,flexShrink:0}}>{label}</span>
        {hasOvr?(
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{position:'relative'}}>
              <input type='number' value={f[ovrKey]} min='0' step='any'
                disabled={readOnly}
                onChange={e=>upd(ovrKey,parseFloat(e.target.value)||0)}
                className="custom-input"
                style={{width:90,border:'2px solid var(--primary)',borderRadius:6,padding:'4px 28px 4px 8px',fontSize:13,outline:'none',color:'var(--text-primary)',background:readOnly?'var(--bg-hover)':'var(--bg-card)'}}/>
              <span style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'var(--text-light)'}}>{unit}</span>
            </div>
            {!readOnly && (
              <button onClick={()=>upd(ovrKey,null)} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--text-light)',border:'none',background:'none',cursor:'pointer'}}>
                <RotateCcw size={11}/> Reset
              </button>
            )}
          </div>
        ):(
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap: 'wrap'}}>
            <span style={{fontSize:13,fontWeight:700,color:'var(--text-muted)'}}>{isX?`${eff.v}×`:`${unit}${eff.v}`}</span>
            <SrcPill src={eff.src}/>
            {!readOnly && (
              <button onClick={()=>upd(ovrKey,eff.v)} style={{fontSize:11,color:'var(--primary)',fontWeight:700,border:'none',background:'none',cursor:'pointer'}}>Override</button>
            )}
          </div>
        )}
      </div>
    )
  }

  const fcBg     = pct>threshold?'rgba(239,68,68,0.06)':pct>threshold*0.85?'rgba(249,115,22,0.06)':'rgba(20,184,166,0.06)'
  const fcBorder = pct>threshold?'rgba(239,68,68,0.2)':pct>threshold*0.85?'rgba(249,115,22,0.2)':'rgba(20,184,166,0.2)'

  return (
    <Modal title={readOnly ? 'Menu Item Details' : (item?'Edit Menu Item':'Add Menu Item')} onClose={onClose} wide>
      <SecTitle>Basic Information</SecTitle>
      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:12}}>
        <div style={{gridColumn:'1/-1',display:'flex',gap:8,alignItems:'flex-end'}}>
          <Inp label='Item Name' v={f.name} onChange={v=>upd('name',v)} ph='e.g. Prawn Pasta, Mango Smoothie' req disabled={readOnly} style={{flex:1}}/>
          {!readOnly && <Btn ch={<><Sparkles size={12}/>{aiL?'Thinking…':'AI Suggest'}</>} v='ai' sz='sm' onClick={runAI} disabled={aiL}/>}
        </div>
        <AiPanel suggestions={ai} onApply={applyAI} onDismiss={()=>setAi(null)}/>
        <InlineAddDropdown label='Category' v={f.category} onChange={v=>upd('category',v)} options={cats} ph='e.g. Mains, Beverages, Starters' disabled={readOnly}/>
        <InlineAddDropdown label='Sub-Category' v={f.sub_category} onChange={v=>upd('sub_category',v)} options={subCats} ph='e.g. Pasta, Smoothies, Soups' disabled={readOnly}/>
        <Sel label='Food Type' v={f.food_type} onChange={v=>upd('food_type',v)} opts={FOOD_TYPES} ph='Select…' disabled={readOnly} style={{gridColumn: isMobile ? 'auto' : '1/-1'}}/>
      </div>

      <SecTitle>Recipe Ingredients</SecTitle>
      <IngPicker ings={f.ingredients} setIngs={v=>upd('ingredients',v)} rms={rms} setRms={setRms} ints={ints} setInts={setInts} readOnly={readOnly}/>

      <details style={{ marginTop: 16, marginBottom: 16 }}>
        <summary style={{ fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--primary)', outline: 'none' }}>
          Show Pricing Overrides (Advanced)
        </summary>
        <div style={{ marginTop: 12, background:'var(--bg-hover)',borderRadius:12,padding:'4px 16px' }}>
          <OvrField label='SP Multiplier' field='sp_multiplier' ovrKey='sp_multiplier_override' unit='×' isX/>
          <OvrField label='Packaging Cost' field='packaging_cost' ovrKey='packaging_cost_override' unit='₹'/>
          <OvrField label='Delivery Markup' field='delivery_markup' ovrKey='delivery_markup_override' unit='%'/>
          <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'flex-start' : 'center',gap: isMobile ? 6 : 12,padding:'8px 0',borderBottom:'1px solid var(--border-color)'}}>
            <span style={{fontSize:12,color:'var(--text-light)',width:150,flexShrink:0}}>Custom Selling Price</span>
            {f.selling_price_override != null ? (
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{position:'relative'}}>
                  <input type='number' value={f.selling_price_override} min='0' step='any'
                    disabled={readOnly}
                    onChange={e=>upd('selling_price_override',parseFloat(e.target.value)||0)}
                    style={{width:90,border:'2px solid var(--primary)',borderRadius:6,padding:'4px 28px 4px 8px',fontSize:13,outline:'none',color:'var(--text-primary)',background:readOnly?'var(--bg-hover)':'var(--bg-card)'}}/>
                  <span style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'var(--text-light)'}}>₹</span>
                </div>
                {!readOnly && (
                  <button onClick={()=>upd('selling_price_override',null)} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--text-light)',border:'none',background:'none',cursor:'pointer'}}>
                    <RotateCcw size={11}/> Reset
                  </button>
                )}
              </div>
            ) : (
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap: 'wrap'}}>
                <span style={{fontSize:13,fontWeight:700,color:'var(--text-muted)'}}>{fc(sugg_sp)}</span>
                <span style={{fontSize:11,color:'var(--text-light)'}}>Inherited from cost markup</span>
                {!readOnly && <button onClick={()=>upd('selling_price_override',sugg_sp)} style={{fontSize:11,color:'var(--primary)',fontWeight:700,border:'none',background:'none',cursor:'pointer'}}>Override</button>}
              </div>
            )}
          </div>
          <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'flex-start' : 'center',gap: isMobile ? 6 : 12,padding:'8px 0',borderBottom:'1px solid var(--border-color)'}}>
            <span style={{fontSize:12,color:'var(--text-light)',width:150,flexShrink:0}}>Custom Takeaway Price</span>
            {f.takeaway_price_override != null ? (
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{position:'relative'}}>
                  <input type='number' value={f.takeaway_price_override} min='0' step='any'
                    disabled={readOnly}
                    onChange={e=>upd('takeaway_price_override',parseFloat(e.target.value)||0)}
                    style={{width:90,border:'2px solid var(--primary)',borderRadius:6,padding:'4px 28px 4px 8px',fontSize:13,outline:'none',color:'var(--text-primary)',background:readOnly?'var(--bg-hover)':'var(--bg-card)'}}/>
                  <span style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'var(--text-light)'}}>₹</span>
                </div>
                {!readOnly && (
                  <button onClick={()=>upd('takeaway_price_override',null)} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--text-light)',border:'none',background:'none',cursor:'pointer'}}>
                    <RotateCcw size={11}/> Reset
                  </button>
                )}
              </div>
            ) : (
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap: 'wrap'}}>
                <span style={{fontSize:13,fontWeight:700,color:'var(--text-muted)'}}>{fc(sugg_tp)}</span>
                <span style={{fontSize:11,color:'var(--text-light)'}}>Inherited from cost markup</span>
                {!readOnly && <button onClick={()=>upd('takeaway_price_override',sugg_tp)} style={{fontSize:11,color:'var(--primary)',fontWeight:700,border:'none',background:'none',cursor:'pointer'}}>Override</button>}
              </div>
            )}
          </div>
          <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',alignItems: isMobile ? 'flex-start' : 'center',gap: isMobile ? 6 : 12,padding:'8px 0'}}>
            <span style={{fontSize:12,color:'var(--text-light)',width:150,flexShrink:0}}>Custom Delivery Price</span>
            {f.delivery_price_override != null ? (
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{position:'relative'}}>
                  <input type='number' value={f.delivery_price_override} min='0' step='any'
                    disabled={readOnly}
                    onChange={e=>upd('delivery_price_override',parseFloat(e.target.value)||0)}
                    style={{width:90,border:'2px solid var(--primary)',borderRadius:6,padding:'4px 28px 4px 8px',fontSize:13,outline:'none',color:'var(--text-primary)',background:readOnly?'var(--bg-hover)':'var(--bg-card)'}}/>
                  <span style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'var(--text-light)'}}>₹</span>
                </div>
                {!readOnly && (
                  <button onClick={()=>upd('delivery_price_override',null)} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--text-light)',border:'none',background:'none',cursor:'pointer'}}>
                    <RotateCcw size={11}/> Reset
                  </button>
                )}
              </div>
            ) : (
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap: 'wrap'}}>
                <span style={{fontSize:13,fontWeight:700,color:'var(--text-muted)'}}>{fc(sugg_dp)}</span>
                <span style={{fontSize:11,color:'var(--text-light)'}}>Inherited from cost markup</span>
                {!readOnly && <button onClick={()=>upd('delivery_price_override',sugg_dp)} style={{fontSize:11,color:'var(--primary)',fontWeight:700,border:'none',background:'none',cursor:'pointer'}}>Override</button>}
              </div>
            )}
          </div>
        </div>
      </details>

      {f.ingredients.length>0&&(
        <>
          <SecTitle>Live Pricing Preview</SecTitle>
          <div style={{background:fcBg,border:`1px solid ${fcBorder}`,borderRadius:12,padding:16,transition:'all 0.2s'}}>
        {pct>threshold&&(
          <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#ef4444',marginBottom:12,fontWeight:600}}>
            <AlertTriangle size={13}/> FC% exceeds your {threshold}% alert threshold!
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',gap:16}}>
          {/* Suggested Column */}
          <div style={{background:'var(--bg-card)',padding:12,borderRadius:10,border:'1px solid var(--border-strong)'}}>
            <div style={{fontWeight:700,fontSize:12,color:'var(--text-secondary)',marginBottom:10,borderBottom:'1px solid var(--border-color)',paddingBottom:4}}>Suggested Pricing</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div>
                <div style={{fontSize:10,color:'var(--text-light)',fontWeight:600}}>Dine-In</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                  <span style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>{fc(sugg_sp)}</span>
                  <span style={{fontSize:11,fontWeight:600,color:sugg_pct>threshold?'#ef4444':'#10b981'}}>{fp(sugg_pct)} FC</span>
                </div>
              </div>
              <div>
                <div style={{fontSize:10,color:'var(--text-light)',fontWeight:600}}>Takeaway (with Pkg)</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                  <span style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>{fc(sugg_tp)}</span>
                  <span style={{fontSize:11,fontWeight:600,color:sugg_takeaway_pct>threshold?'#ef4444':'#10b981'}}>{fp(sugg_takeaway_pct)} FC</span>
                </div>
              </div>
              <div>
                <div style={{fontSize:10,color:'var(--text-light)',fontWeight:600}}>Delivery (Markup applied)</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                  <span style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>{fc(sugg_dp)}</span>
                  <span style={{fontSize:11,fontWeight:600,color:sugg_delivery_pct>threshold?'#ef4444':'#10b981'}}>{fp(sugg_delivery_pct)} FC</span>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Column */}
          <div style={{
            background: hasCustom ? 'var(--bg-active-tab)' : 'var(--bg-hover)',
            padding:12,
            borderRadius:10,
            border: hasCustom ? '1px solid var(--primary)' : '1px solid var(--border-color)',
            transition: 'all 0.15s ease'
          }}>
            <div style={{
              fontWeight:700,
              fontSize:12,
              color: hasCustom ? 'var(--primary)' : 'var(--text-light)',
              marginBottom:10,
              borderBottom: hasCustom ? '1px solid var(--primary-light)' : '1px solid var(--border-color)',
              paddingBottom:4
            }}>
              {hasCustom ? 'Custom Pricing (Active)' : 'Custom Pricing (None)'}
            </div>
            {hasCustom ? (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div>
                  <div style={{fontSize:10,color: f.selling_price_override != null ? 'var(--primary)' : 'var(--text-light)',fontWeight:600}}>Dine-In {f.selling_price_override != null && '(Custom)'}</div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                    <span style={{fontSize:13,fontWeight:700,color: f.selling_price_override != null ? 'var(--primary)' : 'var(--text-primary)'}}>{fc(sp)}</span>
                    <span style={{fontSize:11,fontWeight:600,color:pct>threshold?'#ef4444':'#10b981'}}>{fp(pct)} FC</span>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:10,color: f.takeaway_price_override != null ? 'var(--primary)' : 'var(--text-light)',fontWeight:600}}>Takeaway {f.takeaway_price_override != null && '(Custom)'}</div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                    <span style={{fontSize:13,fontWeight:700,color: f.takeaway_price_override != null ? 'var(--primary)' : 'var(--text-primary)'}}>{fc(tp)}</span>
                    <span style={{fontSize:11,fontWeight:600,color:takeaway_pct>threshold?'#ef4444':'#10b981'}}>{fp(takeaway_pct)} FC</span>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:10,color: f.delivery_price_override != null ? 'var(--primary)' : 'var(--text-light)',fontWeight:600}}>Delivery {f.delivery_price_override != null && '(Custom)'}</div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                    <span style={{fontSize:13,fontWeight:700,color: f.delivery_price_override != null ? 'var(--primary)' : 'var(--text-primary)'}}>{fc(dp)}</span>
                    <span style={{fontSize:11,fontWeight:600,color:delivery_pct>threshold?'#ef4444':'#10b981'}}>{fp(delivery_pct)} FC</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{fontSize:11,color:'var(--text-light)',textAlign:'center',padding:'32px 0',lineHeight:1.4}}>
                Using suggested pricing. Click Override under Pricing Overrides to set custom prices.
              </div>
            )}
          </div>

          {/* Cost & Margins Column */}
          <div style={{background:'var(--bg-card)',padding:12,borderRadius:10,border:'1px solid var(--border-strong)'}}>
            <div style={{fontWeight:700,fontSize:12,color:'var(--text-secondary)',marginBottom:8,borderBottom:'1px solid var(--border-color)',paddingBottom:4}}>Cost & Markup</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div>
                <div style={{fontSize:10,color:'var(--text-light)'}}>Food Cost</div>
                <div style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>{fc(food)}</div>
              </div>
              <div>
                <div style={{fontSize:10,color:'var(--text-light)'}}>Packaging</div>
                <div style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>{fc(act_pkg)}</div>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <div style={{fontSize:10,color:'var(--text-light)'}}>Delivery Markup</div>
                <div style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>{act_dm}%</div>
              </div>
              <div style={{gridColumn:'1/-1',marginTop:8,borderTop:'1px solid var(--border-color)',paddingTop:8}}>
                <div style={{fontSize:10,color:'var(--text-light)'}}>Effective Multiplier</div>
                <div style={{fontSize:13,fontWeight:700,color:'var(--primary)'}}>{act_spm}×</div>
              </div>
            </div>
          </div>
        </div>
      </div>

          <details style={{ marginTop: 16 }}>
            <summary style={{ fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--primary)', outline: 'none' }}>
              Show Nutritional Information (optional)
            </summary>
            <div style={{ marginTop: 12 }}>
              <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)',gap:8}}>
                {NF.map(n=>(
                  <div key={n.k} style={{background:'var(--bg-hover)',borderRadius:8,padding:'8px 10px'}}>
                    <div style={{fontSize:11,color:'var(--text-light)'}}>{n.l}</div>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>{(nut[n.k]||0).toFixed(1)}<span style={{fontSize:10,color:'var(--text-light)',fontWeight:400,marginLeft:2}}>{n.u}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </>
      )}

      <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:16,marginTop:8,borderTop:'1px solid var(--border-color)'}}>
        <Btn ch={readOnly ? 'Close' : 'Cancel'} v='secondary' onClick={onClose}/>
        {!readOnly && <Btn ch='Save Menu Item' v='primary' onClick={() => {
          if (f.category) addCustomCat?.('menu', f.category);
          if (f.sub_category) addCustomCat?.('menu_sub', f.sub_category);
          onSave(f);
        }} disabled={!valid}/>}
      </div>
    </Modal>
  )
}
