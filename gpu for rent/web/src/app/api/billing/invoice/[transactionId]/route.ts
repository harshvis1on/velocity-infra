import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const VELOCITY_GSTIN = process.env.VELOCITY_GSTIN || '27AABCU9603R1ZM'
const VELOCITY_SAC = '998314'
const VELOCITY_LEGAL = 'Velocity Cloud Infrastructure Private Limited'
const VELOCITY_ADDRESS = 'Mumbai, Maharashtra, India'

export async function GET(
  request: Request,
  { params }: { params: { transactionId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tx, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', params.transactionId)
    .eq('user_id', user.id)
    .single()

  if (error || !tx) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, phone, company_name, gstin, billing_address')
    .eq('id', user.id)
    .single()

  const amountInr = Number(tx.amount_inr)
  const invoiceNumber = `VI-${new Date(tx.created_at).getFullYear()}-${tx.id.substring(0, 8).toUpperCase()}`
  const baseAmount = amountInr / 1.18
  const gstAmount = amountInr - baseAmount
  const cgst = gstAmount / 2
  const sgst = gstAmount / 2

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: auto; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #000; }
    .logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .logo span { color: #00ff88; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 28px; color: #333; }
    .invoice-title .number { font-size: 14px; color: #666; margin-top: 4px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { width: 45%; }
    .party h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
    .party p { font-size: 13px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f5f5f5; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; border-bottom: 1px solid #ddd; }
    td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
    .amount { text-align: right; font-family: monospace; }
    .total-row td { font-weight: 700; border-top: 2px solid #000; font-size: 15px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 11px; color: #999; }
    .gst-note { background: #f8f8f8; padding: 16px; border-radius: 4px; margin-bottom: 20px; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Velocity<span>Infra</span></div>
    <div class="invoice-title">
      <h1>TAX INVOICE</h1>
      <div class="number">${invoiceNumber}</div>
      <div class="number">${new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>From</h3>
      <p><strong>${VELOCITY_LEGAL}</strong></p>
      <p>${VELOCITY_ADDRESS}</p>
      <p>GSTIN: ${VELOCITY_GSTIN}</p>
      <p>SAC: ${VELOCITY_SAC}</p>
    </div>
    <div class="party">
      <h3>Bill To</h3>
      <p><strong>${profile?.company_name || profile?.full_name || user.email}</strong></p>
      <p>${profile?.billing_address || ''}</p>
      ${profile?.gstin ? `<p>GSTIN: ${profile.gstin}</p>` : ''}
      <p>${profile?.email || user.email}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>SAC Code</th>
        <th class="amount">Amount (INR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${tx.type === 'deposit' ? 'Wallet Top-Up — GPU Cloud Computing Credits' : 'GPU Compute Usage'}</td>
        <td>${VELOCITY_SAC}</td>
        <td class="amount">₹${baseAmount.toFixed(2)}</td>
      </tr>
      <tr>
        <td>CGST @ 9%</td>
        <td></td>
        <td class="amount">₹${cgst.toFixed(2)}</td>
      </tr>
      <tr>
        <td>SGST @ 9%</td>
        <td></td>
        <td class="amount">₹${sgst.toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="2">Total</td>
        <td class="amount">₹${amountInr.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="gst-note">
    <strong>GST Summary:</strong> Taxable Value ₹${baseAmount.toFixed(2)} | CGST @9%: ₹${cgst.toFixed(2)} | SGST @9%: ₹${sgst.toFixed(2)} | Total Tax: ₹${gstAmount.toFixed(2)}
    ${profile?.gstin ? '<br><strong>ITC Eligible:</strong> Yes — GSTIN registered buyer.' : ''}
  </div>

  <div class="footer">
    <p>Payment Reference: ${tx.razorpay_payment_id || tx.reference_id || tx.id}</p>
    <p>Payment Method: ${tx.type === 'deposit' ? 'UPI / Razorpay' : 'Wallet Deduction'}</p>
    <p style="margin-top: 8px;">This is a computer-generated invoice and does not require a physical signature.</p>
    <p>${VELOCITY_LEGAL} | ${VELOCITY_ADDRESS} | support@velocityinfra.in</p>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${invoiceNumber}.html"`,
    },
  })
}
