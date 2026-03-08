import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Create an unmodified response first so we can modify its cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                      request.nextUrl.pathname.startsWith('/signup');
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');
  const isOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding');

  const isOnboarded = user?.user_metadata?.onboarded === true;

  if (isDashboardRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is logged in but hasn't onboarded, force them to onboarding
  if (isDashboardRoute && user && !isOnboarded) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  if (isOnboardingRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is already onboarded, don't let them hit onboarding again
  if (isOnboardingRoute && user && isOnboarded) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isAuthRoute && user) {
    if (isOnboarded) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  return supabaseResponse
}
