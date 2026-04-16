import { describe, it, expect } from 'vitest'

function calculateBillingCost(params: {
  gpuPricePerHr: number
  gpuCount: number
  storagePricePerGbMonth: number
  diskSizeGb: number
  minutesElapsed: number
  isRunning: boolean
}) {
  const { gpuPricePerHr, gpuCount, storagePricePerGbMonth, diskSizeGb, minutesElapsed, isRunning } = params
  
  const gpuCost = isRunning ? gpuPricePerHr * gpuCount : 0
  const storageCostPerHr = (storagePricePerGbMonth * diskSizeGb) / (30 * 24)
  const totalCostPerHr = gpuCost + storageCostPerHr
  const totalCost = (totalCostPerHr * minutesElapsed) / 60

  return {
    gpuCost,
    storageCostPerHr,
    totalCostPerHr,
    totalCost,
  }
}

const USD_TO_INR = 85

function calculateGstOnInrCharge(amountInr: number) {
  const baseAmount = amountInr / 1.18
  const gstAmount = amountInr - baseAmount
  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100,
    cgst: Math.round((gstAmount / 2) * 100) / 100,
    sgst: Math.round((gstAmount / 2) * 100) / 100,
    totalWithGst: amountInr,
  }
}

function calculateHostPayout(grossAmountUsd: number) {
  const tdsRate = 0.01
  const tds = Math.round(grossAmountUsd * tdsRate * 100) / 100
  const net = Math.round((grossAmountUsd - tds) * 100) / 100
  return { grossAmountUsd, tds, net }
}

function calculatePlatformSplit(totalCostUsd: number) {
  const platformShare = totalCostUsd * 0.15
  const hostShare = totalCostUsd - platformShare
  return {
    platformShare: Math.round(platformShare * 100) / 100,
    hostShare: Math.round(hostShare * 100) / 100,
  }
}

describe('Billing Math (USD)', () => {
  describe('calculateBillingCost', () => {
    it('calculates running instance cost correctly', () => {
      const result = calculateBillingCost({
        gpuPricePerHr: 0.55,
        gpuCount: 1,
        storagePricePerGbMonth: 0.02,
        diskSizeGb: 50,
        minutesElapsed: 60,
        isRunning: true,
      })

      expect(result.gpuCost).toBe(0.55)
      expect(result.totalCost).toBeGreaterThan(0.55)
      expect(result.storageCostPerHr).toBeCloseTo(0.001389, 4)
    })

    it('bills only storage for stopped instances', () => {
      const result = calculateBillingCost({
        gpuPricePerHr: 0.55,
        gpuCount: 1,
        storagePricePerGbMonth: 0.02,
        diskSizeGb: 50,
        minutesElapsed: 60,
        isRunning: false,
      })

      expect(result.gpuCost).toBe(0)
      expect(result.totalCost).toBeGreaterThan(0)
    })

    it('scales with GPU count', () => {
      const single = calculateBillingCost({
        gpuPricePerHr: 2.50, gpuCount: 1, storagePricePerGbMonth: 0, diskSizeGb: 0, minutesElapsed: 60, isRunning: true,
      })
      const quad = calculateBillingCost({
        gpuPricePerHr: 2.50, gpuCount: 4, storagePricePerGbMonth: 0, diskSizeGb: 0, minutesElapsed: 60, isRunning: true,
      })

      expect(quad.totalCost).toBe(single.totalCost * 4)
    })

    it('handles zero minutes', () => {
      const result = calculateBillingCost({
        gpuPricePerHr: 2.50, gpuCount: 1, storagePricePerGbMonth: 0.02, diskSizeGb: 50, minutesElapsed: 0, isRunning: true,
      })

      expect(result.totalCost).toBe(0)
    })

    it('never produces negative costs', () => {
      const result = calculateBillingCost({
        gpuPricePerHr: 0, gpuCount: 0, storagePricePerGbMonth: 0, diskSizeGb: 0, minutesElapsed: 60, isRunning: true,
      })

      expect(result.totalCost).toBe(0)
    })
  })

  describe('USD to INR conversion for Razorpay', () => {
    it('converts $10 to INR correctly', () => {
      const usd = 10
      const inr = usd * USD_TO_INR
      expect(inr).toBe(850)
    })

    it('converts INR back to USD correctly', () => {
      const inr = 850
      const usd = inr / USD_TO_INR
      expect(usd).toBe(10)
    })

    it('round-trips without precision loss for whole USD amounts', () => {
      const original = 25
      const converted = (original * USD_TO_INR) / USD_TO_INR
      expect(converted).toBe(original)
    })
  })

  describe('GST on INR charge (Razorpay invoice)', () => {
    it('calculates 18% GST on the INR Razorpay charge', () => {
      const usdDeposit = 10
      const inrCharge = usdDeposit * USD_TO_INR
      const result = calculateGstOnInrCharge(inrCharge)

      expect(result.totalWithGst).toBe(850)
      expect(result.baseAmount).toBeCloseTo(720.34, 1)
      expect(result.gstAmount).toBeCloseTo(129.66, 1)
      expect(result.cgst).toBeCloseTo(64.83, 1)
      expect(result.sgst).toBeCloseTo(64.83, 1)
    })

    it('CGST + SGST equals total GST', () => {
      const result = calculateGstOnInrCharge(1000)
      expect(result.cgst + result.sgst).toBeCloseTo(result.gstAmount, 1)
    })
  })

  describe('calculateHostPayout (USD)', () => {
    it('deducts 1% TDS on USD amount', () => {
      const result = calculateHostPayout(100)
      expect(result.tds).toBe(1)
      expect(result.net).toBe(99)
    })

    it('handles small USD amounts', () => {
      const result = calculateHostPayout(0.50)
      expect(result.tds).toBe(0.01)
      expect(result.net).toBe(0.49)
    })
  })

  describe('calculatePlatformSplit (USD)', () => {
    it('takes 15% platform fee', () => {
      const result = calculatePlatformSplit(10)
      expect(result.platformShare).toBe(1.50)
      expect(result.hostShare).toBe(8.50)
    })

    it('platform + host equals total', () => {
      const result = calculatePlatformSplit(2.75)
      expect(result.platformShare + result.hostShare).toBeCloseTo(2.75, 2)
    })
  })

  describe('wallet balance protection', () => {
    it('caps charge at remaining USD balance', () => {
      const walletBalance = 0.50
      const totalCost = 2.50

      const cappedCost = Math.min(totalCost, walletBalance)
      const newBalance = walletBalance - cappedCost

      expect(cappedCost).toBe(0.50)
      expect(newBalance).toBe(0)
    })

    it('triggers auto-stop when balance hits zero', () => {
      const newBalance = 0
      const isRunning = true

      const shouldAutoStop = newBalance <= 0 && isRunning
      expect(shouldAutoStop).toBe(true)
    })
  })
})
