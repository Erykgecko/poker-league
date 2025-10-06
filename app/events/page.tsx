// app/events/page.tsx
import { supabase } from '@/lib/supabase'

type EventRow = {
  id: string
  title: string
  event_date: string   // ISO date string
  venue: string | null
  buy_in_cents: number
  rake_cents: number | null
}

export const revalidate = 60

async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_date, venue, buy_in_cents, rake_cents')
    .order('event_date', { ascending: false })

  if (error) throw new Error(`Events query failed: ${error.message}`)
  return (data ?? []) as EventRow[]
}

export default async function EventsPage() {
  const events = await getEvents()

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Events</h1>

      {events.length === 0 ? (
        <p className="text-gray-600">No events yet.</p>
      ) : (
        <ul className="space-y-3">
          {events.map(ev => {
            const date = new Date(ev.event_date).toLocaleDateString(undefined, {
              year: 'numeric', month: 'short', day: 'numeric'
            })
            const buyIn = (ev.buy_in_cents / 100).toLocaleString(undefined, {
              style: 'currency', currency: 'GBP'
            })
            return (
              <li key={ev.id} className="rounded-2xl border p-4">
                <a href={`/events/${ev.id}`} className="block hover:opacity-90">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold">{ev.title}</div>
                      <div className="text-gray-600">
                        {date}{ev.venue ? ` • ${ev.venue}` : ''}
                      </div>
                    </div>
                    <div className="text-gray-700">{buyIn} buy-in</div>
                  </div>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
