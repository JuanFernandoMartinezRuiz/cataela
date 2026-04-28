import { ensureSupabaseConfigured, supabase } from '../lib/supabaseClient'

export async function fetchCategories() {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, created_at')
    .order('name')

  if (error) {
    throw error
  }

  return data ?? []
}
