/**
 * Agronomy AI Location & Geocoding Service
 * Integrates OpenStreetMap Nominatim with Open-Meteo Fallback & Open-Meteo Live Microclimate.
 */

export interface SelectedLocation {
  latitude: number
  longitude: number
  villageLocality: string
  subdistrictMandal: string
  district: string
  state: string
  country: string
  displayName: string
  source: 'manual' | 'gps'
}

export interface WeatherData {
  temperature: number
  humidity: number
  apparentTemp: number
  precipitation: number
  windSpeed: number
  weatherCode: number
  lastUpdated: string
}

export interface FarmingAdvisory {
  status: string
  badge: string
  advice: string
  severity: 'normal' | 'caution' | 'warning'
}

const STORAGE_KEY = 'agronomy_selected_farm_location'

/**
 * Searches villages, towns, districts, or cities via the Next.js Geocode API Route
 */
export async function searchLocations(query: string, signal?: AbortSignal): Promise<SelectedLocation[]> {
  const cleanQ = query.trim()
  if (cleanQ.length < 2) return []

  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(cleanQ)}`, {
      signal,
      headers: { 'Accept': 'application/json' },
    })

    if (!res.ok) return []
    const data = await res.json()
    if (data && Array.isArray(data.results)) {
      return data.results.map((r: any) => ({
        ...r,
        source: 'manual' as const,
      }))
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.warn('[LocationService] Geocoding search error:', err)
    }
  }
  return []
}

/**
 * Reverse geocodes GPS coordinates to identify actual village, mandal, district, state, country
 */
export async function reverseGeocodeLocation(lat: number, lon: number): Promise<SelectedLocation> {
  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`, {
      headers: { 'Accept': 'application/json' },
    })

    if (res.ok) {
      const data = await res.json()
      if (data && data.location) {
        return {
          ...data.location,
          source: 'gps' as const,
        }
      }
    }
  } catch (err) {
    console.warn('[LocationService] Reverse geocode error:', err)
  }

  return {
    latitude: lat,
    longitude: lon,
    villageLocality: `Field Coordinates (${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E)`,
    subdistrictMandal: '',
    district: '',
    state: '',
    country: '',
    displayName: `GPS Farm Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
    source: 'gps',
  }
}

/**
 * Fetches real-time weather from Open-Meteo for exact coordinates
 */
export async function fetchWeatherForCoordinates(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Open-Meteo service responded with status ${res.status}`)
  }

  const data = await res.json()
  if (!data || !data.current) {
    throw new Error('Weather data payload missing current meteorological conditions')
  }

  return {
    temperature: Math.round(data.current.temperature_2m * 10) / 10,
    humidity: Math.round(data.current.relative_humidity_2m),
    apparentTemp: Math.round(data.current.apparent_temperature * 10) / 10,
    precipitation: data.current.precipitation ?? 0,
    windSpeed: Math.round(data.current.wind_speed_10m * 10) / 10,
    weatherCode: data.current.weather_code ?? 0,
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

/**
 * Generates cautious, empirical agronomic recommendations strictly based on actual weather
 */
export function getFarmingAdvisory(temp: number, humidity: number, precip: number, wind: number): FarmingAdvisory {
  // 1. Precipitation
  if (precip > 0.5) {
    return {
      status: 'Active Precipitation Observed',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      advice:
        'Rainfall in progress. Postpone foliar pesticide spraying and dry fertilizer broadcasting to avoid chemical wash-off and environmental loss. Inspect drainage channels in waterlogged crop blocks.',
      severity: 'warning',
    }
  }

  // 2. High Wind Speed
  if (wind > 20) {
    return {
      status: 'High Wind Velocity Caution',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      advice: `Wind speed is elevated (${wind} km/h). Foliar spraying is not recommended due to droplet drift onto non-target vegetation. Delay spraying until wind velocity drops below 15 km/h.`,
      severity: 'warning',
    }
  }

  // 3. High Humidity (Fungal Spore Risk Factor)
  if (humidity > 75) {
    return {
      status: 'Elevated Microclimate Humidity',
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
      advice: `Relative humidity is high (${humidity}%). Prolonged leaf wetness can favor fungal spore germination (e.g., blight, downy/powdery mildew). Scout lower leaf undersides and maintain field aeration; avoid unnecessary evening irrigation.`,
      severity: 'caution',
    }
  }

  // 4. Heat Stress
  if (temp > 35) {
    return {
      status: 'High Temperature Stress Caution',
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
      advice: `Ambient temperature is elevated (${temp}°C). Provide adequate root-zone hydration during early morning or dusk hours to mitigate vegetative dehydration, leaf wilting, and flower drop.`,
      severity: 'caution',
    }
  }

  // 5. Cold / Low Temperature
  if (temp < 10) {
    return {
      status: 'Low Temperature Advisory',
      badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      advice: `Cool temperatures (${temp}°C) may slow metabolic activity and nutrient uptake. Irrigate moderately during sunny mid-day intervals if required to buffer root-zone temperatures.`,
      severity: 'caution',
    }
  }

  // 6. Optimal
  return {
    status: 'Favorable Fieldwork Window',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    advice:
      'Current microclimate conditions (moderate temperature, gentle breeze, stable humidity) are suitable for scheduled foliar nutrition, routine field inspection, intercultural operations, and crop scouting.',
    severity: 'normal',
  }
}

/**
 * Human-readable WMO Weather Code interpreter
 */
export function getWeatherDescription(code: number): { text: string; icon: string } {
  if (code === 0) return { text: 'Clear Sky', icon: '☀️' }
  if (code >= 1 && code <= 3) return { text: 'Partly Cloudy', icon: '⛅' }
  if (code >= 45 && code <= 48) return { text: 'Fog / Mist', icon: '🌫️' }
  if (code >= 51 && code <= 67) return { text: 'Rain / Drizzle', icon: '🌧️' }
  if (code >= 71 && code <= 77) return { text: 'Snow / Flurries', icon: '🌨️' }
  if (code >= 80 && code <= 82) return { text: 'Rain Showers', icon: '🌦️' }
  if (code >= 95) return { text: 'Thunderstorm', icon: '⛈️' }
  return { text: 'Fair Weather', icon: '🌤️' }
}

/**
 * LocalStorage Helpers
 */
export function getStoredLocation(): SelectedLocation | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (err) {
    console.warn('[LocationService] Could not parse stored location:', err)
  }
  return null
}

export function saveStoredLocation(loc: SelectedLocation): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))
  } catch (err) {
    console.warn('[LocationService] Could not save location:', err)
  }
}
