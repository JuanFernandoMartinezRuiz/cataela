import { ensureSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { slugify } from '../utils/slugify'

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

export async function createCategory({ name }) {
  ensureSupabaseConfigured()

  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('El nombre de la categoria es obligatorio.')
  }

  const payload = {
    name: trimmedName,
    slug: slugify(trimmedName),
  }

  // Supabase insert for admin-managed product categories.
  const { data, error } = await supabase
    .from('categories')
    .insert(payload)
    .select('id, name, slug, created_at')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateCategory(id, { name }) {
  ensureSupabaseConfigured()

  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('El nombre de la categoria es obligatorio.')
  }

  const payload = {
    name: trimmedName,
    slug: slugify(trimmedName),
  }

  // Supabase update for category name and auto-generated slug.
  const { data, error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', id)
    .select('id, name, slug, created_at')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteCategory(id) {
  ensureSupabaseConfigured()

  const { error } = await supabase.from('categories').delete().eq('id', id)

  if (error) {
    throw error
  }
}
