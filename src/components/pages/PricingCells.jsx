import React from 'react'
import { fc } from '../../utils.js'

export const PricingCells = ({ m }) => {
  return (
    <>
      <td style={{padding:'10px 14px',fontWeight:800,color:'var(--text-primary)'}}>{fc(m.food)}</td>
      <td style={{padding:'10px 14px',fontWeight:800,color:'var(--primary)'}}>{fc(m.sp)}</td>
      <td style={{padding:'10px 14px',fontWeight:500,color:'var(--text-muted)'}}>{fc(m.tp)}</td>
      <td style={{padding:'10px 14px',fontWeight:500,color:'var(--text-muted)'}}>{fc(m.dp)}</td>
    </>
  )
}
