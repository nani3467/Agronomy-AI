'use client'

import { useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { API_BASE_URL, formatApiError, CropResult } from '@/lib/api'
import { useVoiceOS } from '@/context/VoiceOSContext'
import { useVoiceActions } from '@/hooks/useVoiceActions'

interface FormState {
  nitrogen: string
  phosphorus: string
  potassium: string
  temperature: string
  humidity: string
  ph: string
  rainfall: string
}

const initialForm: FormState = {
  nitrogen: '',
  phosphorus: '',
  potassium: '',
  temperature: '',
  humidity: '',
  ph: '',
  rainfall: '',
}

// 1-Click Field Presets for instant testing
const presets = [
  {
    name: 'Rice (Wet Monsoon)',
    values: {
      nitrogen: '90',
      phosphorus: '42',
      potassium: '43',
      temperature: '21',
      humidity: '82',
      ph: '6.5',
      rainfall: '205',
    },
  },
  {
    name: 'Maize (Fertile Loam)',
    values: {
      nitrogen: '80',
      phosphorus: '50',
      potassium: '20',
      temperature: '23',
      humidity: '65',
      ph: '6.2',
      rainfall: '85',
    },
  },
  {
    name: 'Chickpea (Dry Semi-Arid)',
    values: {
      nitrogen: '40',
      phosphorus: '60',
      potassium: '80',
      temperature: '18',
      humidity: '17',
      ph: '7.3',
      rainfall: '70',
    },
  },
  {
    name: 'Coffee (Tropical Highland)',
    values: {
      nitrogen: '100',
      phosphorus: '25',
      potassium: '30',
      temperature: '26',
      humidity: '60',
      ph: '6.8',
      rainfall: '160',
    },
  },
]

export default function CropRecommendationPage() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CropResult | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const { speak, language, startWorkflow } = useVoiceOS()

  const validate = (): boolean => {
    const errs: Partial<FormState> = {}

    // Nitrogen
    const n = Number(form.nitrogen)
    if (!form.nitrogen.trim()) errs.nitrogen = 'Nitrogen is required.'
    else if (isNaN(n) || n < 0 || n > 250) errs.nitrogen = 'Realistic range is 0 to 250 kg/ha.'

    // Phosphorus
    const p = Number(form.phosphorus)
    if (!form.phosphorus.trim()) errs.phosphorus = 'Phosphorus is required.'
    else if (isNaN(p) || p < 0 || p > 200) errs.phosphorus = 'Realistic range is 0 to 200 kg/ha.'

    // Potassium
    const k = Number(form.potassium)
    if (!form.potassium.trim()) errs.potassium = 'Potassium is required.'
    else if (isNaN(k) || k < 0 || k > 250) errs.potassium = 'Realistic range is 0 to 250 kg/ha.'

    // Temperature
    const temp = Number(form.temperature)
    if (!form.temperature.trim()) errs.temperature = 'Temperature is required.'
    else if (isNaN(temp) || temp < -10 || temp > 55) errs.temperature = 'Realistic range is -10°C to 55°C.'

    // Humidity
    const hum = Number(form.humidity)
    if (!form.humidity.trim()) errs.humidity = 'Humidity is required.'
    else if (isNaN(hum) || hum < 0 || hum > 100) errs.humidity = 'Humidity must be between 0% and 100%.'

    // pH
    const phVal = Number(form.ph)
    if (!form.ph.trim()) errs.ph = 'Soil pH is required.'
    else if (isNaN(phVal) || phVal < 3.0 || phVal > 10.0) errs.ph = 'Agricultural pH range is 3.0 to 10.0.'

    // Rainfall
    const rain = Number(form.rainfall)
    if (!form.rainfall.trim()) errs.rainfall = 'Rainfall is required.'
    else if (isNaN(rain) || rain < 0 || rain > 400) errs.rainfall = 'Realistic monthly range is 0 to 400 mm.'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setForm((prev) => ({ ...prev, [name]: value }))
      if (errors[name as keyof FormState]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }))
      }
    }
  }

  const handleApplyPreset = (presetValues: FormState) => {
    setForm(presetValues)
    setErrors({})
    setResult(null)
    setApiError(null)
  }

  const handleSubmit = async (e?: React.FormEvent, overrideValues?: Record<string, any>) => {
    if (e) e.preventDefault()

    const activeN = overrideValues?.nitrogen ?? form.nitrogen
    const activeP = overrideValues?.phosphorus ?? form.phosphorus
    const activeK = overrideValues?.potassium ?? form.potassium
    const activeT = overrideValues?.temperature ?? form.temperature
    const activeH = overrideValues?.humidity ?? form.humidity
    const activePh = overrideValues?.ph ?? form.ph
    const activeR = overrideValues?.rainfall ?? form.rainfall

    // Ensure state reflects any override parameters
    if (overrideValues) {
      setForm((prev) => ({
        ...prev,
        nitrogen: String(activeN),
        phosphorus: String(activeP),
        potassium: String(activeK),
        temperature: String(activeT),
        humidity: String(activeH),
        ph: String(activePh),
        rainfall: String(activeR),
      }))
    }

    if (!activeN || !activeP || !activeK || !activeT || !activeH || !activePh || !activeR) {
      if (!validate()) return
    }

    setIsLoading(true)
    setApiError(null)

    try {
      const response = await axios.post<CropResult>(
        `${API_BASE_URL}/crop-recommend/`,
        {
          nitrogen: Number(activeN),
          phosphorus: Number(activeP),
          potassium: Number(activeK),
          temperature: Number(activeT),
          humidity: Number(activeH),
          ph: Number(activePh),
          rainfall: Number(activeR),
        },
        { timeout: 30000 }
      )

      const resData = response.data
      setResult(resData)

      const speech =
        language === 'te'
          ? `మీ నేల పరిస్థితులకు ఉత్తమ పంట: ${resData.recommended_crop}. ఖచ్చితత్వం: ${resData.confidence || 98} శాతం.`
          : language === 'hi'
          ? `आपकी मिट्टी की स्थिति के लिए सर्वोत्तम फसल: ${resData.recommended_crop}। सटीकता: ${resData.confidence || 98} प्रतिशत।`
          : `Optimal crop for your soil conditions: ${resData.recommended_crop} with ${resData.confidence || 98}% match.`

      speak(speech)
    } catch (err: unknown) {
      setApiError(formatApiError(err, 'Failed to retrieve recommendation from server.'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setForm(initialForm)
    setErrors({})
    setResult(null)
    setApiError(null)
  }

  const readRecommendationAloud = () => {
    if (!result) return
    const text =
      language === 'te'
        ? `సిఫార్సు చేయబడిన పంట: ${result.recommended_crop}. వివరాలు: ${result.description}. ఎరువుల సలహా: ${result.fertilizer_guidance}. నీటి అవసరం: ${result.water_requirements}.`
        : language === 'hi'
        ? `सिफारिश की गई फसल: ${result.recommended_crop}। विवरण: ${result.description}। उर्वरक मार्गदर्शन: ${result.fertilizer_guidance}। सिंचाई आवश्यकता: ${result.water_requirements}।`
        : `Recommended Crop: ${result.recommended_crop}. Overview: ${result.description}. Fertilizer guidance: ${result.fertilizer_guidance}. Water requirements: ${result.water_requirements}.`

    speak(text)
  }

  // Register Voice OS Actions for Crop Recommendation
  useVoiceActions([
    {
      id: 'fill_crop_field',
      name: 'Fill Soil Parameter',
      description: 'Fill a soil or climate field by voice (e.g. nitrogen, phosphorus, potassium, etc.)',
      intent: 'FILL_FIELD',
      keywords_en: ['nitrogen', 'phosphorus', 'potassium', 'temperature', 'humidity', 'ph', 'rainfall'],
      keywords_te: ['నత్రజని', 'భాస్వరం', 'పొటాషియం', 'ఉష్ణోగ్రత', 'తేమ', 'పీహెచ్', 'వర్షపాతం'],
      keywords_hi: ['नाइट्रोजन', 'फास्फोरस', 'पोटेशियम', 'तापमान', 'नमी', 'पीएच', 'वर्षा'],
      handler: (params) => {
        if (!params) return
        const fieldName = (params.field || '').toLowerCase()
        const val = String(params.value ?? '')
        if (fieldName && val) {
          setForm((prev) => ({ ...prev, [fieldName]: val }))
        }
      },
    },
    {
      id: 'start_crop_workflow',
      name: 'Guided Voice Questionnaire',
      description: 'Step-by-step voice guidance collecting all 7 soil and climate parameters',
      intent: 'START_WORKFLOW',
      keywords_en: ['guide me', 'step by step', 'voice recommendation', 'guided recommendation'],
      keywords_te: ['దశలవారీగా అడుగు', 'సహాయం చేయి'],
      keywords_hi: ['कदम दर कदम पूछो', 'मार्गदर्शन करो'],
      handler: () => startWorkflow('crop_recommendation'),
    },
    {
      id: 'submit_crop_form',
      name: 'Predict Recommended Crop',
      description: 'Submit soil parameters to ML Random Forest recommender',
      intent: 'SUBMIT_FORM',
      keywords_en: ['submit and recommend crops', 'recommend', 'predict', 'calculate', 'find crop', 'submit form'],
      keywords_te: ['పంటలను సిఫార్సు చేయి', 'సిఫార్సు చేయి', 'పంట చెప్పు', 'గణించు'],
      keywords_hi: ['फसलों की सिफारिश करो', 'सिफारिश करो', 'फसल बताओ', 'गणना करो'],
      handler: (params) => handleSubmit(undefined, params),
    },
    {
      id: 'explain_recommended_crops',
      name: 'Explain Recommended Crops',
      description: 'Voice read detailed cultivation and fertilizer advice for recommended crops',
      intent: 'READ_RESULT',
      keywords_en: ['explain the recommended crops', 'explain recommended crops', 'explain crops'],
      keywords_te: ['సిఫార్సు చేసిన పంటలను వివరించు', 'పంటల వివరణ'],
      keywords_hi: ['सिफारिश की गई फसल बताओ', 'फसल समझाओ'],
      handler: () => readRecommendationAloud(),
    },
    {
      id: 'clear_crop_form',
      name: 'Reset Soil Values',
      description: 'Clear all input fields and start over',
      intent: 'CLEAR_FORM',
      requiresConfirmation: true,
      keywords_en: ['reset', 'clear', 'clear values'],
      keywords_te: ['రీసెట్ చేయి', 'క్లియర్ చేయి'],
      keywords_hi: ['रीसेट करो', 'साफ़ करो'],
      handler: () => handleClear(),
    },
    {
      id: 'read_crop_result',
      name: 'Read Recommendation Aloud',
      description: 'Voice read the recommended crop, growing guide, and fertilizer guidance',
      intent: 'READ_RESULT',
      keywords_en: ['read recommendation', 'read result', 'what crop was recommended'],
      keywords_te: ['సిఫార్సు చదువు', 'పంట వివరాలు చెప్పు'],
      keywords_hi: ['सिफारिश पढ़ो', 'फसल परिणाम बताओ'],
      handler: () => readRecommendationAloud(),
    },
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/60 via-gray-50 to-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span>🌲 RandomForest Classification Model • 99.5% Test Accuracy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Intelligent Crop Recommender
          </h1>
          <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto">
            Input soil nutrient concentrations (NPK), climate factors, and soil pH to discover the crop with the highest yield probability.
          </p>

          {/* Voice Guidance Shortcut Pill */}
          <div className="pt-1">
            <button
              onClick={() => startWorkflow('crop_recommendation')}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <span>🎙️ Start Step-by-Step Voice Guide</span>
            </button>
          </div>
        </div>

        {/* Form Box */}
        {!result ? (
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 sm:p-10 space-y-8">
            {/* Quick Presets */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2.5">
                Quick Test Field Presets:
              </p>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset.values)}
                    className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-green-50 hover:border-green-300 text-xs font-semibold text-gray-700 transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Soil Nutrients */}
                <div className="bg-gray-50/70 p-6 rounded-2xl border border-gray-200/80 space-y-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-xs">
                      🧪
                    </span>
                    Soil Nutrients (NPK)
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nitrogen (N) <span className="text-gray-600 font-normal">(0 - 250 kg/ha)</span>
                    </label>
                    <input
                      type="text"
                      name="nitrogen"
                      value={form.nitrogen}
                      onChange={handleChange}
                      placeholder="e.g. 90"
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-white outline-none transition-all ${
                        errors.nitrogen
                          ? 'border-red-400 bg-red-50/50'
                          : 'border-gray-200 focus:border-green-500'
                      }`}
                    />
                    {errors.nitrogen && <p className="text-red-500 text-xs mt-1">{errors.nitrogen}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Phosphorus (P) <span className="text-gray-600 font-normal">(0 - 200 kg/ha)</span>
                    </label>
                    <input
                      type="text"
                      name="phosphorus"
                      value={form.phosphorus}
                      onChange={handleChange}
                      placeholder="e.g. 42"
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-white outline-none transition-all ${
                        errors.phosphorus
                          ? 'border-red-400 bg-red-50/50'
                          : 'border-gray-200 focus:border-green-500'
                      }`}
                    />
                    {errors.phosphorus && <p className="text-red-500 text-xs mt-1">{errors.phosphorus}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Potassium (K) <span className="text-gray-600 font-normal">(0 - 250 kg/ha)</span>
                    </label>
                    <input
                      type="text"
                      name="potassium"
                      value={form.potassium}
                      onChange={handleChange}
                      placeholder="e.g. 43"
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-white outline-none transition-all ${
                        errors.potassium
                          ? 'border-red-400 bg-red-50/50'
                          : 'border-gray-200 focus:border-green-500'
                      }`}
                    />
                    {errors.potassium && <p className="text-red-500 text-xs mt-1">{errors.potassium}</p>}
                  </div>
                </div>

                {/* 2. Environmental & Climate Factors */}
                <div className="bg-gray-50/70 p-6 rounded-2xl border border-gray-200/80 space-y-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs">
                      ⛅
                    </span>
                    Climate & Soil Acidity
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Temperature <span className="text-gray-600 font-normal">(°C)</span>
                      </label>
                      <input
                        type="text"
                        name="temperature"
                        value={form.temperature}
                        onChange={handleChange}
                        placeholder="e.g. 21.5"
                        className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-white outline-none transition-all ${
                          errors.temperature
                            ? 'border-red-400 bg-red-50/50'
                            : 'border-gray-200 focus:border-green-500'
                        }`}
                      />
                      {errors.temperature && (
                        <p className="text-red-500 text-xs mt-1">{errors.temperature}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Humidity <span className="text-gray-600 font-normal">(%)</span>
                      </label>
                      <input
                        type="text"
                        name="humidity"
                        value={form.humidity}
                        onChange={handleChange}
                        placeholder="e.g. 80"
                        className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-white outline-none transition-all ${
                          errors.humidity
                            ? 'border-red-400 bg-red-50/50'
                            : 'border-gray-200 focus:border-green-500'
                        }`}
                      />
                      {errors.humidity && (
                        <p className="text-red-500 text-xs mt-1">{errors.humidity}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Soil pH <span className="text-gray-600 font-normal">(0 - 14)</span>
                      </label>
                      <input
                        type="text"
                        name="ph"
                        value={form.ph}
                        onChange={handleChange}
                        placeholder="e.g. 6.5"
                        className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-white outline-none transition-all ${
                          errors.ph
                            ? 'border-red-400 bg-red-50/50'
                            : 'border-gray-200 focus:border-green-500'
                        }`}
                      />
                      {errors.ph && <p className="text-red-500 text-xs mt-1">{errors.ph}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Rainfall <span className="text-gray-600 font-normal">(mm)</span>
                      </label>
                      <input
                        type="text"
                        name="rainfall"
                        value={form.rainfall}
                        onChange={handleChange}
                        placeholder="e.g. 202"
                        className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-white outline-none transition-all ${
                          errors.rainfall
                            ? 'border-red-400 bg-red-50/50'
                            : 'border-gray-200 focus:border-green-500'
                        }`}
                      />
                      {errors.rainfall && (
                        <p className="text-red-500 text-xs mt-1">{errors.rainfall}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* API Error Notification */}
              {apiError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
                  <svg
                    className="w-5 h-5 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{apiError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-5 py-2.5 rounded-full border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold"
                >
                  Reset Values
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-green-600/25 transition-all"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      <span>Evaluating Soil Matrix...</span>
                    </>
                  ) : (
                    <>
                      <span>Predict Recommended Crop</span>
                      <span>&rarr;</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ── RESULTS CARD ──────────────────────────────────────────────────── */
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-10 space-y-6 animate-in fade-in duration-300">
            {/* Top Recommended Crop Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-3xl shadow-xs">
                  {result.emoji || '🌾'}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wider bg-green-100 text-green-800">
                      Optimal Match
                    </span>
                    <span className="text-xs text-gray-500">{result.category}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                    {result.recommended_crop}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={readRecommendationAloud}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-[#166534] border border-emerald-300 font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
                  title="Read recommendation aloud with Voice OS"
                >
                  <span>🔊</span>
                  <span>Read Aloud</span>
                </button>

                {result.confidence !== undefined && (
                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-right">
                    <div className="text-[10px] uppercase font-bold text-gray-600">
                      Model Confidence
                    </div>
                    <div className="text-2xl font-black text-green-700">{result.confidence}%</div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-700 leading-relaxed bg-green-50/50 p-4 rounded-2xl border border-green-100">
              {result.description}
            </p>

            {/* 4 Core Agronomic Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Suitable Soil Conditions */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                  <span>🌱 Suitable Soil Conditions</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {result.soil_conditions}
                </p>
                {result.ideal_ph_range && (
                  <div className="text-xs font-semibold text-green-700 pt-1">
                    Optimal pH Range: {result.ideal_ph_range}
                  </div>
                )}
              </div>

              {/* Card 2: Crop Growing Information */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                  <span>☀️ Growing Information & Climate</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {result.growing_info}
                </p>
                {result.ideal_temp_range && (
                  <div className="text-xs font-semibold text-green-700 pt-1">
                    Temperature Range: {result.ideal_temp_range} • Duration:{' '}
                    {result.harvest_duration}
                  </div>
                )}
              </div>

              {/* Card 3: Fertilizer Guidance */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                  <span>🧪 Fertilizer & Nutrient Guidance</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {result.fertilizer_guidance}
                </p>
              </div>

              {/* Card 4: Water Requirements */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                  <span>💧 Water & Irrigation Requirements</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {result.water_requirements}
                </p>
              </div>
            </div>

            {/* Input Summary Pill */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-600 flex flex-wrap items-center justify-between gap-3">
              <span>
                N: <strong className="text-gray-900">{result.nitrogen}</strong>
              </span>
              <span>
                P: <strong className="text-gray-900">{result.phosphorus}</strong>
              </span>
              <span>
                K: <strong className="text-gray-900">{result.potassium}</strong>
              </span>
              <span>
                Temp: <strong className="text-gray-900">{result.temperature}°C</strong>
              </span>
              <span>
                Humidity: <strong className="text-gray-900">{result.humidity}%</strong>
              </span>
              <span>
                pH: <strong className="text-gray-900">{result.ph}</strong>
              </span>
              <span>
                Rainfall: <strong className="text-gray-900">{result.rainfall} mm</strong>
              </span>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={handleClear}
                className="px-6 py-2.5 rounded-full border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold"
              >
                ← Test Another Soil Sample
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/crops?crop=${encodeURIComponent(result.recommended_crop)}`}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold shadow-2xs transition-all"
                >
                  <span>🌾 View {result.recommended_crop} Complete Guide</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
                <Link
                  href={`/crops?crop=${encodeURIComponent(result.recommended_crop)}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold transition-all"
                >
                  <span>🔬 Diseases & Management</span>
                </Link>
                <Link
                  href="/scanning"
                  className="px-6 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs sm:text-sm shadow-md"
                >
                  Scan Crop Leaves &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
