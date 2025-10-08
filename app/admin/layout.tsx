import { redirect } from 'next/navigation'
import { getUserAndAdmin } from '@/lib/getSession'

export const dynamic = 'force-dynamic'  // make sure cookies are read per request

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = await getUserAndAdmin()
  if (!user) redirect('/login')
  if (!isAdmin) redirect('/')  // or show 403

  return <>{children}</>
}
