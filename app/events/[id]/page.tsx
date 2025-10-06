// app/events/[id]/page.tsx
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type EventRow = {
  id: string
  title: string
  event_date: string
  venue: string | null
  buy_in_cents: number
  rake_cents: number | null
}

type StandingRow = {
  event_id: string
  entry_id: string
  finish_place: number | null
  cash_cents: number
  display_name: string
  handle: string | null
}

export const revalidate = 60

async function getEvent(eventId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_date, venue, buy_in_cents, rake_cents')
    .eq('id', eventId)
    .single()

  if (error) throw new Error(`Event query failed: ${error.message}`)
  return data as EventRow
}

async function getStandings(eventId: string) {
  const { data, error } = await supabase
    .from('v_event_standings')
    .select('*')
    .eq('event_id', eventId)
    .order('finish_place', { ascending: true, nullsFirst: false })

  if (error) throw new Error(`Standings query failed: ${error.message}`)
  return (data ?? []) as StandingRow[]
}

export default async function EventPage({ params }: { params: { id: string } }) {
  const [ev, standings] = await Promise.all([
    getEvent(params.id),
    getStandings(params.id),
  ])

  const date = new Date(ev.event_date).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  })

  const entrants = standings.length
  const prizePool = standings.reduce((sum, r) => sum + (r.cash_cents || 0), 0)
  const prizePoolGBP = (prizePool / 100).toLocaleString(undefined, { style: 'currency', currency: 'GBP' })

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 text-sm">
        <Link href="/events" className="text-blue-600 hover:underline">← Back to events</Link>
      </div>

      <h1 className="text-3xl font-bold">{ev.title}</h1>
      <div className="mt-1 text-gray-700">
        {date}{ev.venue ? ` • ${ev.venue}` : ''} • {entrants} entrants
      </div>
      <div className="mt-1 text-gray-700">Prize pool: {prizePoolGBP}</div>

      <h2 className="mt-6 mb-2 text-xl font-semibold">Results</h2>
      {standings.length === 0 ? (
        <p className="text-gray-600">No results recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3">Place</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Payout</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => {
                const name = row.display_name
                const handle = row.handle ? `@${row.handle}` : ''
                const cash = (row.cash_cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'GBP' })
                return (
                  <tr key={row.entry_id} className="border-t">
                    <td className="px-4 py-3">{row.finish_place ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{name}</div>
                      {handle && <div className="text-gray-500">{handle}</div>}
                    </td>
                    <td className="px-4 py-3">{cash}</td>
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
