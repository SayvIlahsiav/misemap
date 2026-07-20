import { useState } from 'react'
import { Modal, Btn } from '../UIPrimitives.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'

export const CloneVersionModal = ({ sourceId, versions, onClose, onClone }) => {
  const sourceLabel = versions.find(v => v.id === sourceId)?.label || sourceId
  const [label, setLabel] = useState('')
  const isMobile = useIsMobile()

  return (
    <Modal title={`Clone Version`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Create a new independent copy of version <strong>{sourceLabel}</strong>.
        </p>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', marginBottom: 4, display: 'block' }}>
            New Version Label
          </label>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Summer Menu 2026, Version 2.0"
            className="custom-input"
            autoFocus
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              color: 'var(--text-primary)',
              background: 'var(--bg-card)',
              outline: 'none',
              transition: 'all 0.15s ease'
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
          <Btn ch="Cancel" v="secondary" onClick={onClose} />
          <Btn ch="Clone Version" v="primary" onClick={() => onClone(label.trim())} disabled={!label.trim()} />
        </div>
      </div>
    </Modal>
  )
}
