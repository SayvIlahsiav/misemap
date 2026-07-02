export const FOOD_TYPES = ['Vegetarian','Non-Vegetarian','Vegan','Jain','Eggetarian']

export const UNITS = ['g','kg','ml','L','pcs','dozen','tbsp','tsp','cup','oz','lb','slice','bunch','bottle','can','packet','portion','serving','sheet','clove','sprig']

export const NF = [
  {k:'calories',l:'Calories',u:'kcal'},
  {k:'carbs',l:'Carbs',u:'g'},
  {k:'protein',l:'Protein',u:'g'},
  {k:'fats',l:'Fats',u:'g'},
  {k:'fiber',l:'Fiber',u:'g'},
  {k:'sugar',l:'Sugar',u:'g'},
  {k:'caffeine',l:'Caffeine',u:'mg'},
]

export const SK = { rm:'mm_rm', int:'mm_int', mi:'mm_mi', pc:'mm_pc' }

export const FT_COLOR_MAP = {
  Vegetarian:'green','Non-Vegetarian':'red',
  Vegan:'teal',Jain:'orange',Eggetarian:'yellow',
}

export const DEFAULT_PC = {
  global:{ sp_multiplier:3, delivery_markup:15, packaging_cost:20, fc_alert_threshold:35, delivery_commission:25 },
  category_overrides:{}, item_overrides:{},
}
