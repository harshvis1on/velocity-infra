'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { phoneSchema, otpSchema, panSchema, gstinSchema } from '@/lib/validations'
import twilio from 'twilio'

const basicInfoSchema = z.object({
  role: z.enum(['renter', 'host']),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  companyName: z.string().max(200).optional().or(z.literal('')),
  gstin: gstinSchema,
})

export async function saveBasicInfo(data: {
  role: string
  fullName: string
  companyName?: string
  gstin?: string
}) {
  const parsed = basicInfoSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues.map(i => i.message).join(', ') }
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('users')
    .update({
      role: parsed.data.role,
      full_name: parsed.data.fullName,
      company_name: parsed.data.companyName || null,
      gstin: parsed.data.gstin || null,
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error saving basic info:', error)
    return { error: 'Failed to save profile information.' }
  }

  revalidatePath('/onboarding')
  return { success: true }
}

export async function sendPhoneOTP(phone: string) {
  const parsed = phoneSchema.safeParse(phone)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000))
  console.log(`[OTP] Phone: +91${phone} | OTP: ${otp}`)

  // Send SMS via Twilio if configured
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      await client.messages.create({
        body: `Your Velocity Infra verification code is ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+91${phone}`
      })
    } catch (err) {
      console.error('Twilio SMS Error:', err)
      return { error: 'Failed to send SMS. Please check your number or try again later.' }
    }
  }

  // Store OTP in user metadata
  const { error } = await supabase
    .from('users')
    .update({
      phone: phone,
      phone_otp: otp,
      phone_otp_sent_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error storing OTP:', error)
    return { error: 'Failed to send OTP. Please try again.' }
  }

  return { success: true }
}

export async function verifyPhoneOTP(phone: string, otp: string) {
  const phoneResult = phoneSchema.safeParse(phone)
  if (!phoneResult.success) {
    return { error: phoneResult.error.issues[0].message }
  }

  const otpResult = otpSchema.safeParse(otp)
  if (!otpResult.success) {
    return { error: otpResult.error.issues[0].message }
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('phone_otp, phone_otp_sent_at')
    .eq('id', user.id)
    .single()

  // Allow '123456' bypass only in development, otherwise require actual OTP match
  const isDev = process.env.NODE_ENV === 'development'
  const isValidOTP = (isDev && otp === '123456') || otp === profile?.phone_otp

  if (!isValidOTP) {
    return { error: 'Invalid OTP. Please try again.' }
  }

  // Check OTP expiry (10 minutes)
  if (profile?.phone_otp_sent_at) {
    const sentAt = new Date(profile.phone_otp_sent_at).getTime()
    const now = Date.now()
    if (now - sentAt > 10 * 60 * 1000) {
      return { error: 'OTP has expired. Please request a new one.' }
    }
  }

  const { error } = await supabase
    .from('users')
    .update({
      phone: phone,
      phone_verified: true,
      phone_verified_at: new Date().toISOString(),
      phone_otp: null,
      phone_otp_sent_at: null,
      kyc_tier: 'phone_verified',
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error verifying phone:', error)
    return { error: 'Failed to verify phone. Please try again.' }
  }

  revalidatePath('/onboarding')
  return { success: true }
}

export async function verifyPAN(panNumber: string) {
  const parsed = panSchema.safeParse(panNumber.toUpperCase())
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify role is host
  const { data: profile } = await supabase
    .from('users')
    .select('role, phone_verified')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'host') {
    return { error: 'PAN verification is only required for hosts.' }
  }

  if (!profile?.phone_verified) {
    return { error: 'Please verify your phone number first.' }
  }

  // For MVP: validate format and store (production: call Signzy/Karza API)
  const { error } = await supabase
    .from('users')
    .update({
      pan_number: parsed.data,
      pan_verified: true,
      pan_verified_at: new Date().toISOString(),
      kyc_tier: 'id_verified',
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error verifying PAN:', error)
    return { error: 'Failed to save PAN details.' }
  }

  revalidatePath('/onboarding')
  return { success: true }
}

export async function completeOnboarding() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, phone_verified, pan_verified')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profile not found.' }
  }

  const { error } = await supabase
    .from('users')
    .update({ kyc_status: 'completed' })
    .eq('id', user.id)

  if (error) {
    console.error('Error completing onboarding:', error)
    return { error: 'Failed to complete onboarding.' }
  }

  revalidatePath('/onboarding')

  const redirectPath = profile.role === 'host' ? '/host/dashboard' : '/console'
  return { success: true, redirectPath }
}
