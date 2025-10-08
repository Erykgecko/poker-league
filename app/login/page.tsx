'use client'

import { createClient } from '@supabase/supabase-js'
import { useState } from 'react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Supabase will redirect back to this path with a code in the URL:
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })
    if (error) setErr(error.message)
    else setSent(true)
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-bold">Admin Login</h1>
      {sent ? (
        <p>Check your email for a login link.</p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-3">
          <input
            type="email"
            placeholder="you@example.com"
            className="rounded border p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {err && <p className="text-red-600">{err}</p>}
          <button className="rounded bg-black px-4 py-2 text-white">Send magic link</button>
        </form>
      )}
    </main>
  )
}
