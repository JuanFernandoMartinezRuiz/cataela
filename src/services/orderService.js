import { ensureSupabaseConfigured, supabase } from '../lib/supabaseClient'

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
    selected_scents: Array.isArray(order.selected_scents) ? order.selected_scents : [],
  }
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

  return fetchOrderById(data.id)
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

  return fetchOrderById(id)
}

export async function deleteOrder(id) {
  ensureSupabaseConfigured()

  const { error } = await supabase.from('orders').delete().eq('id', id)

  if (error) {
    throw normalizeOrderError(error)
  }
}
