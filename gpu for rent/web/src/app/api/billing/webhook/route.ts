import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/with-rate-limit'
import { BILLING_LIMIT } from '@/lib/rate-limit'
import { USD_TO_INR } from '@/lib/currency'

export async function POST(request: Request) {
  const log = logger.withRequest(request)
  log.info('Webhook received')
  try {
    const rateLimitResponse = withRateLimit(BILLING_LIMIT)(request)
    if (rateLimitResponse) return rateLimitResponse

    const rawBody = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!secret) {
      log.error('RAZORPAY_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const payload = JSON.parse(rawBody)
    const event = payload.event

    if (event === 'payment.captured') {
      const payment = payload.payload.payment.entity
      const paymentId = payment.id
      const userId = payment.notes.userId

      const amountUsd = payment.notes.amountUsd
        ? parseFloat(payment.notes.amountUsd)
        : (payment.amount / 100) / USD_TO_INR

      if (!userId) {
        return NextResponse.json({ error: 'Missing userId in notes' }, { status: 400 })
      }

      // Verify the actual INR payment matches the claimed USD amount (within ₹1 tolerance)
      const actualInrPaise = payment.amount
      const expectedInrPaise = Math.round(amountUsd * USD_TO_INR * 100)
      const tolerancePaise = 100
      if (Math.abs(actualInrPaise - expectedInrPaise) > tolerancePaise) {
        log.error('Payment amount mismatch', {
          actualInrPaise,
          expectedInrPaise,
          amountUsd,
          paymentId,
        })
        return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 })
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('razorpay_payment_id', paymentId)
        .eq('type', 'deposit')
        .maybeSingle()

      if (existingTx) {
        return NextResponse.json({ status: 'already_processed' })
      }

      const { data: creditResult, error: creditError } = await supabase
        .rpc('credit_wallet', { p_user_id: userId, p_amount: amountUsd })

      if (creditError) {
        throw new Error(`Failed to credit wallet: ${creditError.message}`)
      }

      const amountInrActual = payment.amount / 100
      const baseAmount = amountInrActual / 1.18
      const gstAmount = amountInrActual - baseAmount
      const cgstAmount = gstAmount / 2
      const sgstAmount = gstAmount / 2

      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount_usd: amountUsd,
          type: 'deposit',
          status: 'completed',
          razorpay_payment_id: payment.id,
          reference_id: payment.order_id,
          gst_percentage: 18,
          gst_amount: gstAmount,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount
        })

      return NextResponse.json({ status: 'ok' })
    }

    return NextResponse.json({ status: 'ignored' })
  } catch (error: any) {
    logger.error('Webhook processing failed', { error: error.message, stack: error.stack })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
