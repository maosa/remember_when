'use server'

import { requireUser } from '@/lib/supabase/server'
import { searchPlaces as searchPlacesData } from '@/lib/places/data'
import type { PlaceSearchResult } from '@/lib/places/types'

/**
 * Searches the bundled place dataset (cities + countries) for the location
 * picker. Auth-gated so the dataset isn't scraped anonymously; the search itself
 * runs in-memory (no DB), so no rate limiting is needed. Modeled on
 * searchUsersToInvite in ../home/actions.ts.
 */
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  await requireUser()
  return searchPlacesData(query, 20)
}
