'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { API_BASE_URL, AIStatus, ChatMessage, VoiceOption } from '@/lib/api'
import { WavAudioRecorder } from '@/lib/audioRecorder'

const SUGGESTED_QUESTIONS = [
  'Which fertilizer is suitable for rice?',
  'Why are my tomato leaves turning yellow?',
  'How can I prevent fungal disease in rice?',
  'Which crop is suitable for clay soil?',
  'How often should I irrigate groundnut?',
  'What are the symptoms of bacterial leaf blight?',
  'Which nutrients are important for chilli plants?',
]

type InputMode = 'voice' | 'text'
type ResponseMode = 'text' | 'voice'
type LanguageCode = 'en' | 'te' | 'hi'

const DEFAULT_RECOMMENDED_VOICES: Record<LanguageCode, string> = {
  en: 'Avinash',
  te: 'Lakshmi',
  hi: 'Shivani',
}

const SAMPLE_GREETINGS: Record<LanguageCode, string> = {
  en: 'Hello! I am your Agronomy AI voice assistant. How can I help your farm today?',
  te: 'నమస్కారం! నేను మీ అగ్రానమీ AI సహాయకుడిని. మీ పంటల వివరాలు చెప్పండి.',
  hi: 'नमस्ते! मैं आपका एग्रोनॉमी एआई वॉयस सहायक हूँ। आपकी फसलों के बारे में पूछिए।',
}

export default function FloatingAIAssistant() {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Mode Selection (Independent toggles)
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [responseMode, setResponseMode] = useState<ResponseMode>('text')
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('en')

  // Voice Selection State (Gnani Timbre v3.0)
  const [selectedVoice, setSelectedVoice] = useState<string>('Avinash')
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false)

  // Chat message history
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-0',
      role: 'assistant',
      content:
        'Hello! Welcome to Agronomy AI. 🌱\n\nI can help you with plant diseases, crop recommendations, fertilizers, irrigation, weather and farming questions.\n\nYou can switch between Text Mode and Voice Mode at any time.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  // Input & Processing State
  const [textInput, setTextInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<string>('')
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // STT Review State (Gnani Prisma Recognized text awaiting user review/send/edit)
  const [transcribedReview, setTranscribedReview] = useState<string | null>(null)

  // Image Upload State (Gemini Multimodal Inspection)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Microphone Recording State
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const audioRecorderRef = useRef<WavAudioRecorder | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Audio Playback & Enhancement State (Gnani Timbre v3.0)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)
  const [audioProgress, setAudioProgress] = useState<{ current: number; duration: number }>({ current: 0, duration: 0 })
  const [isAudioPaused, setIsAudioPaused] = useState(false)
  const [isSynthesizingId, setIsSynthesizingId] = useState<string | null>(null)
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0)
  const [speechVolume, setSpeechVolume] = useState<number>(1.0)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlsRef = useRef<Record<string, string>>({})

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isChatOpen && !isMinimized && inputMode === 'text') {
      scrollToBottom()
    }
  }, [messages, isChatOpen, isMinimized, isProcessing, inputMode])

  // Listen for external open triggers (e.g. from hero or feature cards)
  useEffect(() => {
    const handleOpen = () => {
      setIsChatOpen(true)
      setIsMinimized(false)
    }
    window.addEventListener('open-agronomy-ai', handleOpen)
    return () => window.removeEventListener('open-agronomy-ai', handleOpen)
  }, [])

  // Listen for VOS global audio stop event to avoid overlapping speech
  useEffect(() => {
    const handleStopAudio = () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current.currentTime = 0
        currentAudioRef.current = null
      }
      setPlayingMessageId(null)
      setIsPreviewingVoice(false)
    }
    window.addEventListener('vos-stop-audio', handleStopAudio)
    return () => window.removeEventListener('vos-stop-audio', handleStopAudio)
  }, [])

  // Probe Backend Status on Mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get<AIStatus>(`${API_BASE_URL}/assistant/status/`, { timeout: 6000 })
        setAiStatus(res.data)
      } catch {
        try {
          const fallbackRes = await axios.get<AIStatus>(`${API_BASE_URL}/ai/status/`, { timeout: 6000 })
          setAiStatus(fallbackRes.data)
        } catch {
          setAiStatus(null)
        }
      }
    }
    fetchStatus()

    // Restore voice preference if saved
    if (typeof window !== 'undefined') {
      const savedVoice = localStorage.getItem('agronomy_preferred_voice')
      if (savedVoice) {
        setSelectedVoice(savedVoice)
      }
      const savedSpeed = localStorage.getItem('agronomy_speech_speed')
      if (savedSpeed) {
        setSpeechSpeed(parseFloat(savedSpeed) || 1.0)
      }
    }
  }, [])

  // Auto-select recommended voice when language changes
  useEffect(() => {
    const recVoice = DEFAULT_RECOMMENDED_VOICES[selectedLang] || 'Avinash'
    // Check if current selected voice supports selected language
    const currentVoiceOption = aiStatus?.supported_voices?.find(
      (v) => v.voice === selectedVoice && v.language === selectedLang
    )
    if (!currentVoiceOption) {
      setSelectedVoice(recVoice)
    }
  }, [selectedLang, aiStatus, selectedVoice])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [textInput])

  // Cleanup audio objects on unmount
  useEffect(() => {
    const urls = audioUrlsRef.current
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  // ── IMAGE ATTACHMENT HANDLERS ─────────────────────────────────────────────
  const handleImageSelect = (file: File) => {
    setErrorMessage(null)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage('Please select a JPG, PNG, or WEBP image file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 10MB limit. Please choose a smaller photo.')
      return
    }
    setSelectedImage(file)
    const preview = URL.createObjectURL(file)
    setImagePreviewUrl(preview)
  }

  const handleRemoveImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }
    setSelectedImage(null)
    setImagePreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // ── MODE TRANSITIONS (SEAMLESS, ZERO DATA LOSS) ───────────────────────────
  const handleSwitchToTextMode = () => {
    // 1. Safely stop recording without losing state
    if (isRecording) {
      cancelRecording()
    }
    // 2. Clear transcription review state if user transitions to edit
    if (transcribedReview) {
      if (!textInput.trim()) {
        setTextInput(transcribedReview)
      } else if (!textInput.includes(transcribedReview)) {
        setTextInput((prev) => `${prev} ${transcribedReview}`)
      }
      setTranscribedReview(null)
    }
    // 3. Switch mode
    setInputMode('text')
    // 4. Focus textarea on next tick
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
  }

  const handleSwitchToVoiceMode = () => {
    // Switch to voice while preserving text, image, and messages
    setInputMode('voice')
  }

  // ── CORE ACTION: SUBMIT QUESTION TO GEMINI AI ─────────────────────────────
  const handleSubmitQuestion = async (queryText?: string, imageOverride?: File | null) => {
    const imgToSend = imageOverride !== undefined ? imageOverride : selectedImage
    const previewToSend =
      imgToSend === selectedImage ? imagePreviewUrl : imgToSend ? URL.createObjectURL(imgToSend) : null
    const rawQuery = (queryText !== undefined ? queryText : textInput).trim()

    if (!rawQuery && !imgToSend) return
    if (isProcessing) return

    setErrorMessage(null)
    setLastFailedQuery(null)
    setTranscribedReview(null)

    const userMsgId = `user-${Date.now()}`
    const botMsgId = `assistant-${Date.now()}`
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const effectiveQuery =
      rawQuery ||
      (imgToSend
        ? 'Please inspect this crop/plant image, diagnose any visible diseases, pests, or nutrient deficiencies, and provide recommendations.'
        : '')

    // Append user message immediately (with image thumbnail if uploaded)
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: rawQuery || '📷 [Attached Plant Image for AI Inspection]',
      imagePreview: previewToSend || undefined,
      timestamp: timeNow,
    }
    setMessages((prev) => [...prev, userMsg])
    setTextInput('')

    // Reset selected image after queuing
    handleRemoveImage()

    setIsProcessing(true)
    setProcessingStatus(imgToSend ? 'Inspecting crop image with Gemini Vision AI...' : 'Analyzing agricultural query...')

    try {
      const formData = new FormData()
      formData.append('message', effectiveQuery)
      formData.append('language', selectedLang)
      formData.append(
        'history',
        JSON.stringify(messages.slice(-6).map((m) => ({ role: m.role, content: m.content })))
      )
      if (imgToSend) {
        formData.append('image', imgToSend)
      }

      const response = await axios.post<{
        status?: string
        reply?: string
        response?: string
        model_used?: string
        language?: string
        sources?: string[]
        notice?: string
        source?: string
      }>(`${API_BASE_URL}/assistant/chat/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 45000,
      })

      const answerContent =
        response.data?.reply ||
        response.data?.response ||
        'I am currently unable to formulate an answer for this query. Please check your question or consult your local agricultural officer.'

      const botMsg: ChatMessage = {
        id: botMsgId,
        role: 'assistant',
        content: answerContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model_used: response.data?.model_used,
        sources: response.data?.sources,
        source: response.data?.source,
        notice: response.data?.notice,
      }
      setMessages((prev) => [...prev, botMsg])

      // If Response Mode is set to Voice, or in Voice Mode, synthesize and play speech
      if (responseMode === 'voice' || inputMode === 'voice') {
        playSpeechForMessage(botMsgId, answerContent)
      }
    } catch (err: unknown) {
      const errorMsg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : 'Unable to reach Agronomy AI services. Please verify the backend is running.'

      setErrorMessage(errorMsg)
      setLastFailedQuery(effectiveQuery)
      const errBotMsg: ChatMessage = {
        id: botMsgId,
        role: 'assistant',
        content: `⚠️ **Diagnostic Error**: ${errorMsg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errBotMsg])
    } finally {
      setIsProcessing(false)
      setProcessingStatus('')
    }
  }

  // ── GNANI PRISMA STT: VOICE RECORDING & TRANSCRIBING ──────────────────────
  const startRecording = async () => {
    try {
      setErrorMessage(null)
      setTranscribedReview(null)

      // Stop any existing audio playback when recording starts
      if (currentAudioRef.current) {
        stopAudio()
      }

      const recorder = new WavAudioRecorder()
      await recorder.start()
      audioRecorderRef.current = recorder

      setIsRecording(true)
      setRecordingSeconds(0)

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            stopRecordingAndTranscribe()
            return 60
          }
          return prev + 1
        })
      }, 1000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied'
      setErrorMessage(`Microphone error: ${msg}. Please allow microphone permissions in your browser.`)
      setIsRecording(false)
    }
  }

  const cancelRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (audioRecorderRef.current) {
      audioRecorderRef.current.cancel()
      audioRecorderRef.current = null
    }
    setIsRecording(false)
    setRecordingSeconds(0)
  }

  const stopRecordingAndTranscribe = async () => {
    if (!audioRecorderRef.current || !isRecording) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setIsRecording(false)
    setIsProcessing(true)
    setProcessingStatus('Encoding 16kHz WAV audio for Gnani Prisma STT...')

    try {
      const wavBlob = await audioRecorderRef.current.stop()
      audioRecorderRef.current = null

      if (wavBlob.size < 1000) {
        setErrorMessage('Recording was too short. Please speak clearly into the microphone.')
        setIsProcessing(false)
        setProcessingStatus('')
        return
      }

      setProcessingStatus('Gnani Prisma is recognizing your speech...')

      const formData = new FormData()
      formData.append('audio', wavBlob, 'farm_voice.wav')
      formData.append('language', selectedLang)

      const res = await axios.post<{
        status: string
        transcript: string
        language: string
      }>(`${API_BASE_URL}/assistant/transcribe/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      })

      const recognizedText = res.data?.transcript?.trim()

      if (!recognizedText) {
        setErrorMessage('Could not recognize any speech. Please try speaking again louder and closer.')
        setIsProcessing(false)
        setProcessingStatus('')
        return
      }

      // CRITICAL REQUIREMENT:
      // DO NOT automatically submit question to Gemini!
      // Store recognized speech for review/editing, and also populate textInput.
      setTranscribedReview(recognizedText)
      setTextInput((prev) => (prev ? `${prev} ${recognizedText}` : recognizedText))

      // If in Text Mode, keep user in Text Mode with input prefilled
      if (inputMode === 'text') {
        setTimeout(() => textareaRef.current?.focus(), 50)
      }
    } catch (err: unknown) {
      const errorMsg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : 'Gnani Speech-to-Text transcription failed. Please check your network connection.'

      setErrorMessage(errorMsg)
    } finally {
      setIsProcessing(false)
      setProcessingStatus('')
    }
  }

  // ── GNANI TIMBRE TTS: SYNTHESIS, PLAYBACK & CONTROLS ─────────────────────
  const playSpeechForMessage = async (msgId: string, text: string) => {
    // If the same audio is currently playing, toggle pause/play
    if (playingMessageId === msgId && currentAudioRef.current) {
      if (isAudioPaused) {
        currentAudioRef.current.play()
        setIsAudioPaused(false)
      } else {
        currentAudioRef.current.pause()
        setIsAudioPaused(true)
      }
      return
    }

    // Stop currently active audio if another message was playing
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }

    // Cache key includes voice and speed to ensure accurate playback
    const cacheKey = `${msgId}_${selectedVoice}_${speechSpeed}`
    const existingUrl = audioUrlsRef.current[cacheKey]
    if (existingUrl) {
      playAudioUrl(existingUrl, msgId)
      return
    }

    // Fetch synthesized audio from Gnani Timbre TTS
    setIsSynthesizingId(msgId)
    try {
      // Strip markdown syntax so synthesis reads naturally
      const cleanText = text
        .replace(/[*_#`~[\]]/g, ' ')
        .replace(/\n+/g, '. ')
        .slice(0, 950)

      const response = await axios.post(
        `${API_BASE_URL}/assistant/speak/`,
        {
          text: cleanText,
          language: selectedLang,
          voice: selectedVoice,
          speed: speechSpeed,
        },
        { responseType: 'blob', timeout: 35000 }
      )

      const audioBlob = new Blob([response.data], { type: 'audio/wav' })
      const audioUrl = URL.createObjectURL(audioBlob)
      audioUrlsRef.current[cacheKey] = audioUrl
      playAudioUrl(audioUrl, msgId)
    } catch {
      setErrorMessage('Audio temporarily unavailable. Written response displayed in conversation.')
    } finally {
      setIsSynthesizingId(null)
    }
  }

  const playAudioUrl = (url: string, msgId: string) => {
    const audio = new Audio(url)
    currentAudioRef.current = audio
    audio.volume = speechVolume
    audio.playbackRate = speechSpeed
    setPlayingMessageId(msgId)
    setIsAudioPaused(false)

    audio.ontimeupdate = () => {
      setAudioProgress({
        current: audio.currentTime,
        duration: audio.duration || 0,
      })
    }

    audio.onended = () => {
      setPlayingMessageId(null)
      setIsAudioPaused(false)
      setAudioProgress({ current: 0, duration: 0 })
      currentAudioRef.current = null
    }

    audio.onerror = () => {
      setPlayingMessageId(null)
      setIsAudioPaused(false)
      currentAudioRef.current = null
    }

    audio.play().catch(() => {
      setPlayingMessageId(null)
      setIsAudioPaused(false)
    })
  }

  const handlePreviewVoice = async () => {
    if (isPreviewingVoice) return
    setIsPreviewingVoice(true)
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }
      const previewText = SAMPLE_GREETINGS[selectedLang] || SAMPLE_GREETINGS.en
      const response = await axios.post(
        `${API_BASE_URL}/assistant/speak/`,
        {
          text: previewText,
          language: selectedLang,
          voice: selectedVoice,
          speed: speechSpeed,
        },
        { responseType: 'blob', timeout: 25000 }
      )
      const audioBlob = new Blob([response.data], { type: 'audio/wav' })
      const audioUrl = URL.createObjectURL(audioBlob)
      const previewAudio = new Audio(audioUrl)
      previewAudio.volume = speechVolume
      previewAudio.playbackRate = speechSpeed
      currentAudioRef.current = previewAudio
      setPlayingMessageId('preview')
      previewAudio.onended = () => {
        setIsPreviewingVoice(false)
        setPlayingMessageId(null)
        URL.revokeObjectURL(audioUrl)
      }
      previewAudio.onerror = () => {
        setIsPreviewingVoice(false)
        setPlayingMessageId(null)
      }
      await previewAudio.play()
    } catch {
      setErrorMessage('Could not preview voice. Please check network connection.')
      setIsPreviewingVoice(false)
    }
  }

  const handleVoiceChange = (newVoice: string) => {
    setSelectedVoice(newVoice)
    if (typeof window !== 'undefined') {
      localStorage.setItem('agronomy_preferred_voice', newVoice)
    }
  }

  const handleSpeedChange = (newSpeed: number) => {
    setSpeechSpeed(newSpeed)
    if (typeof window !== 'undefined') {
      localStorage.setItem('agronomy_speech_speed', newSpeed.toString())
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.playbackRate = newSpeed
    }
  }

  const handleVolumeChange = (newVol: number) => {
    setSpeechVolume(newVol)
    if (currentAudioRef.current) {
      currentAudioRef.current.volume = newVol
    }
  }

  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
      currentAudioRef.current = null
    }
    setPlayingMessageId(null)
    setIsAudioPaused(false)
    setIsPreviewingVoice(false)
    setAudioProgress({ current: 0, duration: 0 })
  }

  const replayAudio = (msgId: string) => {
    const cacheKey = `${msgId}_${selectedVoice}_${speechSpeed}`
    const url = audioUrlsRef.current[cacheKey]
    if (url) {
      stopAudio()
      playAudioUrl(url, msgId)
    }
  }

  const handleCopyMessage = async (msgId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(msgId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback
    }
  }

  const handleClearSession = () => {
    stopAudio()
    if (confirm('Clear conversation history?')) {
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: 'Session refreshed. How can I help you with your agriculture questions today?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      setTranscribedReview(null)
      setTextInput('')
      handleRemoveImage()
    }
  }

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Get available voices for active language with verified acoustic profiles
  const fallbackVoicesByLang: Record<LanguageCode, VoiceOption[]> = {
    en: [
      { language: 'en', voice: 'Avinash', gender: 'Male', label: 'Avinash (Male - Recommended)' },
      { language: 'en', voice: 'Lakshmi', gender: 'Female', label: 'Lakshmi (Female - Recommended)' },
      { language: 'en', voice: 'Shivani', gender: 'Female', label: 'Shivani (Female)' },
      { language: 'en', voice: 'Riyaa', gender: 'Female', label: 'Riyaa (Female)' },
    ],
    te: [
      { language: 'te', voice: 'Lakshmi', gender: 'Female', label: 'Lakshmi (Female - Recommended)' },
      { language: 'te', voice: 'Harshad', gender: 'Male', label: 'Harshad (Male - Recommended)' },
      { language: 'te', voice: 'Riyaa', gender: 'Female', label: 'Riyaa (Female)' },
      { language: 'te', voice: 'Avinash', gender: 'Male', label: 'Avinash (Male)' },
    ],
    hi: [
      { language: 'hi', voice: 'Shivani', gender: 'Female', label: 'Shivani (Female - Recommended)' },
      { language: 'hi', voice: 'Avinash', gender: 'Male', label: 'Avinash (Male - Recommended)' },
      { language: 'hi', voice: 'Riyaa', gender: 'Female', label: 'Riyaa (Female)' },
    ],
  }

  const availableVoices: VoiceOption[] =
    aiStatus?.supported_voices?.filter((v) => v.language === selectedLang) ||
    fallbackVoicesByLang[selectedLang] ||
    fallbackVoicesByLang.en

  // Latest assistant message for voice mode read-along
  const latestAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant')

  return (
    <>
      {/* ── 1. FLOATING ASSISTANT BUTTON (BOTTOM-RIGHT) ─────────────────────── */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[9998] flex items-center gap-2 sm:gap-3 pointer-events-auto">
        {/* Pill Button with "Ask Agronomy AI" and "VOICE & TEXT" */}
        <button
          type="button"
          onClick={() => {
            setIsChatOpen(true)
            setIsMinimized(false)
          }}
          className="cursor-pointer inline-flex items-center gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-white text-[#14532D] text-xs font-bold border border-green-200/90 shadow-xl shadow-green-950/10 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 backdrop-blur-sm select-none group"
          aria-label="Ask Agronomy AI"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse shrink-0" />
          <span className="font-extrabold tracking-tight">Ask Agronomy AI</span>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#166534] border border-green-300/80">
            Voice & Text
          </span>
        </button>

        {/* Large Circular Green Icon Button */}
        <button
          type="button"
          onClick={() => {
            if (isChatOpen && !isMinimized) {
              setIsChatOpen(false)
            } else {
              setIsChatOpen(true)
              setIsMinimized(false)
            }
          }}
          aria-label="Toggle Agronomy AI Assistant"
          className="cursor-pointer relative group w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#14532D] via-[#16A34A] to-[#22C55E] flex items-center justify-center text-white shadow-[0_10px_28px_rgba(22,163,74,0.45)] hover:shadow-[0_12px_36px_rgba(22,163,74,0.65)] hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none ring-4 ring-green-400/25 shrink-0"
        >
          {isChatOpen && !isMinimized ? (
            <svg
              className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <div className="relative flex items-center justify-center pointer-events-none">
              <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                />
              </svg>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white text-[#166534] flex items-center justify-center shadow-sm border border-green-200">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </span>
            </div>
          )}

          {!isChatOpen && (
            <span className="absolute inset-0 rounded-full bg-[#22C55E] opacity-25 animate-ping pointer-events-none" />
          )}
        </button>
      </div>

      {/* ── 2. CONDITIONAL AI ASSISTANT WINDOW ─────────────────────────────── */}
      {isChatOpen && (
        <div
          role="dialog"
          aria-label="Agronomy AI Assistant"
          className={`fixed bottom-[84px] sm:bottom-[94px] right-3 sm:right-6 z-[9999] w-[calc(100vw-24px)] sm:w-[480px] bg-white rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35)] border border-slate-200/90 flex flex-col overflow-hidden transition-all duration-300 ${
            isMinimized ? 'h-[74px]' : 'h-[650px] max-h-[85vh]'
          }`}
        >
          {/* ── HEADER ──────────────────────────────────────────────────────── */}
          <div className="bg-gradient-to-r from-[#14532D] via-[#166534] to-[#15803D] text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm">
                <svg
                  className="w-5 h-5 text-[#A3E635]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              </div>

              <div>
                <h3 className="font-extrabold text-sm sm:text-base leading-tight tracking-tight flex items-center gap-2">
                  <span>Agronomy AI Assistant</span>
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-green-100/90 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      aiStatus?.gnani_stt_ready ? 'bg-[#4ADE80] animate-pulse' : 'bg-emerald-400'
                    }`}
                  />
                  <span>
                    {aiStatus?.gemini_ready
                      ? 'Online (Gemini Multimodal AI)'
                      : aiStatus?.gnani_stt_ready
                      ? 'Online (Gnani Voice Ready)'
                      : 'Online & Ready'}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Controls: Language, Settings, Clear, Minimize, Close */}
            <div className="flex items-center gap-1.5">
              {/* Language Selector */}
              <div className="flex rounded-lg bg-black/25 p-0.5 text-[11px] font-extrabold">
                <button
                  type="button"
                  onClick={() => setSelectedLang('en')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    selectedLang === 'en' ? 'bg-white text-[#14532D]' : 'text-white/80 hover:text-white'
                  }`}
                  title="English"
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLang('te')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    selectedLang === 'te' ? 'bg-white text-[#14532D]' : 'text-white/80 hover:text-white'
                  }`}
                  title="తెలుగు (Telugu)"
                >
                  తె
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLang('hi')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    selectedLang === 'hi' ? 'bg-white text-[#14532D]' : 'text-white/80 hover:text-white'
                  }`}
                  title="हिन्दी (Hindi)"
                >
                  हि
                </button>
              </div>

              {/* Voice Settings Button */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isSettingsOpen
                    ? 'bg-white text-[#14532D]'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                title="Voice & Speech Settings"
                aria-label="Voice Settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Clear Session */}
              <button
                type="button"
                onClick={handleClearSession}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Clear conversation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
                  />
                </svg>
              </button>

              {/* Minimize */}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
                aria-label={isMinimized ? 'Expand' : 'Minimize'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={isMinimized ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
                  />
                </svg>
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Close"
                aria-label="Close chat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* ── VOICE SETTINGS PANEL (COLLAPSIBLE MODAL DRAWER) ─────────── */}
              {isSettingsOpen && (
                <div className="bg-slate-50 border-b border-slate-200 p-3.5 space-y-3 shrink-0 text-xs animate-in slide-in-from-top-2 duration-150 shadow-inner">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span>⚙️ Gnani Timbre Voice Settings</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(false)}
                      className="text-slate-400 hover:text-slate-700 font-bold px-1"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Voice Selector & Preview */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>Spoken Voice ({selectedLang.toUpperCase()}):</span>
                      <span className="text-green-700 font-semibold text-[10px]">Gnani Timbre v3.0</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedVoice}
                        onChange={(e) => handleVoiceChange(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-green-500 focus:outline-none"
                      >
                        {availableVoices.map((v) => (
                          <option key={`${v.language}-${v.voice}`} value={v.voice}>
                            {v.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handlePreviewVoice}
                        disabled={isPreviewingVoice}
                        className="px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors shrink-0"
                      >
                        {isPreviewingVoice ? (
                          <>
                            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Playing...</span>
                          </>
                        ) : (
                          <>
                            <span>🔊</span>
                            <span>Preview</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Speech Speed & Volume */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="text-[11px] font-bold text-slate-600 mb-1">Speech Speed:</div>
                      <div className="flex bg-white rounded-lg p-0.5 border border-slate-200">
                        {[0.9, 1.0, 1.1, 1.2].map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() => handleSpeedChange(spd)}
                            className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${
                              speechSpeed === spd
                                ? 'bg-[#14532D] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-bold text-slate-600 mb-1 flex justify-between">
                        <span>Volume:</span>
                        <span className="text-[#16A34A]">{Math.round(speechVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={speechVolume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#16A34A]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── MODE NAVIGATION TOOLBAR ────────────────────────────────── */}
              <div className="bg-slate-100/90 border-b border-slate-200 px-3.5 py-2 flex items-center justify-between shrink-0 text-xs font-semibold">
                {/* Main Mode Toggle: Text Mode vs Voice Mode */}
                <div className="flex bg-white rounded-full p-0.5 border border-slate-200/90 shadow-xs">
                  <button
                    type="button"
                    onClick={handleSwitchToTextMode}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      inputMode === 'text'
                        ? 'bg-[#16A34A] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>⌨️</span>
                    <span>Text Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSwitchToVoiceMode}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      inputMode === 'voice'
                        ? 'bg-[#16A34A] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🎤</span>
                    <span>Voice Mode</span>
                  </button>
                </div>

                {/* Spoken Response Mode Toggle */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setResponseMode(responseMode === 'text' ? 'voice' : 'text')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1 ${
                      responseMode === 'voice'
                        ? 'bg-[#DCFCE7] text-[#14532D] border-green-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                    }`}
                    title="Toggle automatic spoken response synthesis"
                  >
                    <span>{responseMode === 'voice' ? '🔊 Voice Answer ON' : '📝 Text Answer'}</span>
                  </button>
                </div>
              </div>

              {/* ── AUDIO PLAYBACK DOCK (WHEN AUDIO IS ACTIVELY PLAYING) ───── */}
              {playingMessageId && playingMessageId !== 'preview' && (
                <div className="bg-[#DCFCE7] border-b border-green-200 px-3.5 py-2 flex flex-col gap-1.5 text-xs text-[#14532D]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
                      <span className="font-bold">
                        {isAudioPaused ? 'Audio Paused' : `Playing via Gnani Timbre (${selectedVoice})`}
                      </span>
                      <span className="text-[11px] text-[#166534]">
                        ({formatAudioTime(audioProgress.current)} / {formatAudioTime(audioProgress.duration)})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (currentAudioRef.current) {
                            if (isAudioPaused) {
                              currentAudioRef.current.play()
                              setIsAudioPaused(false)
                            } else {
                              currentAudioRef.current.pause()
                              setIsAudioPaused(true)
                            }
                          }
                        }}
                        className="px-2 py-0.5 rounded-md bg-white text-[#14532D] font-bold shadow-xs hover:bg-slate-50 transition-colors"
                      >
                        {isAudioPaused ? 'Resume' : 'Pause'}
                      </button>
                      <button
                        type="button"
                        onClick={stopAudio}
                        className="px-2 py-0.5 rounded-md bg-red-600 text-white font-bold shadow-xs hover:bg-red-700 transition-colors"
                      >
                        Stop
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ERROR NOTIFICATION BANNER ─────────────────────────────── */}
              {errorMessage && (
                <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700 flex items-center justify-between shrink-0">
                  <span className="font-medium">{errorMessage}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {lastFailedQuery && (
                      <button
                        type="button"
                        onClick={() => handleSubmitQuestion(lastFailedQuery)}
                        className="font-bold px-2 py-0.5 rounded bg-red-200 text-red-900 hover:bg-red-300 transition-colors"
                      >
                        ↻ Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="font-bold text-red-900 hover:underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* ── RENDER MODE 1: DEDICATED VOICE INTERACTION SCREEN ─────── */}
              {/* ============================================================= */}
              {inputMode === 'voice' ? (
                <div className="flex-1 flex flex-col justify-between p-4 bg-gradient-to-b from-[#F7FAF7] to-white overflow-y-auto">
                  {/* Top: Prominent Switch to Text Button */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <button
                      type="button"
                      onClick={handleSwitchToTextMode}
                      className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white text-[#14532D] border border-green-200 font-extrabold text-xs shadow-xs hover:bg-green-50 hover:border-green-300 transition-all active:scale-95"
                    >
                      <span className="text-sm">⌨️</span>
                      <span>Switch to Text</span>
                    </button>

                    <span className="text-[11px] font-bold text-slate-400">
                      Voice: {selectedVoice} ({selectedLang.toUpperCase()})
                    </span>
                  </div>

                  {/* Central Voice Hub with Dynamic States */}
                  <div className="my-auto flex flex-col items-center justify-center py-4 space-y-4 text-center">
                    {/* Attached Photo Preview if Present */}
                    {imagePreviewUrl && (
                      <div className="w-full max-w-xs bg-white border border-green-200 rounded-2xl p-2.5 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <img
                            src={imagePreviewUrl}
                            alt="Crop leaf"
                            className="w-10 h-10 object-cover rounded-xl border border-green-300 shrink-0"
                          />
                          <div className="text-left overflow-hidden">
                            <div className="text-xs font-bold text-slate-800 truncate">
                              {selectedImage?.name || 'Plant image ready'}
                            </div>
                            <div className="text-[10px] text-green-700 font-semibold">
                              🌿 Plant photo attached for voice query
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="p-1 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* STATE 1: PROCESSING / TRANSCRIBING */}
                    {isProcessing ? (
                      <div className="space-y-3 py-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center border-2 border-green-300">
                          <span className="w-8 h-8 border-3 border-[#16A34A] border-t-transparent rounded-full animate-spin" />
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-slate-800">
                            {processingStatus || 'Gnani Prisma is transcribing...'}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">Please wait a moment</div>
                        </div>
                      </div>
                    ) : isRecording ? (
                      /* STATE 2: ACTIVE RECORDING */
                      <div className="space-y-4 w-full max-w-xs">
                        <div className="flex items-center justify-center gap-2 text-red-600 font-extrabold text-sm">
                          <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
                          <span>Listening via Gnani Prisma</span>
                          <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 text-xs font-mono">
                            {formatAudioTime(recordingSeconds)} / 01:00
                          </span>
                        </div>

                        {/* Animated Soundwave */}
                        <div className="flex items-center justify-center gap-1.5 h-12 py-2">
                          {[0.3, 0.7, 1.0, 0.6, 0.9, 0.5, 0.8, 1.0, 0.4, 0.8, 0.5].map((scale, i) => (
                            <span
                              key={i}
                              className="w-1.5 bg-[#16A34A] rounded-full animate-pulse"
                              style={{
                                height: `${scale * 100}%`,
                                animationDuration: `${0.3 + (i % 4) * 0.15}s`,
                              }}
                            />
                          ))}
                        </div>

                        {/* Control buttons during recording */}
                        <div className="flex items-center justify-center gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={stopRecordingAndTranscribe}
                            className="cursor-pointer px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md shadow-red-600/25 active:scale-95 transition-all flex items-center gap-1.5"
                          >
                            <span>⏹️</span>
                            <span>Stop & Transcribe</span>
                          </button>
                          <button
                            type="button"
                            onClick={cancelRecording}
                            className="cursor-pointer px-4 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 active:scale-95 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : transcribedReview ? (
                      /* STATE 3: RECOGNIZED SPEECH REVIEW CARD (CRITICAL USER REQUIREMENT) */
                      <div className="w-full max-w-sm bg-white border-2 border-green-300 rounded-2xl p-4 shadow-sm space-y-3 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-green-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span>✓ Recognized Speech</span>
                          </span>
                          <span className="text-[10px] text-slate-400">Gnani Prisma STT</span>
                        </div>

                        {/* Recognized Text Display */}
                        <div className="p-3 bg-green-50/60 rounded-xl border border-green-200 text-sm font-semibold text-slate-800 leading-relaxed max-h-36 overflow-y-auto">
                          &ldquo;{transcribedReview}&rdquo;
                        </div>

                        {/* Review Action Buttons */}
                        <div className="space-y-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSubmitQuestion(transcribedReview)}
                            className="w-full py-2.5 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <span>🚀</span>
                            <span>Send Question to Gemini AI</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSwitchToTextMode}
                              className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-[#14532D] font-bold text-xs border border-green-200 shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                            >
                              <span>✏️</span>
                              <span>Edit in Text</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setTranscribedReview(null)
                                startRecording()
                              }}
                              className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                            >
                              <span>🔄</span>
                              <span>Record Again</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* STATE 4: IDLE VOICE HUB (TAP MIC TO SPEAK) */
                      <div className="space-y-4">
                        <button
                          type="button"
                          onClick={startRecording}
                          disabled={isProcessing}
                          className="cursor-pointer group relative w-24 h-24 rounded-full bg-gradient-to-tr from-[#14532D] via-[#16A34A] to-[#22C55E] hover:from-[#166534] hover:to-[#16A34A] text-white flex items-center justify-center shadow-xl shadow-green-600/30 hover:scale-105 active:scale-95 transition-all duration-200 ring-8 ring-green-300/30 mx-auto"
                        >
                          <svg
                            className="w-12 h-12 transition-transform group-hover:scale-110"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth="2.2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                            />
                          </svg>
                          <span className="absolute inset-0 rounded-full bg-[#22C55E] opacity-20 animate-ping pointer-events-none" />
                        </button>

                        <div>
                          <div className="font-extrabold text-base text-slate-800">
                            Tap Microphone to Speak
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Powered by Gnani Prisma Speech-to-Text v3.0
                          </div>
                        </div>

                        {/* Optional Plant Photo with Voice */}
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/jpg"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleImageSelect(file)
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:text-[#16A34A] hover:border-green-300 transition-all shadow-2xs"
                          >
                            <span>📷</span>
                            <span>{selectedImage ? 'Change Plant Photo' : 'Attach Plant Photo for Voice Query'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Latest Answer Display / Read-Along Card in Voice Mode */}
                  {latestAssistantMessage && latestAssistantMessage.id !== 'welcome-0' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs text-left max-h-36 overflow-y-auto">
                      <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                        <span>Latest Agronomy AI Response</span>
                        <button
                          type="button"
                          onClick={() => playSpeechForMessage(latestAssistantMessage.id, latestAssistantMessage.content)}
                          className="text-green-700 hover:underline flex items-center gap-1"
                        >
                          <span>🔊 Listen Again</span>
                        </button>
                      </div>
                      <div className="text-xs text-slate-700 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                        {latestAssistantMessage.content}
                      </div>
                    </div>
                  )}

                  {/* Voice Footer Note */}
                  <div className="pt-2 text-center text-[10px] text-slate-400">
                    Supports English, Telugu & Hindi • Never auto-submits unconfirmed speech
                  </div>
                </div>
              ) : (
                /* ============================================================= */
                /* ── RENDER MODE 2: CONVERSATIONAL TEXT MODE SCREEN ─────────── */
                /* ============================================================= */
                <>
                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                            msg.role === 'user'
                              ? 'bg-[#16A34A] text-white rounded-br-xs'
                              : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                          }`}
                        >
                          {/* Attached Plant/Crop Image Thumbnail */}
                          {msg.imagePreview && (
                            <div className="mb-2 rounded-xl overflow-hidden border border-white/30 shadow-xs max-w-[240px]">
                              <img
                                src={msg.imagePreview}
                                alt="Crop leaf inspection"
                                className="w-full max-h-48 object-cover rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                                onClick={() => window.open(msg.imagePreview, '_blank')}
                              />
                            </div>
                          )}

                          <div className="whitespace-pre-wrap">{msg.content}</div>

                          {/* Gemini Multimodal Attribution Badge */}
                          {msg.role === 'assistant' && msg.source === 'google_gemini' && (
                            <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1 text-[10px] text-green-700 font-semibold">
                              <span>✨ Google Gemini Multimodal AI</span>
                              {msg.model_used && (
                                <span className="text-slate-400 font-normal">({msg.model_used})</span>
                              )}
                            </div>
                          )}

                          {/* Botanical notice if present */}
                          {msg.notice && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                              {msg.notice}
                            </div>
                          )}
                        </div>

                        {/* Metadata, Copy & Audio Player Trigger */}
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <span className="text-[10px] text-slate-400">{msg.timestamp}</span>

                          {msg.role === 'assistant' && (
                            <div className="flex items-center gap-1.5">
                              {/* Copy Answer Button */}
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg.id, msg.content)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 shadow-2xs transition-all"
                                title="Copy response"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <span className="text-green-600">✓</span>
                                    <span className="text-green-600">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <span>📋</span>
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>

                              {/* Play / Listen Button */}
                              <button
                                type="button"
                                onClick={() => playSpeechForMessage(msg.id, msg.content)}
                                disabled={isSynthesizingId === msg.id}
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-all ${
                                  playingMessageId === msg.id
                                    ? 'bg-[#DCFCE7] text-[#14532D] ring-1 ring-green-300'
                                    : 'text-slate-600 hover:text-[#16A34A] bg-white border border-slate-200 hover:border-green-300 shadow-2xs'
                                }`}
                              >
                                {isSynthesizingId === msg.id ? (
                                  <>
                                    <span className="inline-block w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                    <span>Synthesizing...</span>
                                  </>
                                ) : playingMessageId === msg.id ? (
                                  <>
                                    <div className="flex items-center gap-0.5 h-3">
                                      <span className="w-0.5 h-3 bg-green-600 animate-pulse" />
                                      <span className="w-0.5 h-2 bg-green-600 animate-pulse" />
                                      <span className="w-0.5 h-3.5 bg-green-600 animate-pulse" />
                                    </div>
                                    <span>{isAudioPaused ? 'Resume' : 'Pause'}</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3.5 h-3.5 text-[#16A34A]" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                                    </svg>
                                    <span>Listen 🔊</span>
                                  </>
                                )}
                              </button>

                              {/* Stop & Replay buttons if active */}
                              {playingMessageId === msg.id && (
                                <>
                                  <button
                                    type="button"
                                    onClick={stopAudio}
                                    className="text-[10px] text-red-600 hover:text-red-800 font-bold px-1.5 py-0.5 rounded-md hover:bg-red-50"
                                    title="Stop playing"
                                  >
                                    Stop
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => replayAudio(msg.id)}
                                    className="text-[10px] text-slate-500 hover:text-slate-800 font-bold px-1.5 py-0.5 rounded-md hover:bg-slate-100"
                                    title="Replay from start"
                                  >
                                    Replay
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* AI Thinking Spinner */}
                    {isProcessing && (
                      <div className="flex items-center gap-2.5 text-slate-600 text-xs py-2.5 px-3.5 bg-white rounded-2xl border border-green-200 max-w-[85%] shadow-xs">
                        <span className="w-4 h-4 border-2 border-[#16A34A] border-t-transparent rounded-full animate-spin shrink-0" />
                        <span className="font-medium">{processingStatus || 'Agronomy AI is thinking...'}</span>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Suggested Questions Pills */}
                  {messages.length <= 2 && (
                    <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                        Suggested:
                      </span>
                      {SUGGESTED_QUESTIONS.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => handleSubmitQuestion(q)}
                          disabled={isProcessing}
                          className="text-[11px] whitespace-nowrap px-3 py-1 rounded-full bg-slate-100 hover:bg-[#DCFCE7] text-slate-700 hover:text-[#166534] font-medium border border-slate-200 transition-colors shrink-0"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* ── TEXT MODE INPUT BAR ─────────────────────────────────── */}
                  <div className="p-3 bg-white border-t border-slate-200">
                    {/* Attached Image Preview Bar */}
                    {imagePreviewUrl && (
                      <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between shadow-2xs animate-in fade-in duration-150">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <img
                            src={imagePreviewUrl}
                            alt="Attached crop leaf"
                            className="w-12 h-12 object-cover rounded-xl border border-green-300 shadow-2xs shrink-0"
                          />
                          <div className="text-left overflow-hidden">
                            <div className="text-xs font-bold text-slate-800 truncate">
                              {selectedImage?.name || 'Plant image ready'}
                            </div>
                            <div className="text-[10px] text-green-700 font-semibold flex items-center gap-1">
                              <span>🌿 Crop image attached</span>
                              {selectedImage && <span>• {(selectedImage.size / (1024 * 1024)).toFixed(2)} MB</span>}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                          title="Remove image"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Hidden File Input for Image Questions */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageSelect(file)
                      }}
                    />

                    {/* Input Form */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleSubmitQuestion(textInput)
                      }}
                      className="flex items-end gap-1.5"
                    >
                      {/* Attachment Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className={`p-2.5 rounded-2xl border transition-all duration-150 shrink-0 ${
                          selectedImage
                            ? 'bg-green-100 text-[#166534] border-green-400 ring-2 ring-green-300'
                            : 'bg-slate-50 text-slate-500 hover:text-[#16A34A] border-slate-200 hover:bg-green-50'
                        }`}
                        title="Attach crop/leaf photo for AI disease diagnosis (JPG, PNG, WEBP <= 10MB)"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                          />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                        </svg>
                      </button>

                      {/* Text Input Area */}
                      <textarea
                        ref={textareaRef}
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSubmitQuestion(textInput)
                          }
                        }}
                        rows={1}
                        disabled={isProcessing}
                        placeholder={
                          selectedImage
                            ? selectedLang === 'te'
                              ? 'ఈ ఫోటో గురించి మీ ప్రశ్న రాయండి...'
                              : selectedLang === 'hi'
                              ? 'इस फोटो के बारे में प्रश्न लिखें...'
                              : 'Ask about this photo, or press send to analyze...'
                            : selectedLang === 'te'
                            ? 'వరికి ఏ ఎరువులు వేయాలి? ఇక్కడ టైప్ చేయండి...'
                            : selectedLang === 'hi'
                            ? 'धान के लिए कौन सी खाद उपयुक्त है? यहाँ लिखें...'
                            : 'Ask an agricultural question or attach a photo...'
                        }
                        className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-[#16A34A] focus:bg-white focus:outline-none text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 resize-none max-h-32 transition-colors"
                      />

                      {/* Microphone Button (Switches to Voice Mode or records) */}
                      <button
                        type="button"
                        onClick={handleSwitchToVoiceMode}
                        disabled={isProcessing}
                        className="p-2.5 rounded-2xl bg-slate-50 hover:bg-green-50 text-slate-600 hover:text-[#16A34A] border border-slate-200 hover:border-green-300 transition-all shrink-0"
                        title="Switch to Voice Mode (Gnani Prisma STT)"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                          />
                        </svg>
                      </button>

                      {/* Send Button */}
                      <button
                        type="submit"
                        disabled={(!textInput.trim() && !selectedImage) || isProcessing}
                        className="p-2.5 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-40 text-white transition-all duration-150 shrink-0 shadow-sm shadow-green-600/30"
                        title={selectedImage ? 'Send image for AI analysis' : 'Send message'}
                      >
                        <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
                        </svg>
                      </button>
                    </form>

                    {/* Footer Disclaimer */}
                    <div className="mt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                      <span>Google Gemini Multimodal AI</span>
                      <span>•</span>
                      <span>Gnani Voice (Prisma STT & Timbre TTS)</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
