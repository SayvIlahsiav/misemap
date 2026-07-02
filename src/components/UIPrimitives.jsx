import { X } from 'lucide-react'
import { fp } from '../utils.js'

// ─────────────────────────────────────────────────────────
// UI PRIMITIVES
// ─────────────────────────────────────────────────────────
export const Modal = ({ title, onClose, children, wide=false }) => (
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

export const Btn = ({ch, onClick, v='primary', sz='md', disabled, style={}}) => {
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

export const Label = ({children}) => (
  <div style={{fontSize:11,fontWeight:600,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{children}</div>
)

export const Inp = ({label, v, onChange, type='text', ph, req, unit, min, step, readOnly, style={}}) => (
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

export const Sel = ({label, v, onChange, opts, ph, req, style={}}) => (
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

export const Bdg = ({ch, c='gray'}) => (
  <span style={{...BADGE_STYLES[c]||BADGE_STYLES.gray,padding:'2px 8px',borderRadius:999,fontSize:11,fontWeight:500,whiteSpace:'nowrap',display:'inline-block'}}>{ch}</span>
)

export const FCBadge = ({pct, threshold}) => {
  const c = pct>threshold?'red':pct>threshold*0.85?'orange':'green'
  return <Bdg ch={fp(pct)} c={c}/>
}

export const SrcPill = ({src}) => {
  if (src==='item')     return <span style={{fontSize:11,color:'#7c3aed',background:'#ede9fe',padding:'1px 6px',borderRadius:999}}>item override</span>
  if (src==='category') return <span style={{fontSize:11,color:'#2563eb',background:'#dbeafe',padding:'1px 6px',borderRadius:999}}>category override</span>
  return <span style={{fontSize:11,color:'#9ca3af'}}>global default</span>
}

export const InfoBox = ({children, color='amber'}) => {
  const clr = {amber:{bg:'#f0fdfa',border:'#99f6e4',text:'#134e4a'},green:{bg:'#f0fdf4',border:'#bbf7d0',text:'#166534'},red:{bg:'#fef2f2',border:'#fecaca',text:'#991b1b'},blue:{bg:'#eff6ff',border:'#bfdbfe',text:'#1e40af'},gray:{bg:'#f9fafb',border:'#e5e7eb',text:'#374151'}}
  const s = clr[color]||clr.amber
  return <div style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:10,padding:'8px 12px',fontSize:12,color:s.text,lineHeight:1.5}}>{children}</div>
}

export const SecTitle = ({children}) => (
  <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',margin:'18px 0 10px'}}>{children}</div>
)
