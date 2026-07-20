import { useState } from 'react'
import { Upload, Download, Check, AlertTriangle } from 'lucide-react'
import { Modal, Btn, Bdg } from '../UIPrimitives.jsx'
import { FOOD_TYPES, FT_COLOR_MAP } from '../../constants.js'
import { uid, fc } from '../../utils.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { useUI } from '../../context/UIContext.jsx'

export const BatchImportModal = ({rms, onSave, onClose}) => {
  const { showToast } = useUI()
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
        showToast('Failed to parse CSV: ' + err.message, 'error')
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
      const cleanItem = { ...item }
      delete cleanItem.warnings
      delete cleanItem.isDuplicate
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
      <p style={{fontSize:13,color:'var(--text-light)',marginBottom:16,lineHeight:1.5}}>
        Import multiple ingredients at once using a CSV file. Duplicate ingredient names will overwrite existing ones.
      </p>

      <div style={{display:'flex',gap:12,marginBottom:20,flexDirection: isMobile ? 'column' : 'row'}}>
        <Btn ch={<><Download size={14}/>Download Template</>} v="secondary" onClick={downloadTemplate} style={{flex: isMobile ? 1 : 'none'}}/>
        <div style={{position:'relative',flex: 1}}>
          <input type="file" accept=".csv" id="csv-file-input" onChange={handleFileChange} style={{display:'none'}} />
          <label htmlFor="csv-file-input" style={{
            display:'inline-flex',alignItems:'center',gap:6,padding: isMobile ? '8px 16px' : '8px 16px',borderRadius:8,fontSize:13,
            fontWeight:600,cursor:'pointer',background:'var(--bg-card)',color:'var(--text-primary)',border:'1px solid var(--border-strong)',boxSizing:'border-box',width: '100%',justifyContent:'center'
          }}>
            <Upload size={14}/> {fileName ? 'Change File' : 'Select CSV File'}
          </label>
        </div>
      </div>

      {fileName && <div style={{fontSize:12,color:'var(--text-primary)',marginBottom:12}}>Selected: <strong>{fileName}</strong></div>}

      {parsed.length > 0 ? (
        <div>
          <h4 style={{fontSize:12,fontWeight:700,marginBottom:8,color:'var(--text-primary)'}}>Preview (Ready to import {parsed.length} items)</h4>
          <div style={{border:'1px solid var(--border-color)',borderRadius:12,overflowX:'auto',maxHeight:240,marginBottom:20}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth: 700}}>
              <thead>
                <tr style={{background:'var(--bg-hover)',borderBottom:'1px solid var(--border-color)'}}>
                  {['Name','Category','Food Type','Pack Cost','Conversion','Status'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:600,color:'var(--text-light)',fontSize:11}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.map((item, idx)=>(
                  <tr key={idx} style={{borderBottom:'1px solid var(--border-color)'}}>
                    <td style={{padding:'8px 12px',fontWeight:700,color:'var(--text-primary)'}}>{item.name}</td>
                    <td style={{padding:'8px 12px',color:'var(--text-secondary)'}}>{item.category}</td>
                    <td style={{padding:'8px 12px'}}><Bdg ch={item.food_type} c={FT_COLOR_MAP[item.food_type]||'gray'}/></td>
                    <td style={{padding:'8px 12px',color:'var(--text-primary)'}}>{fc(item.pack_cost)}</td>
                    <td style={{padding:'8px 12px',color:'var(--text-secondary)'}}>{item.conversion}</td>
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

          <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:16,borderTop:'1px solid var(--border-color)'}}>
            <Btn ch="Cancel" v="secondary" onClick={onClose}/>
            <Btn ch={`Import ${parsed.length} Ingredients`} v="primary" onClick={handleImport}/>
          </div>
        </div>
      ) : fileName && (
        <div style={{textAlign:'center',padding:24,color:'var(--text-light)',fontSize:13}}>No valid rows found in the selected CSV.</div>
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
