'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useVoiceOS } from '@/context/VoiceOSContext'
import { useVoiceActions } from '@/hooks/useVoiceActions'

const deficiencyGuides = [
  {
    nutrient: 'Nitrogen (N)',
    symbol: 'N',
    color: 'from-amber-400 to-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    textColor: 'text-amber-800',
    badgeColor: 'bg-amber-100 text-amber-900',
    role: 'Key driver of vegetative growth, leaf chlorophyll production, and protein synthesis.',
    symptoms: 'Older, lower leaves turn uniformly pale yellow (chlorosis) starting from the leaf tip and progressing along the midrib. Plant growth is severely stunted and spindly.',
    correction: 'Apply Urea (46-0-0) or Ammonium sulfate. Organically: top-dress with well-rotted farmyard manure, poultry compost, blood meal, or grow green-manure legumes (sesbania, cowpea).'
  },
  {
    nutrient: 'Phosphorus (P)',
    symbol: 'P',
    color: 'from-purple-400 to-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    textColor: 'text-purple-800',
    badgeColor: 'bg-purple-100 text-purple-900',
    role: 'Essential for root system development, floral bud initiation, early seed germination, and cellular energy transfer (ATP).',
    symptoms: 'Foliage develops a distinctive dark green or dull purplish-bronze hue, particularly along veins and leaf undersides. Delayed maturity and poor root establishment.',
    correction: 'Apply Diammonium Phosphate (DAP 18-46-0) or Single Super Phosphate (SSP). Organically: apply steamed bone meal, rock phosphate, or mycorrhizal fungal inoculants.'
  },
  {
    nutrient: 'Potassium (K)',
    symbol: 'K',
    color: 'from-rose-400 to-rose-600',
    bgColor: 'bg-rose-50 border-rose-200',
    textColor: 'text-rose-800',
    badgeColor: 'bg-rose-100 text-rose-900',
    role: 'Regulates stomatal opening and transpiration, activates enzymes, enhances drought and cold tolerance, and boosts fruit brix and shelf life.',
    symptoms: 'Marginal leaf scorch or necrosis ("firing") appearing first on the edges and tips of older lower leaves. Stalks become weak and prone to lodging.',
    correction: 'Apply Muriate of Potash (MOP 0-0-60) or Potassium sulfate (SOP 0-0-50). Organically: incorporate hardwood ash, kelp meal, or potassium-rich composted straw.'
  },
  {
    nutrient: 'Zinc (Zn) & Micronutrients',
    symbol: 'Zn',
    color: 'from-blue-400 to-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-800',
    badgeColor: 'bg-blue-100 text-blue-900',
    role: 'Enzyme activator for growth hormones (auxins) and internode elongation.',
    symptoms: 'Interveinal chlorosis on young upper leaves resulting in bleaching, "white bud" in maize, or severe rosetting and little-leaf disorders.',
    correction: 'Foliar application of 0.5% Zinc Sulfate + 0.25% slaked lime spray, or soil application of 25 kg/ha Zinc Sulfate heptahydrate at basal bed preparation.'
  }
]

export default function FertilizerPage() {
  // Fertilizer Calculator State
  const [cropType, setCropType] = useState('rice')
  const [area, setArea] = useState('1')
  const [unit, setUnit] = useState<'hectares' | 'acres'>('hectares')

  // Recommended NPK per hectare in kg/ha
  const cropNPKRequirements: Record<string, { n: number; p: number; k: number; name: string }> = {
    rice: { n: 100, p: 50, k: 50, name: 'Rice (Paddy)' },
    maize: { n: 150, p: 75, k: 75, name: 'Maize (Corn)' },
    wheat: { n: 120, p: 60, k: 40, name: 'Wheat' },
    cotton: { n: 120, p: 60, k: 60, name: 'Cotton' },
    potato: { n: 180, p: 100, k: 150, name: 'Potato' },
    tomato: { n: 140, p: 90, k: 120, name: 'Tomato' },
  }

  const selectedNPK = cropNPKRequirements[cropType] || cropNPKRequirements.rice
  const parsedArea = parseFloat(area) || 1
  const areaMultiplier = unit === 'hectares' ? parsedArea : parsedArea * 0.404686

  // Calculation for commercial fertilizer carriers:
  // DAP (18% N, 46% P2O5)
  // Urea (46% N)
  // MOP (60% K2O)
  const dapNeeded = Math.round((selectedNPK.p * areaMultiplier) / 0.46)
  const nSuppliedByDap = dapNeeded * 0.18
  const remainingN = Math.max(0, (selectedNPK.n * areaMultiplier) - nSuppliedByDap)
  const ureaNeeded = Math.round(remainingN / 0.46)
  const mopNeeded = Math.round((selectedNPK.k * areaMultiplier) / 0.60)

  const { speak, language } = useVoiceOS()

  useVoiceActions([
    {
      id: 'calculate_fertilizer',
      name: 'Calculate Fertilizer Dosages',
      description: 'Calculate DAP, Urea, and Potash requirements for crop acreage',
      intent: 'SUBMIT_FORM',
      keywords_en: ['calculate fertilizer', 'how many bags', 'fertilizer dose'],
      keywords_te: ['ఎరువులు లెక్కించు', 'ఎన్ని బస్తాలు'],
      keywords_hi: ['खाद की गणना', 'कितनी बोरी खाद'],
      handler: (params) => {
        if (params?.crop) {
          const matched = Object.keys(cropNPKRequirements).find((k) => k.includes(params.crop.toLowerCase()))
          if (matched) setCropType(matched)
        }
        if (params?.area) {
          setArea(String(params.area))
        }
        const text =
          language === 'te'
            ? `${selectedNPK.name} కోసం సిఫార్సు: డీఏపీ ${dapNeeded} కిలోలు (${(dapNeeded / 50).toFixed(1)} బస్తాలు), యూరియా ${ureaNeeded} కిలోలు (${(ureaNeeded / 50).toFixed(1)} బస్తాలు), పొటాష్ ${mopNeeded} కిలోలు.`
            : language === 'hi'
            ? `${selectedNPK.name} के लिए सिफारिश: डीएपी ${dapNeeded} किग्रा (${(dapNeeded / 50).toFixed(1)} बोरी), यूरिया ${ureaNeeded} किग्रा (${(ureaNeeded / 50).toFixed(1)} बोरी), पोटाश ${mopNeeded} किग्रा।`
            : `Fertilizer requirement for ${selectedNPK.name}: DAP ${dapNeeded} kg (${(dapNeeded / 50).toFixed(1)} bags), Urea ${ureaNeeded} kg (${(ureaNeeded / 50).toFixed(1)} bags), MOP Potash ${mopNeeded} kg (${(mopNeeded / 50).toFixed(1)} bags).`
        speak(text)
      },
    },
    {
      id: 'read_deficiency_guide',
      name: 'Read Nutrient Deficiency Symptoms',
      description: 'Voice read Nitrogen, Phosphorus, and Potassium deficiency symptoms',
      intent: 'READ_SECTION',
      keywords_en: ['deficiency symptoms', 'nitrogen deficiency', 'yellow leaves'],
      keywords_te: ['లోపం లక్షణాలు', 'ఆకులు పసుపు'],
      keywords_hi: ['पोषक तत्वों की कमी', 'पत्तियां पीली'],
      handler: () => {
        const text =
          language === 'te'
            ? 'నత్రజని లోపం వల్ల పాత ఆకులు పసుపు రంగులోకి మారుతాయి. భాస్వరం లోపం వల్ల ఆకులు ముదురు ఆకుపచ్చ లేదా ఊదా రంగులోకి మారతాయి. పొటాషియం లోపం వల్ల ఆకుల అంచులు ఎండిపోతాయి.'
            : language === 'hi'
            ? 'नाइट्रोजन की कमी से पुरानी पत्तियां पीली हो जाती हैं। फास्फोरस की कमी से पत्तियां बैंगनी हो जाती हैं। पोटेशियम की कमी से पत्तियों के किनारे झुलस जाते हैं।'
            : 'Nitrogen deficiency causes uniform yellowing on older lower leaves. Phosphorus causes dark purple-bronze hues. Potassium causes marginal leaf scorching along edges.'
        speak(text)
      },
    },
    {
      id: 'read_fertilizer_guide',
      name: 'Explain Fertilizer Recommendations',
      description: 'Explain fertilizer dosage and recommendations for crops',
      intent: 'READ_PAGE',
      keywords_en: ['explain fertilizer recommendations', 'fertilizer recommendations', 'explain fertilizer'],
      keywords_te: ['ఎరువుల సిఫార్సులు వివరించు', 'ఎరువుల సలహా'],
      keywords_hi: ['उर्वरक सिफारिशें समझाओ', 'खाद की सिफारिश'],
      handler: () => {
        const text =
          language === 'te'
            ? `ప్రధాన పంటల ఎరువుల నిర్వహణ: వరికి 100 కిలోల నత్రజని, 50 కిలోల భాస్వరం, 50 కిలోల పొటాషియం అవసరం. మొక్కజొన్నకు 150 కిలోల నత్రజని, 75 కిలోల భాస్వరం, 75 కిలోల పొటాషియం అవసరం.`
            : language === 'hi'
            ? `प्रमुख फसलों के लिए उर्वरक मार्गदर्शन: चावल को 100 किग्रा नाइट्रोजन, 50 किग्रा फास्फोरस और 50 किग्रा पोटाश की आवश्यकता होती है। मक्का को 150 किग्रा नाइट्रोजन, 75 किग्रा फास्फोरस की आवश्यकता होती है।`
            : `Fertilizer Guidance Overview: Recommended NPK for Rice is 100 kg Nitrogen, 50 kg Phosphorus, and 50 kg Potash per hectare. For Maize, it is 150 kg Nitrogen, 75 kg Phosphorus, and 75 kg Potash.`
        speak(text)
      },
    },
    {
      id: 'search_fertilizer',
      name: 'Search Fertilizer',
      description: 'Search for fertilizer details (e.g. nitrogen, urea, dap)',
      intent: 'SEARCH',
      keywords_en: ['search for nitrogen fertilizer', 'nitrogen fertilizer', 'search fertilizer'],
      keywords_te: ['నత్రజని ఎరువు కోసం వెతుకు', 'నైట్రోజన్ ఎరువు'],
      keywords_hi: ['नाइट्रोजन उर्वरक खोजो', 'खाद खोजो'],
      handler: (params) => {
        const q = (params?.query || 'nitrogen').toLowerCase()
        if (q.includes('nitrogen') || q.includes('urea') || q.includes('నత్రజని') || q.includes('नाइट्रोजन')) {
          const text =
            language === 'te'
              ? 'నత్రజని ఎరువులు (యూరియా 46-0-0) మొక్క పెరుగుదల మరియు ఆకుల పచ్చదనానికి అత్యవసరం. పైపాటుగా ఎకరాకు 25 నుండి 50 కిలోలు వేయండి.'
              : language === 'hi'
              ? 'नाइट्रोजन उर्वरक (यूरिया 46-0-0) पौधों की वानस्पतिक वृद्धि और पर्णहरित के लिए आवश्यक है। आवश्यकतानुसार यूरिया का छिड़काव करें।'
              : 'Nitrogen Fertilizer (Urea 46-0-0): Promotes rapid vegetative canopy growth and chlorophyll synthesis. Top-dress in split applications.'
          speak(text)
        } else {
          const text = `Information for ${q} fertilizer displayed on page.`
          speak(text)
        }
      },
    },
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/60 via-gray-50 to-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span>🧪 Soil Chemistry & Plant Nutrition Advisory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Fertilizer Guidance & Nutrient Calculator
          </h1>
          <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto">
            Diagnose plant nutrient deficiencies from visual leaf symptoms and calculate exact commercial or organic fertilizer dosages for your acreage.
          </p>
        </div>

        {/* ── INTERACTIVE FERTILIZER DOSE CALCULATOR ──────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-lg border border-gray-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">
                Precision Field Fertilizer Calculator
              </h2>
              <p className="text-xs text-gray-500">
                Calculates Urea, DAP, and MOP bag requirements based on recommended N-P-K ratios.
              </p>
            </div>
            <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
              Standard 50 kg Bag Equivalence
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Target Crop:
              </label>
              <select
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm font-semibold outline-none focus:border-green-500"
              >
                {Object.entries(cropNPKRequirements).map(([key, val]) => (
                  <option key={key} value={key}>{val.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Field Area:
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm font-semibold outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Area Unit:
              </label>
              <div className="flex rounded-xl border border-gray-200 overflow-hidden p-1 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setUnit('hectares')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    unit === 'hectares' ? 'bg-white text-green-800 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Hectares
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('acres')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    unit === 'acres' ? 'bg-white text-green-800 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Acres
                </button>
              </div>
            </div>
          </div>

          {/* Computed Results Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Urea */}
            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                Urea (46% N)
              </span>
              <div className="text-3xl font-black text-amber-900">
                {ureaNeeded} <span className="text-xs font-semibold">kg</span>
              </div>
              <p className="text-xs text-amber-700 font-medium">
                ≈ {(ureaNeeded / 50).toFixed(1)} bags (50kg)
              </p>
              <span className="text-[10px] text-amber-800/80 block pt-1">
                Apply in 2-3 split doses
              </span>
            </div>

            {/* DAP */}
            <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 text-center space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800">
                DAP (18-46-0)
              </span>
              <div className="text-3xl font-black text-purple-900">
                {dapNeeded} <span className="text-xs font-semibold">kg</span>
              </div>
              <p className="text-xs text-purple-700 font-medium">
                ≈ {(dapNeeded / 50).toFixed(1)} bags (50kg)
              </p>
              <span className="text-[10px] text-purple-800/80 block pt-1">
                Apply 100% as basal at sowing
              </span>
            </div>

            {/* MOP */}
            <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 text-center space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800">
                MOP (0-0-60 K)
              </span>
              <div className="text-3xl font-black text-rose-900">
                {mopNeeded} <span className="text-xs font-semibold">kg</span>
              </div>
              <p className="text-xs text-rose-700 font-medium">
                ≈ {(mopNeeded / 50).toFixed(1)} bags (50kg)
              </p>
              <span className="text-[10px] text-rose-800/80 block pt-1">
                Apply at planting & panicle/fruit set
              </span>
            </div>
          </div>
        </div>

        {/* ── NUTRIENT DEFICIENCY SYMPTOM IDENTIFIER ──────────────────────────── */}
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-extrabold text-gray-900">
              Nutrient Deficiency Identification
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Identify what your crops are lacking based on leaf discoloration and lesion patterns.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {deficiencyGuides.map((guide) => (
              <div
                key={guide.nutrient}
                className={`rounded-3xl p-6 sm:p-7 border ${guide.bgColor} space-y-4 shadow-xs`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${guide.color} text-white font-black text-sm flex items-center justify-center shadow-xs`}>
                      {guide.symbol}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {guide.nutrient}
                    </h3>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${guide.badgeColor}`}>
                    Essential
                  </span>
                </div>

                <p className="text-xs font-medium text-gray-700 leading-relaxed">
                  {guide.role}
                </p>

                <div className="p-3.5 rounded-xl bg-white/80 border border-gray-200/60 space-y-1 text-xs">
                  <strong className="text-gray-900 block font-bold">🔍 Visual Symptoms:</strong>
                  <p className="text-gray-600 leading-relaxed">{guide.symptoms}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/80 border border-gray-200/60 space-y-1 text-xs">
                  <strong className="text-green-900 block font-bold">🌿 Corrective Action:</strong>
                  <p className="text-gray-700 leading-relaxed">{guide.correction}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="text-center pt-4">
          <Link
            href="/crop-recommendation"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs sm:text-sm shadow-md"
          >
            <span>Run Soil Crop Match &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
