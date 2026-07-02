import { NF } from './constants.js'

// Formatters and helpers
export const fc  = n => `₹${(+n||0).toFixed(2)}`
export const fp  = n => `${(+n||0).toFixed(1)}%`
export const uid = () => `id${Date.now()}${Math.random().toString(36).slice(2,7)}`
export const cx  = (...a) => a.filter(Boolean).join(' ')

// Cost calculations
export const rmUC = rm => {
  if (!rm) return 0
  const buc = (rm.pack_cost||0) / (rm.pack_qty||1)
  if (!rm.conversion || rm.usage_unit === rm.buy_unit) return buc
  return buc / (rm.conversion||1)
}

export const ingCost = (ing, rms, ints) => {
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

export const intUC = (it, rms, ints) => {
  const tc = (it?.ingredients||[]).reduce((s,i) => s + ingCost(i, rms, ints), 0)
  return tc / (it?.yield_qty||1)
}

export const miFC = (mi, rms, ints) =>
  (mi?.ingredients||[]).reduce((s,i) => s + ingCost(i, rms, ints), 0)

export const ingNut = (ing, rms, ints) => {
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

export const intNut = (it, rms, ints) => {
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

export const miNut = (mi, rms, ints) =>
  (mi?.ingredients||[]).reduce((a,i) => {
    const n = ingNut(i, rms, ints)
    NF.forEach(f => { a[f.k] = (a[f.k]||0) + (n[f.k]||0) })
    return a
  }, Object.fromEntries(NF.map(f => [f.k, 0])))

export const effVal = (field, itemId, cat, pc) => {
  if (pc.item_overrides?.[itemId]?.[field] != null)
    return { v: pc.item_overrides[itemId][field], src: 'item' }
  if (cat && pc.category_overrides?.[cat]?.[field] != null)
    return { v: pc.category_overrides[cat][field], src: 'category' }
  return { v: pc.global[field], src: 'global' }
}

export const calcPricing = (mi, rms, ints, pc) => {
  const food = miFC(mi, rms, ints)
  const spm  = mi?.sp_multiplier_override ?? effVal('sp_multiplier', mi?.id, mi?.category, pc).v
  const pkg  = mi?.packaging_cost_override ?? effVal('packaging_cost', mi?.id, mi?.category, pc).v
  const dm   = mi?.delivery_markup_override ?? effVal('delivery_markup', mi?.id, mi?.category, pc).v
  const sp   = mi?.selling_price_override ?? (food * spm)
  const dp   = (sp + pkg) * (1 + dm/100)
  const pct  = sp > 0 ? (food/sp)*100 : 0
  return { food, sp, pkg, dm, dp, pct, spm }
}
