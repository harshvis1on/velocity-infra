import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          supabaseResponse = NextResponse.next({ request })
          supabaseResponse.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          supabaseResponse = NextResponse.next({ request })
          supabaseResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const publicRoutes = ['/', '/login', '/signup', '/pricing', '/terms', '/privacy', '/auth/callback', '/auth/signout', '/host', '/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.some(r => pathname === r) || pathname.startsWith('/auth/') || pathname.startsWith('/docs') || pathname.startsWith('/host/setup')

  const protectedRoutes = ['/console', '/host/dashboard', '/host/datacenter-apply', '/billing', '/settings', '/onboarding']
  const isProtectedRoute = protectedRoutes.some(r => pathname.startsWith(r))

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && !isPublicRoute && !pathname.startsWith('/onboarding')) {
    const { data: profile } = await supabase
      .from('users')
      .select('kyc_status, kyc_tier, is_banned, phone_verified, role')
      .eq('id', user.id)
      .single()

    if (profile?.is_banned) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'Your account has been suspended. Contact support@velocity.infra')
      return NextResponse.redirect(url)
    }

    if (profile && profile.kyc_status === 'pending') {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }

    // Renters must have phone verified to use console
    if (pathname.startsWith('/console')) {
      if (profile?.role === 'host') {
        const url = request.nextUrl.clone()
        url.pathname = '/host/dashboard'
        return NextResponse.redirect(url)
      }
      if (!profile?.phone_verified) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        url.searchParams.set('message', 'Please verify your phone number to access the GPU marketplace.')
        return NextResponse.redirect(url)
      }
    }

    // Hosts must have full KYC (id_verified tier) to manage machines
    if (pathname.startsWith('/host/dashboard') || pathname.startsWith('/host/datacenter-apply')) {
      if (profile?.role === 'renter') {
        const url = request.nextUrl.clone()
        url.pathname = '/console'
        return NextResponse.redirect(url)
      }
      const tier = profile?.kyc_tier || 'none'
      if (tier !== 'id_verified' && tier !== 'enterprise') {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        url.searchParams.set('message', 'Hosts must complete PAN verification to list machines.')
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
