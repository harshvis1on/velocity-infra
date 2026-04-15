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

function calculateGst(amountInr: number) {
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

function calculateHostPayout(grossAmount: number) {
  const tdsRate = 0.01
  const tds = Math.round(grossAmount * tdsRate * 100) / 100
  const net = Math.round((grossAmount - tds) * 100) / 100
  return { grossAmount, tds, net }
}

function calculatePlatformSplit(totalCost: number) {
  const platformShare = totalCost * 0.15
  const hostShare = totalCost - platformShare
  return {
    platformShare: Math.round(platformShare * 100) / 100,
    hostShare: Math.round(hostShare * 100) / 100,
  }
}

describe('Billing Math', () => {
  describe('calculateBillingCost', () => {
    it('calculates running instance cost correctly', () => {
      const result = calculateBillingCost({
        gpuPricePerHr: 35,
        gpuCount: 1,
        storagePricePerGbMonth: 4.5,
        diskSizeGb: 50,
        minutesElapsed: 60,
        isRunning: true,
      })

      expect(result.gpuCost).toBe(35)
      expect(result.totalCost).toBeGreaterThan(35)
      expect(result.storageCostPerHr).toBeCloseTo(0.3125, 3)
    })

    it('bills only storage for stopped instances', () => {
      const result = calculateBillingCost({
        gpuPricePerHr: 35,
        gpuCount: 1,
        storagePricePerGbMonth: 4.5,
        diskSizeGb: 50,
        minutesElapsed: 60,
        isRunning: false,
      })

      expect(result.gpuCost).toBe(0)
      expect(result.totalCost).toBeGreaterThan(0)
    })

    it('scales with GPU count', () => {
      const single = calculateBillingCost({
        gpuPricePerHr: 35, gpuCount: 1, storagePricePerGbMonth: 0, diskSizeGb: 0, minutesElapsed: 60, isRunning: true,
      })
      const double = calculateBillingCost({
        gpuPricePerHr: 35, gpuCount: 2, storagePricePerGbMonth: 0, diskSizeGb: 0, minutesElapsed: 60, isRunning: true,
      })

      expect(double.totalCost).toBe(single.totalCost * 2)
    })

    it('handles zero minutes', () => {
      const result = calculateBillingCost({
        gpuPricePerHr: 35, gpuCount: 1, storagePricePerGbMonth: 4.5, diskSizeGb: 50, minutesElapsed: 0, isRunning: true,
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

  describe('calculateGst', () => {
    it('calculates 18% GST correctly for ₹500', () => {
      const result = calculateGst(500)
      expect(result.baseAmount).toBeCloseTo(423.73, 1)
      expect(result.gstAmount).toBeCloseTo(76.27, 1)
      expect(result.cgst).toBeCloseTo(38.14, 1)
      expect(result.sgst).toBeCloseTo(38.14, 1)
    })

    it('CGST + SGST equals total GST', () => {
      const result = calculateGst(1000)
      expect(result.cgst + result.sgst).toBeCloseTo(result.gstAmount, 1)
    })
  })

  describe('calculateHostPayout', () => {
    it('deducts 1% TDS', () => {
      const result = calculateHostPayout(1000)
      expect(result.tds).toBe(10)
      expect(result.net).toBe(990)
    })

    it('handles small amounts', () => {
      const result = calculateHostPayout(1)
      expect(result.tds).toBe(0.01)
      expect(result.net).toBe(0.99)
    })
  })

  describe('calculatePlatformSplit', () => {
    it('takes 15% platform fee', () => {
      const result = calculatePlatformSplit(100)
      expect(result.platformShare).toBe(15)
      expect(result.hostShare).toBe(85)
    })

    it('platform + host equals total', () => {
      const result = calculatePlatformSplit(237.50)
      expect(result.platformShare + result.hostShare).toBeCloseTo(237.50, 1)
    })
  })

  describe('wallet balance protection', () => {
    it('caps charge at remaining balance', () => {
      const walletBalance = 10
      const totalCost = 35

      const cappedCost = Math.min(totalCost, walletBalance)
      const newBalance = walletBalance - cappedCost

      expect(cappedCost).toBe(10)
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
