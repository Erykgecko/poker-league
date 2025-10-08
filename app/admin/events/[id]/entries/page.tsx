import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import {  createSupabaseServerClientReadOnly, createSupabaseActionClient, } from '@/lib/supabaseServer'

// Types
type Player = { id: string; display_name: string; handle: string | null }
type Entry = {
  id: string
  player_id: string
  buyins: number
  rebuys: number
  addon: boolean
}
type EventRow = {
  id: string; title: string; event_date: string
  venue: string | null; buy_in_cents: number; rake_cents: number | null
}

// Data loaders
async function getEvent(eventId: string) {
  const supabase = await createSupabaseServerClientReadOnly()
  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_date, venue, buy_in_cents, rake_cents')
    .eq('id', eventId)
    .single()
  if (error) throw new Error(`Event query failed: ${error.message}`)
  return data as EventRow
}

async function getEntriesWithPlayers(eventId: string) {
  const supabase = await createSupabaseServerClientReadOnly()
  // 1) entries
  const { data: entries, error: eErr } = await supabase
    .from('entries')
    .select('id, player_id, buyins, rebuys, addon')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
  if (eErr) throw new Error(`Entries query failed: ${eErr.message}`)
  const list = (entries ?? []) as Entry[]
  if (list.length === 0) return { list, playersById: new Map<string, Player>() }

  // 2) player info for those entries
  const ids = Array.from(new Set(list.map(e => e.player_id)))
  const { data: players, error: pErr } = await supabase
    .from('players')
    .select('id, display_name, handle')
    .in('id', ids)
  if (pErr) throw new Error(`Players query failed: ${pErr.message}`)

  const playersById = new Map(players!.map(p => [p.id, p as Player]))
  return { list, playersById }
}

// -------- Server Actions (all run as the logged-in user; RLS enforces admin) --------
async function actionAddExisting(form: FormData) {
  'use server'
  const supabase = await createSupabaseActionClient()
  const eventId = String(form.get('event_id') ?? '')
  const handleOrName = String(form.get('handle_or_name') ?? '').trim()

  if (!eventId || !handleOrName) throw new Error('Missing data.')

  // Find by handle first; fallback to exact display_name
  let { data: players, error } = await supabase
    .from('players')
    .select('id')
    .ilike('handle', handleOrName)
    .limit(1)
  if (error) throw new Error(error.message)

  if (!players || players.length === 0) {
    const { data: byName, error: nErr } = await supabase
      .from('players')
      .select('id')
      .eq('display_name', handleOrName)
      .limit(1)
    if (nErr) throw new Error(nErr.message)
    players = byName ?? []
  }
  if (!players || players.length === 0) throw new Error('Player not found.')

  const playerId = players[0].id

  const { error: insErr } = await supabase.from('entries').insert({
    event_id: eventId,
    player_id: playerId,
    buyins: 1,
    rebuys: 0,
    addon: false,
  })
  if (insErr && !insErr.message.includes('duplicate key')) throw new Error(insErr.message)

  revalidatePath(`/admin/events/${eventId}/entries`)
  revalidatePath(`/events/${eventId}`) // public page
}

async function actionCreateAndAdd(form: FormData) {
  'use server'
  const supabase = await createSupabaseActionClient()
  const eventId = String(form.get('event_id') ?? '')
  const display_name = String(form.get('display_name') ?? '').trim()
  const handle = (String(form.get('handle') ?? '').trim() || null) as string | null

  if (!eventId || !display_name) throw new Error('Display name is required.')

  // If a handle was provided, try to re-use existing player by handle
  let playerId: string | null = null
  if (handle) {
    const { data: existing, error: lookupErr } = await supabase
      .from('players')
      .select('id')
      .eq('handle', handle)
      .maybeSingle()
    if (!lookupErr && existing) {
      playerId = existing.id
    }
  }

  // Create (or upsert on handle) when we don't already have a playerId
  if (!playerId) {
    const { data: upserted, error: pErr } = await supabase
      .from('players')
      .upsert({ display_name, handle }, { onConflict: 'handle' }) // handle is UNIQUE
      .select('id')
      .single()

    if (pErr) {
      // Friendlier messages for the two common cases
      const msg = pErr.message.toLowerCase()
      if (msg.includes('row-level security') || msg.includes('rls')) {
        throw new Error('Not authorized to create players. Make sure your user is in poker_league.user_roles as admin and RLS policies are installed.')
      }
      throw new Error('Create player failed: ' + pErr.message)
    }
    playerId = upserted!.id
  }

  // Add entry (ignore if already exists for this event)
  const { error: insErr } = await supabase.from('entries').insert({
    event_id: eventId, player_id: playerId, buyins: 1, rebuys: 0, addon: false,
  })
  if (insErr && !insErr.message.includes('duplicate key')) {
    const msg = insErr.message.toLowerCase()
    if (msg.includes('row-level security') || msg.includes('rls')) {
      throw new Error('Not authorized to add entries. Confirm admin role and RLS policies.')
    }
    throw new Error('Add entry failed: ' + insErr.message)
  }

  revalidatePath(`/admin/events/${eventId}/entries`)
  revalidatePath(`/events/${eventId}`)
}

async function actionIncRebuy(form: FormData) {
  'use server'
  const supabase = await createSupabaseActionClient()
  const entryId = String(form.get('entry_id') ?? '')
  const eventId = String(form.get('event_id') ?? '')
  if (!entryId || !eventId) throw new Error('Missing ids.')

  const { error } = await supabase.rpc('increment_rebuy', { entry_id_in: entryId })
  if (error) {
    // Fallback if you haven't added the SQL function yet:
    const { data: row } = await supabase.from('entries').select('rebuys').eq('id', entryId).single()
    const next = (row?.rebuys ?? 0) + 1
    const { error: uErr } = await supabase.from('entries').update({ rebuys: next }).eq('id', entryId)
    if (uErr) throw new Error(uErr.message)
  }

  revalidatePath(`/admin/events/${eventId}/entries`)
}

async function actionToggleAddon(form: FormData) {
  'use server'
  const supabase = await createSupabaseActionClient()
  const entryId = String(form.get('entry_id') ?? '')
  const eventId = String(form.get('event_id') ?? '')
  if (!entryId || !eventId) throw new Error('Missing ids.')

  const { data: row, error } = await supabase.from('entries')
    .select('addon').eq('id', entryId).single()
  if (error) throw new Error(error.message)

  const { error: uErr } = await supabase.from('entries')
    .update({ addon: !row!.addon })
    .eq('id', entryId)
  if (uErr) throw new Error(uErr.message)

  revalidatePath(`/admin/events/${eventId}/entries`)
}

async function actionRemoveEntry(form: FormData) {
  'use server'
  const supabase = await createSupabaseActionClient()
  const entryId = String(form.get('entry_id') ?? '')
  const eventId = String(form.get('event_id') ?? '')
  if (!entryId || !eventId) throw new Error('Missing ids.')

  const { error } = await supabase.from('entries').delete().eq('id', entryId)
  if (error) throw new Error(error.message)

  revalidatePath(`/admin/events/${eventId}/entries`)
  revalidatePath(`/events/${eventId}`)
}

// -------- Page --------
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EntriesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: eventId } = await params
  const ev = await getEvent(eventId)
  const { list: entries, playersById } = await getEntriesWithPlayers(eventId)

  const date = new Date(ev.event_date).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  })

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 text-sm">
        <Link href="/admin/events" className="text-blue-600 hover:underline">← Back to admin events</Link>
      </div>

      <h1 className="text-2xl font-bold">Entries • {ev.title}</h1>
      <div className="text-gray-700">{date}{ev.venue ? ` • ${ev.venue}` : ''}</div>

      {/* Add existing player */}
      <section className="mt-6 rounded-2xl border p-4">
        <h2 className="mb-3 text-lg font-semibold">Add existing player</h2>
        <form action={actionAddExisting} className="flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="event_id" value={eventId} />
          <input
            name="handle_or_name"
            className="flex-1 rounded border p-2"
            placeholder="Type @handle or exact name"
          />
          <button className="rounded bg-black px-4 py-2 text-white">Add</button>
        </form>
        <p className="mt-2 text-sm text-gray-600">
          Tip: Prefer <code>@handle</code> for uniqueness. Falls back to exact display name match.
        </p>
      </section>

      {/* Create & add new player */}
      <section className="mt-6 rounded-2xl border p-4">
        <h2 className="mb-3 text-lg font-semibold">Create & add player</h2>
        <form action={actionCreateAndAdd} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="event_id" value={eventId} />
          <input name="display_name" className="rounded border p-2" placeholder="Display name" />
          <input name="handle" className="rounded border p-2" placeholder="handle (optional)" />
          <button className="rounded bg-black px-4 py-2 text-white sm:col-span-1">Create & Add</button>
        </form>
      </section>

      {/* Current entries */}
      <section className="mt-6">
        <h2 className="mb-2 text-lg font-semibold">Current entries ({entries.length})</h2>
        {entries.length === 0 ? (
          <p className="text-gray-600">No entries yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Buy-ins</th>
                  <th className="px-4 py-3">Rebuys</th>
                  <th className="px-4 py-3">Add-on</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((en) => {
                  const p = playersById.get(en.player_id)
                  const name = p?.display_name ?? 'Unknown'
                  const handle = p?.handle ? `@${p.handle}` : ''
                  return (
                    <tr key={en.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-medium">{name}</div>
                        {handle && <div className="text-gray-500">{handle}</div>}
                      </td>
                      <td className="px-4 py-3">{en.buyins}</td>
                      <td className="px-4 py-3">
                        <form action={actionIncRebuy}>
                          <input type="hidden" name="entry_id" value={en.id} />
                          <input type="hidden" name="event_id" value={eventId} />
                          <button className="rounded border px-3 py-1">+ Rebuy ({en.rebuys})</button>
                        </form>
                      </td>
                      <td className="px-4 py-3">
                        <form action={actionToggleAddon}>
                          <input type="hidden" name="entry_id" value={en.id} />
                          <input type="hidden" name="event_id" value={eventId} />
                          <button className="rounded border px-3 py-1">
                            {en.addon ? 'Remove add-on' : 'Add add-on'}
                          </button>
                        </form>
                      </td>
                      <td className="px-4 py-3">
                        <form action={actionRemoveEntry}>
                          <input type="hidden" name="entry_id" value={en.id} />
                          <input type="hidden" name="event_id" value={eventId} />
                          <button className="rounded border px-3 py-1 text-red-600">Remove</button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
