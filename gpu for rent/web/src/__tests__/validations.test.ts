import { describe, it, expect } from 'vitest'
import {
  phoneSchema,
  panSchema,
  gstinSchema,
  otpSchema,
  addMachineSchema,
  createOfferSchema,
  updateOfferSchema,
  createRentalSchema,
  maintenanceWindowSchema,
  deployInstanceSchema,
  addFundsSchema,
} from '@/lib/validations'

describe('Validation Schemas', () => {
  describe('phoneSchema', () => {
    it('accepts valid phone numbers', () => {
      expect(phoneSchema.safeParse('9876543210').success).toBe(true)
      expect(phoneSchema.safeParse('1234567').success).toBe(true)
    })

    it('rejects too short', () => {
      expect(phoneSchema.safeParse('123456').success).toBe(false)
    })

    it('rejects non-digits', () => {
      expect(phoneSchema.safeParse('98765abc10').success).toBe(false)
    })

    it('rejects too long', () => {
      expect(phoneSchema.safeParse('1234567890123456').success).toBe(false)
    })
  })

  describe('panSchema', () => {
    it('accepts valid PAN', () => {
      expect(panSchema.safeParse('ABCDE1234F').success).toBe(true)
    })

    it('rejects lowercase', () => {
      expect(panSchema.safeParse('abcde1234f').success).toBe(false)
    })

    it('rejects wrong format', () => {
      expect(panSchema.safeParse('12345ABCDE').success).toBe(false)
    })
  })

  describe('gstinSchema', () => {
    it('accepts valid GSTIN', () => {
      expect(gstinSchema.safeParse('27AABCU9603R1ZM').success).toBe(true)
    })

    it('accepts empty string (optional)', () => {
      expect(gstinSchema.safeParse('').success).toBe(true)
    })

    it('accepts undefined (optional)', () => {
      expect(gstinSchema.safeParse(undefined).success).toBe(true)
    })

    it('rejects invalid format', () => {
      expect(gstinSchema.safeParse('INVALID').success).toBe(false)
    })
  })

  describe('otpSchema', () => {
    it('accepts 6-digit OTP', () => {
      expect(otpSchema.safeParse('123456').success).toBe(true)
    })

    it('rejects non-6-digit', () => {
      expect(otpSchema.safeParse('12345').success).toBe(false)
      expect(otpSchema.safeParse('1234567').success).toBe(false)
    })

    it('rejects non-numeric', () => {
      expect(otpSchema.safeParse('abcdef').success).toBe(false)
    })
  })

  describe('addMachineSchema', () => {
    const validMachine = {
      gpu_model: 'RTX 4090',
      gpu_count: 2,
      vram_gb: 24,
      ram_gb: 64,
      vcpu_count: 16,
      storage_gb: 1000,
      location: 'Mumbai, India',
      price_per_hour_usd: 0.55,
      storage_price_per_gb_hr: 0.001,
      min_gpu: 1,
    }

    it('accepts valid machine', () => {
      expect(addMachineSchema.safeParse(validMachine).success).toBe(true)
    })

    it('rejects missing gpu_model', () => {
      const { gpu_model, ...rest } = validMachine
      expect(addMachineSchema.safeParse(rest).success).toBe(false)
    })

    it('rejects zero gpu_count', () => {
      expect(addMachineSchema.safeParse({ ...validMachine, gpu_count: 0 }).success).toBe(false)
    })

    it('rejects negative price', () => {
      expect(addMachineSchema.safeParse({ ...validMachine, price_per_hour_usd: -1 }).success).toBe(false)
    })
  })

  describe('createOfferSchema', () => {
    const validOffer = {
      machineId: '550e8400-e29b-41d4-a716-446655440000',
      pricePerGpuHrUsd: 0.55,
      storagePricePerGbMonthUsd: 4.5,
      bandwidthUploadPricePerGbUsd: 0,
      bandwidthDownloadPricePerGbUsd: 0,
      minGpu: 1,
      offerEndDate: '2027-01-01T00:00:00.000Z',
      reservedDiscountFactor: 0.4,
    }

    it('accepts valid offer', () => {
      expect(createOfferSchema.safeParse(validOffer).success).toBe(true)
    })

    it('rejects non-uuid machineId', () => {
      expect(createOfferSchema.safeParse({ ...validOffer, machineId: 'not-a-uuid' }).success).toBe(false)
    })

    it('rejects zero price', () => {
      expect(createOfferSchema.safeParse({ ...validOffer, pricePerGpuHrUsd: 0 }).success).toBe(false)
    })

    it('rejects non-power-of-2 minGpu', () => {
      expect(createOfferSchema.safeParse({ ...validOffer, minGpu: 3 }).success).toBe(false)
    })

    it('accepts power-of-2 minGpu values', () => {
      for (const v of [1, 2, 4, 8, 16]) {
        expect(createOfferSchema.safeParse({ ...validOffer, minGpu: v }).success).toBe(true)
      }
    })
  })

  describe('updateOfferSchema', () => {
    it('accepts partial updates', () => {
      expect(updateOfferSchema.safeParse({ pricePerGpuHrUsd: 1.20 }).success).toBe(true)
    })

    it('accepts empty object', () => {
      expect(updateOfferSchema.safeParse({}).success).toBe(true)
    })

    it('rejects invalid discount factor', () => {
      expect(updateOfferSchema.safeParse({ reservedDiscountFactor: 1.5 }).success).toBe(false)
    })
  })

  describe('createRentalSchema', () => {
    const validRental = {
      offerId: '550e8400-e29b-41d4-a716-446655440000',
      gpuCount: 1,
      templateId: '550e8400-e29b-41d4-a716-446655440001',
      diskSize: 50,
      launchMode: 'ssh' as const,
    }

    it('accepts valid rental', () => {
      expect(createRentalSchema.safeParse(validRental).success).toBe(true)
    })

    it('rejects invalid launchMode', () => {
      expect(createRentalSchema.safeParse({ ...validRental, launchMode: 'invalid' }).success).toBe(false)
    })

    it('accepts optional bidPriceUsd', () => {
      expect(createRentalSchema.safeParse({ ...validRental, bidPriceUsd: 0.45 }).success).toBe(true)
    })

    it('accepts all rental types', () => {
      for (const rt of ['on_demand', 'reserved', 'interruptible']) {
        expect(createRentalSchema.safeParse({ ...validRental, rentalType: rt }).success).toBe(true)
      }
    })
  })

  describe('maintenanceWindowSchema', () => {
    it('accepts valid window', () => {
      expect(maintenanceWindowSchema.safeParse({
        machineId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: '2027-01-01T00:00:00.000Z',
        durationHrs: 4,
      }).success).toBe(true)
    })

    it('rejects zero duration', () => {
      expect(maintenanceWindowSchema.safeParse({
        machineId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: '2027-01-01T00:00:00.000Z',
        durationHrs: 0,
      }).success).toBe(false)
    })
  })

  describe('deployInstanceSchema', () => {
    const validDeploy = {
      machineId: '550e8400-e29b-41d4-a716-446655440000',
      templateId: '550e8400-e29b-41d4-a716-446655440001',
      diskSize: 50,
      launchMode: 'ssh' as const,
    }

    it('accepts valid deploy', () => {
      expect(deployInstanceSchema.safeParse(validDeploy).success).toBe(true)
    })

    it('rejects disk below 10', () => {
      expect(deployInstanceSchema.safeParse({ ...validDeploy, diskSize: 5 }).success).toBe(false)
    })

    it('accepts optional gpuCount', () => {
      expect(deployInstanceSchema.safeParse({ ...validDeploy, gpuCount: 4 }).success).toBe(true)
    })
  })

  describe('addFundsSchema', () => {
    it('accepts valid deposit', () => {
      expect(addFundsSchema.safeParse({ amountUsd: 25, paymentId: 'pay_abc123' }).success).toBe(true)
    })

    it('rejects amount below $10 minimum', () => {
      expect(addFundsSchema.safeParse({ amountUsd: 5, paymentId: 'pay_abc123' }).success).toBe(false)
    })

    it('accepts $10 exactly', () => {
      expect(addFundsSchema.safeParse({ amountUsd: 10, paymentId: 'pay_abc123' }).success).toBe(true)
    })

    it('rejects missing paymentId', () => {
      expect(addFundsSchema.safeParse({ amountUsd: 100 }).success).toBe(false)
    })
  })
})
