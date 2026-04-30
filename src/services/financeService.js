import { ensureSupabaseConfigured, supabase } from '../lib/supabaseClient'

const financeFields = `
  id,
  type,
  amount,
  paid_amount,
  remaining_amount,
  product_id,
  quantity,
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

function normalizeFinanceTransaction(transaction) {
  const payments = [...(transaction.finance_payments ?? [])].sort((left, right) =>
    `${left.payment_date}-${left.created_at}`.localeCompare(
      `${right.payment_date}-${right.created_at}`,
    ),
  )
  const methodsLabel = buildPaymentMethodsLabel(payments)

  return {
    ...transaction,
    product: transaction.products ?? null,
    payments,
    payment_method: methodsLabel || transaction.payment_method || '',
  }
}

function sanitizeFinancePayload(payload) {
  const paymentSummary = derivePaymentSummary(payload.amount, payload.payments)

  return {
    amount: payload.amount,
    paid_amount: paymentSummary.paidAmount,
    product_id: payload.product_id || null,
    quantity: payload.product_id ? Number(payload.quantity || 1) : null,
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
  const { data, error } = await supabase
    .from('finance_transactions')
    .insert(cleanPayload)
    .select(financeFields)
    .single()

  if (error) {
    throw normalizeFinanceError(error)
  }

  try {
    await replaceFinancePayments(data.id, payload.payments)
  } catch (paymentError) {
    await supabase.from('finance_transactions').delete().eq('id', data.id)
    throw paymentError
  }

  return fetchFinanceTransactionById(data.id)
}

export async function updateFinanceTransaction(id, payload, previousTransaction = null) {
  ensureSupabaseConfigured()

  const previousState = previousTransaction ?? (await fetchFinanceTransactionById(id))
  const cleanPayload = sanitizeFinancePayload(payload)

  try {
    await replaceFinancePayments(id, payload.payments)
  } catch (paymentError) {
    throw paymentError
  }

  const { error } = await supabase
    .from('finance_transactions')
    .update(cleanPayload)
    .eq('id', id)

  if (error) {
    try {
      await replaceFinancePayments(id, previousState.payments)
    } catch {
      // Best effort restore if the base update fails after replacing payments.
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

export { derivePaymentSummary, buildPaymentMethodsLabel }
