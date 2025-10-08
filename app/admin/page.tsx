// app/admin/page.tsx
import Link from 'next/link'

export default function AdminHome() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Admin</h1>
      <ul className="list-disc pl-6">
        <li><Link className="text-blue-600 underline" href="/admin/events">Manage events</Link></li>
      </ul>
    </main>
  )
}