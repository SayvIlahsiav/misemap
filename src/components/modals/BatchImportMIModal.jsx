import { useState } from 'react'
import { Upload, Download, Check, AlertTriangle } from 'lucide-react'
import { Modal, Btn, Bdg } from '../UIPrimitives.jsx'
import { FOOD_TYPES, FT_COLOR_MAP } from '../../constants.js'
import { uid } from '../../utils.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { useUI } from '../../context/UIContext.jsx'

export const BatchImportMIModal = ({rms, ints, mis, onSave, onClose}) => {
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
        showToast('Failed to parse CSV: ' + err.message, 'error')
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
      const cleanItem = { ...item }
      delete cleanItem.warnings
      delete cleanItem.isDuplicate
      
      const cleanIngredients = cleanItem.ingredients
        .filter(ing => ing.id)
        .map(ing => {
          const copy = { ...ing }
          delete copy.name
          return copy
        })
        
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
      <p style={{fontSize:13,color:'var(--text-light)',marginBottom:16,lineHeight:1.5}}>
        Import multiple menu items. Group rows with the same <strong>item_name</strong> to define a single menu item with multiple ingredients.
      </p>

      <div style={{display:'flex',gap:12,marginBottom:20,flexDirection: isMobile ? 'column' : 'row'}}>
        <Btn ch={<><Download size={14}/>Download Template</>} v="secondary" onClick={downloadTemplate} style={{flex: isMobile ? 1 : 'none'}}/>
        <div style={{position:'relative',flex: 1}}>
          <input type="file" accept=".csv" id="csv-file-input-mi" onChange={handleFileChange} style={{display:'none'}} />
          <label htmlFor="csv-file-input-mi" style={{
            display:'inline-flex',alignItems:'center',gap:6,padding: '8px 16px',borderRadius:8,fontSize:13,
            fontWeight:600,cursor:'pointer',background:'var(--bg-card)',color:'var(--text-primary)',border:'1px solid var(--border-strong)',boxSizing:'border-box',width: '100%',justifyContent:'center'
          }}>
            <Upload size={14}/> {fileName ? 'Change File' : 'Select CSV File'}
          </label>
        </div>
      </div>

      {fileName && <div style={{fontSize:12,color:'var(--text-primary)',marginBottom:12}}>Selected: <strong>{fileName}</strong></div>}

      {parsed.length > 0 ? (
        <div>
          <h4 style={{fontSize:12,fontWeight:700,marginBottom:8,color:'var(--text-primary)'}}>Preview (Ready to import {importableCount} of {parsed.length} menu items)</h4>
          <div style={{border:'1px solid var(--border-color)',borderRadius:12,overflowX:'auto',maxHeight:240,marginBottom:20}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth: 700}}>
              <thead>
                <tr style={{background:'var(--bg-hover)',borderBottom:'1px solid var(--border-color)'}}>
                  {['Item Name','Category','Sub-Category','Type','Ingredients','Status'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:600,color:'var(--text-light)',fontSize:11}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.map((item, idx)=>(
                  <tr key={idx} style={{borderBottom:'1px solid var(--border-color)'}}>
                    <td style={{padding:'8px 12px',fontWeight:700,color:'var(--text-primary)'}}>{item.name}</td>
                    <td style={{padding:'8px 12px',color:'var(--text-secondary)'}}>{item.category}</td>
                    <td style={{padding:'8px 12px',color:'var(--text-secondary)'}}>{item.sub_category || '—'}</td>
                    <td style={{padding:'8px 12px'}}><Bdg ch={item.food_type} c={FT_COLOR_MAP[item.food_type]||'gray'}/></td>
                    <td style={{padding:'8px 12px',color:'var(--text-secondary)'}}>
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

          <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:16,borderTop:'1px solid var(--border-color)'}}>
            <Btn ch="Cancel" v="secondary" onClick={onClose}/>
            <Btn ch={`Import ${importableCount} Menu Items`} v="primary" onClick={handleImport} disabled={importableCount === 0}/>
          </div>
        </div>
      ) : fileName && (
        <div style={{textAlign:'center',padding:24,color:'var(--text-light)',fontSize:13}}>No valid menu items found in the selected CSV.</div>
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
