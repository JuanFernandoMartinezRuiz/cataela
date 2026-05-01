export function formatDate(date) {
  if (!date) {
    return ''
  }

  const normalizedDate = String(date).split('T')[0]
  const [year, month, day] = normalizedDate.split('-')

  if (!year || !month || !day) {
    return String(date)
  }

  return `${day}/${month}/${year}`
}

export function getDateValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
