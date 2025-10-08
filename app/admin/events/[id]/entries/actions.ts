'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseActionClient } from '@/lib/supabaseServer'

export async function syncSelection(formData: FormData) {
  const supabase = await createSupabaseActionClient()
  const eventId = String(formData.get('event_id') ?? '')
  if (!eventId) throw new Error('Missing event id.')

  const selected = new Set<string>((formData.getAll('players') as string[]) ?? [])

  // Current entries for this event
  const { data: entries, error: eErr } = await supabase
    .from('entries')
    .select('id, player_id')
    .eq('event_id', eventId)
  if (eErr) throw new Error(eErr.message)

  const existing = new Map(entries?.map(e => [e.player_id as string, e.id as string]) ?? [])

  // Compute diffs
  const toAdd: string[] = []
  for (const playerId of selected) if (!existing.has(playerId)) toAdd.push(playerId)

  const toRemove: string[] = []
  for (const [playerId, entryId] of existing) if (!selected.has(playerId)) toRemove.push(entryId)

  // Bulk insert
  if (toAdd.length > 0) {
    const rows = toAdd.map(player_id => ({
      event_id: eventId, player_id, buyins: 1, rebuys: 0, addon: false,
    }))
    const { error } = await supabase.from('entries').insert(rows)
    if (error) throw new Error('Bulk add failed: ' + error.message)
  }

  // Bulk delete
  if (toRemove.length > 0) {
    const { error } = await supabase.from('entries').delete().in('id', toRemove)
    if (error) throw new Error('Bulk remove failed: ' + error.message)
  }

  revalidatePath(`/admin/events/${eventId}/entries`)
  revalidatePath(`/events/${eventId}`)
}
