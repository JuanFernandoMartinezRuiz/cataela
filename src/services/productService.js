import { ensureSupabaseConfigured, supabase } from '../lib/supabaseClient'

const productSelect = `
  id,
  name,
  slug,
  description,
  price,
  category_id,
  main_image_url,
  is_active,
  created_at,
  categories (
    id,
    name,
    slug
  ),
  product_images (
    id,
    product_id,
    image_url,
    sort_order,
    created_at
  )
`

function normalizeProduct(product) {
  return {
    ...product,
    category: product.categories ?? null,
    gallery: [...(product.product_images ?? [])].sort(
      (left, right) => left.sort_order - right.sort_order,
    ),
  }
}

function mapProductError(error) {
  if (error?.code === '23505' && String(error.message || '').includes('slug')) {
    return new Error('Ya existe un producto con ese nombre.')
  }

  return error
}

export async function fetchPublicProducts() {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('products')
    .select(productSelect)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw mapProductError(error)
  }

  return (data ?? []).map(normalizeProduct)
}

export async function fetchAdminProducts() {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('products')
    .select(productSelect)
    .order('created_at', { ascending: false })

  if (error) {
    throw mapProductError(error)
  }

  return (data ?? []).map(normalizeProduct)
}

export async function fetchProductBySlug(slug) {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('products')
    .select(productSelect)
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? normalizeProduct(data) : null
}

export async function fetchProductById(id) {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('products')
    .select(productSelect)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? normalizeProduct(data) : null
}

export async function createProduct(payload) {
  ensureSupabaseConfigured()

  // Supabase insert for product base data.
  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select(productSelect)
    .single()

  if (error) {
    throw error
  }

  return normalizeProduct(data)
}

export async function updateProduct(id, payload) {
  ensureSupabaseConfigured()

  // Supabase update for product base data.
  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select(productSelect)
    .single()

  if (error) {
    throw error
  }

  return normalizeProduct(data)
}

export async function deleteProduct(id) {
  ensureSupabaseConfigured()

  const { error } = await supabase.from('products').delete().eq('id', id)

  if (error) {
    throw error
  }
}
