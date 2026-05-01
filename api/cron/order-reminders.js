import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const ORDER_FIELDS = `
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
  notes,
  reminder_7_days_sent,
  reminder_1_day_sent,
  order_items (
    id,
    product_name,
    quantity,
    unit_price,
    subtotal,
    custom_description
  )
`

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const isTestMode = req.query?.test === 'true'

  if (!isTestMode && !isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const config = getServerConfig()
    const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey)
    const resend = new Resend(process.env.RESEND_API_KEY)
    const recipients = parseRecipients(process.env.ORDER_REMINDER_EMAILS)

    if (isTestMode) {
      const testRecipient = recipients[0]

      if (!testRecipient) {
        throw new Error('No hay un correo disponible en ORDER_REMINDER_EMAILS para la prueba.')
      }

      const subject = 'Test correo Cataela'
      const currentDate = formatDate(getBogotaDateOffset(0))
      const html = `
        <div style="font-family: Georgia, serif; color: #334155; line-height: 1.7;">
          <h2 style="color: #566b7f;">Prueba de correo de Cataela</h2>
          <p>Si recibes esto, Resend está funcionando correctamente.</p>
          <p><strong>Fecha actual:</strong> ${escapeHtml(currentDate)}</p>
          <p>Este mensaje fue generado en modo de prueba desde el endpoint de recordatorios.</p>
        </div>
      `
      const text = [
        'Test correo Cataela',
        '',
        `Fecha actual: ${currentDate}`,
        'Si recibes esto, Resend está funcionando correctamente',
      ].join('\n')

      const result = await sendEmail({
        resend,
        recipients: [testRecipient],
        subject,
        text,
        html,
      })

      return res.status(200).json({
        ok: true,
        message: 'Correo enviado correctamente',
        test: true,
        recipient: testRecipient,
        result,
      })
    }

    const sevenDaysDate = getBogotaDateOffset(7)
    const oneDayDate = getBogotaDateOffset(1)

    const [sevenDayOrders, oneDayOrders] = await Promise.all([
      fetchReminderOrders(supabase, sevenDaysDate, 'reminder_7_days_sent'),
      fetchReminderOrders(supabase, oneDayDate, 'reminder_1_day_sent'),
    ])

    const results = {
      sent7Days: 0,
      sent1Day: 0,
      skipped: 0,
    }

    for (const order of sevenDayOrders) {
      const sent = await sendOrderReminder({
        resend,
        recipients,
        order,
        daysAhead: 7,
      })

      if (sent) {
        await markReminderSent(supabase, order.id, 'reminder_7_days_sent')
        results.sent7Days += 1
      } else {
        results.skipped += 1
      }
    }

    for (const order of oneDayOrders) {
      const sent = await sendOrderReminder({
        resend,
        recipients,
        order,
        daysAhead: 1,
      })

      if (sent) {
        await markReminderSent(supabase, order.id, 'reminder_1_day_sent')
        results.sent1Day += 1
      } else {
        results.skipped += 1
      }
    }

    return res.status(200).json({
      ok: true,
      message: 'Correo enviado correctamente',
      date: getBogotaDateOffset(0),
      ...results,
    })
  } catch (error) {
    console.error('order-reminders error:', error)
    return res.status(500).json({
      ok: false,
      error: error.message || 'Unexpected error sending order reminders.',
    })
  }
}

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    return false
  }

  const authHeader = req.headers.authorization || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const cronHeader = req.headers['x-cron-secret'] || ''
  const querySecret = req.query?.secret || ''

  return bearer === secret || cronHeader === secret || querySecret === secret
}

function getServerConfig() {
  const resendApiKey = process.env.RESEND_API_KEY
  const orderReminderEmails = process.env.ORDER_REMINDER_EMAILS
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!resendApiKey) {
    throw new Error('Missing RESEND_API_KEY.')
  }

  if (!orderReminderEmails) {
    throw new Error('Missing ORDER_REMINDER_EMAILS.')
  }

  if (!supabaseUrl) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_URL.')
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.')
  }

  return {
    resendApiKey,
    supabaseUrl,
    supabaseServiceRoleKey,
  }
}

async function fetchReminderOrders(supabase, dateValue, reminderField) {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_FIELDS)
    .eq('delivery_date', dateValue)
    .eq(reminderField, false)
    .not('status', 'in', '("delivered","cancelled")')
    .order('delivery_time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

async function markReminderSent(supabase, orderId, reminderField) {
  const { error } = await supabase
    .from('orders')
    .update({ [reminderField]: true })
    .eq('id', orderId)

  if (error) {
    throw error
  }
}

async function sendOrderReminder({ resend, recipients, order, daysAhead }) {
  if (!recipients.length) {
    return false
  }

  const subject =
    daysAhead === 7
      ? `Recordatorio: pedido de ${order.customer_name} en 7 dias`
      : `Recordatorio: pedido de ${order.customer_name} manana`

  const products = (order.order_items ?? [])
    .map((item) => {
      const subtotal =
        Number(item.subtotal || 0) || Number(item.quantity || 0) * Number(item.unit_price || 0)
      const itemLabel = item.custom_description || item.product_name || 'Item manual'
      return `- ${itemLabel} x${item.quantity} (${formatCurrency(subtotal)})`
    })
    .join('\n')

  const remaining = Math.max(0, Number(order.total_amount || 0) - Number(order.paid_amount || 0))
  const notes = order.notes ? order.notes : 'Sin notas'
  const dateLabel = formatDate(order.delivery_date)
  const timeLabel = order.delivery_time ? String(order.delivery_time).slice(0, 5) : 'Sin hora'
  const addressLabel = order.delivery_address || 'Sin direccion'
  const phoneLabel = order.customer_phone || 'Sin telefono'

  const text = [
    daysAhead === 7
      ? 'Recordatorio de pedido a 7 dias.'
      : 'Recordatorio de pedido a 1 dia.',
    '',
    `Cliente: ${order.customer_name}`,
    `Telefono: ${phoneLabel}`,
    `Entrega: ${dateLabel} ${timeLabel}`,
    `Direccion: ${addressLabel}`,
    products ? `Productos:\n${products}` : 'Productos: Sin items',
    `Total: ${formatCurrency(order.total_amount)}`,
    `Abono: ${formatCurrency(order.paid_amount)}`,
    `Saldo: ${formatCurrency(remaining)}`,
    `Notas: ${notes}`,
  ].join('\n')

  const html = `
    <div style="font-family: Georgia, serif; color: #334155; line-height: 1.6;">
      <h2 style="color: #566b7f;">${daysAhead === 7 ? 'Recordatorio de pedido a 7 dias' : 'Recordatorio de pedido para manana'}</h2>
      <p><strong>Cliente:</strong> ${escapeHtml(order.customer_name)}</p>
      <p><strong>Telefono:</strong> ${escapeHtml(phoneLabel)}</p>
      <p><strong>Entrega:</strong> ${escapeHtml(dateLabel)} ${escapeHtml(timeLabel)}</p>
      <p><strong>Direccion:</strong> ${escapeHtml(addressLabel)}</p>
      <p><strong>Productos:</strong></p>
      <pre style="white-space: pre-wrap; background: #fffdf8; border: 1px dashed #d7c8b6; border-radius: 16px; padding: 14px;">${escapeHtml(products || 'Sin items')}</pre>
      <p><strong>Total:</strong> ${escapeHtml(formatCurrency(order.total_amount))}</p>
      <p><strong>Abono:</strong> ${escapeHtml(formatCurrency(order.paid_amount))}</p>
      <p><strong>Saldo:</strong> ${escapeHtml(formatCurrency(remaining))}</p>
      <p><strong>Notas:</strong> ${escapeHtml(notes)}</p>
    </div>
  `

  await sendEmail({
    resend,
    recipients,
    subject,
    text,
    html,
  })

  return true
}

function parseRecipients(value) {
  return (value || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
}

async function sendEmail({ resend, recipients, subject, text, html }) {
  console.log('Resend recipients:', recipients)
  console.log('Resend subject:', subject)

  try {
    const result = await resend.emails.send({
      from: 'Cataela <onboarding@resend.dev>',
      to: recipients,
      subject,
      text,
      html,
    })

    console.log('Resend result:', result)
    return result
  } catch (error) {
    console.error('Resend send error:', error)
    throw error
  }
}

function getBogotaDateOffset(days) {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Bogota',
  })
  const base = formatter.format(new Date())
  const [year, month, day] = base.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  const nextYear = date.getFullYear()
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0')
  const nextDay = String(date.getDate()).padStart(2, '0')
  return `${nextYear}-${nextMonth}-${nextDay}`
}

function formatDate(date) {
  if (!date) {
    return ''
  }

  const [year, month, day] = String(date).split('-')
  return `${day}/${month}/${year}`
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
