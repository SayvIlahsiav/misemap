import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  LayoutDashboard, Package, FlaskConical, UtensilsCrossed, Settings,
  Plus, Pencil, Trash2, X, Sparkles, AlertTriangle, Search, Check,
  RotateCcw, ShieldAlert, ChefHat, TrendingUp,
} from 'lucide-react'
import { storage } from './lib/storage.js'

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────
const FOOD_TYPES = ['Vegetarian','Non-Vegetarian','Vegan','Jain','Eggetarian']
const UNITS = ['g','kg','ml','L','pcs','dozen','tbsp','tsp','cup','oz','lb','slice','bunch','bottle','can','packet','portion','serving','sheet','clove','sprig']
const NF = [
  {k:'calories',l:'Calories',u:'kcal'},
  {k:'carbs',l:'Carbs',u:'g'},
  {k:'protein',l:'Protein',u:'g'},
  {k:'fats',l:'Fats',u:'g'},
  {k:'fiber',l:'Fiber',u:'g'},
  {k:'sugar',l:'Sugar',u:'g'},
  {k:'caffeine',l:'Caffeine',u:'mg'},
]
const SK = { rm:'mm_rm', int:'mm_int', mi:'mm_mi', pc:'mm_pc' }
const FT_COLOR_MAP = {
  Vegetarian:'green','Non-Vegetarian':'red',
  Vegan:'teal',Jain:'orange',Eggetarian:'yellow',
}
const DEFAULT_PC = {
  global:{ sp_multiplier:3, delivery_markup:15, packaging_cost:20, fc_alert_threshold:35 },
  category_overrides:{}, item_overrides:{},
}

// ─────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────
const fc  = n => `₹${(+n||0).toFixed(2)}`
const fp  = n => `${(+n||0).toFixed(1)}%`
const uid = () => `id${Date.now()}${Math.random().toString(36).slice(2,7)}`
const cx  = (...a) => a.filter(Boolean).join(' ')

// ─────────────────────────────────────────────────────────
// COST CALCULATIONS
// ─────────────────────────────────────────────────────────
const rmUC = rm => {
  if (!rm) return 0
  const buc = (rm.pack_cost||0) / (rm.pack_qty||1)
  if (!rm.conversion || rm.usage_unit === rm.buy_unit) return buc
  return buc / (rm.conversion||1)
}

const ingCost = (ing, rms, ints) => {
  if (!ing) return 0
  if (ing.type === 'raw') {
    const rm = rms.find(r => r.id === ing.id)
    return rmUC(rm) * (ing.qty||0)
  }
  const it = ints.find(i => i.id === ing.id)
  if (!it) return 0
  const tc = (it.ingredients||[]).reduce((s,i) => s + ingCost(i, rms, ints), 0)
  return (tc / (it.yield_qty||1)) * (ing.qty||0)
}

const intUC = (it, rms, ints) => {
  const tc = (it?.ingredients||[]).reduce((s,i) => s + ingCost(i, rms, ints), 0)
  return tc / (it?.yield_qty||1)
}

const miFC = (mi, rms, ints) =>
  (mi?.ingredients||[]).reduce((s,i) => s + ingCost(i, rms, ints), 0)

const ingNut = (ing, rms, ints) => {
  const z = Object.fromEntries(NF.map(f => [f.k, 0]))
  if (!ing) return z
  if (ing.type === 'raw') {
    const rm = rms.find(r => r.id === ing.id)
    if (!rm) return z
    return Object.fromEntries(NF.map(f => [f.k, (rm[f.k]||0) * (ing.qty||0)]))
  }
  const it = ints.find(i => i.id === ing.id)
  if (!it) return z
  const n = intNut(it, rms, ints)
  return Object.fromEntries(NF.map(f => [f.k, (n[f.k]||0) * (ing.qty||0)]))
}

const intNut = (it, rms, ints) => {
  const z = Object.fromEntries(NF.map(f => [f.k, 0]))
  if (!it?.ingredients) return z
  const t = it.ingredients.reduce((a,i) => {
    const n = ingNut(i, rms, ints)
    NF.forEach(f => { a[f.k] = (a[f.k]||0) + (n[f.k]||0) })
    return a
  }, {...z})
  const y = it.yield_qty||1
  return Object.fromEntries(NF.map(f => [f.k, t[f.k]/y]))
}

const miNut = (mi, rms, ints) =>
  (mi?.ingredients||[]).reduce((a,i) => {
    const n = ingNut(i, rms, ints)
    NF.forEach(f => { a[f.k] = (a[f.k]||0) + (n[f.k]||0) })
    return a
  }, Object.fromEntries(NF.map(f => [f.k, 0])))

const effVal = (field, itemId, cat, pc) => {
  if (pc.item_overrides?.[itemId]?.[field] != null)
    return { v: pc.item_overrides[itemId][field], src: 'item' }
  if (cat && pc.category_overrides?.[cat]?.[field] != null)
    return { v: pc.category_overrides[cat][field], src: 'category' }
  return { v: pc.global[field], src: 'global' }
}

const calcPricing = (mi, rms, ints, pc) => {
  const food = miFC(mi, rms, ints)
  const spm  = effVal('sp_multiplier', mi.id, mi.category, pc).v
  const pkg  = effVal('packaging_cost', mi.id, mi.category, pc).v
  const dm   = effVal('delivery_markup', mi.id, mi.category, pc).v
  const sp   = food * spm
  const dp   = (sp + pkg) * (1 + dm/100)
  const pct  = sp > 0 ? (food/sp)*100 : 0
  return { food, sp, pkg, dm, dp, pct, spm }
}

// ─────────────────────────────────────────────────────────
// SHARED STORAGE HOOK (Supabase)
// ─────────────────────────────────────────────────────────
const useShared = (key, def) => {
  const [d, setD]   = useState(def)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const raw = await storage.get(key)
        if (raw) setD(JSON.parse(raw))
      } catch (e) {
        console.warn('[useShared] load error', key, e)
      }
      setOk(true)
    })()
  }, [key])

  const save = useCallback(async nd => {
    setD(nd)
    try { await storage.set(key, JSON.stringify(nd)) }
    catch (e) { console.warn('[useShared] save error', key, e) }
  }, [key])

  return [d, save, ok]
}

// ─────────────────────────────────────────────────────────
// AI SUGGESTIONS (Anthropic API)
// ─────────────────────────────────────────────────────────
const aiSuggest = async (name, type) => {
  const isRM = type === 'raw'
  const prompt = isRM
    ? `You are a food industry expert. For the ingredient "${name}", provide accurate realistic data.
Respond ONLY with valid JSON, no markdown, no extra text:
{"category":"","sub_category":"","food_type":"Vegetarian","buy_unit":"kg","usage_unit":"g","conversion":1000,"calories":0.0,"carbs":0.0,"protein":0.0,"fats":0.0,"fiber":0.0,"sugar":0.0,"caffeine":0.0}
Rules: food_type must be one of [Vegetarian, Non-Vegetarian, Vegan, Jain, Eggetarian]. conversion = how many usage_units per 1 buy_unit. All nutrition values per 1 usage_unit.`
    : `For the menu item "${name}", respond ONLY with valid JSON, no markdown:
{"category":"","sub_category":"","food_type":"Vegetarian"}
food_type must be one of [Vegetarian, Non-Vegetarian, Vegan, Jain, Eggetarian]. Use realistic restaurant categories.`

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`)
  }

  const data = await res.json()
  const txt  = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return JSON.parse(txt.replace(/```json\n?|```/g, '').trim())
}

// ─────────────────────────────────────────────────────────
// UI PRIMITIVES
// ─────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, wide=false }) => (
  <div style={{position:'fixed',inset:0,zIndex:50,overflowY:'auto',background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'1.5rem 1rem'}}>
    <div style={{background:'#fff',borderRadius:20,width:'100%',maxWidth:wide?920:560,boxShadow:'0 24px 64px rgba(0,0,0,0.18)',marginTop:24,marginBottom:24}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 24px',borderBottom:'1px solid #f1f1f1'}}>
        <span style={{fontWeight:700,fontSize:15,color:'#1a1a1a'}}>{title}</span>
        <button onClick={onClose} style={{padding:6,borderRadius:8,border:'none',background:'none',cursor:'pointer',color:'#aaa',display:'flex'}}>
          <X size={16}/>
        </button>
      </div>
      <div style={{padding:'20px 24px',maxHeight:'85vh',overflowY:'auto'}}>{children}</div>
    </div>
  </div>
)

const Btn = ({ch, onClick, v='primary', sz='md', disabled, style={}}) => {
  const sizes = {sm:{padding:'6px 12px',fontSize:12},md:{padding:'8px 16px',fontSize:13},lg:{padding:'10px 20px',fontSize:14}}
  const vars  = {
    primary:{background:'#0d9488',color:'#fff',border:'none',boxShadow:'0 1px 3px rgba(0,0,0,0.12)'},
    secondary:{background:'#fff',color:'#374151',border:'1px solid #e5e7eb'},
    danger:{background:'#ef4444',color:'#fff',border:'none'},
    ghost:{background:'transparent',color:'#6b7280',border:'none'},
    ai:{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'#fff',border:'none'},
  }
  return (
    <button onClick={onClick} disabled={disabled}
      style={{...sizes[sz],...vars[v],borderRadius:8,fontWeight:600,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.45:1,display:'inline-flex',alignItems:'center',gap:6,transition:'opacity 0.15s',whiteSpace:'nowrap',...style}}>
      {ch}
    </button>
  )
}

const Label = ({children}) => (
  <div style={{fontSize:11,fontWeight:600,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{children}</div>
)

const Inp = ({label, v, onChange, type='text', ph, req, unit, min, step, readOnly, style={}}) => (
  <div style={{display:'flex',flexDirection:'column',gap:4,...style}}>
    {label && <Label>{label}{req&&<span style={{color:'#f87171',marginLeft:2}}>*</span>}</Label>}
    <div style={{position:'relative'}}>
      <input type={type} value={v} onChange={e=>onChange(e.target.value)} placeholder={ph}
        min={min} step={step} readOnly={readOnly}
        style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:8,padding:unit?'8px 36px 8px 10px':'8px 10px',fontSize:13,color:'#1a1a1a',background:readOnly?'#f9fafb':'#fff',outline:'none'}}/>
      {unit&&<span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'#9ca3af'}}>{unit}</span>}
    </div>
  </div>
)

const Sel = ({label, v, onChange, opts, ph, req, style={}}) => (
  <div style={{display:'flex',flexDirection:'column',gap:4,...style}}>
    {label&&<Label>{label}{req&&<span style={{color:'#f87171',marginLeft:2}}>*</span>}</Label>}
    <select value={v} onChange={e=>onChange(e.target.value)}
      style={{border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 10px',fontSize:13,color:'#1a1a1a',background:'#fff',outline:'none',cursor:'pointer'}}>
      {ph&&<option value="">{ph}</option>}
      {opts.map(o=><option key={o.v??o} value={o.v??o}>{o.l??o}</option>)}
    </select>
  </div>
)

const BADGE_STYLES = {
  gray:{background:'#f3f4f6',color:'#374151'},
  green:{background:'#dcfce7',color:'#166534'},
  red:{background:'#fee2e2',color:'#991b1b'},
  teal:{background:'#ccfbf1',color:'#0f766e'},
  orange:{background:'#ffedd5',color:'#9a3412'},
  yellow:{background:'#fef9c3',color:'#713f12'},
  blue:{background:'#dbeafe',color:'#1e40af'},
  amber:{background:'#ccfbf1',color:'#134e4a'},
  purple:{background:'#ede9fe',color:'#5b21b6'},
}
const Bdg = ({ch, c='gray'}) => (
  <span style={{...BADGE_STYLES[c]||BADGE_STYLES.gray,padding:'2px 8px',borderRadius:999,fontSize:11,fontWeight:500,whiteSpace:'nowrap',display:'inline-block'}}>{ch}</span>
)

const FCBadge = ({pct, threshold}) => {
  const c = pct>threshold?'red':pct>threshold*0.85?'orange':'green'
  return <Bdg ch={fp(pct)} c={c}/>
}

const SrcPill = ({src}) => {
  if (src==='item')     return <span style={{fontSize:11,color:'#7c3aed',background:'#ede9fe',padding:'1px 6px',borderRadius:999}}>item override</span>
  if (src==='category') return <span style={{fontSize:11,color:'#2563eb',background:'#dbeafe',padding:'1px 6px',borderRadius:999}}>category override</span>
  return <span style={{fontSize:11,color:'#9ca3af'}}>global default</span>
}

const InfoBox = ({children, color='amber'}) => {
  const clr = {amber:{bg:'#f0fdfa',border:'#99f6e4',text:'#134e4a'},green:{bg:'#f0fdf4',border:'#bbf7d0',text:'#166534'},red:{bg:'#fef2f2',border:'#fecaca',text:'#991b1b'},blue:{bg:'#eff6ff',border:'#bfdbfe',text:'#1e40af'},gray:{bg:'#f9fafb',border:'#e5e7eb',text:'#374151'}}
  const s = clr[color]||clr.amber
  return <div style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:10,padding:'8px 12px',fontSize:12,color:s.text,lineHeight:1.5}}>{children}</div>
}

const SecTitle = ({children}) => (
  <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',margin:'18px 0 10px'}}>{children}</div>
)

// ─────────────────────────────────────────────────────────
// AI PANEL
// ─────────────────────────────────────────────────────────
const AiPanel = ({suggestions, onApply, onDismiss}) => {
  if (!suggestions) return null
  return (
    <div style={{gridColumn:'1/-1',border:'1px solid #c4b5fd',background:'#faf5ff',borderRadius:12,padding:14}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,color:'#5b21b6'}}>
          <Sparkles size={13}/> AI Suggestions — review and apply
        </div>
        <button onClick={onDismiss} style={{border:'none',background:'none',cursor:'pointer',color:'#a78bfa',display:'flex'}}><X size={13}/></button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'6px 16px',marginBottom:12}}>
        {Object.entries(suggestions).map(([k,vl])=>(
          <div key={k} style={{display:'flex',gap:4,fontSize:12}}>
            <span style={{color:'#9ca3af',textTransform:'capitalize',flexShrink:0}}>{k.replace(/_/g,' ')}:</span>
            <span style={{fontWeight:600,color:'#1a1a1a'}}>{String(vl)}</span>
          </div>
        ))}
      </div>
      <Btn ch={<><Check size={12}/>Apply All</>} v='primary' sz='sm' onClick={onApply}/>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// INGREDIENT PICKER
// ─────────────────────────────────────────────────────────
const IngPicker = ({ings, setIngs, rms, ints, noInts=false}) => {
  const [q, setQ] = useState('')
  const all = useMemo(() => [
    ...rms.map(r=>({...r,type:'raw',du:r.usage_unit})),
    ...(noInts?[]:ints.map(i=>({...i,type:'intermediate',du:i.yield_unit}))),
  ],[rms,ints,noInts])
  const filtered = q ? all.filter(i=>i.name.toLowerCase().includes(q.toLowerCase())) : []

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

// ─────────────────────────────────────────────────────────
// RAW MATERIAL MODAL
// ─────────────────────────────────────────────────────────
const RMModal = ({rm, onSave, onClose}) => {
  const blank = {id:'',name:'',category:'',sub_category:'',food_type:'',buy_unit:'kg',pack_cost:0,pack_qty:1,usage_unit:'g',conversion:1000,...Object.fromEntries(NF.map(f=>[f.k,0]))}
  const [f, setF]   = useState(rm?{...blank,...rm}:{...blank,id:uid()})
  const [ai, setAi] = useState(null)
  const [aiL,setAiL]= useState(false)
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
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{gridColumn:'1/-1',display:'flex',gap:8,alignItems:'flex-end'}}>
          <Inp label='Ingredient Name' v={f.name} onChange={v=>upd('name',v)} ph='e.g. Prawns, Basmati Rice, Olive Oil' req style={{flex:1}}/>
          <Btn ch={<><Sparkles size={12}/>{aiL?'Thinking…':'AI Suggest'}</>} v='ai' sz='sm' onClick={runAI} disabled={aiL}/>
        </div>
        <AiPanel suggestions={ai} onApply={applyAI} onDismiss={()=>setAi(null)}/>
        <Inp label='Category' v={f.category} onChange={v=>upd('category',v)} ph='e.g. Seafood, Dairy, Vegetables' req/>
        <Inp label='Sub-Category' v={f.sub_category} onChange={v=>upd('sub_category',v)} ph='e.g. Shellfish, Leafy Greens'/>
        <Sel label='Food Type' v={f.food_type} onChange={v=>upd('food_type',v)} opts={FOOD_TYPES} ph='Select…' req/>
      </div>

      <SecTitle>Purchase Details</SecTitle>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
        <Sel label='Buy Unit' v={f.buy_unit} onChange={v=>{upd('buy_unit',v);if(v===f.usage_unit)upd('conversion',1)}} opts={UNITS} req/>
        <Inp label='Pack Cost (₹)' v={f.pack_cost} onChange={v=>upd('pack_cost',parseFloat(v)||0)} type='number' min='0' step='any' req/>
        <Inp label='Qty per Pack' v={f.pack_qty} onChange={v=>upd('pack_qty',parseFloat(v)||0)} type='number' min='0' step='any' req/>
      </div>
      <div style={{marginTop:8}}><InfoBox color='gray'>Cost per {f.buy_unit||'buy unit'}: <strong>{fc(buc)}</strong></InfoBox></div>

      <SecTitle>Usage Details</SecTitle>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <Sel label='Usage Unit (how measured in recipes)' v={f.usage_unit} onChange={v=>{upd('usage_unit',v);if(v===f.buy_unit)upd('conversion',1)}} opts={UNITS} req/>
        <Inp
          label={sameUnit?'Conversion (same unit — 1:1)':`How many ${f.usage_unit||'usage units'} per 1 ${f.buy_unit||'buy unit'}`}
          v={f.conversion} onChange={v=>upd('conversion',parseFloat(v)||0)}
          type='number' min='0' step='any' readOnly={sameUnit}/>
      </div>
      <div style={{marginTop:8}}><InfoBox color='amber'>Cost per {f.usage_unit||'usage unit'}: <strong>{fc(uc)}</strong></InfoBox></div>

      <SecTitle>Nutritional Values (per 1 {f.usage_unit||'usage unit'})</SecTitle>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
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
const IntModal = ({inter, onSave, onClose, rms, ints}) => {
  const blank = {id:'',name:'',category:'',ingredients:[],yield_qty:1,yield_unit:'g'}
  const [f,setF] = useState(inter?{...blank,...inter}:{...blank,id:uid()})
  const upd = (k,v) => setF(p=>({...p,[k]:v}))
  const totalCost = f.ingredients.reduce((s,i)=>s+ingCost(i,rms,ints),0)
  const uc  = totalCost/(f.yield_qty||1)
  const nut = intNut({...f},rms,ints)
  const valid = f.name&&(f.yield_qty||0)>0&&f.ingredients.length>0

  return (
    <Modal title={inter?'Edit Intermediate':'Add Intermediate'} onClose={onClose} wide>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <Inp label='Intermediate Name' v={f.name} onChange={v=>upd('name',v)} ph='e.g. Red Pasta Sauce, Marinated Chicken' req/>
        <Inp label='Category' v={f.category} onChange={v=>upd('category',v)} ph='e.g. Sauces, Marinades, Bases'/>
      </div>

      <SecTitle>Recipe Ingredients</SecTitle>
      <IngPicker ings={f.ingredients} setIngs={v=>upd('ingredients',v)} rms={rms} ints={ints.filter(i=>i.id!==f.id)}/>

      <SecTitle>Yield (Output produced by this recipe)</SecTitle>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <Inp label='Yield Quantity' v={f.yield_qty} onChange={v=>upd('yield_qty',parseFloat(v)||0)} type='number' min='0' step='any' req/>
        <Sel label='Yield Unit' v={f.yield_unit} onChange={v=>upd('yield_unit',v)} opts={UNITS} req/>
      </div>
      {f.yield_qty>0&&f.ingredients.length>0&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
          <InfoBox color='gray'>Total recipe cost: <strong>{fc(totalCost)}</strong></InfoBox>
          <InfoBox color='amber'>Cost per {f.yield_unit}: <strong>{fc(uc)}</strong></InfoBox>
        </div>
      )}

      {f.ingredients.length>0&&(
        <>
          <SecTitle>Auto-Calculated Nutrition (per yield unit)</SecTitle>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
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
const MIModal = ({item, onSave, onClose, rms, ints, pc}) => {
  const blank = {id:'',name:'',category:'',sub_category:'',food_type:'',ingredients:[],sp_multiplier_override:null,packaging_cost_override:null,delivery_markup_override:null}
  const [f,setF]   = useState(item?{...blank,...item}:{...blank,id:uid()})
  const [ai,setAi] = useState(null)
  const [aiL,setAiL]= useState(false)
  const upd = (k,v) => setF(p=>({...p,[k]:v}))

  const food = miFC(f,rms,ints)
  const eff_spm = effVal('sp_multiplier',f.id,f.category,pc)
  const eff_pkg = effVal('packaging_cost',f.id,f.category,pc)
  const eff_dm  = effVal('delivery_markup',f.id,f.category,pc)
  const act_spm = f.sp_multiplier_override ?? eff_spm.v
  const act_pkg = f.packaging_cost_override ?? eff_pkg.v
  const act_dm  = f.delivery_markup_override ?? eff_dm.v
  const sp  = food * act_spm
  const dp  = (sp + act_pkg) * (1 + act_dm/100)
  const pct = sp>0?(food/sp)*100:0
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
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',borderBottom:'1px solid #f9fafb'}}>
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
          <div style={{display:'flex',alignItems:'center',gap:8}}>
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
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{gridColumn:'1/-1',display:'flex',gap:8,alignItems:'flex-end'}}>
          <Inp label='Item Name' v={f.name} onChange={v=>upd('name',v)} ph='e.g. Prawn Pasta, Mango Smoothie' req style={{flex:1}}/>
          <Btn ch={<><Sparkles size={12}/>{aiL?'Thinking…':'AI Suggest'}</>} v='ai' sz='sm' onClick={runAI} disabled={aiL}/>
        </div>
        <AiPanel suggestions={ai} onApply={applyAI} onDismiss={()=>setAi(null)}/>
        <Inp label='Category' v={f.category} onChange={v=>upd('category',v)} ph='e.g. Mains, Beverages, Starters'/>
        <Inp label='Sub-Category' v={f.sub_category} onChange={v=>upd('sub_category',v)} ph='e.g. Pasta, Smoothies, Soups'/>
        <Sel label='Food Type' v={f.food_type} onChange={v=>upd('food_type',v)} opts={FOOD_TYPES} ph='Select…'/>
      </div>

      <SecTitle>Recipe Ingredients</SecTitle>
      <IngPicker ings={f.ingredients} setIngs={v=>upd('ingredients',v)} rms={rms} ints={ints}/>

      <SecTitle>Pricing Overrides</SecTitle>
      <div style={{background:'#f9fafb',borderRadius:12,padding:'4px 16px'}}>
        <OvrField label='SP Multiplier' field='sp_multiplier' ovrKey='sp_multiplier_override' unit='×' isX/>
        <OvrField label='Packaging Cost' field='packaging_cost' ovrKey='packaging_cost_override' unit='₹'/>
        <OvrField label='Delivery Markup' field='delivery_markup' ovrKey='delivery_markup_override' unit='%'/>
      </div>

      {f.ingredients.length>0&&(
        <>
          <SecTitle>Live Pricing Preview</SecTitle>
          <div style={{background:fcBg,border:`1px solid ${fcBorder}`,borderRadius:12,padding:16}}>
            {pct>threshold&&(
              <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#991b1b',marginBottom:10}}>
                <AlertTriangle size={13}/> FC% exceeds your {threshold}% alert threshold!
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
              {[['Food Cost',fc(food)],['Selling Price ('+act_spm+'×)',fc(sp)],['Packaging',fc(act_pkg)],['Delivery Markup',act_dm+'%'],['Delivery Price',fc(dp)],['FC%',fp(pct)]].map(([l,vl])=>(
                <div key={l}>
                  <div style={{fontSize:11,color:'#6b7280'}}>{l}</div>
                  <div style={{fontSize:16,fontWeight:800,color:l==='FC%'?(pct>threshold?'#991b1b':pct>threshold*0.85?'#134e4a':'#166534'):'#111'}}>{vl}</div>
                </div>
              ))}
            </div>
          </div>

          <SecTitle>Total Nutrition (per serving)</SecTitle>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
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
const CascadeModal = ({data, onConfirm, onClose, mis}) => {
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
// DASHBOARD
// ─────────────────────────────────────────────────────────
const Dashboard = ({rms, ints, mis, pc}) => {
  const threshold = pc.global.fc_alert_threshold
  const pricings  = useMemo(()=>mis.map(m=>({...m,...calcPricing(m,rms,ints,pc)})),[mis,rms,ints,pc])
  const alerts    = pricings.filter(m=>m.pct>threshold)
  const warnings  = pricings.filter(m=>m.pct>threshold*0.85&&m.pct<=threshold)

  const StatCard = ({icon:Icon,label,value,sub,color}) => (
    <div style={{background:'#fff',border:'1px solid #f1f1f1',borderRadius:16,padding:18,display:'flex',alignItems:'center',gap:14}}>
      <div style={{padding:10,borderRadius:12,background:color.bg}}><Icon size={20} style={{color:color.ico}}/></div>
      <div>
        <div style={{fontSize:26,fontWeight:800,color:'#111',lineHeight:1}}>{value}</div>
        <div style={{fontSize:12,fontWeight:600,color:'#374151',marginTop:2}}>{label}</div>
        <div style={{fontSize:11,color:'#9ca3af'}}>{sub}</div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:800,color:'#111',margin:0}}>Dashboard</h1>
        <p style={{fontSize:13,color:'#9ca3af',marginTop:4}}>Live overview · shared across your team</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
        <StatCard icon={Package}        label='Raw Materials' value={rms.length} sub='ingredients tracked'              color={{bg:'#eff6ff',ico:'#2563eb'}}/>
        <StatCard icon={FlaskConical}   label='Intermediates' value={ints.length} sub='prep recipes'                   color={{bg:'#ccfbf1',ico:'#0d9488'}}/>
        <StatCard icon={UtensilsCrossed}label='Menu Items'    value={mis.length} sub='on your menu'                    color={{bg:'#ccfbf1',ico:'#0d9488'}}/>
        <StatCard icon={ShieldAlert}    label='FC% Alerts'    value={alerts.length} sub={`${warnings.length} warnings`} color={alerts.length>0?{bg:'#fee2e2',ico:'#dc2626'}:{bg:'#dcfce7',ico:'#16a34a'}}/>
      </div>

      {alerts.length>0&&(
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:14,padding:16,marginBottom:20}}>
          <div style={{display:'flex',alignItems:'center',gap:8,fontWeight:700,fontSize:13,color:'#991b1b',marginBottom:12}}>
            <AlertTriangle size={15}/> {alerts.length} item{alerts.length!==1?'s':''} exceed{alerts.length===1?'s':''} your {threshold}% FC% threshold
          </div>
          {alerts.map(m=>(
            <div key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fff',border:'1px solid #fecaca',borderRadius:10,padding:'8px 14px',marginBottom:6}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontWeight:700,fontSize:13}}>{m.name}</span>
                {m.category&&<Bdg ch={m.category} c='gray'/>}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:14,fontSize:12}}>
                <span style={{color:'#6b7280'}}>FC: <strong style={{color:'#111'}}>{fc(m.food)}</strong></span>
                <span style={{color:'#6b7280'}}>SP: <strong style={{color:'#111'}}>{fc(m.sp)}</strong></span>
                <FCBadge pct={m.pct} threshold={threshold}/>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{fontWeight:700,fontSize:13,color:'#374151',marginBottom:12}}>All Menu Items — Pricing Overview</div>
      {pricings.length===0?(
        <div style={{textAlign:'center',padding:'64px 0',color:'#d1d5db',border:'2px dashed #f1f1f1',borderRadius:16,fontSize:14}}>
          Add raw materials, build recipes, and your full cost analysis appears here.
        </div>
      ):(
        <div style={{background:'#fff',border:'1px solid #f1f1f1',borderRadius:16,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:'#f9fafb'}}>
                {['Item','Category','Food Type','Food Cost','Sell Price','Delivery Price','FC%'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:'#9ca3af',fontSize:11}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pricings.map(m=>(
                <tr key={m.id} style={{borderTop:'1px solid #f9fafb'}}
                  onMouseOver={e=>e.currentTarget.style.background='#fafafa'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'10px 14px',fontWeight:700,color:'#111'}}>{m.name}</td>
                  <td style={{padding:'10px 14px',color:'#6b7280'}}>{m.category||'—'}</td>
                  <td style={{padding:'10px 14px'}}><Bdg ch={m.food_type||'—'} c={FT_COLOR_MAP[m.food_type]||'gray'}/></td>
                  <td style={{padding:'10px 14px'}}>{fc(m.food)}</td>
                  <td style={{padding:'10px 14px',fontWeight:700}}>{fc(m.sp)}</td>
                  <td style={{padding:'10px 14px',fontWeight:700,color:'#0f766e'}}>{fc(m.dp)}</td>
                  <td style={{padding:'10px 14px'}}><FCBadge pct={m.pct} threshold={threshold}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// RAW MATERIALS PAGE
// ─────────────────────────────────────────────────────────
const RMPage = ({rms, setRms}) => {
  const [modal, setModal] = useState(null)
  const [q, setQ]         = useState('')
  const filtered = rms.filter(r=>r.name.toLowerCase().includes(q.toLowerCase())||(r.category||'').toLowerCase().includes(q.toLowerCase()))
  const save = rm => { setRms(rms.find(r=>r.id===rm.id)?rms.map(r=>r.id===rm.id?rm:r):[...rms,rm]); setModal(null) }
  const del  = id => { if(confirm('Delete this raw material? It may break recipes that use it.')) setRms(rms.filter(r=>r.id!==id)) }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'#111',margin:0}}>Raw Materials</h1>
          <p style={{fontSize:13,color:'#9ca3af',marginTop:4}}>{rms.length} ingredients · the foundation of all recipes</p>
        </div>
        <Btn ch={<><Plus size={14}/>Add Raw Material</>} v='primary' onClick={()=>setModal('new')}/>
      </div>
      <div style={{position:'relative',marginBottom:16}}>
        <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#d1d5db'}}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder='Search by name or category…'
          style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:10,padding:'9px 12px 9px 34px',fontSize:13,outline:'none'}}/>
      </div>
      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'64px 0',color:'#d1d5db',border:'2px dashed #f1f1f1',borderRadius:16,fontSize:14}}>
          {rms.length===0?'No raw materials yet — add your first ingredient!':'No results found.'}
        </div>
      ):(
        <div style={{background:'#fff',border:'1px solid #f1f1f1',borderRadius:16,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:'#f9fafb'}}>
                {['Name & Category','Type','Buy Unit','Pack Cost','Qty / Pack','Usage Unit','Unit Cost',''].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:'#9ca3af',fontSize:11,whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(rm=>(
                <tr key={rm.id} style={{borderTop:'1px solid #f9fafb'}}
                  onMouseOver={e=>e.currentTarget.style.background='#fafafa'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{fontWeight:700,color:'#111'}}>{rm.name}</div>
                    <div style={{fontSize:11,color:'#9ca3af'}}>{[rm.category,rm.sub_category].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td style={{padding:'10px 14px'}}><Bdg ch={rm.food_type||'—'} c={FT_COLOR_MAP[rm.food_type]||'gray'}/></td>
                  <td style={{padding:'10px 14px',color:'#6b7280'}}>{rm.buy_unit}</td>
                  <td style={{padding:'10px 14px'}}>{fc(rm.pack_cost)}</td>
                  <td style={{padding:'10px 14px',color:'#6b7280'}}>{rm.pack_qty}</td>
                  <td style={{padding:'10px 14px',color:'#6b7280'}}>{rm.usage_unit}</td>
                  <td style={{padding:'10px 14px'}}>
                    <span style={{fontWeight:700,color:'#0f766e'}}>{fc(rmUC(rm))}</span>
                    <span style={{fontSize:11,color:'#9ca3af'}}>/{rm.usage_unit}</span>
                  </td>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={()=>setModal(rm)} style={{padding:5,border:'none',background:'none',cursor:'pointer',color:'#9ca3af',borderRadius:6,display:'flex'}}
                        onMouseOver={e=>e.currentTarget.style.background='#f3f4f6'} onMouseOut={e=>e.currentTarget.style.background='none'}>
                        <Pencil size={12}/>
                      </button>
                      <button onClick={()=>del(rm.id)} style={{padding:5,border:'none',background:'none',cursor:'pointer',color:'#9ca3af',borderRadius:6,display:'flex'}}
                        onMouseOver={e=>e.currentTarget.style.background='#fee2e2'} onMouseOut={e=>e.currentTarget.style.background='none'}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal&&<RMModal rm={modal==='new'?null:modal} onSave={save} onClose={()=>setModal(null)}/>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// INTERMEDIATES PAGE
// ─────────────────────────────────────────────────────────
const IntPage = ({ints, setInts, rms}) => {
  const [modal, setModal] = useState(null)
  const [q, setQ]         = useState('')
  const filtered = ints.filter(i=>i.name.toLowerCase().includes(q.toLowerCase())||(i.category||'').toLowerCase().includes(q.toLowerCase()))
  const save = it => { setInts(ints.find(i=>i.id===it.id)?ints.map(i=>i.id===it.id?it:i):[...ints,it]); setModal(null) }
  const del  = id => { if(confirm('Delete this intermediate? It may break menu items that use it.')) setInts(ints.filter(i=>i.id!==id)) }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'#111',margin:0}}>Intermediates</h1>
          <p style={{fontSize:13,color:'#9ca3af',marginTop:4}}>{ints.length} prep recipes · sauces, marinades, bases</p>
        </div>
        <Btn ch={<><Plus size={14}/>Add Intermediate</>} v='primary' onClick={()=>setModal('new')} disabled={rms.length===0}/>
      </div>
      {rms.length===0&&<div style={{marginBottom:16}}><InfoBox color='blue'>Add raw materials first before creating intermediates.</InfoBox></div>}
      <div style={{position:'relative',marginBottom:16}}>
        <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#d1d5db'}}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder='Search intermediates…'
          style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:10,padding:'9px 12px 9px 34px',fontSize:13,outline:'none'}}/>
      </div>
      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'64px 0',color:'#d1d5db',border:'2px dashed #f1f1f1',borderRadius:16,fontSize:14}}>
          {ints.length===0?'No intermediates yet.':'No results found.'}
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {filtered.map(it=>{
            const tc=it.ingredients.reduce((s,i)=>s+ingCost(i,rms,ints),0), uc=intUC(it,rms,ints)
            return (
              <div key={it.id} style={{background:'#fff',border:'1px solid #f1f1f1',borderRadius:14,padding:'14px 18px'}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:'#111'}}>{it.name}</div>
                    <div style={{fontSize:12,color:'#9ca3af',marginTop:2}}>{it.category||'No category'} · {it.ingredients.length} ingredient{it.ingredients.length!==1?'s':''}</div>
                  </div>
                  <div style={{display:'flex',gap:14,alignItems:'center'}}>
                    <div style={{textAlign:'right'}}><div style={{fontSize:11,color:'#9ca3af'}}>Total cost</div><div style={{fontWeight:700,fontSize:14,color:'#374151'}}>{fc(tc)}</div></div>
                    <div style={{textAlign:'right'}}><div style={{fontSize:11,color:'#9ca3af'}}>Per {it.yield_unit}</div><div style={{fontWeight:700,fontSize:14,color:'#0f766e'}}>{fc(uc)}</div></div>
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={()=>setModal(it)} style={{padding:6,border:'none',background:'#f9fafb',cursor:'pointer',color:'#6b7280',borderRadius:6,display:'flex'}}><Pencil size={12}/></button>
                      <button onClick={()=>del(it.id)}   style={{padding:6,border:'none',background:'#f9fafb',cursor:'pointer',color:'#6b7280',borderRadius:6,display:'flex'}}><Trash2 size={12}/></button>
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
      {modal&&<IntModal inter={modal==='new'?null:modal} onSave={save} onClose={()=>setModal(null)} rms={rms} ints={ints}/>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MENU ITEMS PAGE
// ─────────────────────────────────────────────────────────
const MIPage = ({mis, setMis, rms, ints, pc}) => {
  const [modal, setModal]   = useState(null)
  const [q, setQ]           = useState('')
  const [filterCat, setFCat]= useState('')
  const cats      = [...new Set(mis.map(m=>m.category).filter(Boolean))].sort()
  const threshold = pc.global.fc_alert_threshold
  const pricings  = useMemo(()=>mis.map(m=>({...m,...calcPricing(m,rms,ints,pc)})),[mis,rms,ints,pc])
  const filtered  = pricings.filter(m=>
    (m.name.toLowerCase().includes(q.toLowerCase())||(m.category||'').toLowerCase().includes(q.toLowerCase()))
    &&(!filterCat||m.category===filterCat)
  )
  const save = mi => { setMis(mis.find(m=>m.id===mi.id)?mis.map(m=>m.id===mi.id?mi:m):[...mis,mi]); setModal(null) }
  const del  = id => { if(confirm('Delete this menu item?')) setMis(mis.filter(m=>m.id!==id)) }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'#111',margin:0}}>Menu Items</h1>
          <p style={{fontSize:13,color:'#9ca3af',marginTop:4}}>{mis.length} items · full recipe costing and pricing</p>
        </div>
        <Btn ch={<><Plus size={14}/>Add Menu Item</>} v='primary' onClick={()=>setModal('new')} disabled={rms.length===0}/>
      </div>
      {rms.length===0&&<div style={{marginBottom:16}}><InfoBox color='blue'>Add raw materials first before creating menu items.</InfoBox></div>}
      <div style={{display:'flex',gap:10,marginBottom:16}}>
        <div style={{position:'relative',flex:1}}>
          <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#d1d5db'}}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder='Search menu items…'
            style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:10,padding:'9px 12px 9px 34px',fontSize:13,outline:'none'}}/>
        </div>
        {cats.length>0&&(
          <select value={filterCat} onChange={e=>setFCat(e.target.value)}
            style={{border:'1px solid #e5e7eb',borderRadius:10,padding:'9px 12px',fontSize:13,color:filterCat?'#374151':'#9ca3af',outline:'none',background:'#fff',minWidth:160}}>
            <option value=''>All categories</option>
            {cats.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>
      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'64px 0',color:'#d1d5db',border:'2px dashed #f1f1f1',borderRadius:16,fontSize:14}}>
          {mis.length===0?'No menu items yet.':'No results found.'}
        </div>
      ):(
        <div style={{background:'#fff',border:'1px solid #f1f1f1',borderRadius:16,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:'#f9fafb'}}>
                {['Item','Category','Type','Food Cost','SP','Pkg','Delivery Price','FC%',''].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:'#9ca3af',fontSize:11,whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m=>(
                <tr key={m.id} style={{borderTop:'1px solid #f9fafb'}}
                  onMouseOver={e=>e.currentTarget.style.background='#fafafa'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{fontWeight:700,color:'#111'}}>{m.name}</div>
                    {m.sub_category&&<div style={{fontSize:11,color:'#9ca3af'}}>{m.sub_category}</div>}
                  </td>
                  <td style={{padding:'10px 14px',color:'#6b7280'}}>{m.category||'—'}</td>
                  <td style={{padding:'10px 14px'}}><Bdg ch={m.food_type||'—'} c={FT_COLOR_MAP[m.food_type]||'gray'}/></td>
                  <td style={{padding:'10px 14px',fontWeight:600}}>{fc(m.food)}</td>
                  <td style={{padding:'10px 14px',fontWeight:800,color:'#111'}}>{fc(m.sp)}</td>
                  <td style={{padding:'10px 14px',color:'#6b7280'}}>{fc(m.pkg)}</td>
                  <td style={{padding:'10px 14px',fontWeight:800,color:'#0f766e'}}>{fc(m.dp)}</td>
                  <td style={{padding:'10px 14px'}}><FCBadge pct={m.pct} threshold={threshold}/></td>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={()=>setModal(mis.find(x=>x.id===m.id))} style={{padding:5,border:'none',background:'none',cursor:'pointer',color:'#9ca3af',borderRadius:6,display:'flex'}}
                        onMouseOver={e=>e.currentTarget.style.background='#f3f4f6'} onMouseOut={e=>e.currentTarget.style.background='none'}>
                        <Pencil size={12}/>
                      </button>
                      <button onClick={()=>del(m.id)} style={{padding:5,border:'none',background:'none',cursor:'pointer',color:'#9ca3af',borderRadius:6,display:'flex'}}
                        onMouseOver={e=>e.currentTarget.style.background='#fee2e2'} onMouseOut={e=>e.currentTarget.style.background='none'}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal&&<MIModal item={modal==='new'?null:modal} onSave={save} onClose={()=>setModal(null)} rms={rms} ints={ints} pc={pc}/>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────────────────
const SettingsPage = ({pc, setPc, mis}) => {
  const [draft, setDraft]     = useState(()=>JSON.parse(JSON.stringify(pc)))
  const [cascade, setCascade] = useState(null)
  const [flash, setFlash]     = useState(false)

  const updG   = (k,v) => setDraft(d=>({...d,global:{...d.global,[k]:parseFloat(v)||0}}))
  const updCat = (cat,k,v) => setDraft(d=>{
    const co={...d.category_overrides}
    if(!co[cat])co[cat]={}
    if(v===''||v===null){delete co[cat][k];if(!Object.keys(co[cat]).length)delete co[cat]}
    else co[cat][k]=parseFloat(v)
    return{...d,category_overrides:co}
  })
  const updItem= (id,k,v) => setDraft(d=>{
    const io={...d.item_overrides}
    if(!io[id])io[id]={}
    if(v===''||v===null){delete io[id][k];if(!Object.keys(io[id]).length)delete io[id]}
    else io[id][k]=parseFloat(v)
    return{...d,item_overrides:io}
  })

  const FIELDS = [
    {k:'sp_multiplier',l:'SP Multiplier',u:'×',step:'0.1'},
    {k:'packaging_cost',l:'Packaging Cost',u:'₹',step:'1'},
    {k:'delivery_markup',l:'Delivery Markup',u:'%',step:'1'},
  ]
  const cats = [...new Set(mis.map(m=>m.category).filter(Boolean))].sort()

  const saveGlobal = () => {
    const changedFields = FIELDS.map(f=>f.k).filter(k=>draft.global[k]!==pc.global[k])
    if(!changedFields.length){doSave();return}
    const affCats={}, affItems={}
    cats.forEach(cat=>{const ov=pc.category_overrides[cat];if(ov&&changedFields.some(f=>ov[f]!=null))affCats[cat]=ov})
    mis.forEach(mi=>{const ov=pc.item_overrides[mi.id];if(ov&&changedFields.some(f=>ov[f]!=null))affItems[mi.id]=ov})
    if(!Object.keys(affCats).length&&!Object.keys(affItems).length){doSave();return}
    setCascade({changedFields,affCats,affItems,newGlobal:draft.global})
  }

  const doSave = (selCats=[], selItems=[]) => {
    let nd={...draft}
    selCats.forEach(({cat,field})=>{nd={...nd,category_overrides:{...nd.category_overrides,[cat]:{...nd.category_overrides[cat],[field]:nd.global[field]}}}})
    selItems.forEach(({id,field})=>{nd={...nd,item_overrides:{...nd.item_overrides,[id]:{...nd.item_overrides[id],[field]:nd.global[field]}}}})
    setPc(nd)
    setDraft(JSON.parse(JSON.stringify(nd)))
    setCascade(null)
    setFlash(true)
    setTimeout(()=>setFlash(false),2200)
  }

  const Card = ({title,children}) => (
    <div style={{background:'#fff',border:'1px solid #f1f1f1',borderRadius:16,overflow:'hidden',marginBottom:20}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid #f9fafb',fontSize:13,fontWeight:700,color:'#374151'}}>{title}</div>
      <div style={{padding:'16px 20px'}}>{children}</div>
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'#111',margin:0}}>Settings</h1>
          <p style={{fontSize:13,color:'#9ca3af',marginTop:4}}>Global defaults → category overrides → per-item rules</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {flash&&<span style={{fontSize:12,color:'#166534',background:'#dcfce7',padding:'4px 12px',borderRadius:8,fontWeight:600}}>Saved!</span>}
          <Btn ch='Save All Settings' v='primary' onClick={saveGlobal}/>
        </div>
      </div>

      <Card title='Global Defaults'>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          {FIELDS.map(f=>(
            <Inp key={f.k} label={f.l} v={draft.global[f.k]} onChange={v=>updG(f.k,v)} type='number' min='0' step={f.step} unit={f.u}/>
          ))}
          <Inp label='FC% Alert Threshold' v={draft.global.fc_alert_threshold} onChange={v=>updG('fc_alert_threshold',v)} type='number' min='0' step='1' unit='%'/>
        </div>
        <div style={{marginTop:12}}>
          <InfoBox color='gray'>
            SP = Food Cost × {draft.global.sp_multiplier}× &nbsp;·&nbsp; Delivery = (SP + ₹{draft.global.packaging_cost}) × (1 + {draft.global.delivery_markup}%) &nbsp;·&nbsp; Alert fires above {draft.global.fc_alert_threshold}% FC
          </InfoBox>
        </div>
      </Card>

      <Card title='Category Overrides (leave blank to inherit global)'>
        {cats.length===0?(
          <p style={{fontSize:13,color:'#9ca3af'}}>No categories yet — add menu items with categories to create overrides.</p>
        ):(
          <>
            <div style={{display:'grid',gridTemplateColumns:'1.5fr repeat(3,1fr)',gap:10,padding:'6px 0',borderBottom:'1px solid #f1f1f1',marginBottom:4}}>
              <span style={{fontSize:11,fontWeight:700,color:'#9ca3af'}}>CATEGORY</span>
              {FIELDS.map(f=><span key={f.k} style={{fontSize:11,fontWeight:700,color:'#9ca3af'}}>{f.l.toUpperCase()} ({f.u})</span>)}
            </div>
            {cats.map(cat=>(
              <div key={cat} style={{display:'grid',gridTemplateColumns:'1.5fr repeat(3,1fr)',gap:10,padding:'10px 0',borderBottom:'1px solid #f9fafb',alignItems:'center'}}>
                <span style={{fontSize:13,fontWeight:600,color:'#374151'}}>{cat}</span>
                {FIELDS.map(f=>{
                  const ov=draft.category_overrides[cat]?.[f.k]
                  return (
                    <div key={f.k} style={{position:'relative'}}>
                      <input type='number' min='0' step={f.step} placeholder={String(draft.global[f.k])} value={ov!=null?ov:''}
                        onChange={e=>updCat(cat,f.k,e.target.value===''?null:e.target.value)}
                        style={{width:'100%',boxSizing:'border-box',border:`1px solid ${ov!=null?'#2dd4bf':'#e5e7eb'}`,borderRadius:6,padding:'5px 28px 5px 8px',fontSize:12,outline:'none',background:ov!=null?'#f0fdfa':'#fff'}}/>
                      <span style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'#9ca3af'}}>{f.u}</span>
                    </div>
                  )
                })}
              </div>
            ))}
            <p style={{fontSize:11,color:'#9ca3af',marginTop:8}}>Highlighted fields are active overrides. Blank = uses global default.</p>
          </>
        )}
      </Card>

      <Card title='Per-Item Overrides (leave blank to inherit category or global)'>
        {mis.length===0?(
          <p style={{fontSize:13,color:'#9ca3af'}}>No menu items yet.</p>
        ):(
          <>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr repeat(3,1fr)',gap:10,padding:'6px 0',borderBottom:'1px solid #f1f1f1',marginBottom:4}}>
              <span style={{fontSize:11,fontWeight:700,color:'#9ca3af'}}>ITEM</span>
              <span style={{fontSize:11,fontWeight:700,color:'#9ca3af'}}>CATEGORY</span>
              {FIELDS.map(f=><span key={f.k} style={{fontSize:11,fontWeight:700,color:'#9ca3af'}}>{f.l.toUpperCase()} ({f.u})</span>)}
            </div>
            {mis.map(mi=>(
              <div key={mi.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr repeat(3,1fr)',gap:10,padding:'10px 0',borderBottom:'1px solid #f9fafb',alignItems:'center'}}>
                <span style={{fontSize:13,fontWeight:600,color:'#374151'}}>{mi.name}</span>
                <span style={{fontSize:12,color:'#9ca3af'}}>{mi.category||'—'}</span>
                {FIELDS.map(f=>{
                  const ov=draft.item_overrides[mi.id]?.[f.k]
                  const catV=draft.category_overrides[mi.category]?.[f.k]
                  const ph=catV!=null?`${catV} (cat)`:`${draft.global[f.k]} (glb)`
                  return (
                    <div key={f.k} style={{position:'relative'}}>
                      <input type='number' min='0' step={f.step} placeholder={ph} value={ov!=null?ov:''}
                        onChange={e=>updItem(mi.id,f.k,e.target.value===''?null:e.target.value)}
                        style={{width:'100%',boxSizing:'border-box',border:`1px solid ${ov!=null?'#a78bfa':'#e5e7eb'}`,borderRadius:6,padding:'5px 28px 5px 8px',fontSize:12,outline:'none',background:ov!=null?'#faf5ff':'#fff'}}/>
                      <span style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'#9ca3af'}}>{f.u}</span>
                    </div>
                  )
                })}
              </div>
            ))}
            <p style={{fontSize:11,color:'#9ca3af',marginTop:8}}>Yellow = category override · Purple = item override · Blank = inherits from category or global</p>
          </>
        )}
      </Card>

      {cascade&&<CascadeModal data={cascade} onConfirm={doSave} onClose={()=>setCascade(null)} mis={mis}/>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────
export default function App() {
  const [rms,  setRms,  rmsOk]  = useShared(SK.rm,  [])
  const [ints, setInts, intsOk] = useShared(SK.int, [])
  const [mis,  setMis,  misOk]  = useShared(SK.mi,  [])
  const [pc,   setPc,   pcOk]   = useShared(SK.pc,  DEFAULT_PC)
  const [tab,  setTab]          = useState('dashboard')

  const loading = !rmsOk||!intsOk||!misOk||!pcOk

  const NAV = [
    {id:'dashboard',     icon:LayoutDashboard,  label:'Dashboard'},
    {id:'raw',           icon:Package,           label:'Raw Materials'},
    {id:'intermediates', icon:FlaskConical,      label:'Intermediates'},
    {id:'menu',          icon:UtensilsCrossed,   label:'Menu Items'},
    {id:'settings',      icon:Settings,          label:'Settings'},
  ]

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14}}>
      <div style={{background:'#0d9488',borderRadius:16,padding:14,display:'flex'}}>
        <ChefHat size={32} style={{color:'#fff'}}/>
      </div>
      <div style={{fontSize:15,fontWeight:600,color:'#374151'}}>Loading MiseMap…</div>
      <div style={{fontSize:12,color:'#9ca3af'}}>Connecting to your shared database</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f8f7f4',display:'flex'}}>
      {/* ── Sidebar ── */}
      <div style={{width:220,background:'#fff',borderRight:'1px solid #f1f1f1',display:'flex',flexDirection:'column',padding:'20px 12px',position:'sticky',top:0,height:'100vh',flexShrink:0,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'0 8px 20px',borderBottom:'1px solid #f5f5f5',marginBottom:12}}>
          <div style={{background:'#0d9488',borderRadius:10,padding:8,display:'flex'}}>
            <ChefHat size={18} style={{color:'#fff'}}/>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:14,color:'#111'}}>MiseMap</div>
            <div style={{fontSize:10,color:'#9ca3af'}}>by Sayv Ilahsiav</div>
          </div>
        </div>

        {NAV.map(({id,icon:Icon,label})=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:8,border:'none',cursor:'pointer',marginBottom:2,
              background:tab===id?'#f0fdfa':'transparent',color:tab===id?'#0f766e':'#6b7280',
              fontWeight:tab===id?700:400,fontSize:13,transition:'all 0.15s',textAlign:'left',width:'100%'}}>
            <Icon size={16} style={{color:tab===id?'#0d9488':'#9ca3af',flexShrink:0}}/>
            {label}
          </button>
        ))}

        <div style={{marginTop:'auto',padding:'12px 8px 0',borderTop:'1px solid #f5f5f5'}}>
          <div style={{fontSize:10,color:'#d1d5db',textAlign:'center',lineHeight:1.5}}>MiseMap · Data shared via Supabase</div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{flex:1,padding:'32px 36px',maxWidth:1120,overflowX:'hidden'}}>
        {tab==='dashboard'     && <Dashboard rms={rms} ints={ints} mis={mis} pc={pc}/>}
        {tab==='raw'           && <RMPage    rms={rms} setRms={setRms}/>}
        {tab==='intermediates' && <IntPage   ints={ints} setInts={setInts} rms={rms}/>}
        {tab==='menu'          && <MIPage    mis={mis} setMis={setMis} rms={rms} ints={ints} pc={pc}/>}
        {tab==='settings'      && <SettingsPage pc={pc} setPc={setPc} mis={mis}/>}
      </div>
    </div>
  )
}