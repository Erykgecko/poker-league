import { createSupabaseServerClientReadOnly } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export default async function Me() {
  const supabase = await createSupabaseServerClientReadOnly()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <pre className="p-6">{user ? JSON.stringify(user, null, 2) : 'No user session'}</pre>
  )
}