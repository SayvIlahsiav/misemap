import { Sparkles, X, Check } from 'lucide-react'
import { Btn } from './UIPrimitives.jsx'

export const AiPanel = ({suggestions, onApply, onDismiss}) => {
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
