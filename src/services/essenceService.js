import { ensureSupabaseConfigured, supabase } from '../lib/supabaseClient'

const essenceFields = `
  id,
  name,
  description,
  is_available,
  notes,
  created_at
`

function normalizeEssenceError(error) {
  if (!error) {
    return new Error('Ocurrio un error inesperado al cargar esencias.')
  }

  return error
}

function sortEssences(list) {
  return [...(list ?? [])].sort((left, right) =>
    left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }),
  )
}

export async function fetchAdminEssences() {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('essences')
    .select(essenceFields)
    .order('name')

  if (error) {
    throw normalizeEssenceError(error)
  }

  return sortEssences(data)
}

export async function fetchAvailableEssences() {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('essences')
    .select(essenceFields)
    .eq('is_available', true)
    .order('name')

  if (error) {
    throw normalizeEssenceError(error)
  }

  return sortEssences(data)
}

export async function createEssence(payload) {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('essences')
    .insert({
      name: String(payload.name || '').trim(),
      description: String(payload.description || '').trim() || null,
      is_available: Boolean(payload.is_available),
      notes: String(payload.notes || '').trim() || null,
    })
    .select(essenceFields)
    .single()

  if (error) {
    throw normalizeEssenceError(error)
  }

  return data
}

export async function updateEssence(id, payload) {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('essences')
    .update({
      name: String(payload.name || '').trim(),
      description: String(payload.description || '').trim() || null,
      is_available: Boolean(payload.is_available),
      notes: String(payload.notes || '').trim() || null,
    })
    .eq('id', id)
    .select(essenceFields)
    .single()

  if (error) {
    throw normalizeEssenceError(error)
  }

  return data
}

export async function deleteEssence(id) {
  ensureSupabaseConfigured()

  const { error } = await supabase.from('essences').delete().eq('id', id)

  if (error) {
    throw normalizeEssenceError(error)
  }
}
