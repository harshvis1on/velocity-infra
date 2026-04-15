import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/with-rate-limit'
import { BILLING_LIMIT } from '@/lib/rate-limit'

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
      const amountInr = payment.amount / 100
      const userId = payment.notes.userId

      if (!userId) {
        return NextResponse.json({ error: 'Missing userId in notes' }, { status: 400 })
      }

      // Initialize Supabase with service role key to bypass RLS
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Idempotency: check if this payment was already processed
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('razorpay_payment_id', paymentId)
        .eq('type', 'deposit')
        .maybeSingle()

      if (existingTx) {
        return NextResponse.json({ status: 'already_processed' })
      }

      // Atomic wallet credit — prevents race conditions with concurrent webhooks
      const { data: creditResult, error: creditError } = await supabase
        .rpc('credit_wallet', { p_user_id: userId, p_amount: amountInr })

      if (creditError) {
        throw new Error(`Failed to credit wallet: ${creditError.message}`)
      }

      // Calculate GST (18% inclusive)
      // If amount is 100, base is 100 / 1.18 = 84.75, GST is 15.25
      const baseAmount = amountInr / 1.18
      const gstAmount = amountInr - baseAmount
      const cgstAmount = gstAmount / 2
      const sgstAmount = gstAmount / 2

      // Record transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount_inr: amountInr,
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
