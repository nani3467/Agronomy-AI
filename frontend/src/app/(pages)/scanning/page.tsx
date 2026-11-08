'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { API_BASE_URL, formatApiError, ScanResult } from '@/lib/api'
import { useVoiceOS } from '@/context/VoiceOSContext'
import { useVoiceActions } from '@/hooks/useVoiceActions'

// High-resolution sample images for instant 1-click test evaluations
const sampleLeaves = [
  {
    name: 'Tomato Blight Leaf',
    url: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=600&auto=format&fit=crop&q=80',
    type: 'Sample 1',
  },
  {
    name: 'Corn Rust Leaf',
    url: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80',
    type: 'Sample 2',
  },
  {
    name: 'Potato Blight Leaf',
    url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80',
    type: 'Sample 3',
  },
]

export default function ScanningPage() {
  const MAX_SIZE_MB = 10

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'treatments' | 'pathology' | 'prevention'>('treatments')

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment')
  const [cameraError, setCameraError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraFallbackInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const { speak, language } = useVoiceOS()

  // Clean up camera stream on unmount
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }, [])

  useEffect(() => {
    return () => {
      stopCameraStream()
    }
  }, [stopCameraStream])

  const processFile = useCallback((file: File) => {
    // 1. Format validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!validTypes.includes(file.type.toLowerCase()) && !file.type.startsWith('image/')) {
      setError(`Unsupported format (${file.type || 'unknown'}). Please upload a JPG, PNG, or WEBP image.`)
      return
    }

    // 2. Size validation
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_SIZE_MB) {
      setError(`File size (${sizeMB.toFixed(1)} MB) exceeds maximum allowed size of ${MAX_SIZE_MB} MB.`)
      return
    }

    setSelectedFile(file)
    setError(null)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  // Start Camera with Rear Facing Default
  const startCamera = useCallback(async (facing: 'environment' | 'user' = 'environment') => {
    stopCameraStream()
    setCameraError(null)

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      setIsCameraActive(true)
      setCameraFacing(facing)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      console.warn('[Camera] getUserMedia failed, falling back to native capture input:', err)
      setCameraError('Direct camera feed unavailable. Opening device camera app...')
      // Fallback to mobile native camera capture input
      cameraFallbackInputRef.current?.click()
    }
  }, [stopCameraStream])

  // Capture current frame from live camera video
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !streamRef.current) return

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `leaf-capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
        processFile(file)
        stopCameraStream()

        // Spoken prompt asking user if they want to analyze it
        const analyzePrompt =
          language === 'te'
            ? 'మీ మొక్క ఫోటో సిద్ధంగా ఉంది. విశ్లేషించమంటారా?'
            : language === 'hi'
            ? 'आपकी पौधे की फोटो तैयार है। क्या मैं इसका विश्लेषण करूँ?'
            : 'Your plant photo is ready. Should I analyze it?'

        speak(analyzePrompt)
      },
      'image/jpeg',
      0.92
    )
  }, [processFile, stopCameraStream, language, speak])

  const toggleCameraFacing = useCallback(() => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment'
    startCamera(nextFacing)
  }, [cameraFacing, startCamera])

  // Global event listeners for cross-page & direct Voice OS triggers
  useEffect(() => {
    const handleCameraEvent = (e: any) => {
      const facing = e?.detail?.facing || 'environment'
      startCamera(facing)
    }
    const handleGalleryEvent = () => fileInputRef.current?.click()
    const handleCaptureEvent = () => capturePhoto()
    const handleAnalyzeEvent = () => handleAnalyze()
    const handleRetakeEvent = () => {
      handleClear()
      startCamera('environment')
    }

    window.addEventListener('vos-open-camera', handleCameraEvent)
    window.addEventListener('vos-open-gallery', handleGalleryEvent)
    window.addEventListener('vos-take-photo', handleCaptureEvent)
    window.addEventListener('vos-analyze', handleAnalyzeEvent)
    window.addEventListener('vos-retake', handleRetakeEvent)

    // Check query params on mount (e.g. redirected from another page: /scanning?action=camera)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const action = params.get('action')
      if (action === 'camera') {
        setTimeout(() => startCamera('environment'), 300)
      } else if (action === 'gallery') {
        setTimeout(() => fileInputRef.current?.click(), 300)
      }
    }

    return () => {
      window.removeEventListener('vos-open-camera', handleCameraEvent)
      window.removeEventListener('vos-open-gallery', handleGalleryEvent)
      window.removeEventListener('vos-take-photo', handleCaptureEvent)
      window.removeEventListener('vos-analyze', handleAnalyzeEvent)
      window.removeEventListener('vos-retake', handleRetakeEvent)
    }
  }, [startCamera, capturePhoto])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleClear = () => {
    stopCameraStream()
    setSelectedFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraFallbackInputRef.current) cameraFallbackInputRef.current.value = ''
  }

  // Load sample image
  const handleLoadSample = async (sampleUrl: string, sampleName: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(sampleUrl)
      const blob = await res.blob()
      const file = new File([blob], `${sampleName.toLowerCase().replace(/\s+/g, '-')}.jpg`, {
        type: 'image/jpeg',
      })
      processFile(file)
    } catch {
      setError('Could not load sample leaf image. Please choose an image from your device.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select or upload an image to analyze.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', selectedFile)

      const response = await axios.post<ScanResult>(`${API_BASE_URL}/scan/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 45000,
      })

      const data = response.data
      setResult(data)

      // Comprehensive spoken diagnosis per Phase 3 requirements:
      // "Speak the disease name, confidence where available, symptoms, causes, and treatment recommendations."
      const sym = data.symptoms || 'leaf lesions and discoloration'
      const cause = data.causes || 'fungal or bacterial pathogen'
      const treat = data.organic_treatment || data.chemical_treatment || 'Apply organic neem oil and isolate affected foliage.'

      const diagnosisSpeech =
        language === 'te'
          ? `గుర్తించిన సమస్య: ${data.disease_name}. ఖచ్చితత్వం: ${data.accuracy} శాతం. లక్షణాలు: ${sym}. కారణం: ${cause}. సిఫార్సు చేసిన చికిత్స: ${treat}.`
          : language === 'hi'
          ? `पहचानी गई बीमारी: ${data.disease_name}। सटीकता: ${data.accuracy} प्रतिशत। लक्षण: ${sym}। कारण: ${cause}। अनुशंसित उपचार: ${treat}।`
          : `Diagnosis complete. Detected: ${data.disease_name} with ${data.accuracy}% confidence. Symptoms: ${sym}. Causes: ${cause}. Treatment: ${treat}.`

      speak(diagnosisSpeech)
    } catch (err: unknown) {
      setError(
        formatApiError(
          err,
          'Failed to analyze image. Please ensure the Django backend server is running.'
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Read Diagnosis Aloud Handler
  const readDiagnosisAloud = () => {
    if (!result) return
    const sym = result.symptoms || 'visible leaf lesions'
    const cause = result.causes || 'pathogenic infection'
    const treat = result.organic_treatment || result.chemical_treatment || 'Apply organic treatment.'

    const fullSummary =
      language === 'te'
        ? `రోగ నిర్ధారణ: ${result.disease_name}. ఖచ్చితత్వం: ${result.accuracy} శాతం. లక్షణాలు: ${sym}. కారణం: ${cause}. చికిత్స: ${treat}.`
        : language === 'hi'
        ? `रोग निदान: ${result.disease_name}। सटीकता: ${result.accuracy} प्रतिशत। लक्षण: ${sym}। कारण: ${cause}। उपचार: ${treat}।`
        : `Plant Diagnosis: ${result.disease_name} with ${result.accuracy}% confidence. Symptoms: ${sym}. Causes: ${cause}. Treatment: ${treat}.`

    speak(fullSummary)
  }

  // Explain Treatment Handler
  const explainTreatment = () => {
    if (!result) {
      const noResPrompt =
        language === 'te'
          ? 'దయచేసి మొదట మీ మొక్కను స్కాన్ చేయండి.'
          : language === 'hi'
          ? 'कृपया पहले अपने पौधे को स्कैन करें।'
          : 'Please scan a plant image first to view treatment advice.'
      speak(noResPrompt)
      return
    }

    const org = result.organic_treatment || 'Apply organic neem spray.'
    const chem = result.chemical_treatment || 'Use approved protective fungicide.'

    const treatSpeech =
      language === 'te'
        ? `${result.disease_name} నివారణకు: సేంద్రీయ విధానం: ${org}. రసాయన విధానం: ${chem}.`
        : language === 'hi'
        ? `${result.disease_name} के उपचार के लिए: जैविक विधि: ${org}। रासायनिक विधि: ${chem}।`
        : `Treatment recommendations for ${result.disease_name}. Organic remedy: ${org}. Chemical remedy: ${chem}.`

    speak(treatSpeech)
  }

  // Connect Scanning Page Actions to Agronomy Voice OS Registry
  useVoiceActions([
    {
      id: 'open_camera',
      name: 'Open Camera',
      description: 'Open rear camera viewfinder to photograph a plant leaf',
      intent: 'OPEN_CAMERA',
      keywords_en: ['open camera', 'take photo with camera', 'use camera', 'camera'],
      keywords_te: ['కెమెరా తెరువు', 'కెమెరా ఓపెన్ చేయి', 'కెమెరా'],
      keywords_hi: ['कैमरा खोलो', 'कैमरा शुरू करो', 'कैमरा'],
      handler: () => startCamera('environment'),
    },
    {
      id: 'prompt_camera_facing',
      name: 'Choose Camera',
      description: 'Ask user whether to use front or back camera',
      intent: 'OPEN_CAMERA',
      keywords_en: ['take a photo', 'take photo'],
      keywords_te: ['ఫోటో తీయి'],
      keywords_hi: ['फोटो खींचो'],
      handler: () => {
        const prompt =
          language === 'te'
            ? 'మీరు ముందు కెమెరా లేదా వెనుక కెమెరా ఉపయోగించాలనుకుంటున్నారా?'
            : language === 'hi'
            ? 'क्या आप फ्रंट कैमरा या बैक कैमरा का उपयोग करना चाहते हैं?'
            : 'Would you like to use the front camera or back camera?'
        speak(prompt)
      },
    },
    {
      id: 'open_back_camera',
      name: 'Open Rear Camera',
      description: 'Open rear environment camera for plant photo',
      intent: 'OPEN_CAMERA',
      keywords_en: ['back camera', 'rear camera', 'back'],
      keywords_te: ['వెనుక కెమెరా', 'రియర్ కెమెరా', 'బ్యాక్ కెమెరా'],
      keywords_hi: ['बैक कैमरा', 'पिछला कैमरा'],
      handler: () => {
        startCamera('environment')
        const p =
          language === 'te'
            ? 'వెనుక కెమెరా తెరవబడింది. ఫోటో తీయడానికి క్యాప్చర్ అని చెప్పండి.'
            : language === 'hi'
            ? 'बैक कैमरा सक्रिय है। फोटो खींचने के लिए कैप्चर कहें।'
            : 'Rear camera active. Say capture to take the photo.'
        speak(p)
      },
    },
    {
      id: 'open_front_camera',
      name: 'Open Front Camera',
      description: 'Open front selfie camera for plant photo',
      intent: 'OPEN_CAMERA',
      keywords_en: ['front camera', 'front', 'selfie camera'],
      keywords_te: ['ముందు కెమెరా', 'ఫ్రంట్ కెమెరా'],
      keywords_hi: ['फ्रंट कैमरा', 'सामने का कैमरा'],
      handler: () => {
        startCamera('user')
        const p =
          language === 'te'
            ? 'ముందు కెమెరా తెరవబడింది. ఫోటో తీయడానికి క్యాప్చర్ అని చెప్పండి.'
            : language === 'hi'
            ? 'फ्रंट कैमरा सक्रिय है। फोटो खींचने के लिए कैप्चर कहें।'
            : 'Front camera active. Say capture to take the photo.'
        speak(p)
      },
    },
    {
      id: 'open_gallery',
      name: 'Upload from Gallery',
      description: 'Open file picker to upload leaf picture from gallery or files',
      intent: 'OPEN_GALLERY',
      keywords_en: ['open gallery', 'upload picture', 'choose from files', 'gallery', 'upload image'],
      keywords_te: ['గ్యాలరీ తెరువు', 'గ్యాలరీ', 'ఫోటో అప్‌లోడ్'],
      keywords_hi: ['गैलरी खोलो', 'फ़ोटो अपलोड', 'गैलरी'],
      handler: () => fileInputRef.current?.click(),
    },
    {
      id: 'capture_plant_photo',
      name: 'Capture Photo',
      description: 'Capture photo from camera feed and ask for analysis confirmation',
      intent: 'CAPTURE_IMAGE',
      keywords_en: ['capture', 'capture photo', 'snap', 'click photo', 'shoot'],
      keywords_te: ['క్యాప్చర్', 'ఫోటో తీయి', 'క్లిక్ చేయి'],
      keywords_hi: ['कैप्चर', 'फोटो खींचो', 'फोटो लो'],
      handler: () => capturePhoto(),
    },
    {
      id: 'take_photo',
      name: 'Capture Photo Alias',
      description: 'Capture photo from camera feed',
      intent: 'TAKE_PHOTO',
      keywords_en: ['take photo', 'snap', 'capture', 'click photo', 'shoot'],
      keywords_te: ['ఫోటో తీయి', 'క్లిక్ చేయి', 'క్యాప్చర్'],
      keywords_hi: ['फोटो खींचो', 'फोटो लो', 'कैप्चर'],
      handler: () => capturePhoto(),
    },
    {
      id: 'retake_photo',
      name: 'Retake Photo',
      description: 'Discard current photo and restart camera',
      intent: 'RETAKE_PHOTO',
      keywords_en: ['retake', 'retake photo', 'discard photo', 'try again'],
      keywords_te: ['మళ్ళీ ఫోటో తీయి', 'మరలా తీయి'],
      keywords_hi: ['फिर से फोटो लो', 'दोबारा खींचो'],
      handler: () => {
        handleClear()
        startCamera('environment')
        const p =
          language === 'te'
            ? 'కెమెరా ప్రివ్యూకి తిరిగి వెళ్తున్నాను. ఫోటో తీయడానికి క్యాప్చర్ అని చెప్పండి.'
            : language === 'hi'
            ? 'कैमरा पूर्वावलोकन पर वापस जा रहे हैं। फोटो खींचने के लिए कैप्चर कहें।'
            : 'Returning to camera preview. Say capture to take the photo.'
        speak(p)
      },
    },
    {
      id: 'submit_scan',
      name: 'Diagnose Plant Leaf',
      description: 'Run deep neural network plant disease analysis on current image',
      intent: 'SUBMIT_FORM',
      keywords_en: ['analyze', 'diagnose', 'scan now', 'check disease', 'submit image', 'scan leaf'],
      keywords_te: ['స్కాన్ చేయి', 'విశ్లేషించు', 'రోగం తనిఖీ'],
      keywords_hi: ['स्कैन करो', 'रोग जांचो', 'विश्लेषण करो'],
      handler: () => handleAnalyze(),
    },
    {
      id: 'clear_scan',
      name: 'Reset Scanner',
      description: 'Clear uploaded leaf and reset scanner',
      intent: 'CLEAR_FORM',
      keywords_en: ['reset', 'clear', 'start over', 'scan another'],
      keywords_te: ['రీసెట్ చేయి', 'క్లియర్ చేయి'],
      keywords_hi: ['रीसेट करो', 'साफ़ करो'],
      handler: () => handleClear(),
    },
    {
      id: 'read_result',
      name: 'Read Diagnosis Aloud',
      description: 'Voice read the scan results and organic treatments',
      intent: 'READ_RESULT',
      keywords_en: ['read diagnosis', 'read result', 'what did you find', 'read symptoms', 'show the disease result'],
      keywords_te: ['ఫలితం చదువు', 'రోగం వివరాలు చెప్పు', 'ఫలితం చూపించు'],
      keywords_hi: ['परिणाम पढ़ो', 'बीमारी बताओ', 'परिणाम दिखाओ'],
      handler: () => readDiagnosisAloud(),
    },
    {
      id: 'explain_treatment',
      name: 'Explain Treatment',
      description: 'Voice read the organic and chemical treatment advice for detected disease',
      intent: 'EXPLAIN_CONTENT',
      keywords_en: ['tell me how to treat it', 'how to treat it', 'explain treatment', 'treat it', 'treatment'],
      keywords_te: ['చికిత్స చెప్పు', 'ఎలా నయం చేయాలి'],
      keywords_hi: ['उपचार बताओ', 'इलाज बताओ'],
      handler: () => explainTreatment(),
    },
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/60 via-gray-50 to-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
            <span>🔬 MobileNetV2 Neural Pathology Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Plant Disease Scanner
          </h1>
          <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto">
            Take a photo with your camera or upload from gallery for instant AI disease identification, symptoms assessment, and treatment prescriptions.
          </p>
        </div>

        {/* Upload & Analysis Box (when no result) */}
        {!result ? (
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 sm:p-10 space-y-6">
            {/* Live Camera Viewfinder Modal / View */}
            {isCameraActive ? (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-[460px] flex items-center justify-center border-4 border-green-500 shadow-xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Camera Overlay Guide Box */}
                <div className="absolute inset-8 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                    Center the affected leaf inside frame
                  </span>
                </div>

                {/* Camera Top Controls */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <button
                    onClick={toggleCameraFacing}
                    className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm shadow-md"
                    title="Flip Camera (Front/Rear)"
                  >
                    🔄
                  </button>
                  <button
                    onClick={stopCameraStream}
                    className="p-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md text-xs font-bold"
                    title="Close Camera"
                  >
                    ✕
                  </button>
                </div>

                {/* Camera Bottom Shutter Bar */}
                <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-4">
                  <button
                    onClick={capturePhoto}
                    className="w-16 h-16 rounded-full bg-white border-4 border-green-600 hover:scale-105 active:scale-95 shadow-2xl flex items-center justify-center transition-all"
                    aria-label="Capture Photo"
                    title="Snap Photo"
                  >
                    <div className="w-11 h-11 rounded-full bg-green-600" />
                  </button>
                </div>
              </div>
            ) : (
              /* Drop Zone / Image Display */
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center transition-all ${
                  isDragging
                    ? 'border-green-500 bg-green-50/80 scale-[1.01]'
                    : preview
                    ? 'border-green-300 bg-green-50/30'
                    : 'border-gray-300 bg-gray-50/50'
                }`}
              >
                {preview ? (
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      <img
                        src={preview}
                        alt="Plant Leaf Preview"
                        className="max-h-80 mx-auto rounded-xl shadow-md border-2 border-green-400 object-contain"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleClear()
                        }}
                        className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center shadow-md text-xs"
                        title="Remove image"
                      >
                        &times;
                      </button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-800">✓ {selectedFile?.name}</p>
                      <p className="text-xs text-gray-500">
                        {selectedFile &&
                          `${(selectedFile.size / 1024).toFixed(1)} KB • Ready for deep analysis`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Dual Action Choice Cards (Take Photo vs Upload from Gallery) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                      {/* Option 1: Take Photo */}
                      <button
                        type="button"
                        onClick={() => startCamera('environment')}
                        className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white border-2 border-green-500/30 hover:border-green-600 hover:bg-green-50/50 shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-green-100 text-[#16A34A] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <svg
                            className="w-7 h-7"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth="2.2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </div>
                        <span className="font-extrabold text-sm text-gray-900 group-hover:text-green-700">
                          Take a Photo 📷
                        </span>
                        <span className="text-[11px] text-gray-500 mt-1">
                          Rear camera default
                        </span>
                      </button>

                      {/* Option 2: Upload from Gallery */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-green-600 hover:bg-green-50/50 shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <svg
                            className="w-7 h-7"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <span className="font-extrabold text-sm text-gray-900 group-hover:text-green-700">
                          Upload from Gallery 🖼️
                        </span>
                        <span className="text-[11px] text-gray-500 mt-1">
                          Browse device files
                        </span>
                      </button>
                    </div>

                    <p className="text-xs text-gray-500">
                      or drag & drop your leaf image directly onto this area
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Hidden File Inputs */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleInputChange}
              className="hidden"
            />
            {/* Fallback Mobile Camera Input with capture="environment" */}
            <input
              type="file"
              ref={cameraFallbackInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleInputChange}
              className="hidden"
            />

            {/* Quick Sample Selector */}
            {!preview && !isCameraActive && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-semibold mb-2.5">
                  Or test immediately with a sample leaf:
                </p>
                <div className="flex flex-wrap gap-2">
                  {sampleLeaves.map((sample) => (
                    <button
                      key={sample.name}
                      onClick={() => handleLoadSample(sample.url, sample.name)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-green-50 hover:border-green-300 text-xs font-semibold text-gray-700 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      {sample.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
                <svg
                  className="w-5 h-5 shrink-0 mt-0.5 text-red-500"
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
                <div className="space-y-1">
                  <strong className="block font-bold">Analysis Notice:</strong>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Camera Error / Notice */}
            {cameraError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                {cameraError}
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="px-4 py-2.5 rounded-full border border-green-600 bg-green-50 hover:bg-green-100 text-[#166534] text-xs sm:text-sm font-bold transition-colors"
                >
                  📷 Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-full border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold transition-colors"
                >
                  🖼️ Gallery
                </button>
              </div>

              <div className="flex items-center gap-2">
                {preview && (
                  <button
                    onClick={handleClear}
                    className="px-5 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-semibold"
                  >
                    Clear
                  </button>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={!selectedFile || isLoading}
                  className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full bg-green-600 hover:bg-green-700 active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-md shadow-green-600/25 transition-all"
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
                      <span>Analyzing Cellular Patterns...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>Diagnose Plant Leaf</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── RESULTS CARD ──────────────────────────────────────────────────── */
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in duration-300 space-y-6 p-6 sm:p-10">
            {/* Top Status & Confidence Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                      result.status === 'Healthy'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}
                  >
                    {result.status === 'Healthy' ? '✓ Healthy Plant' : '⚠ Pathology Detected'}
                  </span>
                  <span className="text-xs text-gray-500">ID: {result.id.slice(0, 8)}...</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  {result.disease_name}
                </h2>
              </div>

              {/* Confidence Score Pill & Read Aloud Button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={readDiagnosisAloud}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-[#166534] border border-emerald-300 font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
                  title="Read diagnosis aloud with Voice OS"
                >
                  <span>🔊</span>
                  <span>Read Aloud</span>
                </button>

                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-gray-600">
                      ML Confidence
                    </div>
                    <div className="text-2xl font-black text-green-700">{result.accuracy}%</div>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-green-200 border-t-green-600 flex items-center justify-center font-bold text-xs text-green-800">
                    AI
                  </div>
                </div>
              </div>
            </div>

            {/* Low Confidence Warning */}
            {result.accuracy < 60 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-start gap-2.5">
                <span className="text-lg">⚠️</span>
                <div>
                  <strong>Low Model Certainty ({result.accuracy}%):</strong>
                  <p className="mt-0.5 text-xs text-amber-700">
                    The image may have glare, blur, or suboptimal angles. For maximum precision, retake the photo in bright daylight focused on clear lesions.
                  </p>
                </div>
              </div>
            )}

            {/* Image Preview & Quick Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {preview && (
                <div className="md:col-span-1 rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-gray-50 aspect-square">
                  <img src={preview} alt={result.disease_name} className="w-full h-full object-cover" />
                </div>
              )}

              <div className={`${preview ? 'md:col-span-2' : 'md:col-span-3'} space-y-4`}>
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Observed Symptoms
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                    {result.symptoms ||
                      'Visual leaf lesions, color alteration, or spot formations matching this class signature.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                    <strong className="text-gray-900 block mb-0.5">🦠 Primary Cause:</strong>
                    <span className="text-gray-600 leading-relaxed">
                      {result.causes ||
                        'Microbial or fungal pathogen triggered by favorable temperature and humidity.'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                    <strong className="text-gray-900 block mb-0.5">💨 Transmission Route:</strong>
                    <span className="text-gray-600 leading-relaxed">
                      {result.spread || 'Dispersed by rain splash, wind currents, and mechanical contact.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabbed Detailed Sections */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <div className="flex border-b border-gray-200 gap-2">
                <button
                  onClick={() => setActiveTab('treatments')}
                  className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                    activeTab === 'treatments'
                      ? 'border-green-600 text-green-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  💊 Treatments & Chemical Safety
                </button>
                <button
                  onClick={() => setActiveTab('pathology')}
                  className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                    activeTab === 'pathology'
                      ? 'border-green-600 text-green-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  🌾 Crop Damage Assessment
                </button>
                <button
                  onClick={() => setActiveTab('prevention')}
                  className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                    activeTab === 'prevention'
                      ? 'border-green-600 text-green-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  🛡️ Long-Term Prevention
                </button>
              </div>

              {/* Tab 1: Treatments */}
              {activeTab === 'treatments' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-5 rounded-2xl bg-green-50 border border-green-200 space-y-2">
                    <div className="flex items-center gap-2 text-green-900 font-bold text-sm">
                      <span>🌿 Organic Biological Treatment</span>
                    </div>
                    <p className="text-xs sm:text-sm text-green-800 leading-relaxed">
                      {result.organic_treatment}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
                    <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                      <span>🧪 Chemical Treatment & Safety Precautions</span>
                    </div>
                    <p className="text-xs sm:text-sm text-blue-900 leading-relaxed">
                      {result.chemical_treatment}
                    </p>
                    {result.safety_precautions && (
                      <div className="mt-2 pt-2 border-t border-blue-200 text-xs text-blue-800">
                        <strong>⚠️ Handler Safety:</strong> {result.safety_precautions}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Crop Damage */}
              {activeTab === 'pathology' && (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <span>⚠️ Economic Impact & Yield Vulnerability</span>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
                    {result.crop_damage ||
                      'Can cause severe loss of photosynthetic canopy, stunted growth, and diminished marketable yield.'}
                  </p>
                </div>
              )}

              {/* Tab 3: Prevention */}
              {activeTab === 'prevention' && (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <span>🛡️ Cultural & Agronomic Prevention Practices</span>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
                    {result.prevention ||
                      'Maintain crop rotation, sanitize tools, and irrigate via drip tape to keep leaves dry.'}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={handleClear}
                className="px-6 py-2.5 rounded-full border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold"
              >
                ← Scan Another Plant
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/crops?disease=${encodeURIComponent(result.disease_name)}`}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs sm:text-sm shadow-2xs transition-all"
                >
                  <span>📖 View Crop Guide & Treatment</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>

                <Link
                  href={`/report?id=${result.id}`}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>Full Printable Report & Export</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
