import { ensureSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { fetchRaffleImages } from './imageService'

export const raffleNumberStatuses = ['available', 'reserved', 'paid', 'winner']
export const raffleStatuses = ['draft', 'active', 'closed']

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

  return {
    total: numbers.length,
    availableCount,
    reservedCount,
    paidCount,
    winnerCount,
    potentialRevenue: unitPrice * numbers.length,
    reservedRevenue: unitPrice * reservedCount,
    paidRevenue: unitPrice * paidCount,
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

  // Supabase insert for raffle base info.
  const { data, error } = await supabase
    .from('raffles')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  if (data.status === 'active') {
    // Ensure there is only one public active raffle at a time.
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

  // Supabase insert for raffle numbers 00-99.
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
    // When a raffle becomes active, all other active raffles are closed.
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
    paid_at:
      payload.status === 'paid' || payload.status === 'winner'
        ? new Date().toISOString()
        : null,
  }

  // Supabase update for each raffle number state and buyer info.
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

  return data
}

export function getRaffleSummary(raffle, numbers) {
  return buildRaffleSummary(raffle, numbers)
}
