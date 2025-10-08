import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as
    | 'signup'
    | 'magiclink'
    | 'email'
    | 'recovery'
    | 'invite'
    | null

  // We'll attach Set-Cookie headers to THIS response
  const response = NextResponse.redirect(new URL('/admin', url.origin))

  if (!token_hash || !type) {
    // Missing params → send to login
    return NextResponse.redirect(new URL('/login', url.origin))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Exchange the token hash for a session (Magic Link / email)
  const { error, data } = await supabase.auth.verifyOtp({ token_hash, type })
  if (error || !data?.session) {
    return new NextResponse(`Auth error: ${error?.message ?? 'no session'}`, { status: 400 })
  }

  return response
}
