import { ensureSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { getDateValue } from '../utils/date'

const orderFields = `
  id,
  customer_name,
  customer_phone,
  delivery_date,
  delivery_time,
  delivery_address,
  status,
  payment_status,
  total_amount,
  paid_amount,
  payment_method,
  finance_transaction_id,
  selected_scents,
  notes,
  created_at,
  order_items (
    id,
    order_id,
    product_id,
    product_name,
    unit_price,
    quantity,
    subtotal,
    custom_description,
    products (
      id,
      name,
      price
    )
  )
`

const ORDER_FINANCE_CATEGORY = 'Pedidos'

function normalizeOrderError(error) {
  if (!error) {
    return new Error('Ocurrio un error inesperado en pedidos.')
  }

  return error
}

function normalizeOrderItem(item) {
  return {
    ...item,
    product: item.products ?? null,
    product_name: item.product_name || item.products?.name || '',
    subtotal: Number(item.subtotal ?? Number(item.quantity || 0) * Number(item.unit_price || 0)),
  }
}

function buildOrderItemsSummary(items) {
  return (items ?? [])
    .map((item) => `${item.product_name} x${item.quantity}`)
    .join(', ')
}

function normalizeOrder(order) {
  const items = [...(order.order_items ?? [])]
    .map(normalizeOrderItem)
    .sort((left, right) => {
      const leftKey = `${left.id}-${left.product_name}`
      const rightKey = `${right.id}-${right.product_name}`
      return leftKey.localeCompare(rightKey)
    })

  return {
    ...order,
    items,
    itemsSummary: buildOrderItemsSummary(items),
    payment_method: order.payment_method || 'Sin metodo',
    finance_transaction_id: order.finance_transaction_id || null,
    selected_scents: Array.isArray(order.selected_scents) ? order.selected_scents : [],
  }
}

function deriveOrderFinanceStatus(totalAmount, paidAmount) {
  const total = Number(totalAmount || 0)
  const paid = Number(paidAmount || 0)

  if (paid <= 0) {
    return 'pending'
  }

  if (paid >= total && total > 0) {
    return 'completed'
  }

  return 'partial'
}

function buildOrderFinancePayload(order) {
  const totalAmount = Number(order.total_amount || 0)
  const paidAmount = Number(order.paid_amount || 0)

  return {
    type: 'income',
    category: ORDER_FINANCE_CATEGORY,
    description: `Pedido - ${String(order.customer_name || '').trim()}`,
    buyer_name: String(order.customer_name || '').trim() || null,
    amount: totalAmount,
    paid_amount: paidAmount,
    status: deriveOrderFinanceStatus(totalAmount, paidAmount),
    transaction_date: order.delivery_date,
    payment_method: String(order.payment_method || '').trim() || 'Sin metodo',
    selected_scents: Array.isArray(order.selected_scents) ? order.selected_scents : [],
  }
}

function shouldCreateOrderPayment(order) {
  const paidAmount = Number(order.paid_amount || 0)
  const paymentMethod = String(order.payment_method || '').trim()
  return paidAmount > 0 && paymentMethod && paymentMethod !== 'Sin metodo'
}

function sanitizeOrderItems(items) {
  return (items ?? [])
    .map((item) => ({
      product_id: item.product_id || null,
      product_name: String(item.product_name || '').trim(),
      unit_price: Number(item.unit_price || 0),
      quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
      custom_description: String(item.custom_description || '').trim(),
    }))
    .filter((item) => item.product_id || item.custom_description || item.product_name)
}

async function resolveOrderItemRows(items) {
  const cleanItems = sanitizeOrderItems(items)

  if (!cleanItems.length) {
    return []
  }

  const productIds = [...new Set(cleanItems.map((item) => item.product_id).filter(Boolean))]
  let productMap = new Map()

  if (productIds.length) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price')
      .in('id', productIds)

    if (error) {
      throw normalizeOrderError(error)
    }

    productMap = new Map((data ?? []).map((product) => [product.id, product]))
  }

  return cleanItems.map((item) => {
    const linkedProduct = item.product_id ? productMap.get(item.product_id) : null
    const productName = String(item.product_name || linkedProduct?.name || item.custom_description || '').trim()

    if (!productName) {
      throw new Error('Cada item del pedido debe tener un producto o una descripcion personalizada.')
    }

    return {
      product_id: linkedProduct?.id || item.product_id || null,
      product_name: productName,
      unit_price: Number(item.unit_price || linkedProduct?.price || 0),
      quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
      custom_description: item.custom_description || null,
    }
  })
}

function deriveOrderPaymentStatus(totalAmount, paidAmount, requestedStatus) {
  if (paidAmount <= 0) {
    return requestedStatus === 'paid' && totalAmount > 0 ? 'partial' : 'pending'
  }

  if (paidAmount >= totalAmount && totalAmount > 0) {
    return 'paid'
  }

  return requestedStatus === 'pending' ? 'partial' : requestedStatus || 'partial'
}

function sanitizeOrderPayload(payload, itemRows) {
  const totalAmount = itemRows.reduce(
    (sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0),
    0,
  )
  const rawPaidAmount = Number(payload.paid_amount || 0)
  const paidAmount = Math.max(0, Math.min(rawPaidAmount, totalAmount))
  const paymentStatus = deriveOrderPaymentStatus(totalAmount, paidAmount, payload.payment_status)

  return {
    customer_name: String(payload.customer_name || '').trim(),
    customer_phone: String(payload.customer_phone || '').trim() || null,
    delivery_date: payload.delivery_date,
    delivery_time: payload.delivery_time || null,
    delivery_address: String(payload.delivery_address || '').trim() || null,
    status: payload.status || 'pending',
    payment_status: paymentStatus,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    payment_method: String(payload.payment_method || '').trim() || 'Sin metodo',
    selected_scents: Array.isArray(payload.selected_scents) ? payload.selected_scents : [],
    notes: String(payload.notes || '').trim() || null,
  }
}

async function fetchOrderById(id) {
  const { data, error } = await supabase
    .from('orders')
    .select(orderFields)
    .eq('id', id)
    .single()

  if (error) {
    throw normalizeOrderError(error)
  }

  return normalizeOrder(data)
}

async function upsertOrderFinanceTransaction(order) {
  const financePayload = buildOrderFinancePayload(order)
  let transactionId = order.finance_transaction_id || null
  let action = 'updated'

  if (transactionId) {
    const { data: existingTransaction, error: fetchError } = await supabase
      .from('finance_transactions')
      .select('id')
      .eq('id', transactionId)
      .maybeSingle()

    if (fetchError) {
      throw normalizeOrderError(fetchError)
    }

    if (existingTransaction?.id) {
      const { error: updateError } = await supabase
        .from('finance_transactions')
        .update(financePayload)
        .eq('id', transactionId)

      if (updateError) {
        throw normalizeOrderError(updateError)
      }

      return {
        transactionId,
        action,
      }
    }
  }

  const { data: createdTransaction, error: createError } = await supabase
    .from('finance_transactions')
    .insert(financePayload)
    .select('id')
    .single()

  if (createError) {
    throw normalizeOrderError(createError)
  }

  transactionId = createdTransaction.id

  const { error: linkError } = await supabase
    .from('orders')
    .update({ finance_transaction_id: transactionId })
    .eq('id', order.id)

  if (linkError) {
    await supabase.from('finance_transactions').delete().eq('id', transactionId)
    throw normalizeOrderError(linkError)
  }

  action = 'created'

  return {
    transactionId,
    action,
  }
}

async function syncOrderFinancePayment(transactionId, order) {
  const { data: existingPayments, error: fetchError } = await supabase
    .from('finance_payments')
    .select('id')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: true })

  if (fetchError) {
    throw normalizeOrderError(fetchError)
  }

  const paymentRows = existingPayments ?? []

  if (!shouldCreateOrderPayment(order)) {
    if (paymentRows.length) {
      const idsToDelete = paymentRows.map((payment) => payment.id)
      const { error: deleteError } = await supabase
        .from('finance_payments')
        .delete()
        .in('id', idsToDelete)

      if (deleteError) {
        throw normalizeOrderError(deleteError)
      }

      return 'deleted'
    }

    return 'none'
  }

  const paymentPayload = {
    transaction_id: transactionId,
    amount: Number(order.paid_amount || 0),
    payment_method: String(order.payment_method || '').trim(),
    payment_date: getDateValue(new Date()),
    note: `Abono pedido - ${String(order.customer_name || '').trim()}`,
  }

  if (!paymentRows.length) {
    const { error: createError } = await supabase
      .from('finance_payments')
      .insert(paymentPayload)

    if (createError) {
      throw normalizeOrderError(createError)
    }

    return 'created'
  }

  const primaryPaymentId = paymentRows[0].id
  const { error: updateError } = await supabase
    .from('finance_payments')
    .update({
      amount: paymentPayload.amount,
      payment_method: paymentPayload.payment_method,
      payment_date: paymentPayload.payment_date,
      note: paymentPayload.note,
    })
    .eq('id', primaryPaymentId)

  if (updateError) {
    throw normalizeOrderError(updateError)
  }

  if (paymentRows.length > 1) {
    const extraIds = paymentRows.slice(1).map((payment) => payment.id)
    const { error: cleanupError } = await supabase
      .from('finance_payments')
      .delete()
      .in('id', extraIds)

    if (cleanupError) {
      throw normalizeOrderError(cleanupError)
    }
  }

  return 'updated'
}

async function syncSingleOrderFinance(order) {
  if (!order?.id) {
    throw new Error('No fue posible sincronizar el pedido con Finanzas.')
  }

  const { transactionId, action: transactionAction } = await upsertOrderFinanceTransaction(order)
  const paymentAction = await syncOrderFinancePayment(transactionId, order)

  return {
    ...order,
    finance_transaction_id: transactionId,
    financeSync: {
      transactionAction,
      paymentAction,
    },
  }
}

async function deleteOrderFinanceTransaction(order) {
  if (!order?.finance_transaction_id) {
    return
  }

  const { data: financeTransaction, error: fetchError } = await supabase
    .from('finance_transactions')
    .select('id, category')
    .eq('id', order.finance_transaction_id)
    .maybeSingle()

  if (fetchError) {
    throw normalizeOrderError(fetchError)
  }

  if (!financeTransaction?.id || financeTransaction.category !== ORDER_FINANCE_CATEGORY) {
    return
  }

  const { error: deletePaymentsError } = await supabase
    .from('finance_payments')
    .delete()
    .eq('transaction_id', financeTransaction.id)

  if (deletePaymentsError) {
    throw normalizeOrderError(deletePaymentsError)
  }

  const { error: deleteError } = await supabase
    .from('finance_transactions')
    .delete()
    .eq('id', financeTransaction.id)

  if (deleteError) {
    throw normalizeOrderError(deleteError)
  }
}

async function replaceOrderItems(orderId, items) {
  const { error: deleteError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', orderId)

  if (deleteError) {
    throw normalizeOrderError(deleteError)
  }

  if (!items.length) {
    return []
  }

  const { error } = await supabase
    .from('order_items')
    .insert(
      items.map((item) => ({
        order_id: orderId,
        product_id: item.product_id,
        product_name: item.product_name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        custom_description: item.custom_description,
      })),
    )

  if (error) {
    throw normalizeOrderError(error)
  }

  return items
}

export async function fetchOrders() {
  ensureSupabaseConfigured()

  const { data, error } = await supabase
    .from('orders')
    .select(orderFields)
    .order('delivery_date', { ascending: true })
    .order('delivery_time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) {
    throw normalizeOrderError(error)
  }

  return (data ?? []).map(normalizeOrder)
}

export async function createOrder(payload) {
  ensureSupabaseConfigured()

  const itemRows = await resolveOrderItemRows(payload.items)
  const cleanPayload = sanitizeOrderPayload(payload, itemRows)

  // Supabase insert for the order base row.
  const { data, error } = await supabase
    .from('orders')
    .insert(cleanPayload)
    .select('id')
    .single()

  if (error) {
    throw normalizeOrderError(error)
  }

  try {
    await replaceOrderItems(data.id, itemRows)
  } catch (nestedError) {
    await supabase.from('orders').delete().eq('id', data.id)
    throw nestedError
  }

  const createdOrder = await fetchOrderById(data.id)

  try {
    const syncedOrder = await syncSingleOrderFinance(createdOrder)
    const refreshedOrder = await fetchOrderById(data.id)
    return {
      ...refreshedOrder,
      financeSync: syncedOrder.financeSync,
    }
  } catch (syncError) {
    return {
      ...createdOrder,
      financeSyncError:
        syncError.message || 'El pedido se creo, pero no fue posible sincronizar Finanzas.',
    }
  }
}

export async function updateOrder(id, payload) {
  ensureSupabaseConfigured()

  const previousOrder = await fetchOrderById(id)
  const itemRows = await resolveOrderItemRows(payload.items)
  const cleanPayload = sanitizeOrderPayload(payload, itemRows)

  try {
    await replaceOrderItems(id, itemRows)
  } catch (nestedError) {
    throw nestedError
  }

  const { error } = await supabase
    .from('orders')
    .update(cleanPayload)
    .eq('id', id)

  if (error) {
    try {
      await replaceOrderItems(id, previousOrder.items)
    } catch {
      // Best-effort restore if updating the base order fails after replacing items.
    }
    throw normalizeOrderError(error)
  }

  const updatedOrder = await fetchOrderById(id)

  try {
    const syncedOrder = await syncSingleOrderFinance(updatedOrder)
    const refreshedOrder = await fetchOrderById(id)
    return {
      ...refreshedOrder,
      financeSync: syncedOrder.financeSync,
    }
  } catch (syncError) {
    return {
      ...updatedOrder,
      financeSyncError:
        syncError.message ||
        'El pedido se actualizo, pero no fue posible sincronizar Finanzas.',
    }
  }
}

export async function deleteOrder(id) {
  ensureSupabaseConfigured()

  const existingOrder = await fetchOrderById(id)
  await deleteOrderFinanceTransaction(existingOrder)

  const { error } = await supabase.from('orders').delete().eq('id', id)

  if (error) {
    throw normalizeOrderError(error)
  }
}

export async function syncOrdersWithFinances(existingOrders = null, options = {}) {
  ensureSupabaseConfigured()

  const { missingOnly = false } = options
  const orders = existingOrders ?? (await fetchOrders())
  let createdCount = 0
  let updatedCount = 0
  let paymentCount = 0
  const syncedOrders = []

  for (const order of orders) {
    if (missingOnly && order.finance_transaction_id) {
      syncedOrders.push(order)
      continue
    }

    const syncedOrder = await syncSingleOrderFinance(order)
    syncedOrders.push(syncedOrder)
    if (syncedOrder.financeSync?.transactionAction === 'created') {
      createdCount += 1
    } else {
      updatedCount += 1
    }
    if (['created', 'updated'].includes(syncedOrder.financeSync?.paymentAction)) {
      paymentCount += 1
    }
  }

  return {
    orders: syncedOrders,
    createdCount,
    updatedCount,
    paymentCount,
  }
}
