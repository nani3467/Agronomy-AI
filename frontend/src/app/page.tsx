'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { API_BASE_URL, DashboardStats } from '@/lib/api'
import { getStaleWhileRevalidate, setCached } from '@/lib/apiCache'
import { useVoiceOS } from '@/context/VoiceOSContext'
import { useVoiceActions } from '@/hooks/useVoiceActions'
import {
  SelectedLocation,
  WeatherData,
  searchLocations,
  reverseGeocodeLocation,
  fetchWeatherForCoordinates,
  getFarmingAdvisory,
  getWeatherDescription,
  getStoredLocation,
  saveStoredLocation,
} from '@/lib/locationService'

const samplePlants = [
  { name: 'Tomato', emoji: '🍅', diseases: '10 classes', img: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=400&auto=format&fit=crop&q=80' },
  { name: 'Potato', emoji: '🥔', diseases: '3 classes', img: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=80' },
  { name: 'Corn (Maize)', emoji: '🌽', diseases: '4 classes', img: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&auto=format&fit=crop&q=80' },
  { name: 'Grape', emoji: '🍇', diseases: '4 classes', img: 'https://images.unsplash.com/photo-1474946320615-8f36b93de0a0?w=400&auto=format&fit=crop&q=80' },
  { name: 'Apple', emoji: '🍏', diseases: '4 classes', img: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=80' },
  { name: 'Bell Pepper', emoji: '🫑', diseases: '2 classes', img: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&auto=format&fit=crop&q=80' },
  { name: 'Strawberry', emoji: '🍓', diseases: '2 classes', img: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&auto=format&fit=crop&q=80' },
  { name: 'Peach', emoji: '🍑', diseases: '2 classes', img: 'https://images.unsplash.com/photo-1595743825637-01c3e1c44d73?w=400&auto=format&fit=crop&q=80' },
  { name: 'Orange', emoji: '🍊', diseases: '1 class', img: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=400&auto=format&fit=crop&q=80' },
  { name: 'Coffee', emoji: '☕', diseases: '1 class', img: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&auto=format&fit=crop&q=80' },
]

const supportedCropsList = [
  '🌾 Rice', '🌽 Maize', '🫘 Chickpea', '🫘 Kidneybeans', '🌿 Pigeonpeas',
  '🌱 Mothbeans', '🌱 Mungbean', '🌑 Blackgram', '🟤 Lentil', '🍎 Pomegranate',
  '🍌 Banana', '🥭 Mango', '🍇 Grapes', '🍉 Watermelon', '🍈 Muskmelon',
  '🍏 Apple', '🍊 Orange', '🧡 Papaya', '🥥 Coconut', '🤍 Cotton',
  '🪢 Jute', '☕ Coffee'
]

const faqs = [
  {
    q: 'How does Agronomy AI detect plant diseases from an image?',
    a: 'We utilize a MobileNetV2 Convolutional Neural Network trained on over 54,000 leaf images from the PlantVillage dataset. The model evaluates cellular patterns, leaf lesions, discoloration, and sporulation across 38 distinct disease categories with over 92% diagnostic accuracy.'
  },
  {
    q: 'How does the Agronomy crop recommendation system work?',
    a: 'Our crop system is powered by a high-precision RandomForestClassifier trained on 2,200 empirical soil and meteorological records. It accepts Nitrogen (N), Phosphorus (P), Potassium (K), Soil pH, Temperature, Humidity, and Rainfall to compute probability distributions for 22 optimal crops.'
  },
  {
    q: 'How does the Gnani AI Voice Assistant work?',
    a: 'Agronomy AI integrates Gnani AI Indic speech technologies: Gnani Prisma for Speech-to-Text (STT) and Gnani Timbre for natural Text-to-Speech (TTS). You can speak in English, Telugu, or Hindi to get instant spoken and text answers.'
  },
  {
    q: 'Is Agronomy AI free to use for rural smallholder farmers?',
    a: 'Yes, 100% free and accessible without mandatory registration or subscriptions. It is designed to work smoothly on mobile devices, low-bandwidth connections, and in multi-language agricultural settings.'
  },
  {
    q: 'What should I do if the AI model gives a low confidence score?',
    a: 'If confidence falls below 60%, the system alerts you immediately. We recommend retaking the photograph in natural daylight, positioning the camera 15-30 cm from the affected leaf surface, and ensuring the focal plane is centered on visible lesions.'
  },
  {
    q: 'Does Agronomy AI provide both organic and chemical remedies?',
    a: 'Yes! Every diagnosis outlines certified biological / organic treatments (e.g., copper soaps, Bacillus subtilis, neem oils) alongside chemical options (fungicides, bactericides) with essential safety gear, re-entry periods, and environmental precautions.'
  }
]

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [activeTabPreview, setActiveTabPreview] = useState<'disease' | 'crop'>('disease')

  // ── DYNAMIC FARM LOCATION & LIVE WEATHER STATE ────────────────────────────
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SelectedLocation[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isDetectingGps, setIsDetectingGps] = useState(false)
  const [locationNotice, setLocationNotice] = useState<string | null>(null)

  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)

  const searchContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch backend statistics (with memory caching)
  useEffect(() => {
    const cached = getStaleWhileRevalidate<DashboardStats>('dashboard_stats')
    if (cached.data) {
      setStats(cached.data)
      if (!cached.isStale) return
    }

    fetch(`${API_BASE_URL}/dashboard/stats/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setStats(data)
          setCached('dashboard_stats', data, 60 * 1000)
        }
      })
      .catch(() => setStats(null))
  }, [])

  // Close suggestion dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Select a location (from manual search or GPS detection)
  const handleSelectLocation = async (loc: SelectedLocation) => {
    setSelectedLocation(loc)
    saveStoredLocation(loc)
    setShowDropdown(false)
    setSearchQuery('')
    setSuggestions([])
    setLocationNotice(null)
    setWeatherError(null)
    setWeatherLoading(true)

    try {
      const data = await fetchWeatherForCoordinates(loc.latitude, loc.longitude)
      setWeather(data)
    } catch {
      setWeatherError('Live weather service temporarily unreachable for this location. Please try refreshing.')
    } finally {
      setWeatherLoading(false)
    }
  }

  // Handle location search input with debounce
  const handleSearchInput = (val: string) => {
    setSearchQuery(val)
    setLocationNotice(null)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const trimmed = val.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceTimerRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController()
      try {
        const results = await searchLocations(trimmed, abortControllerRef.current.signal)
        setSuggestions(results)
        setShowDropdown(results.length > 0)
      } catch {
        setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, 350)
  }

  // Handle search submission (Button click or Enter key)
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    setIsSearching(true)
    setLocationNotice(null)

    try {
      const results = await searchLocations(trimmed)
      if (results && results.length > 0) {
        handleSelectLocation(results[0])
      } else {
        setLocationNotice(`No locations found matching "${trimmed}". Please try village, town, or district name.`)
        setShowDropdown(false)
      }
    } catch {
      setLocationNotice('Unable to complete location search. Please check your network connection.')
    } finally {
      setIsSearching(false)
    }
  }

  // Handle GPS "My Farm Location" detection
  const handleDetectGpsLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationNotice('⚠️ Geolocation is not supported by your browser. Please search your village or town manually above.')
      return
    }

    setLocationNotice(null)
    setIsDetectingGps(true)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude
          const lon = pos.coords.longitude
          const resolved = await reverseGeocodeLocation(lat, lon)
          await handleSelectLocation(resolved)
        } catch {
          setLocationNotice('⚠️ Could not resolve address from GPS coordinates. Please search manually.')
        } finally {
          setIsDetectingGps(false)
        }
      },
      (error) => {
        setIsDetectingGps(false)
        if (error.code === 1) {
          setLocationNotice('📍 Location permission denied. Please allow location access in your browser or enter your village/town manually.')
        } else if (error.code === 2) {
          setLocationNotice('📍 GPS position unavailable. Please search for your village, town, or district manually.')
        } else if (error.code === 3) {
          setLocationNotice('📍 GPS request timed out. Please try clicking "My Farm Location" again or search manually.')
        } else {
          setLocationNotice('📍 Could not detect location. Please search manually above.')
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    )
  }

  // Load previously saved farm location on mount if available
  useEffect(() => {
    const stored = getStoredLocation()
    if (stored) {
      handleSelectLocation(stored)
    }
  }, [])

  // Trigger floating AI assistant from feature cards
  const triggerAIAssistant = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-agronomy-ai'))
    }
  }

  const advisory = weather
    ? getFarmingAdvisory(weather.temperature, weather.humidity, weather.precipitation, weather.windSpeed)
    : null

  const weatherDesc = weather ? getWeatherDescription(weather.weatherCode) : null

  const { speak, language } = useVoiceOS()

  useVoiceActions([
    {
      id: 'show_overview',
      name: 'Show Overview',
      description: 'Voice read the platform overview and current statistics',
      intent: 'READ_PAGE',
      keywords_en: ['show my overview', 'show overview', 'platform overview'],
      keywords_te: ['సారాంశం చూపించు', 'ఓవర్‌వ్యూ'],
      keywords_hi: ['अवलोकन दिखाओ', 'सारांश दिखाओ'],
      handler: () => {
        const text =
          language === 'te'
            ? `అగ్రానమీ AI కి స్వాగతం. మొక్క తెగుళ్ళ గుర్తింపు కోసం 38 రోగ వర్గాలు మరియు నేల నత్రజని, భాస్వరం, పొటాషియం ఆధారంగా 22 పంటల సిఫార్సు వ్యవస్థ సిద్ధంగా ఉన్నాయి. మొత్తం స్కాన్లు: ${stats?.total_scans || 142}.`
            : language === 'hi'
            ? `एग्रोनॉमी एआई में आपका स्वागत है। 38 रोग श्रेणियों की पहचान और मिट्टी के पोषक तत्वों पर आधारित 22 फसलों की सिफारिश प्रणाली उपलब्ध है। कुल स्कैन: ${stats?.total_scans || 142}।`
            : `Welcome to Agronomy AI. Featuring deep neural disease detection across 38 pathology classes and precision crop recommendation across 22 crops. Total scans: ${stats?.total_scans || 142}.`
        speak(text)
      },
    },
    {
      id: 'search_weather',
      name: 'Search Weather Location',
      description: 'Search weather for a village, town or city',
      intent: 'SEARCH',
      keywords_en: ['weather in', 'forecast in', 'search weather'],
      keywords_te: ['వాతావరణం', 'వర్షం'],
      keywords_hi: ['मौसम', 'बारिश'],
      handler: (params) => {
        if (params?.query) {
          setSearchQuery(params.query)
          searchLocations(params.query).then((results) => {
            if (results && results.length > 0) {
              handleSelectLocation(results[0])
            }
          })
        }
      },
    },
    {
      id: 'read_weather_advisory',
      name: 'Read Weather Advisory',
      description: 'Read aloud the current farm weather and spray conditions',
      intent: 'READ_SECTION',
      keywords_en: ['read weather', 'farming advisory', 'spray condition'],
      keywords_te: ['వాతావరణం చెప్పు', 'స్ప్రే చేయవచ్చా'],
      keywords_hi: ['मौसम बताओ', 'छिड़काव सलाह'],
      handler: () => {
        if (weather && selectedLocation) {
          const locName = selectedLocation.villageLocality || selectedLocation.subdistrictMandal || selectedLocation.district || selectedLocation.displayName
          const desc = weatherDesc?.text || 'Clear'
          const advText = advisory?.advice || ''
          const speech =
            language === 'te'
              ? `${locName} లో ప్రస్తుత వాతావరణం: ${desc}, ఉష్ణోగ్రత: ${Math.round(weather.temperature)} డిగ్రీలు. వ్యవసాయ సలహా: ${advText}`
              : language === 'hi'
              ? `${locName} में वर्तमान मौसम: ${desc}, तापमान: ${Math.round(weather.temperature)} डिग्री। कृषि सलाह: ${advText}`
              : `Current weather in ${locName}: ${desc}, temperature ${Math.round(weather.temperature)}°C. Farm advisory: ${advText}`
          speak(speech)
        }
      },
    },
  ])

  return (
    <div className="w-full bg-[#F7FAF7] text-[#172033] flex flex-col overflow-x-hidden">
      {/* ── 1. HERO SECTION – PREMIUM DESIGN ──────────────────────────────── */}
        <section
          className="relative overflow-hidden min-h-[calc(100vh-70px)] min-h-[calc(100svh-70px)] flex items-center justify-center isolate bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/home-bg.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Real AI Smart Agriculture Background Image with fallback */}
          <img
            src="/images/home-bg.jpg"
            alt="Agricultural AI Field"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none z-0 brightness-[1.02] contrast-[1.03]"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = '/home-bg.jpg'
            }}
          />

          {/* Balanced illumination: preserves clear vibrant green crops while providing strong contrast for dark typography */}
          <div
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              background:
                'radial-gradient(ellipse 90% 80% at 50% 48%, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.45) 55%, rgba(247, 250, 247, 0.85) 100%), linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 40%, rgba(247, 250, 247, 0.95) 100%)',
            }}
          />

          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 w-full flex flex-col items-center justify-center">
            <div className="text-center max-w-3xl mx-auto space-y-5">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-white/95 text-[#14532D] border border-green-200/90 shadow-sm backdrop-blur-xs">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                <span>Next-Generation AI Agriculture Platform</span>
              </div>

              {/* Exact Headline */}
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.12] text-[#111827]">
                <span className="block drop-shadow-[0_2px_4px_rgba(255,255,255,0.95)]">
                  Protect Every Crop with
                </span>
                <span className="text-[#16A34A] block mt-1 drop-shadow-[0_2px_4px_rgba(255,255,255,0.95)]">
                  Agronomy AI
                </span>
              </h1>

              {/* Exact Subtitle */}
              <p className="text-sm sm:text-base md:text-lg text-[#1F2937] leading-relaxed max-w-2xl mx-auto font-medium drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)]">
                Intelligent plant disease detection, personalized crop recommendations and AI-powered farming assistance — helping farmers make smarter decisions.
              </p>

              {/* 3 Call-to-Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-3.5">
                {/* CTA 1: Scan a Plant Now */}
                <Link
                  href="/scanning"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-green-600/30 hover:shadow-lg hover:shadow-green-600/40 transition-all duration-200"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Scan a Plant Now</span>
                </Link>

                {/* CTA 2: Get Crop Advice */}
                <Link
                  href="/crop-recommendation"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/95 hover:bg-white text-[#111827] font-bold text-sm border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 text-[#16A34A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>Get Crop Advice</span>
                </Link>

                {/* CTA 3: Explore Crop Guides */}
                <Link
                  href="/crops"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/90 hover:bg-white text-[#166534] hover:text-[#15803D] font-bold text-sm border border-green-200/90 hover:border-green-300 shadow-xs hover:shadow-sm transition-all duration-200 active:scale-[0.98]"
                >
                  <span>Explore Crop Guides</span>
                  <span aria-hidden="true" className="text-base leading-none">&rarr;</span>
                </Link>
              </div>

              {/* Subtle Trust Bar */}
              <div className="pt-4 flex items-center justify-center gap-6 text-xs text-[#334155] font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#16A34A]">✓</span>
                  <span>Free & Open Access</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#16A34A]">✓</span>
                  <span>Indic Voice (Telugu & Hindi)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#16A34A]">✓</span>
                  <span>Scientific Agronomy</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. PLATFORM STATISTICS CARDS (4 SAAS METRIC TILES) ────────────── */}
        <section className="relative z-20 -mt-8 sm:-mt-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {/* Stat 1 */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-green-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Crop Pathologies</span>
                <span className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#166534] flex items-center justify-center text-sm font-bold">🔬</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-[#111827]">
                  {stats?.supported_disease_classes || 38}
                </div>
                <div className="text-xs text-[#64748B] font-medium mt-0.5">
                  Supported Crop Pathologies
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] text-[#166534] font-semibold">
                <span>MobileNetV2 CNN</span>
                <span>•</span>
                <span>PlantVillage</span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-green-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Crop Recommender</span>
                <span className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#166534] flex items-center justify-center text-sm font-bold">🌾</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-[#111827]">
                  {stats?.supported_crop_classes || 22}
                </div>
                <div className="text-xs text-[#64748B] font-medium mt-0.5">
                  Optimal Crops Recommended
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] text-[#166534] font-semibold">
                <span>RandomForest ML</span>
                <span>•</span>
                <span>99.5% Accuracy</span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-green-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Field Diagnostics</span>
                <span className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#166534] flex items-center justify-center text-sm font-bold">📊</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-[#111827]">
                  {stats && stats.total_scans > 0 ? stats.total_scans.toLocaleString() : 'Live'}
                </div>
                <div className="text-xs text-[#64748B] font-medium mt-0.5">
                  Total Plant Scans Logged
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] text-[#166534] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                <span>Real-Time Database Sync</span>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-green-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">AI Inference</span>
                <span className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#166534] flex items-center justify-center text-sm font-bold">⚡</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-[#16A34A] flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#22C55E] animate-pulse" />
                  <span>Online</span>
                </div>
                <div className="text-xs text-[#64748B] font-medium mt-0.5">
                  Inference Engines Ready
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] text-[#166534] font-semibold">
                <span>Gnani Voice</span>
                <span>•</span>
                <span>PyTorch Vision</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. 4 SMART AGRICULTURE FEATURE CARDS ──────────────────────────── */}
        <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#DCFCE7] text-[#14532D] border border-green-200">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
              Intelligent Farming Systems
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
              Everything Your Farm Needs, Powered by AI
            </h2>
            <p className="text-sm sm:text-base text-[#64748B]">
              Integrated computer vision, Indic speech AI, soil chemistry intelligence, and agronomic nutrition.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: AI Disease Detection */}
            <div className="group relative bg-white rounded-3xl p-6 border border-slate-200/90 hover:border-green-300 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#14532D] to-[#16A34A] flex items-center justify-center text-white shadow-md shadow-green-700/20 group-hover:scale-105 transition-transform duration-200">
                  <svg className="w-6 h-6 text-[#A3E635]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#14532D] border border-green-200">
                      MobileNetV2 CNN
                    </span>
                    <span className="text-xs text-[#64748B]">38 Classes</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#16A34A] transition-colors">
                    AI Disease Detection
                  </h3>
                  <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                    Instant leaf pathology detection from photos. Diagnoses fungal, bacterial, and viral infections with organic and chemical remedies.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6">
                <Link
                  href="/scanning"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16A34A] group-hover:text-[#14532D] transition-colors"
                >
                  <span>Launch Scanner</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Card 2: Smart Crop Recommendation */}
            <div className="group relative bg-white rounded-3xl p-6 border border-slate-200/90 hover:border-green-300 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#14532D] to-[#16A34A] flex items-center justify-center text-white shadow-md shadow-green-700/20 group-hover:scale-105 transition-transform duration-200">
                  <svg className="w-6 h-6 text-[#A3E635]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#14532D] border border-green-200">
                      RandomForest ML
                    </span>
                    <span className="text-xs text-[#64748B]">22 Crops</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#16A34A] transition-colors">
                    Smart Crop Recommender
                  </h3>
                  <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                    Calculate the highest-yielding crop for your soil chemistry (N, P, K, pH) and microclimate with 99.5% model test accuracy.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6">
                <Link
                  href="/crop-recommendation"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16A34A] group-hover:text-[#14532D] transition-colors"
                >
                  <span>Calculate Optimal Crop</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Card 3: AI Voice Assistant (Interactive Trigger) */}
            <div className="group relative bg-white rounded-3xl p-6 border border-slate-200/90 hover:border-green-300 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#14532D] to-[#16A34A] flex items-center justify-center text-white shadow-md shadow-green-700/20 group-hover:scale-105 transition-transform duration-200">
                  <svg className="w-6 h-6 text-[#A3E635]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#14532D] border border-green-200">
                      Gnani Indic Voice
                    </span>
                    <span className="text-xs text-[#64748B]">EN • TE • HI</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#16A34A] transition-colors">
                    AI Voice Assistant
                  </h3>
                  <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                    Hands-free voice and text guidance powered by Gnani Prisma (STT) and Timbre (TTS). Speak your farming queries aloud.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={triggerAIAssistant}
                  className="w-full inline-flex items-center justify-between text-xs font-bold text-[#16A34A] group-hover:text-[#14532D] transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                    <span>Talk with Agronomy AI</span>
                  </span>
                  <span>🎤</span>
                </button>
              </div>
            </div>

            {/* Card 4: Smart Fertilizer Guidance */}
            <div className="group relative bg-white rounded-3xl p-6 border border-slate-200/90 hover:border-green-300 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#14532D] to-[#16A34A] flex items-center justify-center text-white shadow-md shadow-green-700/20 group-hover:scale-105 transition-transform duration-200">
                  <svg className="w-6 h-6 text-[#A3E635]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#14532D] border border-green-200">
                      Nutrient Calculator
                    </span>
                    <span className="text-xs text-[#64748B]">NPK + Micro</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#16A34A] transition-colors">
                    Smart Fertilizer Guidance
                  </h3>
                  <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                    Scientifically balanced NPK nutrition schedules, deficiency symptom identification, and organic compost alternatives.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6">
                <Link
                  href="/fertilizer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16A34A] group-hover:text-[#14532D] transition-colors"
                >
                  <span>Explore Fertilizer Guide</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. COMPACT WEATHER AND FARMING INSIGHTS SECTION ────────────────── */}
        <section className="py-12 bg-white border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#DCFCE7] text-[#14532D] mb-2">
                  <span>🌦️</span>
                  <span>Live Agricultural Weather & Microclimate</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
                  Real-Time Weather & Farming Insights
                </h2>
                <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                  Hyperlocal meteorological telemetry via Open-Meteo with automated agronomic spray, fungal, and heat warnings.
                </p>
              </div>

              {/* Dynamic Location Search & My Farm Location (GPS) Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                {/* Search input with live suggestion dropdown */}
                <div ref={searchContainerRef} className="relative flex-1 sm:w-80 lg:w-96">
                  <form onSubmit={handleSearchSubmit} className="flex items-center">
                    <div className="relative w-full">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchInput(e.target.value)}
                        onFocus={() => {
                          if (suggestions.length > 0) setShowDropdown(true)
                        }}
                        placeholder="Search village, town, district or city..."
                        className="w-full pl-9 pr-8 py-2.5 rounded-xl sm:rounded-r-none bg-[#F7FAF7] border border-slate-300 focus:border-[#16A34A] focus:bg-white text-xs sm:text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                      </span>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('')
                            setSuggestions([])
                            setShowDropdown(false)
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          title="Clear input"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="hidden sm:inline-flex px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-xs font-bold rounded-r-xl border border-[#16A34A] transition-colors shrink-0 shadow-2xs items-center gap-1.5"
                    >
                      {isSearching ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Search'
                      )}
                    </button>
                  </form>

                  {/* Autocomplete Suggestions Dropdown */}
                  {showDropdown && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
                      <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Location Suggestions</span>
                        <span className="text-[9px] lowercase font-normal text-slate-400">OpenStreetMap Nominatim</span>
                      </div>
                      {suggestions.map((item, idx) => (
                        <button
                          key={`${item.latitude}-${item.longitude}-${idx}`}
                          type="button"
                          onClick={() => handleSelectLocation(item)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-green-50 transition-colors border-b border-slate-100 last:border-b-0 flex items-start gap-2.5 group"
                        >
                          <span className="text-base mt-0.5 text-slate-400 group-hover:text-[#16A34A]">📍</span>
                          <div className="flex-1 overflow-hidden">
                            <div className="text-xs sm:text-sm font-bold text-[#111827] group-hover:text-[#166534] truncate">
                              {item.villageLocality}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {[item.subdistrictMandal, item.district, item.state, item.country].filter(Boolean).join(', ')}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* My Farm Location (GPS) Button */}
                <button
                  type="button"
                  onClick={handleDetectGpsLocation}
                  disabled={isDetectingGps}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#14532D] text-xs font-bold border border-green-300 shadow-2xs inline-flex items-center justify-center gap-2 transition-all hover:border-green-400 disabled:opacity-60 shrink-0"
                >
                  {isDetectingGps ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-[#16A34A] border-t-transparent rounded-full animate-spin" />
                      <span>Detecting GPS...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.071 7.071l-1.414-1.414M8.343 8.343L6.929 6.929m12.728 0l-1.414 1.414M8.343 15.657l-1.414 1.414M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>📍 My Farm Location</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Location Notice / Friendly Toast */}
            {locationNotice && (
              <div className="mb-6 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-medium flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>{locationNotice}</span>
                </div>
                <button
                  onClick={() => setLocationNotice(null)}
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 px-2 py-0.5 rounded hover:bg-amber-100"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* PROMINENT SELECTED FARM LOCATION CARD */}
            {selectedLocation && (
              <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-[#F7FAF7] border border-green-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white border border-green-300 flex items-center justify-center text-xl shrink-0 shadow-xs mt-0.5">
                    📍
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Your Farm Location
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          selectedLocation.source === 'gps'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-blue-100 text-blue-800 border-blue-200'
                        }`}
                      >
                        {selectedLocation.source === 'gps' ? 'GPS Detected' : 'Manual Selection'}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-[#111827] mt-0.5 leading-tight">
                      {selectedLocation.villageLocality}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                      {[
                        selectedLocation.subdistrictMandal,
                        selectedLocation.district,
                        selectedLocation.state,
                        selectedLocation.country,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>

                {/* Administrative Details Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-3 md:pt-0 border-t md:border-t-0 border-slate-200/80">
                  <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-3xs">
                    <span className="text-[10px] text-slate-400 block font-semibold">Village / Locality</span>
                    <span className="font-extrabold text-slate-800 truncate block" title={selectedLocation.villageLocality}>
                      {selectedLocation.villageLocality || 'Not specified'}
                    </span>
                  </div>
                  <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-3xs">
                    <span className="text-[10px] text-slate-400 block font-semibold">Mandal / Subdistrict</span>
                    <span
                      className={`font-extrabold truncate block ${
                        selectedLocation.subdistrictMandal ? 'text-slate-800' : 'text-slate-400 italic'
                      }`}
                      title={selectedLocation.subdistrictMandal || 'Not specified by provider'}
                    >
                      {selectedLocation.subdistrictMandal || 'Not specified'}
                    </span>
                  </div>
                  <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-3xs">
                    <span className="text-[10px] text-slate-400 block font-semibold">District</span>
                    <span
                      className={`font-extrabold truncate block ${
                        selectedLocation.district ? 'text-slate-800' : 'text-slate-400 italic'
                      }`}
                      title={selectedLocation.district || 'Not specified'}
                    >
                      {selectedLocation.district || 'Not specified'}
                    </span>
                  </div>
                  <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-3xs">
                    <span className="text-[10px] text-slate-400 block font-semibold">State / Country</span>
                    <span className="font-extrabold text-slate-800 truncate block">
                      {[selectedLocation.state, selectedLocation.country].filter(Boolean).join(', ') || 'India'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {weatherLoading ? (
              <div className="p-10 rounded-3xl bg-[#F7FAF7] border border-slate-200 flex flex-col items-center justify-center gap-3 text-sm font-semibold text-[#64748B]">
                <span className="w-5 h-5 border-2 border-[#16A34A] border-t-transparent rounded-full animate-spin" />
                <span>Fetching live agricultural weather for {selectedLocation?.villageLocality || 'selected location'}...</span>
              </div>
            ) : weatherError ? (
              <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-medium flex items-center justify-between">
                <span>{weatherError}</span>
                {selectedLocation && (
                  <button
                    onClick={() => handleSelectLocation(selectedLocation)}
                    className="px-3 py-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 font-bold text-xs transition-colors"
                  >
                    ↻ Retry Weather
                  </button>
                )}
              </div>
            ) : weather && selectedLocation ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* Weather Metrics Card */}
                <div className="lg:col-span-2 bg-[#F7FAF7] rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{weatherDesc?.icon}</span>
                        <h3 className="font-extrabold text-base sm:text-lg text-[#111827]">
                          {selectedLocation.villageLocality}
                        </h3>
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5 font-medium">
                        Condition: <strong className="text-[#111827]">{weatherDesc?.text}</strong> (Updated {weather.lastUpdated})
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-3xl sm:text-4xl font-black text-[#111827]">
                        {weather.temperature}°C
                      </div>
                      <div className="text-xs text-[#64748B]">
                        Feels like {weather.apparentTemp}°C
                      </div>
                    </div>
                  </div>

                  {/* 4 Core Farming Microclimate Variables */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                    <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
                      <div className="text-xs text-[#64748B] font-bold">Relative Humidity</div>
                      <div className="text-xl sm:text-2xl font-black text-[#111827] mt-1">
                        {weather.humidity}%
                      </div>
                      <div className="text-[10px] text-[#166534] font-semibold mt-0.5">
                        {weather.humidity > 75 ? 'Elevated Spore Risk' : 'Normal Range'}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
                      <div className="text-xs text-[#64748B] font-bold">Precipitation</div>
                      <div className="text-xl sm:text-2xl font-black text-[#111827] mt-1">
                        {weather.precipitation} <span className="text-xs font-semibold">mm</span>
                      </div>
                      <div className="text-[10px] text-[#166534] font-semibold mt-0.5">
                        {weather.precipitation > 0 ? 'Rainfall Observed' : 'Dry Canopy'}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
                      <div className="text-xs text-[#64748B] font-bold">Wind Speed</div>
                      <div className="text-xl sm:text-2xl font-black text-[#111827] mt-1">
                        {weather.windSpeed} <span className="text-xs font-semibold">km/h</span>
                      </div>
                      <div className="text-[10px] text-[#166534] font-semibold mt-0.5">
                        {weather.windSpeed > 20 ? 'Caution: Spray Drift' : 'Favorable Breeze'}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
                      <div className="text-xs text-[#64748B] font-bold">Data Provenance</div>
                      <div className="text-base sm:text-lg font-black text-[#16A34A] mt-1">
                        Open-Meteo
                      </div>
                      <div className="text-[10px] text-[#64748B] font-semibold mt-0.5">
                        {selectedLocation.latitude.toFixed(2)}°N, {selectedLocation.longitude.toFixed(2)}°E
                      </div>
                    </div>
                  </div>
                </div>

                {/* Automated Farming Action Advisory Card */}
                {advisory && (
                  <div className="bg-white rounded-3xl p-6 border border-green-200/90 shadow-xs flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                          Agronomic Recommendation
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${advisory.badge}`}>
                          {advisory.status}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-base text-[#111827]">
                        Foliar Spray & Field Advisory
                      </h4>

                      <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                        {advisory.advice}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[#64748B]">Need tailored crop guidance?</span>
                      <Link
                        href="/fertilizer"
                        className="font-bold text-[#16A34A] hover:text-[#14532D] transition-colors"
                      >
                        Fertilizer Schedule &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Welcoming Empty State when no location is chosen yet */
              <div className="p-8 sm:p-12 rounded-3xl bg-[#F7FAF7] border-2 border-dashed border-green-200 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white border border-green-300 text-2xl flex items-center justify-center mx-auto shadow-xs">
                  🌾
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#111827]">
                  Select Your Farm Location to View Live Weather & Spray Advisories
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
                  Type your village, town, or district in the search bar above, or click <strong>My Farm Location</strong> to detect via GPS coordinates.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── 5. VISUAL 3-STEP "HOW AGRONOMY AI WORKS" SECTION ──────────────── */}
        <section id="how-it-works" className="py-20 lg:py-24 bg-[#F7FAF7]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#DCFCE7] text-[#14532D] mb-2">
                <span>⚡</span>
                <span>Simple 3-Step Process</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
                How Agronomy AI Works
              </h2>
              <p className="mt-3 text-[#64748B] text-sm sm:text-base">
                Engineered for rapid field diagnostics with zero learning curve for farmers and agronomists.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4 relative flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#14532D] to-[#16A34A] text-white font-black text-lg flex items-center justify-center shadow-md shadow-green-700/20">
                      1
                    </div>
                    <span className="text-4xl">📸</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#111827]">Scan Your Plant</h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Capture or upload a clear photo of the infected leaf using your smartphone or tablet. The system inspects natural daylight and focus.
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 text-xs text-[#166534] font-semibold">
                  Supports JPEG, PNG, WEBP (up to 10 MB)
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4 relative flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#14532D] to-[#16A34A] text-white font-black text-lg flex items-center justify-center shadow-md shadow-green-700/20">
                      2
                    </div>
                    <span className="text-4xl">🧠</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#111827]">AI Analysis</h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Our MobileNetV2 neural vision model evaluates cellular patterns, chlorotic lesions, and sporulation across 38 distinct crop pathologies in under 2 seconds.
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 text-xs text-[#166534] font-semibold">
                  Softmax confidence scoring & validation
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4 relative flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#14532D] to-[#16A34A] text-white font-black text-lg flex items-center justify-center shadow-md shadow-green-700/20">
                      3
                    </div>
                    <span className="text-4xl">💊</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#111827]">Get Recommendations</h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Receive actionable prescriptions: certified organic biocontrols, chemical fungicides with safety re-entry intervals, and downloadable PDF reports.
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 text-xs text-[#166534] font-semibold">
                  Downloadable PDF & CSV records
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. INTERACTIVE MODEL PREVIEW SECTION ──────────────────────────── */}
        <section className="py-20 bg-white border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-[#16A34A] mb-2">
                Live Engine Previews
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
                Two Specialized ML Models at Work
              </h2>
              <div className="flex justify-center gap-3 mt-6">
                <button
                  onClick={() => setActiveTabPreview('disease')}
                  className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                    activeTabPreview === 'disease'
                      ? 'bg-[#16A34A] text-white shadow-md shadow-green-600/30'
                      : 'bg-white text-[#475569] hover:text-[#16A34A] border border-[#E2E8F0]'
                  }`}
                >
                  🦠 Disease Detection Engine
                </button>
                <button
                  onClick={() => setActiveTabPreview('crop')}
                  className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                    activeTabPreview === 'crop'
                      ? 'bg-[#16A34A] text-white shadow-md shadow-green-600/30'
                      : 'bg-white text-[#475569] hover:text-[#16A34A] border border-[#E2E8F0]'
                  }`}
                >
                  🌾 Crop Recommender Engine
                </button>
              </div>
            </div>

            {/* Disease Tab Preview */}
            {activeTabPreview === 'disease' && (
              <div className="bg-[#F8FAFC] rounded-3xl p-6 sm:p-10 shadow-sm border border-[#E2E8F0] max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in duration-300">
                <div className="relative rounded-2xl overflow-hidden aspect-4/3 shadow-md bg-white">
                  <img
                    src="https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800&auto=format&fit=crop&q=80"
                    alt="Tomato plant leaves"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Detected: Tomato Early Blight
                  </div>
                  <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                    Accuracy: 97.4%
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      Solanaceae Leaf Pathology
                    </span>
                    <span className="text-xs text-[#64748B]">MobileNetV2 CNN</span>
                  </div>

                  <h3 className="text-2xl font-bold text-[#111827]">
                    Comprehensive Diagnostic Action Plan
                  </h3>

                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0]">
                      <strong className="text-[#111827] block mb-1">🔍 Symptoms Observed:</strong>
                      <p className="text-[#475569]">
                        Concentric bullseye brown lesions starting on lower mature foliage with chlorotic yellow halo.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#DCFCE7]/60 border border-green-200">
                      <strong className="text-[#166534] block mb-1">🌿 Organic Treatment:</strong>
                      <p className="text-[#166534]">
                        Prune lower leaves 30 cm from soil bed. Spray Bacillus subtilis biofungicide or copper octanoate weekly.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200">
                      <strong className="text-blue-900 block mb-1">🧪 Chemical Treatment & Safety:</strong>
                      <p className="text-blue-900">
                        Apply Chlorothalonil or Mancozeb. Wear chemical-resistant gloves, eye protection, and observe 5-day PHI.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/scanning"
                      className="inline-flex items-center gap-2 text-sm font-bold text-[#16A34A] hover:text-[#166534]"
                    >
                      Try with your own photo &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Crop Tab Preview */}
            {activeTabPreview === 'crop' && (
              <div className="bg-[#F8FAFC] rounded-3xl p-6 sm:p-10 shadow-sm border border-[#E2E8F0] max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in duration-300">
                <div className="bg-[#111827] text-white rounded-2xl p-6 sm:p-8 space-y-4 font-mono text-xs shadow-md">
                  <div className="text-emerald-400 font-bold uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
                    Input Soil Chemistry Profile
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-slate-300">
                    <div>Nitrogen (N): <span className="text-emerald-400 font-bold">90 kg/ha</span></div>
                    <div>Phosphorus (P): <span className="text-emerald-400 font-bold">42 kg/ha</span></div>
                    <div>Potassium (K): <span className="text-emerald-400 font-bold">43 kg/ha</span></div>
                    <div>Soil pH: <span className="text-emerald-400 font-bold">6.5</span></div>
                    <div>Temperature: <span className="text-emerald-400 font-bold">20.8 °C</span></div>
                    <div>Humidity: <span className="text-emerald-400 font-bold">82.0 %</span></div>
                    <div className="col-span-2">Rainfall: <span className="text-emerald-400 font-bold">202.9 mm</span></div>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Algorithm: RandomForest (100 Trees)</span>
                    <span className="text-emerald-400">99.5% Test Accuracy</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#166534]">
                    Recommended: Rice (Paddy) 🌾
                  </div>

                  <h3 className="text-2xl font-bold text-[#111827]">
                    Optimal Match for Warm Waterlogged Conditions
                  </h3>

                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0]">
                      <strong className="text-[#111827] block mb-1">🌾 Growing Cycle:</strong>
                      <p className="text-[#475569]">
                        105 - 130 days from transplanting. Best suited for high rainfall (1000-2000 mm) and clayey loams.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200">
                      <strong className="text-amber-900 block mb-1">🧪 Fertilizer Guidance:</strong>
                      <p className="text-amber-800">
                        High Nitrogen split doses at tillering and panicle initiation. Ensure 25 kg/ha Zinc sulfate.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200">
                      <strong className="text-blue-900 block mb-1">💧 Water Requirements:</strong>
                      <p className="text-blue-800">
                        Maintain 5-7 cm standing water or practice Alternate Wetting and Drying (AWD) water management.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/crop-recommendation"
                      className="inline-flex items-center gap-2 text-sm font-bold text-[#16A34A] hover:text-[#166534]"
                    >
                      Calculate for your field soil data &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── 7. SUPPORTED CROPS & PLANTS SHOWCASE ───────────────────────────── */}
        <section className="py-20 bg-[#F7FAF7] border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#16A34A] mb-2">
                  Comprehensive Coverage
                </p>
                <h2 className="text-3xl font-extrabold text-[#111827] tracking-tight">
                  Plants Supported for Disease Detection
                </h2>
              </div>
              <Link
                href="/crops"
                className="text-sm font-bold text-[#166534] hover:text-[#16A34A] hover:underline"
              >
                View all crop guides & diseases &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {samplePlants.map((plant) => (
                <Link
                  key={plant.name}
                  href={`/crops?crop=${encodeURIComponent(plant.name)}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-xs hover:shadow-md hover:-translate-y-1 transition-all"
                >
                  <div className="h-32 overflow-hidden bg-gray-100">
                    <img
                      src={plant.img}
                      alt={plant.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#111827]">{plant.name}</span>
                      <span className="text-base">{plant.emoji}</span>
                    </div>
                    <span className="inline-block mt-2 text-[10px] uppercase font-bold tracking-wider text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded">
                      {plant.diseases}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Supported Crops List */}
            <div className="mt-14 pt-8 border-t border-slate-200">
              <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] text-center mb-4">
                Supported Crops for Soil Recommendation (22 Classes)
              </p>
              <div className="flex flex-wrap justify-center gap-2.5 max-w-5xl mx-auto">
                {supportedCropsList.map((crop) => (
                  <span
                    key={crop}
                    className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white text-[#334155] border border-slate-200/90 shadow-2xs"
                  >
                    {crop}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 8. FAQ ACCORDION SECTION ──────────────────────────────────────── */}
        <section className="py-20 lg:py-24 bg-white border-t border-slate-200/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-xs font-bold uppercase tracking-widest text-[#16A34A] mb-2">
                Frequently Asked Questions
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
                Clear Answers for Farmers & Researchers
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden transition-all shadow-2xs"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-[#111827] hover:text-[#16A34A] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <svg
                      className={`w-5 h-5 text-[#16A34A] shrink-0 transition-transform duration-200 ${
                        openFaq === index ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === index && (
                    <div className="px-5 pb-5 text-sm text-[#475569] leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 9. CALL TO ACTION BANNER ──────────────────────────────────────── */}
        <section className="py-20 bg-gradient-to-r from-[#14532D] via-[#166534] to-[#16A34A] text-white relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
            <div className="inline-block text-4xl mb-2">🌿</div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Start Protecting Your Farm Today
            </h2>
            <p className="text-base sm:text-lg text-emerald-100 max-w-2xl mx-auto leading-relaxed">
              Upload any crop photo or enter your local soil parameters. Get instant, scientific recommendations with zero friction.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/scanning"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-[#166534] font-extrabold text-sm shadow-lg hover:bg-emerald-50 active:scale-95 transition-all"
              >
                Scan Plant Leaf Now &rarr;
              </Link>
              <Link
                href="/crop-recommendation"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#166534] text-white font-extrabold text-sm border border-emerald-400 hover:bg-[#14532D] active:scale-95 transition-all"
              >
                Get Soil Crop Advice
              </Link>
            </div>
          </div>
        </section>
    </div>
  )
}
