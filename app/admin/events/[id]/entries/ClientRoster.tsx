'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { addEntry, removeEntry } from './actions'

export type Player = { id: string; display_name: string; handle: string | null }

export function ClientRoster({
  eventId,
  players,
  selectedIds, // <-- live selected ids from server (entries)
}: {
  eventId: string
  players: Player[]
  selectedIds: string[]
}) {
  // Local optimistic selection (copies server selection)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(selectedIds)
  )
  const [isPending, startTransition] = useTransition()
  const [q, setQ] = useState('')

  // Keep local state in sync when server selection changes
  const selectedKey = useMemo(
    () => [...selectedIds].sort().join(','),
    [selectedIds]
  )
  useEffect(() => {
    setSelected(new Set(selectedIds))
  }, [selectedKey])

  const filtered = useMemo(() => {
    if (!q.trim()) return players
    const n = q.trim().toLowerCase()
    return players.filter(p =>
      p.display_name.toLowerCase().includes(n) ||
      (p.handle ?? '').toLowerCase().includes(n)
    )
  }, [players, q])

  const onToggle = (id: string, nextChecked: boolean) => {
    // Optimistic update
    setSelected(prev => {
      const next = new Set(prev)
      nextChecked ? next.add(id) : next.delete(id)
      return next
    })

    startTransition(async () => {
      try {
        if (nextChecked) {
          await addEntry({ eventId, playerId: id })
        } else {
          await removeEntry({ eventId, playerId: id })
        }
      } catch {
        // Revert on error
        setSelected(prev => {
          const next = new Set(prev)
          nextChecked ? next.delete(id) : next.add(id)
          return next
        })
      }
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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const checked = selected.has(p.id)
          const handle = p.handle ? `@${p.handle}` : ''
          return (
            <label key={p.id} className="flex items-center gap-3 rounded-lg border p-2">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onToggle(p.id, e.target.checked)}
              />
              <div>
                <div className="font-medium">{p.display_name}</div>
                {handle && <div className="text-gray-500">{handle}</div>}
              </div>
            </label>
          )
        })}
      </div>

      {isPending && (
        <div className="pt-2 text-sm text-gray-500">Saving…</div>
      )}
    </section>
  )
}

export default ClientRoster
