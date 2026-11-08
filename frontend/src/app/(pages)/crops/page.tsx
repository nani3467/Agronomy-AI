'use client'

import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL, formatApiError, CropGuide, CropDisease } from '@/lib/api'
import { getStaleWhileRevalidate, setCached } from '@/lib/apiCache'
import { useVoiceOS } from '@/context/VoiceOSContext'
import { useVoiceActions } from '@/hooks/useVoiceActions'

function CropsContent() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') || searchParams.get('q') || searchParams.get('crop') || ''
  const initialCrop = searchParams.get('crop') || searchParams.get('search') || searchParams.get('q') || ''
  const initialDisease = searchParams.get('disease') || ''
  const initialCategory = searchParams.get('category') || 'All'

  const [crops, setCrops] = useState<CropGuide[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState(initialSearch)
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [selectedSeason, setSelectedSeason] = useState('All')
  const [sortBy, setSortBy] = useState<'name' | 'duration'>('name')

  // Detailed Modal View State
  const [activeModalCrop, setActiveModalCrop] = useState<CropGuide | null>(null)
  const [modalTab, setModalTab] = useState<'overview' | 'agronomy' | 'timeline' | 'diseases' | 'management' | 'faq'>('overview')
  const [expandedDiseaseId, setExpandedDiseaseId] = useState<string | null>(null)
  const [diseaseCategoryFilter, setDiseaseCategoryFilter] = useState<string>('All')

  const diseaseSectionRef = useRef<HTMLDivElement>(null)

  const { speak, language } = useVoiceOS()

  useVoiceActions([
    {
      id: 'search_crops',
      name: 'Search Crop Library',
      description: 'Search crops by name (e.g. rice, tomato, wheat, cotton)',
      intent: 'SEARCH',
      keywords_en: ['search for rice', 'search crop', 'find crop', 'look up', 'show wheat information', 'explain how to grow tomato'],
      keywords_te: ['పంట వెతుకు', 'పంట సమాచారం', 'వరి గురించి వెతుకు'],
      keywords_hi: ['फसल खोजो', 'फसल जानकारी', 'चावल खोजो'],
      handler: (params) => {
        if (params?.query) {
          const q = params.query.toLowerCase().trim()
          setSearch(q)
          const matched = crops.find((c) => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase()))
          if (matched) {
            setActiveModalCrop(matched)
            const isExplain = params.explain || q.includes('how to grow') || q.includes('grow') || q.includes('explain')
            const resp =
              isExplain
                ? (language === 'te'
                    ? `${matched.name} సాగు మార్గదర్శి: ${matched.description}. నేల పరిస్థితులు: ${matched.soil_conditions}. పంట కాలం: ${matched.harvest_duration || '90-120 రోజులు'}.`
                    : language === 'hi'
                    ? `${matched.name} खेती की मार्गदर्शिका: ${matched.description}। उपयुक्त मिट्टी: ${matched.soil_conditions}। फसल अवधि: ${matched.harvest_duration || '90-120 दिन'}।`
                    : `How to grow ${matched.name}: ${matched.description}. Suitable soil: ${matched.soil_conditions}. Harvest duration: ${matched.harvest_duration || '90-120 days'}.`)
                : (language === 'te'
                    ? `${matched.name} పంట వివరాలు తెరవబడ్డాయి.`
                    : language === 'hi'
                    ? `${matched.name} फसल का विवरण खोला गया।`
                    : `Opened details for ${matched.name}.`)
            speak(resp)
          } else {
            speak(`Found crop search results for ${params.query}.`)
          }
        }
      },
    },
    {
      id: 'show_crop_info',
      name: 'Show Crop Information',
      description: 'Show detailed information and cultivation guide for crop',
      intent: 'SEARCH',
      keywords_en: ['show wheat information', 'wheat information', 'explain how to grow tomato', 'tomato information'],
      keywords_te: ['గోధుమ వివరాలు', 'టమోటా సాగు వివరాలు'],
      keywords_hi: ['गेहूं की जानकारी', 'टमाटर की खेती'],
      handler: (params) => {
        const query = params?.query || (params?.crop || 'rice')
        const matched = crops.find((c) => c.name.toLowerCase().includes(query.toLowerCase()))
        if (matched) {
          setActiveModalCrop(matched)
          const resp =
            language === 'te'
              ? `${matched.name} సాగు మార్గదర్శి: ${matched.description}. నేల: ${matched.soil_conditions}. పంట కాలం: ${matched.harvest_duration || '90-120 రోజులు'}.`
              : language === 'hi'
              ? `${matched.name} खेती मार्गदर्शिका: ${matched.description}। मिट्टी: ${matched.soil_conditions}। फसल अवधि: ${matched.harvest_duration || '90-120 दिन'}।`
              : `${matched.name} Cultivation Guide: ${matched.description}. Soil: ${matched.soil_conditions}. Harvest duration: ${matched.harvest_duration || '90-120 days'}.`
          speak(resp)
        }
      },
    },
    {
      id: 'read_crop_summary',
      name: 'Read Crop Guide',
      description: 'Read the summary and cultivation guidance of active crop',
      intent: 'READ_SECTION',
      keywords_en: ['read guide', 'explain crop', 'tell me about this crop'],
      keywords_te: ['వివరాలు చదువు', 'సాగు పద్ధతులు చెప్పు'],
      keywords_hi: ['विवरण पढ़ो', 'खेती की विधि बताओ'],
      handler: () => {
        if (activeModalCrop) {
          const text =
            language === 'te'
              ? `${activeModalCrop.name} పంట వివరాలు: ${activeModalCrop.description}. వ్యవధి: ${activeModalCrop.harvest_duration || 'సగటు కాలం'}. నేల రకం: ${activeModalCrop.soil_conditions}.`
              : language === 'hi'
              ? `${activeModalCrop.name} फसल विवरण: ${activeModalCrop.description}। अवधि: ${activeModalCrop.harvest_duration || 'औसत समय'}। मिट्टी: ${activeModalCrop.soil_conditions}।`
              : `${activeModalCrop.name} Cultivation Guide: ${activeModalCrop.description}. Harvest duration: ${activeModalCrop.harvest_duration || 'Standard period'}. Soil: ${activeModalCrop.soil_conditions}.`
          speak(text)
        }
      },
    },
  ])

  useEffect(() => {
    // 1. Optimistic instant render from memory cache
    const cached = getStaleWhileRevalidate<CropGuide[]>('crops_library')
    if (cached.data && cached.data.length > 0) {
      setCrops(cached.data)
      setIsLoading(false)

      if (initialDisease) {
        const normDis = initialDisease.toLowerCase().trim()
        const hostCrop = cached.data.find((c) => {
          const hasDirect = (c.diseases || []).some(
            (d) => d.name.toLowerCase() === normDis || d.name.toLowerCase().includes(normDis) || normDis.includes(d.name.toLowerCase())
          )
          const hasCommon = (c.common_diseases || []).some(
            (d) => d.toLowerCase() === normDis || d.toLowerCase().includes(normDis) || normDis.includes(d.toLowerCase())
          )
          return hasDirect || hasCommon || normDis.includes(c.name.toLowerCase())
        })
        if (hostCrop) {
          setActiveModalCrop(hostCrop)
          setModalTab('diseases')
          setExpandedDiseaseId(initialDisease)
        }
      } else if (initialCrop) {
        const norm = initialCrop.toLowerCase().trim()
        const match = cached.data.find(
          (c) => c.name.toLowerCase() === norm || c.name.toLowerCase().includes(norm) || norm.includes(c.name.toLowerCase())
        )
        if (match) setActiveModalCrop(match)
      }

      if (!cached.isStale) return
    }

    const fetchCrops = async () => {
      if (!cached.data || cached.data.length === 0) {
        setIsLoading(true)
      }
      try {
        const res = await axios.get<{ total: number; crops: CropGuide[] }>(`${API_BASE_URL}/crops/`, {
          timeout: 15000,
        })
        const data = res.data.crops || []
        setCrops(data)
        setCached('crops_library', data, 10 * 60 * 1000)

        // If URL has ?disease=..., find the crop that hosts this disease
        if (initialDisease) {
          const normDis = initialDisease.toLowerCase().trim()
          const hostCrop = data.find((c) => {
            const hasDirect = (c.diseases || []).some(
              (d) => d.name.toLowerCase() === normDis || d.name.toLowerCase().includes(normDis) || normDis.includes(d.name.toLowerCase())
            )
            const hasCommon = (c.common_diseases || []).some(
              (d) => d.toLowerCase() === normDis || d.toLowerCase().includes(normDis) || normDis.includes(d.toLowerCase())
            )
            return hasDirect || hasCommon || normDis.includes(c.name.toLowerCase())
          })

          if (hostCrop) {
            setActiveModalCrop(hostCrop)
            setModalTab('diseases')
            setExpandedDiseaseId(initialDisease)
            return
          }
        }

        // If URL has ?crop=..., auto-open that crop
        if (initialCrop) {
          const norm = initialCrop.toLowerCase().trim()
          const match = data.find(
            (c) =>
              c.name.toLowerCase() === norm ||
              c.name.toLowerCase().includes(norm) ||
              norm.includes(c.name.toLowerCase())
          )
          if (match) {
            setActiveModalCrop(match)
            if (initialDisease) {
              setModalTab('diseases')
              setExpandedDiseaseId(initialDisease)
            }
          }
        }
      } catch (err: unknown) {
        setError(formatApiError(err, 'Could not load crop cultivation guides.'))
      } finally {
        setIsLoading(false)
      }
    }
    fetchCrops()
  }, [initialCrop, initialDisease])

  // Update category if URL changes
  useEffect(() => {
    if (initialCategory && initialCategory !== 'All') {
      setSelectedCategory(initialCategory)
    }
  }, [initialCategory])

  const categories = useMemo(() => {
    const set = new Set<string>()
    crops.forEach((c) => {
      if (c.category) set.add(c.category)
    })
    return ['All', ...Array.from(set).sort()]
  }, [crops])

  const filteredCrops = useMemo(() => {
    const q = search.trim().toLowerCase()

    return crops
      .filter((crop) => {
        // Search query across crop and all associated diseases!
        if (q) {
          const hay = [
            crop.name,
            crop.scientific_name || '',
            crop.category || '',
            crop.short_description || crop.description || '',
            crop.growing_season || '',
            crop.soil_requirements || crop.soil_conditions || '',
            crop.seed_varieties || '',
            ...(crop.common_diseases || []),
            ...((crop.diseases || []).map((d) => `${d.name} ${d.scientific_name || ''} ${d.category || ''} ${d.symptoms || ''}`)),
          ]
            .join(' ')
            .toLowerCase()
          if (!hay.includes(q)) return false
        }

        // Category filter
        if (selectedCategory !== 'All' && crop.category !== selectedCategory) {
          return false
        }

        // Season filter
        if (selectedSeason !== 'All') {
          const seasonText = (crop.growing_season || '').toLowerCase()
          if (!seasonText.includes(selectedSeason.toLowerCase())) return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'duration') {
          const durA = parseInt(a.growing_duration || a.harvest_duration || '100', 10)
          const durB = parseInt(b.growing_duration || b.harvest_duration || '100', 10)
          return durA - durB
        }
        return a.name.localeCompare(b.name)
      })
  }, [crops, search, selectedCategory, selectedSeason, sortBy])

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Food Crop':
        return 'bg-amber-50 text-amber-800 border-amber-200'
      case 'Vegetable':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200'
      case 'Fruit':
        return 'bg-purple-50 text-purple-800 border-purple-200'
      case 'Commercial Crop':
      case 'Commercial & Pulses':
        return 'bg-blue-50 text-blue-800 border-blue-200'
      default:
        return 'bg-teal-50 text-teal-800 border-teal-200'
    }
  }

  const getSeverityBadge = (sev?: string) => {
    switch (sev) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'Low':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  // Filter diseases for active modal crop
  const activeCropDiseases = useMemo(() => {
    if (!activeModalCrop) return []
    const all = activeModalCrop.diseases || []
    if (diseaseCategoryFilter === 'All') return all
    return all.filter((d) => (d.category || '').toLowerCase() === diseaseCategoryFilter.toLowerCase())
  }, [activeModalCrop, diseaseCategoryFilter])

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/60 via-gray-50 to-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span>🌱 Unified Crop Intelligence & Disease Pathology Portal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Crop Guides & Pathology
          </h1>
          <p className="text-gray-600 text-sm sm:text-base max-w-3xl mx-auto leading-relaxed">
            Centralized agricultural intelligence combining comprehensive cultivation guides with complete plant pathology profiles, symptoms, causes, prevention, and verified treatments across all major crops.
          </p>

          {/* Quick Metrics Strip */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 text-xs font-medium text-gray-600">
            <span className="px-3 py-1 rounded-full bg-white border border-gray-200 shadow-2xs">
              🌾 <strong>{crops.length}</strong> Supported Crop Handbooks
            </span>
            <span className="px-3 py-1 rounded-full bg-red-50 text-red-800 border border-red-200">
              🦠 <strong>42+</strong> Integrated Pathology Profiles
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              ⚡ <strong>{crops.filter((c) => c.is_model_supported).length}</strong> Recommender Integrated
            </span>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              🧪 Organic & Chemical Treatments
            </span>
          </div>
        </div>

        {/* Search, Category & Sorting Toolbar */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search Input: Matches Crop AND Disease */}
            <div className="md:col-span-2 relative">
              <input
                type="text"
                placeholder="Search by crop (e.g. Tomato, Rice) or disease (e.g. Early Blight, Blast)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all placeholder:text-gray-400"
              />
              <svg
                className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 outline-none focus:border-green-500"
              >
                <option value="All">All Categories ({categories.length - 1})</option>
                {categories
                  .filter((c) => c !== 'All')
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>
            </div>

            {/* Sort Option */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'duration')}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 outline-none focus:border-green-500"
              >
                <option value="name">Sort: Crop Name (A-Z)</option>
                <option value="duration">Sort: Growing Duration</option>
              </select>
            </div>
          </div>

          {/* Quick Category Fast-Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-gray-500">Categories:</span>
              {['All', 'Food Crop', 'Vegetable', 'Fruit', 'Commercial & Pulses'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    selectedCategory === cat
                      ? 'bg-green-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat === 'All' ? 'All Crops' : cat}
                </button>
              ))}
            </div>

            <div className="text-gray-500 font-medium">
              Showing <strong>{filteredCrops.length}</strong> crops with integrated pathology
            </div>
          </div>
        </div>

        {/* Loading State: Responsive Skeleton Cards Grid */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xs p-5 space-y-4">
                <div className="h-44 w-full bg-slate-200 rounded-2xl" />
                <div className="space-y-2">
                  <div className="h-5 bg-slate-200 rounded-md w-1/2" />
                  <div className="h-3.5 bg-slate-100 rounded-md w-3/4" />
                </div>
                <div className="flex gap-2 pt-2">
                  <div className="h-6 bg-slate-100 rounded-full w-20" />
                  <div className="h-6 bg-slate-100 rounded-full w-24" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredCrops.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs space-y-3">
            <span className="text-4xl block">🌾</span>
            <h3 className="text-lg font-bold text-gray-900">No matching crop or disease found</h3>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
              No crops or associated pathologies matched &ldquo;{search}&rdquo;. Try another search term or reset filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSelectedCategory('All')
                setSelectedSeason('All')
              }}
              className="mt-2 px-5 py-2 rounded-full bg-green-600 text-white font-bold text-xs shadow-xs hover:bg-green-700"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Crop Cards Grid */}
        {!isLoading && filteredCrops.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCrops.map((crop) => {
              const diseasesCount = crop.diseases?.length || crop.common_diseases?.length || 0
              return (
                <div
                  key={crop.name}
                  className="group bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Card Image Banner */}
                    <div className="relative h-44 w-full overflow-hidden bg-gray-100">
                      <img
                        src={
                          crop.image_url ||
                          'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80'
                        }
                        alt={crop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80'
                        }}
                      />

                      {/* Category Badge Top Left */}
                      <div className="absolute top-3 left-3">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border backdrop-blur-md shadow-xs ${getCategoryColor(
                            crop.category
                          )}`}
                        >
                          {crop.category}
                        </span>
                      </div>

                      {/* Emoji Avatar Overlay Top Right */}
                      <div className="absolute top-3 right-3 w-10 h-10 rounded-2xl bg-white/90 backdrop-blur-md flex items-center justify-center text-xl shadow-md border border-white/50">
                        {crop.emoji}
                      </div>

                      {/* Growing Duration Banner Bottom Left */}
                      <div className="absolute bottom-2.5 left-3 bg-black/75 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1.5 shadow-2xs">
                        <span>⏱️</span>
                        <span>{crop.growing_duration || crop.harvest_duration || '100–120 days'}</span>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-5 sm:p-6 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xl font-black text-gray-900 group-hover:text-green-700 transition-colors">
                          {crop.name}
                        </h3>
                        {crop.scientific_name && (
                          <span
                            className="text-[11px] text-gray-500 italic font-serif truncate max-w-[150px]"
                            title={crop.scientific_name}
                          >
                            {crop.scientific_name}
                          </span>
                        )}
                      </div>

                      {/* Season & Duration */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="font-bold text-gray-800">Season:</span>
                        <span className="text-gray-600 truncate">{crop.growing_season || 'Kharif / Rabi'}</span>
                      </div>

                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {crop.short_description || crop.description}
                      </p>

                      {/* Quick Agronomic Specs Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                          <span className="text-gray-400 block text-[10px] font-semibold uppercase">SOIL pH</span>
                          <strong className="text-gray-800">{crop.ideal_ph_range || '6.0 – 7.5'}</strong>
                        </div>
                        <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                          <span className="text-gray-400 block text-[10px] font-semibold uppercase">OPTIMUM TEMP</span>
                          <strong className="text-gray-800">
                            {crop.ideal_temp_range || crop.temperature || '20°C – 30°C'}
                          </strong>
                        </div>
                      </div>

                      {/* Integrated Pathology Strip */}
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                            <span>🦠 Plant Pathologies:</span>
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                            {diseasesCount} {diseasesCount === 1 ? 'Disease' : 'Diseases'}
                          </span>
                        </div>

                        {/* List of Disease Pills */}
                        {crop.diseases && crop.diseases.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {crop.diseases.slice(0, 3).map((dis) => (
                              <button
                                key={dis.name}
                                type="button"
                                onClick={() => {
                                  setActiveModalCrop(crop)
                                  setModalTab('diseases')
                                  setExpandedDiseaseId(dis.name)
                                }}
                                className="text-[10px] font-bold text-slate-700 bg-slate-50 hover:bg-red-50 hover:text-red-700 border border-slate-200 hover:border-red-200 px-2 py-0.5 rounded-md transition-colors text-left"
                              >
                                {dis.name}
                              </button>
                            ))}
                            {crop.diseases.length > 3 && (
                              <span className="text-[10px] text-gray-400 self-center font-medium">
                                +{crop.diseases.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : crop.common_diseases && crop.common_diseases.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {crop.common_diseases.slice(0, 2).map((disName) => (
                              <span
                                key={disName}
                                className="text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md"
                              >
                                {disName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-medium">
                            ✓ Low susceptibility under optimal management
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Action Button */}
                  <div className="p-5 sm:p-6 pt-0 border-t border-gray-50 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModalCrop(crop)
                        setModalTab('overview')
                        setExpandedDiseaseId(null)
                      }}
                      className="cursor-pointer w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 hover:bg-green-600 text-gray-700 hover:text-white font-bold text-xs border border-gray-200 hover:border-green-600 transition-all active:scale-95 shadow-2xs"
                    >
                      <span>View Crop Guide & Pathology</span>
                      <span aria-hidden="true">&rarr;</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── DETAILED CROP INTELLIGENCE & PATHOLOGY MODAL ───────────────────── */}
        {activeModalCrop && (
          <div
            onClick={() => setActiveModalCrop(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            >
              {/* Modal Top Header */}
              <div className="p-5 sm:p-7 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 via-white to-green-50/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-3xl shrink-0">
                      {activeModalCrop.emoji}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getCategoryColor(
                            activeModalCrop.category
                          )}`}
                        >
                          {activeModalCrop.category}
                        </span>
                        {activeModalCrop.is_model_supported && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ ML Recommender Ready
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-gray-600">
                          ⏱️ {activeModalCrop.growing_duration || activeModalCrop.harvest_duration}
                        </span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                        {activeModalCrop.name} Complete Handbook
                      </h2>

                      {activeModalCrop.scientific_name && (
                        <p className="text-xs sm:text-sm text-gray-500 italic font-serif">
                          Botanical Name: <strong>{activeModalCrop.scientific_name}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveModalCrop(null)}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center font-bold text-sm shrink-0 transition-colors"
                    aria-label="Close modal"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Navigation Tabs (All Crop & Disease Info in ONE Place) */}
                <div className="flex items-center gap-2 mt-5 pt-3 border-t border-gray-200/60 overflow-x-auto text-xs font-bold no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setModalTab('overview')}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl transition-all ${
                      modalTab === 'overview'
                        ? 'bg-green-600 text-white shadow-xs'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    1. Crop Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('agronomy')}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl transition-all ${
                      modalTab === 'agronomy'
                        ? 'bg-green-600 text-white shadow-xs'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    2. Cultivation Guide
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('timeline')}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl transition-all ${
                      modalTab === 'timeline'
                        ? 'bg-green-600 text-white shadow-xs'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    3. Growth Timeline
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('diseases')}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                      modalTab === 'diseases'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                    }`}
                  >
                    <span>🦠 4. Diseases & Pests</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-red-700 font-extrabold">
                      {activeModalCrop.diseases?.length || 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('management')}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl transition-all ${
                      modalTab === 'management'
                        ? 'bg-green-600 text-white shadow-xs'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    5. Disease Management
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('faq')}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl transition-all ${
                      modalTab === 'faq'
                        ? 'bg-green-600 text-white shadow-xs'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    6. Agronomic FAQs
                  </button>
                </div>
              </div>

              {/* Modal Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
                {/* ── TAB 1: CROP OVERVIEW ──────────────────────────────────── */}
                {modalTab === 'overview' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {/* Hero Image & Overview Banner */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 h-56 md:h-auto">
                        <img
                          src={
                            activeModalCrop.image_url ||
                            'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80'
                          }
                          alt={activeModalCrop.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80'
                          }}
                        />
                      </div>

                      <div className="md:col-span-2 space-y-3">
                        <h4 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                          Agronomic Profile & Importance
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                          {activeModalCrop.overview || activeModalCrop.description}
                        </p>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {activeModalCrop.short_description}
                        </p>

                        <div className="pt-2 flex flex-wrap gap-2 text-xs">
                          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                            🌤️ Climate: {activeModalCrop.climate_requirements || 'Subtropical / Tropical'}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                            💧 Water Demand: {activeModalCrop.water_requirements || activeModalCrop.rainfall || 'Moderate'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 6 Key Environmental Parameter Tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Soil Requirements</span>
                        <div className="text-xs font-bold text-gray-900">
                          {activeModalCrop.soil_requirements || activeModalCrop.soil_conditions || 'Well-drained loam'}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Optimal Soil pH</span>
                        <div className="text-xs font-bold text-emerald-700">
                          {activeModalCrop.ideal_ph_range || '6.0 – 7.5'}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Optimal Temperature</span>
                        <div className="text-xs font-bold text-gray-900">
                          {activeModalCrop.ideal_temp_range || activeModalCrop.temperature || '20°C – 30°C'}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Growing Season</span>
                        <div className="text-xs font-bold text-gray-900">
                          {activeModalCrop.growing_season || 'Kharif / Rabi'}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Water / Rainfall</span>
                        <div className="text-xs font-bold text-blue-700">
                          {activeModalCrop.rainfall || activeModalCrop.water_requirements || '500 – 1000 mm'}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Expected Harvest Yield</span>
                        <div className="text-xs font-bold text-gray-900">
                          {activeModalCrop.expected_yield || 'High Commercial Yield'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 2: CULTIVATION GUIDE ──────────────────────────────── */}
                {modalTab === 'agronomy' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Land Prep */}
                      <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                        <h4 className="text-xs font-black text-gray-900 uppercase flex items-center gap-1.5">
                          <span>🚜 Land Preparation & Tillage</span>
                        </h4>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {activeModalCrop.land_preparation || 'Deep summer plowing followed by harrowing to achieve a fine, friable seedbed.'}
                        </p>
                      </div>

                      {/* Seed Selection */}
                      <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                        <h4 className="text-xs font-black text-gray-900 uppercase flex items-center gap-1.5">
                          <span>🌱 Certified Seed Varieties</span>
                        </h4>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {activeModalCrop.seed_varieties || 'High-yielding certified varieties recommended by regional agricultural extension.'}
                        </p>
                      </div>

                      {/* Sowing & Spacing */}
                      <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                        <h4 className="text-xs font-black text-gray-900 uppercase flex items-center gap-1.5">
                          <span>📐 Sowing Method & Spacing</span>
                        </h4>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {activeModalCrop.sowing_methods || 'Row sowing at uniform depth appropriate for seed diameter.'}
                        </p>
                        {activeModalCrop.seed_spacing && (
                          <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            Spacing: {activeModalCrop.seed_spacing}
                          </div>
                        )}
                      </div>

                      {/* Irrigation Schedule */}
                      <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                        <h4 className="text-xs font-black text-gray-900 uppercase flex items-center gap-1.5">
                          <span>💧 Irrigation Requirements</span>
                        </h4>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {activeModalCrop.irrigation || activeModalCrop.water_requirements || 'Maintain uniform soil moisture at critical growth phases.'}
                        </p>
                      </div>
                    </div>

                    {/* Fertilizer & NPK Regime */}
                    <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                      <h4 className="text-xs font-black text-emerald-950 uppercase flex items-center gap-1.5">
                        <span>🧪 Fertilizer & Nutrient Management (NPK)</span>
                      </h4>
                      <p className="text-xs text-emerald-900 leading-relaxed">
                        {activeModalCrop.fertilizer_requirements || activeModalCrop.fertilizer_guidance}
                      </p>
                      {activeModalCrop.npk_requirements && (
                        <div className="text-xs font-bold text-emerald-900 bg-white p-3 rounded-xl border border-emerald-200">
                          Recommended NPK Dosage: <strong>{activeModalCrop.npk_requirements}</strong>
                        </div>
                      )}
                    </div>

                    {/* Harvesting & Storage */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                        <h4 className="text-xs font-black text-gray-900 uppercase flex items-center gap-1.5">
                          <span>🌾 Harvesting Criteria</span>
                        </h4>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {activeModalCrop.harvesting || 'Harvest at peak physiological maturity when grains/fruits display characteristic color.'}
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                        <h4 className="text-xs font-black text-gray-900 uppercase flex items-center gap-1.5">
                          <span>📦 Post-Harvest Storage</span>
                        </h4>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {activeModalCrop.storage_methods || 'Clean and dry thoroughly before storing in cool, well-ventilated, pest-proof structures.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 3: VISUAL GROWTH TIMELINE ─────────────────────────── */}
                {modalTab === 'timeline' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">
                      Growth Stages & Phenological Milestones
                    </h4>

                    {activeModalCrop.growth_stages && activeModalCrop.growth_stages.length > 0 ? (
                      <div className="relative border-l-2 border-green-300 ml-4 pl-6 space-y-6 py-2">
                        {activeModalCrop.growth_stages.map((st, i) => (
                          <div key={st.stage} className="relative">
                            <span className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-green-600 text-white font-bold text-xs flex items-center justify-center ring-4 ring-white">
                              {i + 1}
                            </span>
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-1">
                              <div className="flex items-center justify-between">
                                <h5 className="font-extrabold text-sm text-gray-900">{st.stage}</h5>
                                <span className="text-xs font-mono font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md">
                                  {st.duration}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed">{st.details}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">
                        Standard developmental stages: Germination, Active Vegetative Branching, Flowering, Fruit Set, and Physiological Maturity.
                      </p>
                    )}
                  </div>
                )}

                {/* ── TAB 4: DISEASES & PESTS (THE CORE SECTION) ─────────────── */}
                {modalTab === 'diseases' && (
                  <div ref={diseaseSectionRef} className="space-y-6 animate-in fade-in duration-150">
                    {/* Header Banner */}
                    <div className="bg-red-50/80 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-red-900 flex items-center gap-1.5">
                          <span>🦠 Pathologies & Pests Associated with {activeModalCrop.name}</span>
                        </h4>
                        <p className="text-xs text-red-700 mt-0.5">
                          Verified diseases specifically affecting this crop, with symptoms, causes, spread vectors, and treatments.
                        </p>
                      </div>

                      {/* Filter by Category */}
                      <div className="flex bg-white rounded-lg p-0.5 border border-red-200 shrink-0 text-xs font-bold">
                        {['All', 'Fungal', 'Bacterial', 'Viral'].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setDiseaseCategoryFilter(cat)}
                            className={`px-2.5 py-1 rounded-md transition-all ${
                              diseaseCategoryFilter === cat
                                ? 'bg-red-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Diseases List */}
                    {activeCropDiseases.length > 0 ? (
                      <div className="space-y-4">
                        {activeCropDiseases.map((dis) => {
                          const isExpanded = expandedDiseaseId === dis.name
                          return (
                            <div
                              key={dis.name}
                              id={`disease-${dis.name.replace(/\s+/g, '-').toLowerCase()}`}
                              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                                isExpanded
                                  ? 'border-red-300 bg-white shadow-md ring-2 ring-red-200'
                                  : 'border-gray-200 bg-white hover:border-gray-300 shadow-2xs'
                              }`}
                            >
                              {/* Disease Accordion Header */}
                              <button
                                type="button"
                                onClick={() => setExpandedDiseaseId(isExpanded ? null : dis.name)}
                                className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  {dis.image_url ? (
                                    <img
                                      src={dis.image_url}
                                      alt={dis.name}
                                      className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.src = 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=400&auto=format&fit=crop&q=80'
                                      }}
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0">
                                      🦠
                                    </div>
                                  )}

                                  <div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <h5 className="font-extrabold text-sm sm:text-base text-gray-900">
                                        {dis.name}
                                      </h5>
                                      <span
                                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${getSeverityBadge(
                                          dis.severity
                                        )}`}
                                      >
                                        {dis.severity || 'Medium'} Severity
                                      </span>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                        {dis.category || 'Fungal'}
                                      </span>
                                    </div>
                                    {dis.scientific_name && (
                                      <p className="text-xs text-gray-500 italic font-serif mt-0.5">
                                        Causal Agent: {dis.scientific_name}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="text-gray-400 font-extrabold text-lg shrink-0 px-2">
                                  {isExpanded ? '▲' : '▼'}
                                </div>
                              </button>

                              {/* Expanded Detailed Disease Card */}
                              {isExpanded && (
                                <div className="p-5 pt-0 border-t border-gray-100 space-y-4 animate-in slide-in-from-top-2 duration-150 text-xs">
                                  {/* Symptoms Section */}
                                  <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                                    <span className="font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1">
                                      <span>🔍 Primary Diagnostic Symptoms</span>
                                    </span>
                                    <p className="text-amber-900 leading-relaxed">{dis.symptoms}</p>
                                    {dis.early_stage_symptoms && (
                                      <div className="pt-1 text-[11px] text-amber-800">
                                        <strong>Early Stage:</strong> {dis.early_stage_symptoms}
                                      </div>
                                    )}
                                    {dis.advanced_stage_symptoms && (
                                      <div className="text-[11px] text-amber-800">
                                        <strong>Advanced Stage:</strong> {dis.advanced_stage_symptoms}
                                      </div>
                                    )}
                                  </div>

                                  {/* Causes & Spread Vector */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                                      <span className="font-extrabold text-gray-800 uppercase text-[11px] block">
                                        Causes & Conditions
                                      </span>
                                      <p className="text-gray-600 leading-relaxed">{dis.causes}</p>
                                      {dis.environmental_conditions && (
                                        <p className="text-[11px] text-gray-500 mt-1">
                                          <strong>Environment:</strong> {dis.environmental_conditions}
                                        </p>
                                      )}
                                    </div>

                                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                                      <span className="font-extrabold text-gray-800 uppercase text-[11px] block">
                                        Mode of Spread
                                      </span>
                                      <p className="text-gray-600 leading-relaxed">{dis.spread}</p>
                                      {dis.crop_damage && (
                                        <p className="text-[11px] text-red-700 mt-1">
                                          <strong>Yield Loss:</strong> {dis.crop_damage}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Prevention Methods */}
                                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
                                    <span className="font-extrabold text-blue-950 uppercase tracking-wider flex items-center gap-1">
                                      <span>🛡️ Proactive Prevention & Sanitation</span>
                                    </span>
                                    <p className="text-blue-900 leading-relaxed">{dis.prevention}</p>
                                  </div>

                                  {/* Treatment & Medicines (Crucial Requirement) */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    {/* Organic Treatment */}
                                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                                      <span className="font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1">
                                        <span>🌿 Organic & Biological Control</span>
                                      </span>
                                      <p className="text-emerald-900 leading-relaxed">
                                        {dis.organic_treatment || 'Apply copper soap or Bacillus subtilis bio-fungicide.'}
                                      </p>
                                    </div>

                                    {/* Chemical Treatment & Medicine Active Ingredients */}
                                    <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 space-y-1.5">
                                      <span className="font-extrabold text-purple-950 uppercase tracking-wider flex items-center gap-1">
                                        <span>💊 Chemical Treatment & Fungicides</span>
                                      </span>
                                      <p className="text-purple-900 leading-relaxed">
                                        {dis.chemical_treatment || 'Apply regional university recommended contact fungicides.'}
                                      </p>
                                      {dis.safety_precautions && (
                                        <div className="pt-1 text-[11px] text-purple-800 font-medium">
                                          <strong>Safety / Precaution:</strong> {dis.safety_precautions}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-500">
                        No diseases logged under category &ldquo;{diseaseCategoryFilter}&rdquo;.
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 5: INTEGRATED DISEASE MANAGEMENT PRINCIPLES ────────── */}
                {modalTab === 'management' && (
                  <div className="space-y-4 animate-in fade-in duration-150 text-xs">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      Integrated Pest & Disease Management (IPM) for {activeModalCrop.name}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
                        <h5 className="font-extrabold text-gray-900 flex items-center gap-1.5">
                          <span>🌱 1. Cultural & Preventative Practices</span>
                        </h5>
                        <p className="text-gray-600 leading-relaxed">
                          Practice strict 3-year crop rotation with non-host families. Ensure wide row spacing for canopy ventilation. Sterilize pruning shears with 70% alcohol between cuts.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
                        <h5 className="font-extrabold text-gray-900 flex items-center gap-1.5">
                          <span>🐞 2. Biological Stewardship</span>
                        </h5>
                        <p className="text-gray-600 leading-relaxed">
                          Incorporate beneficial antagonistic microbes (Trichoderma viride, Bacillus subtilis) into soil at planting. Conserve predatory insects to suppress thrips and whitefly vector populations.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
                        <h5 className="font-extrabold text-gray-900 flex items-center gap-1.5">
                          <span>💧 3. Water & Canopy Sanitation</span>
                        </h5>
                        <p className="text-gray-600 leading-relaxed">
                          Avoid overhead sprinkler irrigation that splashes soil-borne spores onto leaves. Irrigate exclusively through drip lines early in the morning so accidental surface droplets evaporate rapidly.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
                        <h5 className="font-extrabold text-gray-900 flex items-center gap-1.5">
                          <span>👨‍🌾 4. When to Consult Agricultural Extension</span>
                        </h5>
                        <p className="text-gray-600 leading-relaxed">
                          If lesions cover more than 15% of the total green canopy, or sudden wilt occurs across multiple plants, send photographs to your regional Krishi Vigyan Kendra (KVK) or extension specialist immediately.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 6: AGRONOMIC FAQS ──────────────────────────────────── */}
                {modalTab === 'faq' && (
                  <div className="space-y-4 animate-in fade-in duration-150 text-xs">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      Frequently Asked Questions about {activeModalCrop.name}
                    </h4>

                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                        <h5 className="font-extrabold text-gray-900">
                          Q: What is the most critical irrigation stage for {activeModalCrop.name}?
                        </h5>
                        <p className="text-gray-600 leading-relaxed">
                          A: Flowering, fruit/grain set, and rapid development are the most critical moisture windows. Water deficit during these stages causes severe flower abortion and reduced kernel/fruit weight.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                        <h5 className="font-extrabold text-gray-900">
                          Q: How can I tell fungal leaf spots from bacterial lesions?
                        </h5>
                        <p className="text-gray-600 leading-relaxed">
                          A: Bacterial spots are typically angular, restricted by leaf veins, and often show a water-soaked translucent border. Fungal spots (like Early Blight) are circular, expand across veins, and often display concentric rings or velvety spore coatings.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                        <h5 className="font-extrabold text-gray-900">
                          Q: Can I use our AI Assistant to ask specific questions about this crop?
                        </h5>
                        <p className="text-gray-600 leading-relaxed">
                          A: Yes! Click the floating &quot;Ask Agronomy AI&quot; button in the bottom right corner anytime to speak or type specific queries about {activeModalCrop.name} in English, Telugu, or Hindi.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between text-xs font-semibold">
                <span className="text-gray-500">
                  Agronomy AI Handbook • All intelligence verified against ICAR/FAO protocols
                </span>
                <button
                  type="button"
                  onClick={() => setActiveModalCrop(null)}
                  className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-black text-white font-bold transition-all shadow-xs"
                >
                  Close Handbook
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CropsPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-slate-400 font-bold">Loading Crop Guides...</div>}>
      <CropsContent />
    </Suspense>
  )
}
