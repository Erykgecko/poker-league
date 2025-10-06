// app/standings/page.tsx
import { supabase } from '@/lib/supabase'

export const revalidate = 60; // cache for 60s on Vercel; keeps it snappy

type TotalsRow = {
  player_id: string
  total_points: number | null
  wins: number | null
  podiums: number | null
}

type Player = {
  id: string
  display_name: string
  handle: string | null
}

async function getData() {
  // 1) Get league totals from the view
  const { data: totals, error: totalsErr } = await supabase
    .from('v_league_totals')
    .select('*')
    .order('total_points', { ascending: false })

  if (totalsErr) throw new Error(`Totals query failed: ${totalsErr.message}`)

  const ids = (totals ?? []).map(t => t.player_id)
  if (ids.length === 0) return { totals: [], playersById: new Map<string, Player>() }

  // 2) Fetch player names for those ids
  const { data: players, error: playersErr } = await supabase
    .from('players')
    .select('id, display_name, handle')
    .in('id', ids)

  if (playersErr) throw new Error(`Players query failed: ${playersErr.message}`)

  const playersById = new Map<string, Player>(players!.map(p => [p.id, p]))
  return { totals: totals as TotalsRow[], playersById }
}

export default async function StandingsPage() {
  const { totals, playersById } = await getData()

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-3xl font-bold">League Standings</h1>

      {totals.length === 0 ? (
        <p className="text-gray-600">No standings yet. Add an event and results to see data here.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Points</th>
                <th className="px-4 py-3">Wins</th>
                <th className="px-4 py-3">Podiums</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((row, i) => {
                const p = playersById.get(row.player_id)
                const name = p?.display_name ?? row.player_id.slice(0, 8)
                const handle = p?.handle ? `@${p.handle}` : ''
                return (
                  <tr key={row.player_id} className="border-t">
                    <td className="px-4 py-3">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{name}</div>
                      {handle && <div className="text-gray-500">{handle}</div>}
                    </td>
                    <td className="px-4 py-3">{row.total_points ?? 0}</td>
                    <td className="px-4 py-3">{row.wins ?? 0}</td>
                    <td className="px-4 py-3">{row.podiums ?? 0}</td>
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