import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[MiseMap] Missing Supabase env vars.\n' +
    'Copy .env.example → .env and fill in your project credentials.\n' +
    'See README.md for setup instructions.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Key-value storage API (mirrors Claude artifact window.storage) ────────
export const storage = {
  async get(key) {
    const { data, error } = await supabase
      .from('kv_store')
      .select('value')
      .eq('key', key)
      .maybeSingle()
    if (error) throw error
    return data ? data.value : null
  },

  async set(key, value) {
    const { error } = await supabase
      .from('kv_store')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) throw error
  },

  async delete(key) {
    const { error } = await supabase.from('kv_store').delete().eq('key', key)
    if (error) throw error
  },
}

// ─── SQL to run once in Supabase SQL Editor ───────────────────────────────
// Paste this into: Supabase Dashboard → SQL Editor → New Query → Run
//
// create table if not exists kv_store (
//   key        text        primary key,
//   value      text        not null,
//   updated_at timestamptz default now()
// );
//
// -- Allow read/write from browser (anon key)
// alter table kv_store enable row level security;
//
// create policy "Public read"  on kv_store for select using (true);
// create policy "Public write" on kv_store for insert with check (true);
// create policy "Public update" on kv_store for update using (true);
// create policy "Public delete" on kv_store for delete using (true);
