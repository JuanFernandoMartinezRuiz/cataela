const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})
export { formatDate } from './date'

export function formatCurrency(value) {
  const numberValue = Number(value || 0)
  return currencyFormatter.format(Number.isNaN(numberValue) ? 0 : numberValue)
}

export function truncateText(text = '', maxLength = 110) {
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trim()}...`
}

export function buildWhatsAppProductLink(product) {
  const message = `Hola Cataela, quiero informacion sobre ${product.name}.`
  return `https://wa.me/573053211112?text=${encodeURIComponent(message)}`
}

export function buildWhatsAppRaffleLink(raffleTitle) {
  const message = `Hola Cataela, quiero apartar un numero para la rifa ${raffleTitle}.`
  return `https://wa.me/573053211112?text=${encodeURIComponent(message)}`
}
