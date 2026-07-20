import { describe, it, expect } from 'vitest'
import { rmUC, ingCost, intUC, miFC, calcPricing } from '../utils.js'

describe('MiseMap Costing Calculations', () => {
  const mockRms = [
    {
      id: 'rm-rice',
      name: 'Basmati Rice',
      buy_unit: 'kg',
      usage_unit: 'g',
      pack_cost: 100,
      pack_qty: 1,
      conversion: 1000
    },
    {
      id: 'rm-oil',
      name: 'Olive Oil',
      buy_unit: 'L',
      usage_unit: 'ml',
      pack_cost: 500,
      pack_qty: 1,
      conversion: 1000
    }
  ]

  const mockInts = [
    {
      id: 'int-cooked-rice',
      name: 'Cooked Rice',
      yield_qty: 2000,
      yield_unit: 'g',
      ingredients: [
        { id: 'rm-rice', type: 'raw', qty: 1000, unit: 'g' },
        { id: 'rm-oil', type: 'raw', qty: 20, unit: 'ml' }
      ]
    }
  ]

  const mockPc = {
    global: {
      sp_multiplier: 3.0,
      packaging_cost: 15,
      delivery_markup: 10,
      fc_alert_threshold: 35
    },
    item_overrides: {},
    category_overrides: {}
  }

  it('calculates raw material unit cost correctly', () => {
    // 100 Rs per 1kg, conversion is 1000g per kg
    // Unit cost per g should be 100 / 1000 = 0.1 Rs/g
    const rice = mockRms[0]
    expect(rmUC(rice)).toBe(0.1)

    // 500 Rs per 1L, conversion is 1000ml per L
    // Unit cost per ml should be 500 / 1000 = 0.5 Rs/ml
    const oil = mockRms[1]
    expect(rmUC(oil)).toBe(0.5)
  })

  it('calculates simple ingredient costs', () => {
    const ing1 = { id: 'rm-rice', type: 'raw', qty: 200 }
    // 200g * 0.1 Rs/g = 20 Rs
    expect(ingCost(ing1, mockRms, [])).toBe(20)

    const ing2 = { id: 'rm-oil', type: 'raw', qty: 10 }
    // 10ml * 0.5 Rs/ml = 5 Rs
    expect(ingCost(ing2, mockRms, [])).toBe(5)
  })

  it('calculates intermediate recipe unit costs', () => {
    // Recipe cost: 1000g rice (100 Rs) + 20ml oil (10 Rs) = 110 Rs
    // Yield: 2000g
    // Unit cost per g: 110 / 2000 = 0.055 Rs/g
    const cookedRice = mockInts[0]
    expect(intUC(cookedRice, mockRms, mockInts)).toBe(0.055)
  })

  it('calculates menu item total food cost with nested intermediate recipes', () => {
    const menuItem = {
      id: 'mi-biryani',
      name: 'Veg Biryani',
      category: 'Mains',
      ingredients: [
        { id: 'int-cooked-rice', type: 'intermediate', qty: 400 }, // 400g * 0.055 Rs/g = 22 Rs
        { id: 'rm-oil', type: 'raw', qty: 10 } // 10ml * 0.5 Rs/ml = 5 Rs
      ]
    }
    // Total cost: 22 + 5 = 27 Rs
    expect(miFC(menuItem, mockRms, mockInts)).toBe(27)
  })

  it('calculates suggested and overrides selling pricing correctly', () => {
    const menuItem = {
      id: 'mi-biryani',
      name: 'Veg Biryani',
      category: 'Mains',
      ingredients: [
        { id: 'int-cooked-rice', type: 'intermediate', qty: 400 }, // 22 Rs
        { id: 'rm-oil', type: 'raw', qty: 10 } // 5 Rs
      ]
    }
    // food cost = 27
    // sp_multiplier = 3.0
    // packaging_cost = 15
    // delivery_markup = 10%
    // suggested sp = round((27 * 3) / 5) * 5 = round(81 / 5) * 5 = 80 Rs
    const pricing = calcPricing(menuItem, mockRms, mockInts, mockPc)
    expect(pricing.food).toBe(27)
    expect(pricing.sugg_sp).toBe(80)
    expect(pricing.sp).toBe(80)
    expect(pricing.pct).toBeCloseTo(33.75) // 27 / 80 = 33.75%
  })
})
