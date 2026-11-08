import { NextRequest, NextResponse } from 'next/server'

export interface ParsedLocation {
  latitude: number
  longitude: number
  villageLocality: string
  subdistrictMandal: string
  district: string
  state: string
  country: string
  displayName: string
}

// In-memory cache to respect OSM Nominatim rate limits and maximize responsiveness
const geocodeCache = new Map<string, { data: ParsedLocation[]; timestamp: number }>()
const reverseCache = new Map<string, { data: ParsedLocation; timestamp: number }>()
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

const NOMINATIM_HEADERS = {
  'User-Agent': 'AgronomyAI-Platform/2.0 (agronomy.ai; contact@agronomy.ai)',
  'Accept': 'application/json',
}

/**
 * Extracts normalized administrative breakdown from OpenStreetMap Nominatim response.
 * Never invents names; clearly marks missing administrative details.
 */
function parseNominatimAddress(item: any): ParsedLocation {
  const addr = item.address || {}

  // 1. Locality / Village
  const locality =
    addr.village ||
    addr.hamlet ||
    addr.suburb ||
    addr.neighbourhood ||
    addr.town ||
    addr.city ||
    addr.municipality ||
    addr.residential ||
    addr.locality ||
    item.name ||
    'Local Area'

  // 2. Mandal / Subdistrict / Tehsil
  let mandal =
    addr.subdistrict ||
    addr.tehsil ||
    addr.taluk ||
    addr.subdivision ||
    addr.district_subdivision ||
    ''

  // In India, OSM frequently tags mandals as 'county' (e.g. 'Kollipara Mandal')
  if (!mandal && addr.county) {
    const countyLower = String(addr.county).toLowerCase()
    if (countyLower.includes('mandal') || countyLower.includes('tehsil') || countyLower.includes('taluk')) {
      mandal = addr.county
    }
  }

  // 3. District
  let district =
    addr.state_district ||
    addr.district ||
    ''

  if (!district && addr.county && !mandal) {
    district = addr.county
  }

  // 4. State & Country
  const state = addr.state || addr.province || addr.region || ''
  const country = addr.country || 'India'

  const lat = parseFloat(item.lat)
  const lon = parseFloat(item.lon)

  return {
    latitude: lat,
    longitude: lon,
    villageLocality: locality,
    subdistrictMandal: mandal,
    district: district,
    state: state,
    country: country,
    displayName: item.display_name || `${locality}, ${state}, ${country}`,
  }
}

/**
 * Fallback parser for Open-Meteo Geocoding
 */
function parseOpenMeteoResult(item: any): ParsedLocation {
  const locality = item.name || 'Local Area'
  const mandal = item.admin3 || ''
  const district = item.admin2 || ''
  const state = item.admin1 || ''
  const country = item.country || 'India'

  return {
    latitude: item.latitude,
    longitude: item.longitude,
    villageLocality: locality,
    subdistrictMandal: mandal,
    district: district,
    state: state,
    country: country,
    displayName: [locality, mandal, district, state, country].filter(Boolean).join(', '),
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const q = searchParams.get('q')?.trim()
  const latStr = searchParams.get('lat')
  const lonStr = searchParams.get('lon')

  // ── REVERSE GEOCODING (GPS COORDINATES) ──────────────────────────────────
  if (latStr && lonStr) {
    const lat = parseFloat(latStr)
    const lon = parseFloat(lonStr)

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ error: 'Invalid coordinates provided.' }, { status: 400 })
    }

    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`
    const cached = reverseCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ location: cached.data, cached: true })
    }

    try {
      const osmUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1`
      const res = await fetch(osmUrl, {
        headers: NOMINATIM_HEADERS,
        next: { revalidate: 900 },
      })

      if (res.ok) {
        const data = await res.json()
        const parsed = parseNominatimAddress(data)
        reverseCache.set(cacheKey, { data: parsed, timestamp: Date.now() })
        return NextResponse.json({ location: parsed, source: 'nominatim' })
      }
    } catch (err) {
      console.warn('[Geocode API] Nominatim reverse failed, falling back:', err)
    }

    // Graceful fallback if reverse geocoding is unavailable
    const fallbackLocation: ParsedLocation = {
      latitude: lat,
      longitude: lon,
      villageLocality: `Coordinates (${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E)`,
      subdistrictMandal: '',
      district: '',
      state: '',
      country: '',
      displayName: `GPS Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
    }
    return NextResponse.json({ location: fallbackLocation, source: 'fallback' })
  }

  // ── FORWARD SEARCH (MANUAL LOCATION SEARCH) ──────────────────────────────
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const cacheKey = q.toLowerCase()
  const cached = geocodeCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ results: cached.data, cached: true })
  }

  // 1. Primary Search: OpenStreetMap Nominatim
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      q
    )}&format=jsonv2&addressdetails=1&limit=6`

    const res = await fetch(osmUrl, {
      headers: NOMINATIM_HEADERS,
      next: { revalidate: 900 },
    })

    if (res.ok) {
      const items = await res.json()
      if (Array.isArray(items) && items.length > 0) {
        const parsedResults = items.map(parseNominatimAddress)
        geocodeCache.set(cacheKey, { data: parsedResults, timestamp: Date.now() })
        return NextResponse.json({ results: parsedResults, source: 'nominatim' })
      }
    }
  } catch (err) {
    console.warn('[Geocode API] Nominatim search failed, trying Open-Meteo fallback:', err)
  }

  // 2. Fallback Search: Open-Meteo Geocoding API
  try {
    const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      q
    )}&count=6&language=en&format=json`

    const res = await fetch(omUrl)
    if (res.ok) {
      const data = await res.json()
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        const parsedResults = data.results.map(parseOpenMeteoResult)
        geocodeCache.set(cacheKey, { data: parsedResults, timestamp: Date.now() })
        return NextResponse.json({ results: parsedResults, source: 'open-meteo' })
      }
    }
  } catch (err) {
    console.error('[Geocode API] Both Nominatim and Open-Meteo failed:', err)
  }

  return NextResponse.json({ results: [] })
}
