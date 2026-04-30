import { ensureSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { fetchRaffleImages } from './imageService'

export const raffleNumberStatuses = ['available', 'reserved', 'paid', 'winner']
export const raffleStatuses = ['draft', 'active', 'closed']
const RAFFLE_FINANCE_CATEGORY = 'Rifas'

async function closeOtherActiveRaffles(activeRaffleId) {
  const { error } = await supabase
    .from('raffles')
    .update({ status: 'closed' })
    .eq('status', 'active')
    .neq('id', activeRaffleId)

  if (error) {
    throw error
  }
}

function buildRaffleSummary(raffle, numbers = []) {
  const paidCount = numbers.filter((number) => number.status === 'paid').length
  const reservedCount = numbers.filter((number) => number.status === 'reserved').length
  const availableCount = numbers.filter((number) => number.status === 'available').length
  const winnerCount = numbers.filter((number) => number.status === 'winner').length
  const unitPrice = Number(raffle?.price_per_number || 0)
  const paidLikeCount = paidCount + winnerCount
  const total = numbers.length
  const potentialRevenue = unitPrice * total
  const paidRevenue = unitPrice * paidLikeCount

  return {
    total,
    availableCount,
    reservedCount,
    paidCount,
    winnerCount,
    isComplete: total > 0 && availableCount === 0,
    potentialRevenue,
    reservedRevenue: unitPrice * reservedCount,
    paidRevenue,
    pendingRevenue: Math.max(potentialRevenue - paidRevenue, 0),
  }
}

function buildRaffleFinanceDescription(raffleTitle, raffleNumber) {
  return `Rifa - ${raffleTitle} - Numero ${raffleNumber}`
}

async function fetchRaffleContext(raffleId) {
  const { data, error } = await supabase
    .from('raffles')
    .select('id, title, price_per_number')
    .eq('id', raffleId)
    .single()

  if (error) {
    throw error
  }

  return data
}

async function findLinkedFinanceTransaction(numberRecord, description) {
  if (numberRecord.finance_transaction_id) {
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('id')
      .eq('id', numberRecord.finance_transaction_id)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data) {
      return data
    }
  }

  const { data, error } = await supabase
    .from('finance_transactions')
    .select('id')
    .eq('type', 'income')
    .eq('category', RAFFLE_FINANCE_CATEGORY)
    .eq('description', description)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function clearFinanceRelations(transactionId) {
  const { error: paymentsError } = await supabase
    .from('finance_payments')
    .delete()
    .eq('transaction_id', transactionId)

  if (paymentsError) {
    throw paymentsError
  }

  const { error: itemsError } = await supabase
    .from('finance_transaction_items')
    .delete()
    .eq('transaction_id', transactionId)

  if (itemsError) {
    throw itemsError
  }
}

async function syncRaffleFinance(numberRecord, payload) {
  const raffle = await fetchRaffleContext(payload.raffle_id)
  const description = buildRaffleFinanceDescription(raffle.title, numberRecord.number)
  const linkedTransaction = await findLinkedFinanceTransaction(numberRecord, description)

  if (payload.status === 'available') {
    const { error: unlinkError } = await supabase
      .from('raffle_numbers')
      .update({ finance_transaction_id: null })
      .eq('id', numberRecord.id)

    if (unlinkError) {
      throw unlinkError
    }

    if (linkedTransaction?.id) {
      await clearFinanceRelations(linkedTransaction.id)
      const { error: deleteError } = await supabase
        .from('finance_transactions')
        .delete()
        .eq('id', linkedTransaction.id)

      if (deleteError) {
        throw deleteError
      }
    }

    return {
      action: linkedTransaction?.id ? 'deleted' : 'none',
      transactionId: null,
    }
  }

  const amount = Number(raffle.price_per_number || 0)
  const isPaidLike = payload.status === 'paid' || payload.status === 'winner'
  const financePayload = {
    type: 'income',
    category: RAFFLE_FINANCE_CATEGORY,
    description,
    amount,
    paid_amount: isPaidLike ? amount : 0,
    status: isPaidLike ? 'completed' : 'pending',
    transaction_date: new Date().toISOString().slice(0, 10),
    payment_method: payload.payment_method || null,
  }

  let transactionId = linkedTransaction?.id || null
  let action = 'updated'

  if (transactionId) {
    await clearFinanceRelations(transactionId)
    const { error: updateError } = await supabase
      .from('finance_transactions')
      .update(financePayload)
      .eq('id', transactionId)

    if (updateError) {
      throw updateError
    }
  } else {
    const { data, error } = await supabase
      .from('finance_transactions')
      .insert(financePayload)
      .select('id')
      .single()

    if (error) {
      throw error
    }

    transactionId = data.id
    action = 'created'
  }

  const { error: linkError } = await supabase
    .from('raffle_numbers')
    .update({ finance_transaction_id: transactionId })
    .eq('id', numberRecord.id)

  if (linkError) {
    throw linkError
  }

  return {
    action,
    transactionId,
  }
}

export async function fetchRaffles() {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('raffles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function fetchRaffleById(id) {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('raffles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const gallery = await fetchRaffleImages(id)

  return {
    ...data,
    gallery,
  }
}

export async function fetchRaffleNumbers(raffleId) {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('raffle_numbers')
    .select('*')
    .eq('raffle_id', raffleId)
    .order('number')

  if (error) {
    throw error
  }

  return data ?? []
}

export async function fetchActiveRaffle() {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('raffles')
    .select('*')
    .eq('status', 'active')
    .order('draw_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const numbers = await fetchRaffleNumbers(data.id)
  const gallery = await fetchRaffleImages(data.id)
  const winner = numbers.find((number) => number.status === 'winner') || null

  return {
    ...data,
    numbers,
    gallery,
    winner,
    summary: buildRaffleSummary(data, numbers),
  }
}

export async function createRaffle(payload) {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('raffles')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  if (data.status === 'active') {
    await closeOtherActiveRaffles(data.id)
  }

  return data
}

export async function createRaffleWithNumbers(payload) {
  const raffle = await createRaffle(payload)

  const generatedNumbers = Array.from({ length: 100 }, (_, index) => ({
    raffle_id: raffle.id,
    number: String(index).padStart(2, '0'),
    status: 'available',
  }))

  const { error } = await supabase.from('raffle_numbers').insert(generatedNumbers)

  if (error) {
    throw error
  }

  return raffle
}

export async function updateRaffle(id, payload) {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('raffles')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  if (payload.status === 'active') {
    await closeOtherActiveRaffles(id)
  }

  return data
}

export async function updateRaffleNumber(id, payload) {
  ensureSupabaseConfigured()

  if (!payload.raffle_id) {
    throw new Error('Se requiere raffle_id para actualizar el numero de rifa.')
  }

  if (payload.status === 'winner') {
    const { error: clearPreviousWinnerError } = await supabase
      .from('raffle_numbers')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('raffle_id', payload.raffle_id)
      .eq('status', 'winner')
      .neq('id', id)

    if (clearPreviousWinnerError) {
      throw clearPreviousWinnerError
    }
  }

  const nextPayload = {
    status: payload.status,
    buyer_name: payload.buyer_name || null,
    buyer_phone: payload.buyer_phone || null,
    payment_method: payload.payment_method || null,
    paid_at:
      payload.status === 'paid' || payload.status === 'winner'
        ? new Date().toISOString()
        : null,
  }

  const { data, error } = await supabase
    .from('raffle_numbers')
    .update(nextPayload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const { data: currentWinner, error: winnerLookupError } = await supabase
    .from('raffle_numbers')
    .select('number')
    .eq('raffle_id', payload.raffle_id)
    .eq('status', 'winner')
    .maybeSingle()

  if (winnerLookupError) {
    throw winnerLookupError
  }

  const { error: raffleSyncError } = await supabase
    .from('raffles')
    .update({
      winner_number: currentWinner?.number || null,
    })
    .eq('id', payload.raffle_id)

  if (raffleSyncError) {
    throw raffleSyncError
  }

  try {
    const financeSync = await syncRaffleFinance(data, payload)
    return {
      ...data,
      financeSync,
    }
  } catch (financeError) {
    return {
      ...data,
      financeSync: {
        action: 'error',
        error: financeError,
      },
    }
  }
}

export function getRaffleSummary(raffle, numbers) {
  return buildRaffleSummary(raffle, numbers)
}

export async function deleteRaffle(raffleId) {
  ensureSupabaseConfigured()

  const { error: imagesError } = await supabase
    .from('raffle_images')
    .delete()
    .eq('raffle_id', raffleId)

  if (imagesError) {
    throw imagesError
  }

  const { data: raffleNumbers, error: fetchNumbersError } = await supabase
    .from('raffle_numbers')
    .select('finance_transaction_id')
    .eq('raffle_id', raffleId)

  if (fetchNumbersError) {
    throw fetchNumbersError
  }

  const financeTransactionIds = [...new Set(
    (raffleNumbers ?? [])
      .map((number) => number.finance_transaction_id)
      .filter(Boolean),
  )]

  if (financeTransactionIds.length) {
    const { error: unlinkNumbersError } = await supabase
      .from('raffle_numbers')
      .update({ finance_transaction_id: null })
      .eq('raffle_id', raffleId)

    if (unlinkNumbersError) {
      throw unlinkNumbersError
    }

    const { error: deletePaymentsError } = await supabase
      .from('finance_payments')
      .delete()
      .in('transaction_id', financeTransactionIds)

    if (deletePaymentsError) {
      throw deletePaymentsError
    }

    const { error: deleteTransactionsError } = await supabase
      .from('finance_transactions')
      .delete()
      .in('id', financeTransactionIds)

    if (deleteTransactionsError) {
      throw deleteTransactionsError
    }
  }

  const { error: numbersError } = await supabase
    .from('raffle_numbers')
    .delete()
    .eq('raffle_id', raffleId)

  if (numbersError) {
    throw numbersError
  }

  const { error } = await supabase.from('raffles').delete().eq('id', raffleId)

  if (error) {
    throw error
  }
}
