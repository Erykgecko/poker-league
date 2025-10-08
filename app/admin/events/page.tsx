import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClientReadOnly, createSupabaseActionClient } from '@/lib/supabaseServer'

type EventRow = {
  id: string
  title: string
  event_date: string
  venue: string | null
  buy_in_cents: number
  rake_cents: number | null
}

async function getEvents(): Promise<EventRow[]> {
  const supabase = await createSupabaseServerClientReadOnly()
  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_date, venue, buy_in_cents, rake_cents')
    .order('event_date', { ascending: false })

  if (error) throw new Error(`Events query failed: ${error.message}`)
  return (data ?? []) as EventRow[]
}

// Server Action: creates an event as the *logged-in user* (RLS enforces admin)
async function createEvent(formData: FormData) {
  'use server'

  const supabase = await createSupabaseActionClient()

  // Must be logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be logged in.')
  }

  // Must be admin (db also enforces this via RLS, this is just a friendly guard)
  const { data: myRole, error: roleErr } = await supabase
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (roleErr || myRole?.role !== 'admin') {
    throw new Error('Not authorized.')
  }

  const title = String(formData.get('title') ?? '').trim()
  const event_date = String(formData.get('event_date') ?? '')
  const venue = String(formData.get('venue') ?? '').trim() || null
  const buyInGBP = parseFloat(String(formData.get('buy_in') ?? '0')) || 0
  const rakeGBP  = parseFloat(String(formData.get('rake') ?? '0')) || 0

  if (!title || !event_date) {
    throw new Error('Title and Date are required.')
  }

  const { error: insertErr } = await supabase.from('events').insert({
    title,
    event_date, // yyyy-mm-dd
    venue,
    buy_in_cents: Math.round(buyInGBP * 100),
    rake_cents: Math.round(rakeGBP * 100),
  })
  if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`)

  // Refresh admin list and public list
  revalidatePath('/admin/events')
  revalidatePath('/events')
}

export const revalidate = 0 // always fresh for admin

export default async function AdminEventsPage() {
  const supabase = await createSupabaseServerClientReadOnly()

  // Redirect to /login if not signed in (layout also protects /admin/*)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p>Please <Link href="/login" className="text-blue-600 underline">log in</Link>.</p>
      </main>
    )
  }

  const { data: myRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const isAdmin = myRole?.role === 'admin'
  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-red-600">You do not have access to this page.</p>
      </main>
    )
  }

  const events = await getEvents()

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Admin • Events</h1>

      <form action={createEvent} className="mb-8 grid gap-3 rounded-2xl border p-4">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input name="title" className="mt-1 w-full rounded border p-2" placeholder="Weekly League #12" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Date</label>
            <input name="event_date" type="date" className="mt-1 w-full rounded border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Venue (optional)</label>
            <input name="venue" className="mt-1 w-full rounded border p-2" placeholder="Clubhouse" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Buy-in (£)</label>
            <input name="buy_in" type="number" step="0.01" className="mt-1 w-full rounded border p-2" placeholder="20" />
          </div>
          <div>
            <label className="block text-sm font-medium">Rake (£)</label>
            <input name="rake" type="number" step="0.01" className="mt-1 w-full rounded border p-2" placeholder="2" />
          </div>
        </div>

        <button className="mt-2 rounded-lg bg-black px-4 py-2 text-white">
          Create event
        </button>
      </form>

      <h2 className="mb-2 text-xl font-semibold">Recent events</h2>
      {events.length === 0 ? (
        <p className="text-gray-600">No events yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Venue</th>
                <th className="px-4 py-3">Buy-in</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const date = new Date(ev.event_date).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'short', day: 'numeric'
                })
                const buyIn = (ev.buy_in_cents / 100).toLocaleString(undefined, {
                  style: 'currency', currency: 'GBP'
                })
                return (
                  <tr key={ev.id} className="border-t">
                    <td className="px-4 py-3">{date}</td>
                    <td className="px-4 py-3">{ev.title}</td>
                    <td className="px-4 py-3">{ev.venue ?? '—'}</td>
                    <td className="px-4 py-3">{buyIn}</td>
                    <td className="px-4 py-3">
                      <Link className="text-blue-600 hover:underline" href={`/events/${ev.id}`}>
            View
          </Link>
          <span className="mx-2 text-gray-400">·</span>
          <Link className="text-blue-600 hover:underline" href={`/admin/events/${ev.id}/entries`}>
            Entries
          </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
