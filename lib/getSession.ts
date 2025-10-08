import { createSupabaseServerClientReadOnly } from './supabaseServer'

export async function getUserAndAdmin() {
  const supabase = await createSupabaseServerClientReadOnly()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, isAdmin: false }

  // Check admin flag from DB
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const isAdmin = !error && data?.role === 'admin'
  return { user, isAdmin }
}
