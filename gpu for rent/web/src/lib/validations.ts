import { z } from 'zod'

export const phoneSchema = z.string()
  .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number')

export const panSchema = z.string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format (e.g., ABCDE1234F)')

export const gstinSchema = z.string()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Invalid GSTIN format')
  .optional()
  .or(z.literal(''))

export const otpSchema = z.string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d{6}$/, 'OTP must be numeric')

export const addMachineSchema = z.object({
  gpu_model: z.string().min(1, 'GPU model required').max(100),
  gpu_count: z.number().int().min(1).max(16),
  vram_gb: z.number().int().min(1).max(256),
  ram_gb: z.number().int().min(1).max(2048),
  vcpu_count: z.number().int().min(1).max(256),
  storage_gb: z.number().int().min(10).max(100000),
  location: z.string().min(1).max(200),
  price_per_hour_inr: z.number().positive().max(10000),
  storage_price_per_gb_hr: z.number().min(0).max(10),
  min_gpu: z.number().int().min(1).max(16),
})

export const createOfferSchema = z.object({
  machineId: z.string().uuid(),
  pricePerGpuHrInr: z.number().positive().max(50000),
  storagePricePerGbMonthInr: z.number().min(0).max(500).default(4.5),
  bandwidthUploadPricePerGbInr: z.number().min(0).max(100).default(0),
  bandwidthDownloadPricePerGbInr: z.number().min(0).max(100).default(0),
  minGpu: z.number().int().min(1).max(16).refine(
    (v) => (v & (v - 1)) === 0,
    { message: 'min_gpu must be a power of 2 (1, 2, 4, 8, 16)' }
  ),
  offerEndDate: z.string().datetime(),
  interruptibleMinPriceInr: z.number().positive().optional(),
  reservedDiscountFactor: z.number().min(0).max(1).default(0.4),
})

export const updateOfferSchema = z.object({
  pricePerGpuHrInr: z.number().positive().max(50000).optional(),
  storagePricePerGbMonthInr: z.number().min(0).max(500).optional(),
  bandwidthUploadPricePerGbInr: z.number().min(0).max(100).optional(),
  bandwidthDownloadPricePerGbInr: z.number().min(0).max(100).optional(),
  minGpu: z.number().int().min(1).max(16).refine(
    (v) => (v & (v - 1)) === 0,
    { message: 'min_gpu must be a power of 2' }
  ).optional(),
  offerEndDate: z.string().datetime().optional(),
  interruptibleMinPriceInr: z.number().positive().nullable().optional(),
  reservedDiscountFactor: z.number().min(0).max(1).optional(),
})

export const createRentalSchema = z.object({
  offerId: z.string().uuid(),
  gpuCount: z.number().int().min(1).max(16),
  templateId: z.string().uuid(),
  diskSize: z.number().int().min(10).max(100000),
  launchMode: z.enum(['ssh', 'jupyter', 'entrypoint', 'both', 'serverless', 'desktop']),
  rentalType: z.enum(['on_demand', 'reserved', 'interruptible']).default('on_demand'),
  bidPriceInr: z.number().positive().optional(),
  sshKeyId: z.string().uuid().optional(),
  newSshKey: z.string().max(10000).optional(),
})

export const maintenanceWindowSchema = z.object({
  machineId: z.string().uuid(),
  startDate: z.string().datetime(),
  durationHrs: z.number().positive().min(0.5).max(168),
})

export const deployInstanceSchema = z.object({
  machineId: z.string().uuid(),
  templateId: z.string().uuid(),
  diskSize: z.number().int().min(10).max(100000),
  gpuCount: z.number().int().min(1).max(16).optional(),
  launchMode: z.enum(['ssh', 'jupyter', 'entrypoint', 'both', 'serverless', 'desktop']),
  sshKeyId: z.string().uuid().optional(),
  newSshKey: z.string().max(10000).optional(),
})

export const addFundsSchema = z.object({
  amountInr: z.number().positive().min(10).max(1000000),
  paymentId: z.string().min(1).max(200),
})
