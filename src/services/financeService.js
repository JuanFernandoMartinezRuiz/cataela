import { ensureSupabaseConfigured, supabase } from '../lib/supabaseClient'

const financeFields = `
  id,
  type,
  amount,
  paid_amount,
  remaining_amount,
  product_id,
  quantity,
  buyer_name,
  description,
  category,
  payment_method,
  transaction_date,
  status,
  created_at,
  products (
    id,
    name,
    price
  ),
  finance_payments (
    id,
    transaction_id,
    payment_method,
    amount,
    payment_date,
    note,
    created_at
  ),
  finance_transaction_items (
    id,
    transaction_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    subtotal,
    created_at,
    products (
      id,
      name,
      price
    )
  )
`

const financeCategoryFields = `
  id,
  name,
  type,
  created_at
`

function normalizeFinanceError(error) {
  if (!error) {
    return new Error('Ocurrio un error inesperado en finanzas.')
  }

  return error
}

function normalizeFinanceItems(items) {
  return [...(items ?? [])]
    .map((item) => ({
      ...item,
      product: item.products ?? null,
      product_name: item.product_name || item.products?.name || '',
      subtotal: Number(item.subtotal ?? Number(item.quantity || 0) * Number(item.unit_price || 0)),
    }))
    .sort((left, right) => {
      const leftKey = `${left.created_at}-${left.id}`
      const rightKey = `${right.created_at}-${right.id}`
      return leftKey.localeCompare(rightKey)
    })
}

function buildTransactionItemsSummary(items) {
  return (items ?? [])
    .filter((item) => item.product?.name || item.product_name)
    .map((item) => `${item.product?.name || item.product_name} x${item.quantity}`)
    .join(', ')
}

function normalizeFinanceTransaction(transaction) {
  const payments = [...(transaction.finance_payments ?? [])].sort((left, right) =>
    `${left.payment_date}-${left.created_at}`.localeCompare(
      `${right.payment_date}-${right.created_at}`,
    ),
  )
  const items = normalizeFinanceItems(transaction.finance_transaction_items)
  const methodsLabel = buildPaymentMethodsLabel(payments)

  return {
    ...transaction,
    product: transaction.products ?? null,
    items,
    itemsSummary: buildTransactionItemsSummary(items),
    payments,
    payment_method: methodsLabel || transaction.payment_method || '',
  }
}

function sanitizeFinanceItems(items) {
  return (items ?? [])
    .map((item) => ({
      product_id: item.product_id || null,
      product_name: String(item.product_name || '').trim(),
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unit_price || 0),
    }))
    .filter((item) => item.product_id && item.quantity > 0)
}

function deriveItemsSummary(items) {
  const cleanItems = sanitizeFinanceItems(items)
  const totalAmount = cleanItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
    0,
  )

  return {
    items: cleanItems,
    totalAmount,
  }
}

function sanitizeFinancePayload(payload) {
  const paymentSummary = derivePaymentSummary(payload.amount, payload.payments)
  const itemSummary = deriveItemsSummary(payload.items)
  const hasItemizedSale =
    payload.type === 'income' && payload.category === 'Ventas' && itemSummary.items.length > 0
  const primaryItem = hasItemizedSale && itemSummary.items.length === 1 ? itemSummary.items[0] : null

  return {
    amount: payload.amount,
    paid_amount: paymentSummary.paidAmount,
    product_id: primaryItem?.product_id || payload.product_id || null,
    quantity: primaryItem?.quantity || payload.quantity || null,
    buyer_name: payload.buyer_name || null,
    type: payload.type,
    description: payload.description,
    category: payload.category,
    payment_method: paymentSummary.methodsLabel,
    transaction_date: payload.transaction_date,
    status: paymentSummary.status,
  }
}

function sanitizeFinancePayments(payments) {
  return (payments ?? []).map((payment) => ({
    payment_method: String(payment.payment_method || '').trim(),
    amount: Number(payment.amount || 0),
    payment_date: payment.payment_date,
    note: String(payment.note || '').trim(),
  }))
}

function derivePaymentSummary(amount, payments) {
  const totalAmount = Number(amount || 0)
  const cleanPayments = sanitizeFinancePayments(payments).filter(
    (payment) => payment.amount > 0,
  )
  const rawPaidAmount = cleanPayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  )
  const paidAmount =
    totalAmount > 0 ? Math.min(rawPaidAmount, totalAmount) : rawPaidAmount

  let status = 'pending'
  if (paidAmount > 0 && paidAmount < totalAmount) {
    status = 'partial'
  } else if (totalAmount > 0 && paidAmount === totalAmount) {
    status = 'completed'
  }

  return {
    paidAmount,
    remainingAmount: Math.max(0, totalAmount - paidAmount),
    status,
    isOverpaid: rawPaidAmount > totalAmount,
    methodsLabel: buildPaymentMethodsLabel(cleanPayments),
    payments: cleanPayments,
  }
}

function buildPaymentMethodsLabel(payments) {
  const uniqueMethods = [...new Set(
    (payments ?? [])
      .map((payment) => String(payment.payment_method || '').trim())
      .filter(Boolean),
  )]

  return uniqueMethods.join(' + ')
}

async function fetchFinanceTransactionById(id) {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select(financeFields)
    .eq('id', id)
    .single()

  if (error) {
    throw normalizeFinanceError(error)
  }

  return normalizeFinanceTransaction(data)
}

async function replaceFinancePayments(transactionId, payments) {
  const paymentRows = sanitizeFinancePayments(payments)

  const { error: deleteError } = await supabase
    .from('finance_payments')
    .delete()
    .eq('transaction_id', transactionId)

  if (deleteError) {
    throw normalizeFinanceError(deleteError)
  }

  if (!paymentRows.length) {
    return []
  }

  const { data, error } = await supabase
    .from('finance_payments')
    .insert(
      paymentRows.map((payment) => ({
        ...payment,
        transaction_id: transactionId,
      })),
    )
    .select(
      `
        id,
        transaction_id,
        payment_method,
        amount,
        payment_date,
        note,
        created_at
      `,
    )

  if (error) {
    throw normalizeFinanceError(error)
  }

  return data ?? []
}

async function replaceFinanceItems(transactionId, items) {
  const itemRows = await resolveFinanceItemRows(items)

  const { error: deleteError } = await supabase
    .from('finance_transaction_items')
    .delete()
    .eq('transaction_id', transactionId)

  if (deleteError) {
    throw normalizeFinanceError(deleteError)
  }

  if (!itemRows.length) {
    return []
  }

  const { data, error } = await supabase
    .from('finance_transaction_items')
    .insert(
      itemRows.map((item) => ({
        ...item,
        transaction_id: transactionId,
      })),
    )
    .select(
      `
        id,
        transaction_id,
        product_id,
        product_name,
        quantity,
        unit_price,
        subtotal,
        created_at
      `,
    )

  if (error) {
    throw normalizeFinanceError(error)
  }

  return data ?? []
}

async function resolveFinanceItemRows(items) {
  const cleanItems = sanitizeFinanceItems(items)

  if (!cleanItems.length) {
    return []
  }

  const productIds = [...new Set(cleanItems.map((item) => item.product_id).filter(Boolean))]
  const { data, error } = await supabase
    .from('products')
    .select('id, name')
    .in('id', productIds)

  if (error) {
    throw normalizeFinanceError(error)
  }

  const productMap = new Map((data ?? []).map((product) => [product.id, product]))

  return cleanItems.reduce((rows, item) => {
    const product = productMap.get(item.product_id)
    const productName = String(item.product_name || product?.name || '').trim()

    if (!item.product_id || !productName) {
      throw new Error('Cada producto vendido debe tener un nombre valido antes de guardar.')
    }

    rows.push({
      product_id: item.product_id,
      product_name: productName,
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unit_price || 0),
    })

    return rows
  }, [])
}

export async function fetchFinanceTransactions({ startDate, endDate } = {}) {
  ensureSupabaseConfigured()

  let query = supabase
    .from('finance_transactions')
    .select(financeFields)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (startDate) {
    query = query.gte('transaction_date', startDate)
  }

  if (endDate) {
    query = query.lte('transaction_date', endDate)
  }

  const { data, error } = await query

  if (error) {
    throw normalizeFinanceError(error)
  }

  return (data ?? []).map(normalizeFinanceTransaction)
}

export async function fetchFinanceCategories() {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('finance_categories')
    .select(financeCategoryFields)
    .order('type')
    .order('name')

  if (error) {
    throw normalizeFinanceError(error)
  }

  return data ?? []
}

export async function createFinanceCategory(payload) {
  ensureSupabaseConfigured()

  const cleanPayload = {
    name: payload.name.trim(),
    type: payload.type,
  }

  const { data, error } = await supabase
    .from('finance_categories')
    .insert(cleanPayload)
    .select(financeCategoryFields)
    .single()

  if (error) {
    throw normalizeFinanceError(error)
  }

  return data
}

export async function createFinanceTransaction(payload) {
  ensureSupabaseConfigured()

  const cleanPayload = sanitizeFinancePayload(payload)
  const shouldPersistItems = payload.type === 'income' && payload.category === 'Ventas'
  const itemRows = shouldPersistItems ? await resolveFinanceItemRows(payload.items) : []
  const { data, error } = await supabase
    .from('finance_transactions')
    .insert(cleanPayload)
    .select(financeFields)
    .single()

  if (error) {
    throw normalizeFinanceError(error)
  }

  try {
    await replaceFinanceItems(data.id, itemRows)
    await replaceFinancePayments(data.id, payload.payments)
  } catch (nestedError) {
    await supabase.from('finance_transactions').delete().eq('id', data.id)
    throw nestedError
  }

  return fetchFinanceTransactionById(data.id)
}

export async function updateFinanceTransaction(id, payload, previousTransaction = null) {
  ensureSupabaseConfigured()

  const previousState = previousTransaction ?? (await fetchFinanceTransactionById(id))
  const cleanPayload = sanitizeFinancePayload(payload)
  const shouldPersistItems = payload.type === 'income' && payload.category === 'Ventas'
  const itemRows = shouldPersistItems ? await resolveFinanceItemRows(payload.items) : []

  try {
    await replaceFinanceItems(id, itemRows)
    await replaceFinancePayments(id, payload.payments)
  } catch (nestedError) {
    throw nestedError
  }

  const { error } = await supabase
    .from('finance_transactions')
    .update(cleanPayload)
    .eq('id', id)

  if (error) {
    try {
      await replaceFinanceItems(id, previousState.items)
      await replaceFinancePayments(id, previousState.payments)
    } catch {
      // Best effort restore if the base update fails after replacing related rows.
    }
    throw normalizeFinanceError(error)
  }

  return fetchFinanceTransactionById(id)
}

export async function deleteFinanceTransaction(id) {
  ensureSupabaseConfigured()

  const { error } = await supabase.from('finance_transactions').delete().eq('id', id)

  if (error) {
    throw normalizeFinanceError(error)
  }
}

export {
  buildPaymentMethodsLabel,
  buildTransactionItemsSummary,
  deriveItemsSummary,
  derivePaymentSummary,
}
