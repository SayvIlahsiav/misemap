import { X } from 'lucide-react'
import { fp } from '../utils.js'

// ─────────────────────────────────────────────────────────
// UI PRIMITIVES
// ─────────────────────────────────────────────────────────
export const Modal = ({ title, onClose, children, wide=false }) => (
  <div style={{
    position:'fixed',
    inset:0,
    zIndex:150,
    overflowY:'auto',
    background:'rgba(0,0,0,0.5)',
    display:'flex',
    alignItems:'flex-start',
    justifyContent:'center',
    padding:'1.5rem 1rem',
    backdropFilter:'blur(4px)',
    animation: 'backdropFadeIn 0.2s ease-out'
  }}>
    <div style={{
      background:'var(--bg-card)',
      border:'1px solid var(--border-color)',
      borderRadius:20,
      width:'100%',
      maxWidth:wide?920:560,
      boxShadow:'var(--shadow-xl)',
      marginTop:24,
      marginBottom:24,
      animation: 'modalZoomIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
    }}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 24px',borderBottom:'1px solid var(--border-color)'}}>
        <span style={{fontWeight:700,fontSize:15,color:'var(--text-primary)'}}>{title}</span>
        <button onClick={onClose} style={{padding:6,borderRadius:8,border:'none',background:'none',cursor:'pointer',color:'var(--text-light)',display:'flex',transition:'color 0.15s'}}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-light)'}>
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
    primary:{background:'var(--primary)',color:'#fff',border:'none',boxShadow:'var(--shadow-sm)'},
    secondary:{background:'var(--bg-card)',color:'var(--text-secondary)',border:'1px solid var(--border-strong)'},
    danger:{background:'#ef4444',color:'#fff',border:'none'},
    ghost:{background:'transparent',color:'var(--text-muted)',border:'none'},
    ai:{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'#fff',border:'none'},
  }
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        ...sizes[sz],
        ...vars[v],
        borderRadius:8,
        fontWeight:600,
        cursor:disabled?'not-allowed':'pointer',
        opacity:disabled?0.45:1,
        display:'inline-flex',
        alignItems:'center',
        justifyContent:'center',
        gap:6,
        transition:'all 0.15s ease',
        whiteSpace:'nowrap',
        ...style
      }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.opacity = '0.9'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={e => {
        if (!disabled) {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.transform = 'none'
        }
      }}>
      {ch}
    </button>
  )
}

export const Label = ({children}) => (
  <div style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{children}</div>
)

export const Inp = ({label, v, onChange, type='text', ph, req, unit, min, step, readOnly, style={}}) => (
  <div style={{display:'flex',flexDirection:'column',gap:4,...style}}>
    {label && <Label>{label}{req&&<span style={{color:'#ef4444',marginLeft:2}}>*</span>}</Label>}
    <div style={{position:'relative'}}>
      <input type={type} value={v} onChange={e=>onChange(e.target.value)} placeholder={ph}
        min={min} step={step} readOnly={readOnly}
        className="custom-input"
        style={{
          width:'100%',
          boxSizing:'border-box',
          border:'1px solid var(--border-strong)',
          borderRadius:8,
          padding:unit?'8px 36px 8px 10px':'8px 10px',
          fontSize:13,
          color:'var(--text-primary)',
          background:readOnly?'var(--bg-hover)':'var(--bg-card)',
          outline:'none',
          transition: 'all 0.15s ease'
        }}/>
      {unit&&<span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'var(--text-light)'}}>{unit}</span>}
    </div>
  </div>
)

export const Sel = ({label, v, onChange, opts, ph, req, style={}}) => (
  <div style={{display:'flex',flexDirection:'column',gap:4,...style}}>
    {label&&<Label>{label}{req&&<span style={{color:'#ef4444',marginLeft:2}}>*</span>}</Label>}
    <select value={v} onChange={e=>onChange(e.target.value)}
      className="custom-input"
      style={{
        border:'1px solid var(--border-strong)',
        borderRadius:8,
        padding:'8px 10px',
        fontSize:13,
        color:'var(--text-primary)',
        background:'var(--bg-card)',
        outline:'none',
        cursor:'pointer',
        transition: 'all 0.15s ease'
      }}>
      {ph&&<option value="">{ph}</option>}
      {opts.map(o=><option key={o.v??o} value={o.v??o}>{o.l??o}</option>)}
    </select>
  </div>
)

const BADGE_STYLES = {
  gray:{background:'var(--bg-hover)',color:'var(--text-secondary)',border:'1px solid var(--border-color)'},
  green:{background:'rgba(16,185,129,0.12)',color:'#10b981',border:'1px solid rgba(16,185,129,0.2)'},
  red:{background:'rgba(239,68,68,0.12)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.2)'},
  teal:{background:'rgba(20,184,166,0.12)',color:'#14b8a6',border:'1px solid rgba(20,184,166,0.2)'},
  orange:{background:'rgba(249,115,22,0.12)',color:'#f97316',border:'1px solid rgba(249,115,22,0.2)'},
  yellow:{background:'rgba(234,179,8,0.12)',color:'#eab308',border:'1px solid rgba(234,179,8,0.2)'},
  blue:{background:'rgba(59,130,246,0.12)',color:'#3b82f6',border:'1px solid rgba(59,130,246,0.2)'},
  amber:{background:'rgba(245,158,11,0.12)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.2)'},
  purple:{background:'rgba(139,92,246,0.12)',color:'#8b5cf6',border:'1px solid rgba(139,92,246,0.2)'},
}

export const Bdg = ({ch, c='gray'}) => (
  <span style={{
    ...BADGE_STYLES[c]||BADGE_STYLES.gray,
    padding:'2px 8px',
    borderRadius:999,
    fontSize:11,
    fontWeight:600,
    whiteSpace:'nowrap',
    display:'inline-block'
  }}>{ch}</span>
)

export const FCBadge = ({pct, threshold}) => {
  const c = pct>threshold?'red':pct>threshold*0.85?'orange':'green'
  return <Bdg ch={fp(pct)} c={c}/>
}

export const SrcPill = ({src}) => {
  if (src==='item')     return <span style={{fontSize:11,fontWeight:600,color:'#8b5cf6',background:'rgba(139,92,246,0.12)',border:'1px solid rgba(139,92,246,0.2)',padding:'1px 6px',borderRadius:999}}>item override</span>
  if (src==='category') return <span style={{fontSize:11,fontWeight:600,color:'#3b82f6',background:'rgba(59,130,246,0.12)',border:'1px solid rgba(59,130,246,0.2)',padding:'1px 6px',borderRadius:999}}>category override</span>
  return <span style={{fontSize:11,color:'var(--text-light)',border:'1px solid var(--border-color)',padding:'1px 6px',borderRadius:999}}>global default</span>
}

export const InfoBox = ({children, color='amber'}) => {
  const clr = {
    amber:{bg:'rgba(245,158,11,0.06)',border:'rgba(245,158,11,0.25)',text:'#f59e0b'},
    green:{bg:'rgba(16,185,129,0.06)',border:'rgba(16,185,129,0.25)',text:'#10b981'},
    red:{bg:'rgba(239,68,68,0.06)',border:'rgba(239,68,68,0.25)',text:'#ef4444'},
    blue:{bg:'rgba(59,130,246,0.06)',border:'rgba(59,130,246,0.25)',text:'#3b82f6'},
    gray:{bg:'rgba(148,163,184,0.06)',border:'rgba(148,163,184,0.25)',text:'var(--text-secondary)'}
  }
  const s = clr[color]||clr.amber
  return <div style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:10,padding:'8px 12px',fontSize:12,color:s.text,lineHeight:1.5}}>{children}</div>
}

export const SecTitle = ({children}) => (
  <div style={{fontSize:11,fontWeight:700,color:'var(--text-light)',textTransform:'uppercase',letterSpacing:'0.06em',margin:'18px 0 10px'}}>{children}</div>
)
