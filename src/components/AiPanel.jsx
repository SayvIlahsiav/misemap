import { Sparkles, X, Check } from 'lucide-react'
import { Btn } from './UIPrimitives.jsx'

export const AiPanel = ({suggestions, onApply, onDismiss}) => {
  if (!suggestions) return null
  return (
    <div style={{
      gridColumn:'1/-1',
      border:'1px solid var(--primary)',
      background:'var(--bg-active-tab)',
      borderRadius:12,
      padding:14,
      boxShadow: 'var(--card-glow)'
    }}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,color:'var(--primary)'}}>
          <Sparkles size={13}/> AI Suggestions — review and apply
        </div>
        <button onClick={onDismiss} style={{border:'none',background:'none',cursor:'pointer',color:'var(--primary)',display:'flex',opacity:0.7,transition:'opacity 0.15s'}}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.7}>
          <X size={13}/>
        </button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'6px 16px',marginBottom:12}}>
        {Object.entries(suggestions).map(([k,vl])=>(
          <div key={k} style={{display:'flex',gap:4,fontSize:12}}>
            <span style={{color:'var(--text-light)',textTransform:'capitalize',flexShrink:0}}>{k.replace(/_/g,' ')}:</span>
            <span style={{fontWeight:600,color:'var(--text-primary)'}}>{String(vl)}</span>
          </div>
        ))}
      </div>
      <Btn ch={<><Check size={12}/>Apply All</>} v='primary' sz='sm' onClick={onApply}/>
    </div>
  )
}
