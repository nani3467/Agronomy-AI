'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useVoiceOS } from '@/context/VoiceOSContext'
import { useVoiceActions } from '@/hooks/useVoiceActions'

const guideSteps = [
  {
    step: 1,
    title: 'Capture High-Quality Leaf Photo',
    icon: '📸',
    badge: 'Step 1 • Photography',
    color: 'border-l-blue-500 bg-blue-50/50',
    description: 'Capture a well-focused, natural-light photo of the plant leaf showing distinct symptoms or lesions.',
    tips: [
      'Take photos in bright, indirect daylight (avoid harsh direct flash or deep shadows).',
      'Hold the camera 15 to 30 cm away from the leaf surface.',
      'Ensure the affected lesion or spot pattern is in sharp focus.',
      'Avoid blurry images, extreme wide shots, or photos containing human hands/fingers covering the leaf.',
      'Supported image formats: JPG, PNG, WEBP (up to 10 MB).'
    ]
  },
  {
    step: 2,
    title: 'AI Neural Network Analysis',
    icon: '🧠',
    badge: 'Step 2 • Machine Learning',
    color: 'border-l-purple-500 bg-purple-50/50',
    description: 'Our MobileNetV2 deep convolutional neural network analyzes visual patterns across 38 distinct crop disease categories.',
    tips: [
      'The model is trained on 54,000+ botanical leaf images from the PlantVillage repository.',
      'Inference processes in under 2 seconds on modern CPU/GPU architectures.',
      'Softmax probability scores calculate real confidence metrics for the predicted class.',
      'If confidence falls below 60%, the system flags a low-certainty alert.'
    ]
  },
  {
    step: 3,
    title: 'Review Pathology & Symptoms',
    icon: '🔍',
    badge: 'Step 3 • Diagnosis',
    color: 'border-l-emerald-500 bg-emerald-50/50',
    description: 'Receive an immediate breakdown of the detected plant pathology, including pathogen biology and spread mechanics.',
    tips: [
      'Verify the symptoms against what you observe in your field.',
      'Check whether the pathogen is fungal (e.g. Blight, Scab, Rust), bacterial (Bacterial spot), or viral (Mosaic, Leaf curl).',
      'Understand the transmission vectors (windborne spores, rain splash, pruning shears, or insect vectors like whiteflies and mites).'
    ]
  },
  {
    step: 4,
    title: 'Implement Prescribed Treatments',
    icon: '💊',
    badge: 'Step 4 • Crop Recovery',
    color: 'border-l-amber-500 bg-amber-50/50',
    description: 'Choose between certified organic biological remedies and protective chemical sprays with safety rules.',
    tips: [
      'Organic options (Bacillus subtilis, copper soaps, neem oils, potassium bicarbonate) are prioritized.',
      'For chemical controls, strictly observe Pre-Harvest Intervals (PHI) and Restricted Entry Intervals (REI).',
      'Always wear personal protective equipment (PPE): chemical-resistant nitrile gloves, eye goggles, and a dust/mist mask.',
      'Download full diagnosis reports as PDF or CSV for cooperative records or agronomist consultation.'
    ]
  },
  {
    step: 5,
    title: 'Website-Wide Voice Operating System (Voice OS)',
    icon: '🎙️',
    badge: 'Step 5 • Hands-Free Voice Control',
    color: 'border-l-green-500 bg-green-50/50',
    description: 'Control the entire Agronomy AI platform hands-free using natural spoken commands in English, Telugu (తెలుగు), or Hindi (हिन्दी).',
    tips: [
      'Click the floating Voice OS microphone or the top navigation Voice button to activate.',
      'Navigation commands: Say "Go to disease scanner", "పంట సిఫార్సుల పేజీకి వెళ్ళు", or "डैशबोर्ड खोलो".',
      'Camera commands on Scanner: Say "Open camera", "Take photo", or "Upload from gallery".',
      'Universal screen reader: Say "Read this page" or "ఫలితం చదువు" to hear descriptions and diagnosis aloud.',
      'Language switching: Say "Switch to Telugu" (తెలుగులోకి మార్చు) or "Change language to Hindi" anytime.'
    ]
  }
]

export default function HowToUsePage() {
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const { speak, language } = useVoiceOS()

  useVoiceActions([
    {
      id: 'read_how_to_use',
      name: 'Explain How to Use Website',
      description: 'Voice read the guide on how to use Agronomy AI website and Voice OS',
      intent: 'READ_PAGE',
      keywords_en: ['explain how to use this website', 'how to use this website', 'how to use', 'explain website', 'help'],
      keywords_te: ['ఈ వెబ్‌సైట్‌ను ఎలా ఉపయోగించాలో వివరించు', 'వెబ్‌సైట్ ఎలా వాడాలి', 'సహాయం'],
      keywords_hi: ['इस वेबसाइट का उपयोग कैसे करें', 'वेबसाइट कैसे चलाएं', 'मदद'],
      handler: () => {
        const text =
          language === 'te'
            ? 'అగ్రానమీ AI మార్గదర్శిని: 1. మొక్క తెగులు స్కాన్ చేయడానికి "Scan my plant" అని చెప్పండి. 2. మీ నేలకు పంటల సిఫార్సుల కోసం "Recommend a crop" అని చెప్పండి. 3. పంటల సమాచారం కోసం "Open crop guides" అని చెప్పండి. 4. డాష్‌బోర్డ్ కోసం "Open dashboard" అని చెప్పండి.'
            : language === 'hi'
            ? 'एग्रोनॉमी एआई गाइड: 1. पौधे की बीमारी जांचने के लिए "Scan my plant" कहें। 2. अपनी मिट्टी के लिए फसल सलाह पाने के लिए "Recommend a crop" कहें। 3. फसल मार्गदर्शिका के लिए "Open crop guides" कहें। 4. डैशबोर्ड के लिए "Open dashboard" कहें।'
            : 'Welcome to Agronomy AI. You can control the entire website hands-free using voice: Say "Scan my plant" to diagnose plant leaf diseases, "Recommend a crop" to get soil crop suggestions, "Open crop guides" to search 23 crop cultivation manuals, or "Open dashboard" to view analytics.'
        speak(text)
      },
    },
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/60 via-gray-50 to-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
            <span>📖 Farmer & Field Guide</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            How to Use Agronamy
          </h1>
          <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto">
            Step-by-step instructions for optimal image capture, AI diagnostic interpretation, and safe treatment implementation.
          </p>
        </div>

        {/* 4 Interactive Steps */}
        <div className="space-y-6">
          {guideSteps.map((step) => (
            <div
              key={step.step}
              className={`bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-gray-100 border-l-4 ${step.color} transition-all`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-center text-2xl">
                    {step.icon}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">
                      {step.badge}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 mt-1">
                      {step.title}
                    </h3>
                  </div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 mt-3 leading-relaxed">
                {step.description}
              </p>

              {/* Actionable Tips */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Recommended Best Practices:
                </h4>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  {step.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-600 font-bold shrink-0">✓</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Help Callout */}
        <div className="bg-emerald-900 text-white rounded-3xl p-8 sm:p-10 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-2xl font-bold">Ready to analyze your crops?</h3>
            <p className="text-xs sm:text-sm text-emerald-200 max-w-md">
              Start with our AI Disease Scanner or run a soil analysis with our Crop Recommender.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/scanning"
              className="px-6 py-3 rounded-full bg-white text-green-800 font-bold text-xs shadow-md hover:bg-emerald-50 text-center"
            >
              Scan Plant Now
            </Link>
            <Link
              href="/crop-recommendation"
              className="px-6 py-3 rounded-full bg-emerald-800 border border-emerald-400 text-white font-bold text-xs hover:bg-emerald-700 text-center"
            >
              Crop Recommender
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
