// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Public client for read-only data (uses anon key)
// We set the default schema to 'poker_league' so we can query tables/views directly.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { db: { schema: 'poker_league' } }
)