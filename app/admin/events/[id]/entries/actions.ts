'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseActionClient } from '@/lib/supabaseServer'

export async function addEntry(opts: { eventId: string; playerId: string }) {
  const { eventId, playerId } = opts
  const supabase = await createSupabaseActionClient()

  const { error } = await supabase.from('entries').insert({
    event_id: eventId,
    player_id: playerId,
    buyins: 1,
    rebuys: 0,
    addon: false,
  })

  // Allow duplicate attempts (already in)
  if (error && !error.message.toLowerCase().includes('duplicate')) {
    throw new Error('Add failed: ' + error.message)
  }

  revalidatePath(`/admin/events/${eventId}/entries`)
  revalidatePath(`/events/${eventId}`)
}

export async function removeEntry(opts: { eventId: string; playerId: string }) {
  const { eventId, playerId } = opts
  const supabase = await createSupabaseActionClient()

  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('event_id', eventId)
    .eq('player_id', playerId)

  if (error) throw new Error('Remove failed: ' + error.message)

  revalidatePath(`/admin/events/${eventId}/entries`)
  revalidatePath(`/events/${eventId}`)
}
