import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VELOCITY_GSTIN = process.env.VELOCITY_GSTIN || '27AABCU9603R1ZM'
const VELOCITY_SAC = '998314'
const VELOCITY_LEGAL = 'Velocity Cloud Infrastructure Private Limited'
const VELOCITY_ADDRESS = 'Mumbai, Maharashtra, India'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = String(d.getDate()).padStart(2, '0')
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function generateInvoiceNumber(createdAt: string, sequentialId: number): string {
  const d = new Date(createdAt)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const seq = String(sequentialId).padStart(6, '0')
  return `VEL-${yyyy}${mm}-${seq}`
}

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

  const { count } = await supabaseAdmin
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .lte('created_at', tx.created_at)

  const sequentialId = count ?? 1
  const invoiceNumber = generateInvoiceNumber(tx.created_at, sequentialId)
  const invoiceUrl = `/api/billing/invoice/${params.transactionId}`

  const amountInr = Number(tx.amount_inr)
  const baseAmount = amountInr / 1.18
  const gstAmount = amountInr - baseAmount
  const cgst = gstAmount / 2
  const sgst = gstAmount / 2
  const invoiceDate = formatDate(tx.created_at)

  await supabaseAdmin
    .from('transactions')
    .update({ invoice_url: invoiceUrl })
    .eq('id', params.transactionId)

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
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
    .print-btn { display: block; margin: 30px auto 0; padding: 12px 32px; background: #000; color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; letter-spacing: 0.3px; }
    .print-btn:hover { background: #333; }
    @media print {
      body { padding: 20px; }
      .print-btn { display: none !important; }
      @page { margin: 15mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Velocity<span>Infra</span></div>
    <div class="invoice-title">
      <h1>TAX INVOICE</h1>
      <div class="number">${invoiceNumber}</div>
      <div class="number">${invoiceDate}</div>
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
      <p><strong>${escapeHtml(profile?.company_name || profile?.full_name || user.email || '')}</strong></p>
      <p>${escapeHtml(profile?.billing_address || '')}</p>
      ${profile?.gstin ? `<p>GSTIN: ${escapeHtml(profile.gstin)}</p>` : ''}
      <p>${escapeHtml(profile?.email || user.email || '')}</p>
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
    <p>Invoice No: ${invoiceNumber} | Date: ${invoiceDate}</p>
    <p>Payment Reference: ${tx.razorpay_payment_id || tx.reference_id || tx.id}</p>
    <p>Payment Method: ${tx.type === 'deposit' ? 'UPI / Razorpay' : 'Wallet Deduction'}</p>
    <p style="margin-top: 8px;">This is a computer-generated invoice and does not require a physical signature.</p>
    <p>${VELOCITY_LEGAL} | ${VELOCITY_ADDRESS} | support@velocityinfra.in</p>
  </div>

  <button class="print-btn" onclick="window.print()">Download PDF</button>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${invoiceNumber}.html"`,
    },
  })
}
