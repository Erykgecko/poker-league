import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  // We will return *this* response and attach Set-Cookie headers to it
  const response = NextResponse.redirect(new URL('/admin', url.origin))

  if (!code) {
    return response
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // read cookies from the incoming request
        getAll() {
          return cookieStore.getAll()
        },
        // write cookies onto the *response* we return
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  // Helpful debugging: if Supabase refused the code, show it clearly
  if (error || !data?.session) {
    return new NextResponse(
      `Auth error: ${error?.message ?? 'no session returned'}`,
      { status: 400 }
    )
  }

  return response
}