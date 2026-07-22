// Pure, client-safe types for the place picker + map. No dataset import here, so
// this module is safe to pull into client components (the 2 MB city list lives
// in ./data, which must only be imported from server code).

export type PlaceKind = 'city' | 'country'

// The structured value produced by selecting a place in the LocationCombobox and
// persisted on a moment (alongside the human-readable `location` label). For a
// city, lat/lng are the city's coordinates; for a country, they are the capital's.
export type PlaceValue = {
  kind: PlaceKind
  label: string // "Barcelona, Spain" (city) or "Spain" (country)
  countryCode: string // ISO-3166 alpha-2, uppercase
  lat: number
  lng: number
}

// A single row returned by searchPlaces / shown in the combobox dropdown.
export type PlaceSearchResult = PlaceValue & {
  key: string // stable React key, unique across cities + countries
}
