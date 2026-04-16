import { describe, it, expect } from 'vitest'
import { formatUSD, usdToInr, inrToUsd, USD_TO_INR } from '@/lib/currency'

describe('Currency Utilities', () => {
  describe('USD_TO_INR constant', () => {
    it('is 85', () => {
      expect(USD_TO_INR).toBe(85)
    })
  })

  describe('formatUSD', () => {
    it('formats basic amount with 2 decimals', () => {
      expect(formatUSD(10)).toBe('$10.00')
    })

    it('formats zero', () => {
      expect(formatUSD(0)).toBe('$0.00')
    })

    it('formats small amounts', () => {
      expect(formatUSD(0.45)).toBe('$0.45')
    })

    it('respects custom decimals', () => {
      expect(formatUSD(10, { decimals: 0 })).toBe('$10')
      expect(formatUSD(1.5, { decimals: 3 })).toBe('$1.500')
    })

    it('appends suffix', () => {
      expect(formatUSD(0.55, { suffix: '/hr' })).toBe('$0.55/hr')
      expect(formatUSD(2.50, { suffix: '/GPU/hr' })).toBe('$2.50/GPU/hr')
    })

    it('uses compact format for values >= 1000', () => {
      expect(formatUSD(1500, { compact: true })).toBe('$1.5k')
      expect(formatUSD(800, { compact: true, suffix: '/mo' })).toBe('$800.00/mo')
    })

    it('does not compact values below 1000', () => {
      expect(formatUSD(999, { compact: true })).toBe('$999.00')
    })

    it('combines compact with suffix', () => {
      expect(formatUSD(2500, { compact: true, suffix: '/mo' })).toBe('$2.5k/mo')
    })
  })

  describe('usdToInr', () => {
    it('converts $1 to ₹85', () => {
      expect(usdToInr(1)).toBe(85)
    })

    it('converts $10 to ₹850', () => {
      expect(usdToInr(10)).toBe(850)
    })

    it('converts $0 to ₹0', () => {
      expect(usdToInr(0)).toBe(0)
    })

    it('handles fractional USD', () => {
      expect(usdToInr(0.55)).toBeCloseTo(46.75, 2)
    })
  })

  describe('inrToUsd', () => {
    it('converts ₹85 to $1', () => {
      expect(inrToUsd(85)).toBe(1)
    })

    it('converts ₹850 to $10', () => {
      expect(inrToUsd(850)).toBe(10)
    })

    it('converts ₹0 to $0', () => {
      expect(inrToUsd(0)).toBe(0)
    })

    it('handles non-round amounts', () => {
      expect(inrToUsd(100)).toBeCloseTo(1.176, 2)
    })
  })

  describe('round-trip conversion', () => {
    it('preserves value through usd -> inr -> usd', () => {
      const original = 25
      expect(inrToUsd(usdToInr(original))).toBe(original)
    })

    it('preserves value through inr -> usd -> inr', () => {
      const original = 850
      expect(usdToInr(inrToUsd(original))).toBe(original)
    })
  })
})
