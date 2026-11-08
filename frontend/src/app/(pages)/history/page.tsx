'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { API_BASE_URL, formatApiError, ScanResult, CropResult } from '@/lib/api'
import { getStaleWhileRevalidate, setCached } from '@/lib/apiCache'
import { useVoiceOS } from '@/context/VoiceOSContext'
import { useVoiceActions } from '@/hooks/useVoiceActions'

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<'scans' | 'crops'>('scans')
  const [scans, setScans] = useState<ScanResult[]>([])
  const [crops, setCrops] = useState<CropResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Healthy' | 'Infected'>('All')

  const { speak, language } = useVoiceOS()

  useVoiceActions([
    {
      id: 'switch_to_scans',
      name: 'View Disease Scans History',
      description: 'Switch to scan history tab',
      intent: 'SELECT_OPTION',
      keywords_en: ['scan history', 'show scans'],
      keywords_te: ['స్కాన్ చరిత్ర', 'స్కాన్లు చూపించు'],
      keywords_hi: ['स्कैन इतिहास', 'स्कैन दिखाओ'],
      handler: () => setActiveTab('scans'),
    },
    {
      id: 'switch_to_crops',
      name: 'View Crop History',
      description: 'Switch to crop recommendation history tab',
      intent: 'SELECT_OPTION',
      keywords_en: ['crop history', 'show crop recommendations'],
      keywords_te: ['పంట చరిత్ర', 'పంట సిఫార్సులు చూపించు'],
      keywords_hi: ['फसल इतिहास', 'फसल सिफारिशें दिखाओ'],
      handler: () => setActiveTab('crops'),
    },
    {
      id: 'read_history',
      name: 'Read History Summary',
      description: 'Voice read past scan records and latest findings',
      intent: 'READ_PAGE',
      keywords_en: ['read history', 'past scans', 'what did I scan'],
      keywords_te: ['చరిత్ర చదువు', 'గత ఫలితాలు చెప్పు'],
      keywords_hi: ['इतिहास पढ़ो', 'पुराने परिणाम बताओ'],
      handler: () => {
        const latest = scans[0]
        const text =
          language === 'te'
            ? `మీ చరిత్రలో మొత్తం ${scans.length} స్కాన్లు మరియు ${crops.length} పంట సిఫార్సులు ఉన్నాయి.${latest ? ` చివరి స్కాన్: ${latest.disease_name}.` : ''}`
            : language === 'hi'
            ? `आपके इतिहास में कुल ${scans.length} स्कैन और ${crops.length} फसल सिफारिशें हैं।${latest ? ` अंतिम स्कैन: ${latest.disease_name}।` : ''}`
            : `You have ${scans.length} past scans and ${crops.length} crop recommendations in your history.${latest ? ` Most recent diagnosis: ${latest.disease_name}.` : ''}`
        speak(text)
      },
    },
  ])

  useEffect(() => {
    const cachedScans = getStaleWhileRevalidate<ScanResult[]>('history_scans')
    const cachedCrops = getStaleWhileRevalidate<CropResult[]>('history_crops')

    let hasData = false
    if (cachedScans.data) {
      setScans(cachedScans.data)
      hasData = true
    }
    if (cachedCrops.data) {
      setCrops(cachedCrops.data)
      hasData = true
    }
    if (hasData) {
      setIsLoading(false)
      if (!cachedScans.isStale && !cachedCrops.isStale) return
    }

    fetchHistory(!hasData)
  }, [])

  const fetchHistory = async (showLoadingState: boolean = true) => {
    if (showLoadingState) setIsLoading(true)
    setError(null)

    try {
      // Parallel fetch for scans and crop recommendations with 10s timeout
      const [scansRes, cropsRes] = await Promise.allSettled([
        axios.get<ScanResult[]>(`${API_BASE_URL}/scans/`, { timeout: 10000 }),
        axios.get<CropResult[]>(`${API_BASE_URL}/crop-recommendations/`, { timeout: 10000 }),
      ])

      if (scansRes.status === 'fulfilled') {
        const data = scansRes.value.data || []
        setScans(data)
        setCached('history_scans', data, 60 * 1000)
      }
      if (cropsRes.status === 'fulfilled') {
        const data = cropsRes.value.data || []
        setCrops(data)
        setCached('history_crops', data, 60 * 1000)
      }
    } catch (err: unknown) {
      setError(formatApiError(err, 'Could not retrieve history logs from backend database.'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteScan = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this scan from history?')) return

    try {
      await axios.delete(`${API_BASE_URL}/scans/${id}/`)
      setScans((prev) => prev.filter((s) => s.id !== id))
    } catch {
      alert('Could not delete record from server.')
    }
  }

  const filteredScans = scans.filter((scan) => {
    const matchesSearch = scan.disease_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'All' || scan.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredCrops = crops.filter((crop) => {
    return (
      crop.recommended_crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crop.category?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/60 via-gray-50 to-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
            <span>🗄️ Cloud MongoDB History Records</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Agricultural Intelligence History
          </h1>
          <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto">
            Review past plant pathology scans, AI confidence scores, and soil-matched crop recommendation logs.
          </p>
        </div>

        {/* Tab Switcher & Filter Toolbar */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Dual Tabs */}
          <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('scans')}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'scans'
                  ? 'bg-white text-green-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🦠 Plant Scans ({scans.length})
            </button>
            <button
              onClick={() => setActiveTab('crops')}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'crops'
                  ? 'bg-white text-green-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🌾 Crop Advice ({crops.length})
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder={activeTab === 'scans' ? 'Search disease or plant...' : 'Search recommended crop...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:border-green-500 outline-none"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {activeTab === 'scans' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Healthy' | 'Infected')}
                className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white font-medium text-gray-700 outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Healthy">Healthy Only</option>
                <option value="Infected">Infected Only</option>
              </select>
            )}

            <button
              onClick={() => fetchHistory(true)}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold"
              title="Refresh logs"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Loading State: Responsive Skeleton List */}
        {isLoading && (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-14 h-14 bg-slate-200 rounded-2xl shrink-0" />
                  <div className="space-y-2 flex-1 max-w-md">
                    <div className="h-5 bg-slate-200 rounded-md w-1/3" />
                    <div className="h-3.5 bg-slate-100 rounded-md w-1/2" />
                  </div>
                </div>
                <div className="h-8 bg-slate-100 rounded-full w-24 shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Error Notice */}
        {error && !isLoading && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button onClick={() => fetchHistory(true)} className="underline font-bold">Retry</button>
          </div>
        )}

        {/* ── TAB 1: PLANT SCANS ────────────────────────────────────────────── */}
        {!isLoading && activeTab === 'scans' && (
          <div>
            {filteredScans.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto text-2xl">
                  🍃
                </div>
                <h3 className="text-lg font-bold text-gray-900">No Plant Disease Scans Found</h3>
                <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
                  {searchQuery ? 'No scans match your current search query.' : 'You have not scanned any plant leaves yet.'}
                </p>
                <Link
                  href="/scanning"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs shadow-md"
                >
                  Scan Your First Plant
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredScans.map((scan) => (
                  <Link
                    key={scan.id}
                    href={`/report?id=${scan.id}`}
                    className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Thumbnail */}
                      <div className="h-44 bg-gray-100 overflow-hidden relative">
                        {scan.image_url ? (
                          <img
                            src={scan.image_url}
                            alt={scan.disease_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
                            🌿
                          </div>
                        )}
                        <span
                          className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-extrabold shadow-sm ${
                            scan.status === 'Healthy'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-red-500 text-white'
                          }`}
                        >
                          {scan.status}
                        </span>
                        <button
                          onClick={(e) => handleDeleteScan(scan.id, e)}
                          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white text-xs flex items-center justify-center backdrop-blur-xs transition-colors"
                          title="Delete scan"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-5 space-y-2">
                        <div className="text-[11px] text-gray-600 font-semibold">
                          {formatDate(scan.created_at)}
                        </div>
                        <h3 className="font-bold text-base text-gray-900 group-hover:text-green-700 transition-colors line-clamp-1">
                          {scan.disease_name}
                        </h3>
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {scan.symptoms || scan.organic_treatment || 'Analysis diagnosis report available.'}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-600">
                        Accuracy: <strong className="text-green-700">{scan.accuracy}%</strong>
                      </span>
                      <span className="text-green-600 font-bold group-hover:translate-x-0.5 transition-transform">
                        View Report &rarr;
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: CROP RECOMMENDATIONS ──────────────────────────────────── */}
        {!isLoading && activeTab === 'crops' && (
          <div>
            {filteredCrops.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
                  🌾
                </div>
                <h3 className="text-lg font-bold text-gray-900">No Crop Recommendations Found</h3>
                <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
                  {searchQuery ? 'No recommendations match your query.' : 'Run your first soil nutrient test to see suggestions here.'}
                </p>
                <Link
                  href="/crop-recommendation"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs shadow-md"
                >
                  Get Crop Recommendation
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredCrops.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{rec.emoji || '🌾'}</span>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                            {rec.category || 'Agricultural Crop'}
                          </span>
                          <h3 className="text-xl font-extrabold text-gray-900 mt-0.5">
                            {rec.recommended_crop}
                          </h3>
                        </div>
                      </div>
                      <span className="text-xs text-gray-600 font-semibold">
                        {formatDate(rec.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {rec.description}
                    </p>

                    {/* Parameters Grid */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-gray-50">
                        <span className="text-gray-600 block text-[10px]">N</span>
                        <strong className="text-gray-900">{rec.nitrogen}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50">
                        <span className="text-gray-600 block text-[10px]">P</span>
                        <strong className="text-gray-900">{rec.phosphorus}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50">
                        <span className="text-gray-600 block text-[10px]">K</span>
                        <strong className="text-gray-900">{rec.potassium}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50">
                        <span className="text-gray-600 block text-[10px]">pH</span>
                        <strong className="text-gray-900">{rec.ph}</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        Confidence: <strong className="text-green-700">{rec.confidence || 95}%</strong>
                      </span>
                      <Link
                        href={`/crops`}
                        className="text-green-700 font-bold hover:underline"
                      >
                        Crop Cultivation Guide &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
