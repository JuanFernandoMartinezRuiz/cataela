import {
  ensureSupabaseConfigured,
  supabase,
  supabaseBuckets,
} from '../lib/supabaseClient'
import { slugify } from '../utils/slugify'

function sanitizeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9.-]+/g, '-')
}

function getPublicUrl(bucket, path) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

function getStoragePathFromPublicUrl(publicUrl, bucket) {
  if (!publicUrl) {
    return null
  }

  const marker = `/storage/v1/object/public/${bucket}/`
  const markerIndex = publicUrl.indexOf(marker)

  if (markerIndex === -1) {
    return null
  }

  return decodeURIComponent(publicUrl.slice(markerIndex + marker.length))
}

function buildMainImagePath(resourceKey, file) {
  return `products/${resourceKey}/main-${Date.now()}-${sanitizeFileName(file.name)}`
}

function buildGalleryImagePath(resourceKey, index, file) {
  return `products/${resourceKey}/gallery-${Date.now()}-${index}-${sanitizeFileName(file.name)}`
}

function buildRaffleMainImagePath(resourceKey, file) {
  return `raffles/${resourceKey}/main-${Date.now()}-${sanitizeFileName(file.name)}`
}

function buildRaffleGalleryImagePath(resourceKey, index, file) {
  return `raffles/${resourceKey}/gallery-${Date.now()}-${index}-${sanitizeFileName(file.name)}`
}

export async function uploadMainProductImageForDraft({ productName, file }) {
  ensureSupabaseConfigured()

  const resourceKey = `${slugify(productName) || 'producto'}-${Date.now()}`
  const filePath = buildMainImagePath(resourceKey, file)

  // Upload the main image before creating the product record.
  const { error } = await supabase.storage
    .from(supabaseBuckets.productImages)
    .upload(filePath, file, { upsert: true })

  if (error) {
    throw error
  }

  return {
    publicUrl: getPublicUrl(supabaseBuckets.productImages, filePath),
    storagePath: filePath,
  }
}

export async function uploadMainProductImage(productId, file) {
  ensureSupabaseConfigured()

  const filePath = buildMainImagePath(productId, file)

  // Supabase Storage upload for the main product image.
  const { error } = await supabase.storage
    .from(supabaseBuckets.productImages)
    .upload(filePath, file, { upsert: true })

  if (error) {
    throw error
  }

  return getPublicUrl(supabaseBuckets.productImages, filePath)
}

export async function uploadGalleryImages(productId, files, initialOrder = 0) {
  ensureSupabaseConfigured()

  const uploadedRows = []
  const uploadedPaths = []

  for (const [index, file] of files.entries()) {
    const filePath = buildGalleryImagePath(productId, index, file)

    // Supabase Storage upload for gallery images.
    const { error: uploadError } = await supabase.storage
      .from(supabaseBuckets.productImages)
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      if (uploadedPaths.length) {
        await deleteStoredAssetsByPath(uploadedPaths)
      }
      throw uploadError
    }

    uploadedPaths.push(filePath)

    uploadedRows.push({
      product_id: productId,
      image_url: getPublicUrl(supabaseBuckets.productImages, filePath),
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
    await deleteStoredAssetsByPath(uploadedPaths)
    throw error
  }

  return data ?? []
}

export async function uploadMainRaffleImageForDraft({ raffleTitle, file }) {
  ensureSupabaseConfigured()

  const resourceKey = `${slugify(raffleTitle) || 'rifa'}-${Date.now()}`
  const filePath = buildRaffleMainImagePath(resourceKey, file)

  const { error } = await supabase.storage
    .from(supabaseBuckets.raffleImages)
    .upload(filePath, file, { upsert: true })

  if (error) {
    throw error
  }

  return {
    publicUrl: getPublicUrl(supabaseBuckets.raffleImages, filePath),
    storagePath: filePath,
  }
}

export async function uploadMainRaffleImage(raffleId, file) {
  ensureSupabaseConfigured()

  const filePath = buildRaffleMainImagePath(raffleId, file)

  const { error } = await supabase.storage
    .from(supabaseBuckets.raffleImages)
    .upload(filePath, file, { upsert: true })

  if (error) {
    throw error
  }

  return getPublicUrl(supabaseBuckets.raffleImages, filePath)
}

export async function uploadRaffleGalleryImages(raffleId, files, initialOrder = 0) {
  ensureSupabaseConfigured()

  const uploadedRows = []
  const uploadedPaths = []

  for (const [index, file] of files.entries()) {
    const filePath = buildRaffleGalleryImagePath(raffleId, index, file)

    const { error: uploadError } = await supabase.storage
      .from(supabaseBuckets.raffleImages)
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      if (uploadedPaths.length) {
        await deleteStoredAssetsByPath(uploadedPaths, supabaseBuckets.raffleImages)
      }
      throw uploadError
    }

    uploadedPaths.push(filePath)

    uploadedRows.push({
      raffle_id: raffleId,
      image_url: getPublicUrl(supabaseBuckets.raffleImages, filePath),
      sort_order: initialOrder + index,
    })
  }

  if (!uploadedRows.length) {
    return []
  }

  const { data, error } = await supabase
    .from('raffle_images')
    .insert(uploadedRows)
    .select('*')

  if (error) {
    await deleteStoredAssetsByPath(uploadedPaths, supabaseBuckets.raffleImages)
    throw error
  }

  return data ?? []
}

export async function fetchRaffleImages(raffleId) {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('raffle_images')
    .select('*')
    .eq('raffle_id', raffleId)
    .order('sort_order')
    .order('created_at')

  if (error) {
    throw error
  }

  return data ?? []
}

export async function deleteStoredAssetByPath(
  storagePath,
  bucketName = supabaseBuckets.productImages,
) {
  ensureSupabaseConfigured()

  if (!storagePath) {
    return
  }

  const { error } = await supabase.storage
    .from(bucketName)
    .remove([storagePath])

  if (error) {
    throw error
  }
}

export async function deleteStoredAssetsByPath(
  storagePaths,
  bucketName = supabaseBuckets.productImages,
) {
  ensureSupabaseConfigured()

  const filteredPaths = storagePaths.filter(Boolean)
  if (!filteredPaths.length) {
    return
  }

  const { error } = await supabase.storage
    .from(bucketName)
    .remove(filteredPaths)

  if (error) {
    throw error
  }
}

export async function deleteStoredAsset(
  publicUrl,
  bucketName = supabaseBuckets.productImages,
) {
  ensureSupabaseConfigured()

  const storagePath = getStoragePathFromPublicUrl(publicUrl, bucketName)
  if (!storagePath) {
    return
  }

  await deleteStoredAssetByPath(storagePath, bucketName)
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
