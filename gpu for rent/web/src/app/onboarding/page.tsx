import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import KYCOnboarding from './KYCOnboarding'

export default async function OnboardingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name, company_name, gstin, phone, phone_verified, pan_number, pan_verified, kyc_status, kyc_tier')
    .eq('id', user.id)
    .single()

  if (profile?.kyc_status === 'completed') {
    return redirect(profile.role === 'host' ? '/host/dashboard' : '/console')
  }

  return (
    <KYCOnboarding
      profile={{
        role: profile?.role ?? null,
        full_name: profile?.full_name ?? null,
        company_name: profile?.company_name ?? null,
        gstin: profile?.gstin ?? null,
        phone: profile?.phone ?? null,
        phone_verified: profile?.phone_verified ?? false,
        pan_number: profile?.pan_number ?? null,
        pan_verified: profile?.pan_verified ?? false,
        kyc_status: profile?.kyc_status ?? null,
        kyc_tier: profile?.kyc_tier ?? null,
      }}
    />
  )
}
