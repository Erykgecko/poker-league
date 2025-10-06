import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter  } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
            <a href="/" className="font-semibold">Poker League</a>
            <a href="/events" className="hover:underline">Events</a>
            <a href="/standings" className="hover:underline">Standings</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  )
}