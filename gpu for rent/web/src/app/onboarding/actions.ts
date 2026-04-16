'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const onboardingSchema = z.object({
  role: z.enum(['renter', 'host']),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  companyName: z.string().max(200).optional().or(z.literal('')),
})

export async function completeOnboarding(data: {
  role: string
  fullName: string
  companyName?: string
}) {
  const parsed = onboardingSchema.safeParse(data)
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
      kyc_status: 'completed',
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error completing onboarding:', error)
    return { error: 'Failed to save. Please try again.' }
  }

  revalidatePath('/onboarding')
  const redirectPath = parsed.data.role === 'host' ? '/host/dashboard' : '/console'
  return { success: true, redirectPath }
}
