import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amountInr } = body

    if (!amountInr || amountInr < 100) {
      return NextResponse.json({ error: 'Minimum amount is ₹100' }, { status: 400 })
    }

    if (amountInr > 100000) {
      return NextResponse.json({ error: 'Maximum single top-up is ₹1,00,000' }, { status: 400 })
    }

    const hasRazorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET

    if (hasRazorpay) {
      const instance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      })

      const order = await instance.orders.create({
        amount: amountInr * 100,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: { userId: user.id },
      })

      return NextResponse.json({ order })
    }

    // Test mode: directly credit wallet when Razorpay isn't configured
    const { error: rpcError } = await supabase.rpc('credit_wallet', {
      p_user_id: user.id,
      p_amount: amountInr,
    })

    if (rpcError) {
      // Fallback: direct update if RPC doesn't exist
      const { data: current } = await supabase
        .from('users')
        .select('wallet_balance_inr')
        .eq('id', user.id)
        .single()

      const currentBalance = current?.wallet_balance_inr || 0

      const { error: updateError } = await supabase
        .from('users')
        .update({ wallet_balance_inr: currentBalance + amountInr })
        .eq('id', user.id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to credit wallet' }, { status: 500 })
      }
    }

    // Log the transaction (ignore errors if table doesn't exist)
    await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      amount_inr: amountInr,
      type: 'credit',
      description: 'Wallet top-up (test mode)',
      payment_id: `test_${Date.now()}`,
    })

    return NextResponse.json({
      testMode: true,
      message: `₹${amountInr} credited to wallet (test mode — Razorpay not configured)`,
    })
  } catch (error: any) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
