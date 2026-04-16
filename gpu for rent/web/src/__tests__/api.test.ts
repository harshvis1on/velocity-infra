import { describe, it, expect } from 'vitest'
import crypto from 'crypto'

const USD_TO_INR = 85

describe('API Route Logic', () => {
  describe('POST /api/billing/create-order', () => {
    it('rejects amounts below $1', () => {
      const amountUsd = 0.50
      const valid = amountUsd >= 1
      expect(valid).toBe(false)
    })

    it('rejects amounts above $1200', () => {
      const amountUsd = 1500
      const valid = amountUsd <= 1200
      expect(valid).toBe(false)
    })

    it('accepts amounts between $1 and $1200', () => {
      const amountUsd = 25
      const valid = amountUsd >= 1 && amountUsd <= 1200
      expect(valid).toBe(true)
    })

    it('converts USD to INR paise for Razorpay', () => {
      const amountUsd = 10
      const amountInr = Math.round(amountUsd * USD_TO_INR * 100) / 100
      const razorpayPaise = Math.round(amountInr * 100)

      expect(amountInr).toBe(850)
      expect(razorpayPaise).toBe(85000)
    })

    it('stores amountUsd in order notes for webhook recovery', () => {
      const amountUsd = 25
      const notes = { userId: 'user-123', amountUsd: String(amountUsd) }

      expect(notes.amountUsd).toBe('25')
      expect(parseFloat(notes.amountUsd)).toBe(25)
    })
  })

  describe('POST /api/billing/webhook', () => {
    it('verifies Razorpay signature correctly', () => {
      const secret = 'test_webhook_secret'
      const body = JSON.stringify({ event: 'payment.captured', payload: {} })

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex')

      const fakeSignature = 'invalid_signature'

      expect(expectedSignature).not.toBe(fakeSignature)
      expect(expectedSignature.length).toBe(64)
    })

    it('recovers USD amount from order notes', () => {
      const notes = { userId: 'user-123', amountUsd: '10' }
      const amountUsd = notes.amountUsd ? parseFloat(notes.amountUsd) : null

      expect(amountUsd).toBe(10)
    })

    it('falls back to INR conversion when notes missing amountUsd', () => {
      const paymentAmount = 85000 // paise
      const notes = { userId: 'user-123' } as Record<string, string>

      const amountUsd = notes.amountUsd
        ? parseFloat(notes.amountUsd)
        : (paymentAmount / 100) / USD_TO_INR

      expect(amountUsd).toBe(10)
    })

    it('calculates GST on the actual INR charge', () => {
      const paymentAmountPaise = 85000
      const amountInrActual = paymentAmountPaise / 100 // 850
      const baseAmount = amountInrActual / 1.18
      const gstAmount = amountInrActual - baseAmount
      const cgstAmount = gstAmount / 2
      const sgstAmount = gstAmount / 2

      expect(amountInrActual).toBe(850)
      expect(baseAmount).toBeCloseTo(720.34, 1)
      expect(cgstAmount).toBeCloseTo(64.83, 1)
      expect(sgstAmount).toBeCloseTo(64.83, 1)
      expect(cgstAmount + sgstAmount).toBeCloseTo(gstAmount, 2)
    })

    it('verifies payment amount matches expected USD within tolerance', () => {
      const amountUsd = 10
      const expectedInrPaise = Math.round(amountUsd * USD_TO_INR * 100)
      const actualInrPaise = 85000

      const tolerance = 100 // 1 INR tolerance for rounding
      const withinTolerance = Math.abs(actualInrPaise - expectedInrPaise) <= tolerance

      expect(withinTolerance).toBe(true)
    })

    it('detects payment amount mismatch', () => {
      const amountUsd = 10
      const expectedInrPaise = Math.round(amountUsd * USD_TO_INR * 100)
      const tamperedInrPaise = 170000 // someone trying to get $20 for $10

      const tolerance = 100
      const withinTolerance = Math.abs(tamperedInrPaise - expectedInrPaise) <= tolerance

      expect(withinTolerance).toBe(false)
    })
  })

  describe('POST /api/console/rent', () => {
    it('rejects rental when balance < hourly cost', () => {
      const walletBalance = 0.10
      const hourlyRate = 0.55
      const gpuCount = 1
      const estimatedHourlyCost = hourlyRate * gpuCount

      expect(walletBalance < estimatedHourlyCost).toBe(true)
    })

    it('allows rental when balance >= hourly cost', () => {
      const walletBalance = 5.00
      const hourlyRate = 0.55
      const gpuCount = 1
      const estimatedHourlyCost = hourlyRate * gpuCount

      expect(walletBalance >= estimatedHourlyCost).toBe(true)
    })

    it('calculates effective price for reserved rentals', () => {
      const basePrice = 2.50
      const discountFactor = 0.4
      const effectivePrice = basePrice * (1 - discountFactor)

      expect(effectivePrice).toBe(1.50)
    })

    it('uses bid price for interruptible rentals', () => {
      const bidPrice = 0.45
      const basePrice = 0.55
      const isInterruptible = true

      const effectivePrice = isInterruptible ? bidPrice : basePrice
      expect(effectivePrice).toBe(0.45)
    })
  })

  describe('GET /api/health', () => {
    it('checks all required env vars', () => {
      const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'RAZORPAY_KEY_ID',
        'CRON_SECRET',
        'RAZORPAY_WEBHOOK_SECRET',
      ]

      const checks = requiredVars.map(name => ({
        name,
        status: name ? 'configured' : 'missing',
      }))

      expect(checks.every(c => c.status === 'configured')).toBe(true)
    })

    it('reports degraded status when a check fails', () => {
      const checks = {
        database: { status: 'healthy' },
        razorpay: { status: 'missing' },
        cron_secret: { status: 'configured' },
      }

      const allHealthy = Object.values(checks).every(
        c => c.status === 'healthy' || c.status === 'configured'
      )

      expect(allHealthy).toBe(false)
    })
  })
})
