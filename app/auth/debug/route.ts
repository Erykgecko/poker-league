import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const c = await cookies()
  const names = c.getAll().map(x => x.name)
  return NextResponse.json({ cookieNames: names })
}