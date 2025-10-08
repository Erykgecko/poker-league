// lib/supabaseServer.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Use in Server Components (pages/layouts) – READ ONLY: no cookie writes */
export async function createSupabaseServerClientReadOnly() {
  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      // No-op: Server Components cannot write cookies
      setAll() {
        /* intentionally empty */
      },
    },
    db: { schema: 'poker_league' },
  })
}

/** Use in Server Actions / Route Handlers – cookie writes allowed */
export async function createSupabaseActionClient() {
  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
    db: { schema: 'poker_league' },
  })
}
