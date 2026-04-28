import { ensureSupabaseConfigured, supabase } from '../lib/supabaseClient'

const financeFields = `
  id,
  type,
  amount,
  paid_amount,
  remaining_amount,
  description,
  category,
  payment_method,
  transaction_date,
  status,
  created_at
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

function sanitizeFinancePayload(payload) {
  return {
    amount: payload.amount,
    paid_amount: payload.paid_amount,
    type: payload.type,
    description: payload.description,
    category: payload.category,
    payment_method: payload.payment_method,
    transaction_date: payload.transaction_date,
    status: payload.status,
  }
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

  return data ?? []
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

  const { data, error } = await supabase
    .from('finance_transactions')
    .insert(sanitizeFinancePayload(payload))
    .select(financeFields)
    .single()

  if (error) {
    throw normalizeFinanceError(error)
  }

  return data
}

export async function updateFinanceTransaction(id, payload) {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('finance_transactions')
    .update(sanitizeFinancePayload(payload))
    .eq('id', id)
    .select(financeFields)
    .single()

  if (error) {
    throw normalizeFinanceError(error)
  }

  return data
}

export async function deleteFinanceTransaction(id) {
  ensureSupabaseConfigured()

  const { error } = await supabase.from('finance_transactions').delete().eq('id', id)

  if (error) {
    throw normalizeFinanceError(error)
  }
}
