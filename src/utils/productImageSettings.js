export const defaultProductImageSettings = {
  image_position_x: 50,
  image_position_y: 50,
  image_zoom: 1,
}

export function normalizeProductImageSettings(product = {}) {
  return {
    image_position_x: normalizePercentage(
      product.image_position_x,
      defaultProductImageSettings.image_position_x,
    ),
    image_position_y: normalizePercentage(
      product.image_position_y,
      defaultProductImageSettings.image_position_y,
    ),
    image_zoom: normalizeZoom(product.image_zoom, defaultProductImageSettings.image_zoom),
  }
}

export function buildProductImageStyle(product = {}) {
  const settings = normalizeProductImageSettings(product)

  return {
    objectPosition: `${settings.image_position_x}% ${settings.image_position_y}%`,
    transform: `scale(${settings.image_zoom})`,
    transformOrigin: `${settings.image_position_x}% ${settings.image_position_y}%`,
  }
}

function normalizePercentage(value, fallback) {
  const numericValue = Number(value)

  if (Number.isNaN(numericValue)) {
    return fallback
  }

  return Math.min(100, Math.max(0, numericValue))
}

function normalizeZoom(value, fallback) {
  const numericValue = Number(value)

  if (Number.isNaN(numericValue)) {
    return fallback
  }

  return Math.min(2.5, Math.max(1, numericValue))
}
