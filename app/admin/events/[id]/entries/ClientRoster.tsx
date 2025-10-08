'use client'

import { useMemo, useState, useTransition } from 'react'
import { syncSelection } from './actions'

export type Player = { id: string; display_name: string; handle: string | null }

export function ClientRoster({
  eventId,
  players,
  initialSelectedIds,
}: {
  eventId: string
  players: Player[]
  initialSelectedIds: string[]
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelectedIds)
  )
  const [q, setQ] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    if (!q.trim()) return players
    const n = q.trim().toLowerCase()
    return players.filter(p =>
      p.display_name.toLowerCase().includes(n) ||
      (p.handle ?? '').toLowerCase().includes(n)
    )
  }, [players, q])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <section className="mt-8 rounded-2xl border p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Toggle from roster</h2>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            className="rounded border p-2"
            placeholder="Search name or handle…"
            aria-label="Search players"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ('')}
              className="rounded border px-3 py-2"
              title="Clear"
              aria-label="Clear search"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <form
        action={async (formData: FormData) => {
          formData.set('event_id', eventId)
          ;(formData.getAll('players') as string[]).forEach(() => formData.delete('players'))
          selected.forEach(id => formData.append('players', id))
          startTransition(() => syncSelection(formData))
        }}
        className="grid gap-3"
      >
        <input type="hidden" name="event_id" value={eventId} />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => {
            const checked = selected.has(p.id)
            const handle = p.handle ? `@${p.handle}` : ''
            return (
              <label key={p.id} className="flex items-center gap-3 rounded-lg border p-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(p.id)}
                />
                <div>
                  <div className="font-medium">{p.display_name}</div>
                  {handle && <div className="text-gray-500">{handle}</div>}
                </div>
              </label>
            )
          })}
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            disabled={isPending}
            className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {isPending ? 'Saving…' : 'Save selection'}
          </button>
          <button
            type="button"
            className="rounded border px-3 py-2"
            onClick={() => setSelected(new Set(players.map(p => p.id)))}
          >
            Select all (visible)
          </button>
          <button
            type="button"
            className="rounded border px-3 py-2"
            onClick={() => setSelected(new Set())}
          >
            Clear all
          </button>
        </div>
      </form>
    </section>
  )
}

// Provide a default export too (covers any import style)
export default ClientRoster
