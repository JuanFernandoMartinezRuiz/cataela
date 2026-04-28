import {
  ensureSupabaseConfigured,
  supabase,
  supabaseBuckets,
} from '../lib/supabaseClient'

function sanitizeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9.-]+/g, '-')
}

function getPublicUrl(path) {
  return supabase.storage.from(supabaseBuckets.productImages).getPublicUrl(path)
    .data.publicUrl
}

function getStoragePathFromPublicUrl(publicUrl) {
  if (!publicUrl) {
    return null
  }

  const marker = `/storage/v1/object/public/${supabaseBuckets.productImages}/`
  const markerIndex = publicUrl.indexOf(marker)

  if (markerIndex === -1) {
    return null
  }

  return decodeURIComponent(publicUrl.slice(markerIndex + marker.length))
}

export async function uploadMainProductImage(productId, file) {
  ensureSupabaseConfigured()

  const filePath = `products/${productId}/main-${Date.now()}-${sanitizeFileName(file.name)}`

  // Supabase Storage upload for the main product image.
  const { error } = await supabase.storage
    .from(supabaseBuckets.productImages)
    .upload(filePath, file, { upsert: true })

  if (error) {
    throw error
  }

  return getPublicUrl(filePath)
}

export async function uploadGalleryImages(productId, files, initialOrder = 0) {
  ensureSupabaseConfigured()

  const uploadedRows = []

  for (const [index, file] of files.entries()) {
    const filePath = `products/${productId}/gallery-${Date.now()}-${index}-${sanitizeFileName(file.name)}`

    // Supabase Storage upload for gallery images.
    const { error: uploadError } = await supabase.storage
      .from(supabaseBuckets.productImages)
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      throw uploadError
    }

    uploadedRows.push({
      product_id: productId,
      image_url: getPublicUrl(filePath),
      sort_order: initialOrder + index,
    })
  }

  if (!uploadedRows.length) {
    return []
  }

  // Supabase insert for extra gallery image rows.
  const { data, error } = await supabase
    .from('product_images')
    .insert(uploadedRows)
    .select('*')

  if (error) {
    throw error
  }

  return data ?? []
}

export async function deleteStoredAsset(publicUrl) {
  ensureSupabaseConfigured()

  const storagePath = getStoragePathFromPublicUrl(publicUrl)
  if (!storagePath) {
    return
  }

  const { error } = await supabase.storage
    .from(supabaseBuckets.productImages)
    .remove([storagePath])

  if (error) {
    throw error
  }
}

export async function deleteProductImage(image) {
  ensureSupabaseConfigured()

  if (image?.image_url) {
    await deleteStoredAsset(image.image_url)
  }

  const { error } = await supabase.from('product_images').delete().eq('id', image.id)

  if (error) {
    throw error
  }
}

export async function deleteProductAssets(product) {
  ensureSupabaseConfigured()

  if (product.main_image_url) {
    await deleteStoredAsset(product.main_image_url)
  }

  for (const image of product.gallery ?? []) {
    if (image.image_url) {
      await deleteStoredAsset(image.image_url)
    }
  }
}
