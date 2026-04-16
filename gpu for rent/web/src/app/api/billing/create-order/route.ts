import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createClient } from '@/utils/supabase/server'
import { USD_TO_INR } from '@/lib/currency'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amountUsd } = body

    if (!amountUsd || amountUsd < 1) {
      return NextResponse.json({ error: 'Minimum amount is $1' }, { status: 400 })
    }

    if (amountUsd > 1200) {
      return NextResponse.json({ error: 'Maximum single top-up is $1,200' }, { status: 400 })
    }

    const amountInr = Math.round(amountUsd * USD_TO_INR * 100) / 100

    const hasRazorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET

    if (!hasRazorpay) {
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
          { error: 'Payment gateway not configured. Please contact support.' },
          { status: 503 }
        )
      }

      const { error: rpcError } = await supabase.rpc('credit_wallet', {
        p_user_id: user.id,
        p_amount: amountUsd,
      })

      if (rpcError) {
        const { data: current } = await supabase
          .from('users')
          .select('wallet_balance_usd')
          .eq('id', user.id)
          .single()

        const currentBalance = current?.wallet_balance_usd || 0

        const { error: updateError } = await supabase
          .from('users')
          .update({ wallet_balance_usd: currentBalance + amountUsd })
          .eq('id', user.id)

        if (updateError) {
          return NextResponse.json({ error: 'Failed to credit wallet' }, { status: 500 })
        }
      }

      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        amount_usd: amountUsd,
        type: 'credit',
        description: `Wallet top-up $${amountUsd} (test mode)`,
        payment_id: `test_${Date.now()}`,
      })

      return NextResponse.json({
        testMode: true,
        message: `$${amountUsd} credited to wallet (dev test mode)`,
      })
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })

    const order = await instance.orders.create({
      amount: Math.round(amountInr * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: { userId: user.id, amountUsd: String(amountUsd) },
    })

    return NextResponse.json({ order })
  } catch (error: any) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
