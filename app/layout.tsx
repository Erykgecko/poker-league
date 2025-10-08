import type { Metadata } from "next";
import Link from 'next/link'
import {  Inter  } from "next/font/google";
import "./globals.css";


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Clubsports Poker League',
  description: 'Local league standings and results',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="border-b">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 p-4 text-sm">
            <Link href="/" className="font-semibold">Poker League</Link>
            <Link href="/events" className="hover:underline">Events</Link>
            <Link href="/standings" className="hover:underline">Standings</Link>
            <Link href="/admin" className="hover:underline">Admin</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  )
}