import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session?.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('kyc_status, role')
        .eq('id', session.user.id)
        .single()

      if (profile?.kyc_status === 'pending') {
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      if (profile?.role === 'host') {
        return NextResponse.redirect(`${origin}/host/dashboard`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/console`)
}
