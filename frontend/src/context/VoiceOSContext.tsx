'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL, sendVoiceCommand, VOSCommandResponse } from '@/lib/api'
import { WavAudioRecorder } from '@/lib/audioRecorder'
import {
  VOSState,
  VOSIntent,
  PageAction,
  WorkflowState,
  DEFAULT_VOICE_BY_LANGUAGE,
  VOICE_FEEDBACK_MSGS,
} from '@/lib/voiceOS'
import { getNavigationRoute } from '@/lib/navigationRegistry'
import {
  createWorkflow,
  getWorkflowPrompt,
  advanceWorkflowWithInput,
} from '@/lib/conversationWorkflows'

export type VoiceOSButtonState = 'idle' | 'listening' | 'understanding' | 'executing' | 'speaking' | 'error'

interface VoiceOSContextType {
  state: VOSState
  buttonState: VoiceOSButtonState
  isVoiceOSActive: boolean
  isListening: boolean
  isSpeaking: boolean
  isOpen: boolean
  language: 'en' | 'te' | 'hi'
  voice: string
  transcript: string
  lastSpoken: string
  subtitle: string | null
  feedbackMessage: string | null
  activeWorkflow: WorkflowState | null
  registeredActions: PageAction[]
  pendingConfirmation: {
    actionId: string
    title: string
    spokenPrompt: string
    onConfirm: () => void
    onCancel: () => void
  } | null

  // Controls
  toggleVoiceOS: () => Promise<void>
  stopVoiceOS: () => void
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
  startListening: () => Promise<void>
  stopListening: () => Promise<void>
  cancelListening: () => void
  processTextCommand: (text: string) => Promise<void>
  speak: (text: string, lang?: 'en' | 'te' | 'hi', voice?: string) => Promise<void>
  stopSpeaking: () => void
  setLanguage: (lang: 'en' | 'te' | 'hi') => void
  setVoice: (voice: string) => void
  registerAction: (action: PageAction) => void
  unregisterAction: (actionId: string) => void
  executeAction: (actionId: string, params?: Record<string, any>) => Promise<boolean>
  readCurrentPage: () => void
  startWorkflow: (type: 'crop_recommendation' | 'disease_scan', initialData?: Record<string, any>) => void
  cancelWorkflow: () => void
  confirmPendingAction: () => void
  cancelPendingAction: () => void
}

const VoiceOSContext = createContext<VoiceOSContextType | null>(null)

export function VoiceOSProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [state, setState] = useState<VOSState>('idle')
  const [buttonState, setButtonState] = useState<VoiceOSButtonState>('idle')
  const [isVoiceOSActive, setIsVoiceOSActive] = useState(false)
  const isVoiceOSActiveRef = useRef(false)

  const [isOpen, setIsOpen] = useState(false)
  const [language, setLanguageState] = useState<'en' | 'te' | 'hi'>('en')
  const [voice, setVoiceState] = useState<string>('Avinash')
  const [transcript, setTranscript] = useState('')
  const [lastSpoken, setLastSpoken] = useState('')
  const lastSpokenRef = useRef('')
  const [subtitle, setSubtitle] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowState | null>(null)
  const [registeredActions, setRegisteredActions] = useState<PageAction[]>([])
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    actionId: string
    title: string
    spokenPrompt: string
    onConfirm: () => void
    onCancel: () => void
  } | null>(null)

  // Multi-turn conversation session history for contextual reasoning
  const sessionHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([])

  // Single shared recorder and player references
  const audioRecorderRef = useRef<WavAudioRecorder | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const isExecutingRef = useRef(false)
  const subtitleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const actionsMapRef = useRef<Map<string, PageAction>>(new Map())

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('agronomy_vos_language') as 'en' | 'te' | 'hi'
      if (savedLang && ['en', 'te', 'hi'].includes(savedLang)) {
        setLanguageState(savedLang)
        setVoiceState(DEFAULT_VOICE_BY_LANGUAGE[savedLang] || 'Avinash')
      }
      const savedVoice = localStorage.getItem('agronomy_preferred_voice')
      if (savedVoice) {
        setVoiceState(savedVoice)
      }
    }
  }, [])

  const setLanguage = useCallback((newLang: 'en' | 'te' | 'hi') => {
    setLanguageState(newLang)
    const recVoice = DEFAULT_VOICE_BY_LANGUAGE[newLang] || 'Avinash'
    setVoiceState(recVoice)
    if (typeof window !== 'undefined') {
      localStorage.setItem('agronomy_vos_language', newLang)
      localStorage.setItem('agronomy_preferred_voice', recVoice)
    }
  }, [])

  const setVoice = useCallback((newVoice: string) => {
    setVoiceState(newVoice)
    if (typeof window !== 'undefined') {
      localStorage.setItem('agronomy_preferred_voice', newVoice)
    }
  }, [])

  // Show minimal temporary subtitle
  const showSubtitle = useCallback((msg: string, durationMs = 4000) => {
    if (subtitleTimeoutRef.current) {
      clearTimeout(subtitleTimeoutRef.current)
    }
    setSubtitle(msg)
    subtitleTimeoutRef.current = setTimeout(() => {
      setSubtitle(null)
      subtitleTimeoutRef.current = null
    }, durationMs)
  }, [])

  // Show temporary toast feedback message
  const showFeedback = useCallback((msg: string, durationMs = 4000) => {
    setFeedbackMessage(msg)
    showSubtitle(msg, durationMs)
    setTimeout(() => {
      setFeedbackMessage((curr) => (curr === msg ? null : curr))
    }, durationMs)
  }, [showSubtitle])

  // Universal TTS synthesizer and player
  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
      currentAudioRef.current = null
    }
    setState((curr) => (curr === 'speaking' ? 'idle' : curr))
  }, [])

  useEffect(() => {
    const handleStop = () => stopSpeaking()
    if (typeof window !== 'undefined') {
      window.addEventListener('vos-stop-audio', handleStop)
      return () => window.removeEventListener('vos-stop-audio', handleStop)
    }
  }, [stopSpeaking])

  // Forward declarations for mutual references in loop
  const startListeningRef = useRef<() => Promise<void>>()
  const stopListeningRef = useRef<() => Promise<void>>()

  const speak = useCallback(
    async (text: string, targetLang?: 'en' | 'te' | 'hi', targetVoice?: string) => {
      const cleanText = (text || '').trim()
      if (!cleanText) return

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vos-stop-audio'))
      }
      stopSpeaking()
      setState('speaking')
      setButtonState('speaking')
      setLastSpoken(cleanText)
      lastSpokenRef.current = cleanText
      showSubtitle(`🔊 ${cleanText}`, 5000)

      const useLang = targetLang || language
      const useVoice = targetVoice || voice || DEFAULT_VOICE_BY_LANGUAGE[useLang]

      try {
        const response = await axios.post(
          `${API_BASE_URL}/assistant/speak/`,
          {
            text: cleanText,
            language: useLang === 'te' ? 'te-IN' : useLang === 'hi' ? 'hi-IN' : 'en-IN',
            voice: useVoice,
            speed: 1.0,
          },
          { responseType: 'blob', timeout: 20000 }
        )

        const audioBlob = response.data
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        currentAudioRef.current = audio

        const onAudioFinish = () => {
          URL.revokeObjectURL(audioUrl)
          currentAudioRef.current = null

          // AUTOMATIC CONTINUOUS LOOP: If Voice OS is active, immediately return to listening!
          if (isVoiceOSActiveRef.current) {
            setTimeout(() => {
              if (isVoiceOSActiveRef.current && startListeningRef.current) {
                startListeningRef.current()
              }
            }, 350)
          } else {
            setState('idle')
            setButtonState('idle')
          }
        }

        audio.onended = onAudioFinish
        audio.onerror = onAudioFinish

        await audio.play()
      } catch (err) {
        console.warn('[VOS TTS] Speech synthesis notice, falling back to browser synthesis:', err)
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            const utter = new SpeechSynthesisUtterance(cleanText)
            utter.lang = useLang === 'te' ? 'te-IN' : useLang === 'hi' ? 'hi-IN' : 'en-US'
            utter.onend = () => {
              if (isVoiceOSActiveRef.current) {
                setTimeout(() => {
                  if (isVoiceOSActiveRef.current && startListeningRef.current) {
                    startListeningRef.current()
                  }
                }, 350)
              } else {
                setState('idle')
                setButtonState('idle')
              }
            }
            utter.onerror = () => {
              if (isVoiceOSActiveRef.current) {
                setTimeout(() => {
                  if (isVoiceOSActiveRef.current && startListeningRef.current) {
                    startListeningRef.current()
                  }
                }, 350)
              } else {
                setState('idle')
                setButtonState('idle')
              }
            }
            window.speechSynthesis.speak(utter)
            return
          } catch (synthErr) {
            console.warn('[VOS Fallback Synth Failed]', synthErr)
          }
        }

        if (isVoiceOSActiveRef.current) {
          setTimeout(() => {
            if (isVoiceOSActiveRef.current && startListeningRef.current) {
              startListeningRef.current()
            }
          }, 400)
        } else {
          setState('idle')
          setButtonState('idle')
        }
      }
    },
    [language, voice, stopSpeaking, showSubtitle]
  )

  // Action Registry Handlers (Stabilized to prevent re-render storms)
  const registerAction = useCallback((action: PageAction) => {
    actionsMapRef.current.set(action.id, action)
    setRegisteredActions((prev) => {
      const existing = prev.find((a) => a.id === action.id)
      if (existing && existing.handler === action.handler && existing.name === action.name) {
        return prev
      }
      const filtered = prev.filter((a) => a.id !== action.id)
      return [...filtered, action]
    })
  }, [])

  const unregisterAction = useCallback((actionId: string) => {
    actionsMapRef.current.delete(actionId)
    setRegisteredActions((prev) => {
      if (!prev.some((a) => a.id === actionId)) return prev
      return prev.filter((a) => a.id !== actionId)
    })
  }, [])

  const executeAction = useCallback(
    async (actionId: string, params?: Record<string, any>): Promise<boolean> => {
      // Direct custom browser event bridge for immediate camera & scanning triggers
      if (typeof window !== 'undefined') {
        if (actionId === 'open_back_camera') {
          window.dispatchEvent(new CustomEvent('vos-open-camera', { detail: { facing: 'environment' } }))
        } else if (actionId === 'open_front_camera') {
          window.dispatchEvent(new CustomEvent('vos-open-camera', { detail: { facing: 'user' } }))
        } else if (actionId === 'open_camera') {
          window.dispatchEvent(new CustomEvent('vos-open-camera', { detail: { facing: params?.camera || 'environment' } }))
        } else if (actionId === 'open_gallery') {
          window.dispatchEvent(new CustomEvent('vos-open-gallery'))
        } else if (actionId === 'capture_plant_photo' || actionId === 'take_photo') {
          window.dispatchEvent(new CustomEvent('vos-take-photo'))
        } else if (actionId === 'submit_scan') {
          window.dispatchEvent(new CustomEvent('vos-analyze'))
        } else if (actionId === 'retake_photo') {
          window.dispatchEvent(new CustomEvent('vos-retake'))
        }
      }

      // Check actionsMapRef or wait for page mount
      let action = actionsMapRef.current.get(actionId) || registeredActions.find((a) => a.id === actionId)
      if (!action) {
        for (let i = 0; i < 4; i++) {
          await new Promise((r) => setTimeout(r, 100))
          action = actionsMapRef.current.get(actionId) || registeredActions.find((a) => a.id === actionId)
          if (action) break
        }
      }

      if (!action) {
        console.warn(`[VOS] Action "${actionId}" not found in registry (custom event dispatched).`)
        return false
      }

      const actionName = action.name || action.label || action.id
      const requiresConf = action.requiresConfirmation || action.requires_confirmation

      // Check confirmation requirement
      if (requiresConf) {
        const prompt =
          language === 'te'
            ? `మీరు ఖచ్చితంగా ${actionName} చేయాలనుకుంటున్నారా? నిర్ధారించడానికి అవును లేదా వద్దు అని చెప్పండి.`
            : language === 'hi'
            ? `क्या आप वाकई ${actionName} करना चाहते हैं? पुष्टि के लिए हाँ या नहीं कहें।`
            : `Are you sure you want to execute ${actionName}? Say yes to confirm or no to cancel.`

        setPendingConfirmation({
          actionId: action.id,
          title: actionName,
          spokenPrompt: prompt,
          onConfirm: () => {
            setPendingConfirmation(null)
            if (action.handler) action.handler(params)
            else if (action.execute) action.execute(params)
            showFeedback(`Executed: ${actionName}`)
          },
          onCancel: () => {
            setPendingConfirmation(null)
            speak(
              language === 'te' ? 'రద్దు చేయబడింది.' : language === 'hi' ? 'रद्द किया गया।' : 'Action cancelled.'
            )
          },
        })

        await speak(prompt)
        return true
      }

      try {
        setState('executing')
        setButtonState('executing')
        if (action.handler) await action.handler(params)
        else if (action.execute) await action.execute(params)
        showFeedback(`✓ ${actionName}`)
        return true
      } catch (err) {
        console.error(`[VOS] Action execution failed for "${actionId}":`, err)
        setState('error')
        setButtonState('error')
        showFeedback(`Failed to execute: ${actionName}`)
        return false
      }
    },
    [registeredActions, language, speak, showFeedback]
  )

  const confirmPendingAction = useCallback(() => {
    if (pendingConfirmation) {
      pendingConfirmation.onConfirm()
    }
  }, [pendingConfirmation])

  const cancelPendingAction = useCallback(() => {
    if (pendingConfirmation) {
      pendingConfirmation.onCancel()
    }
  }, [pendingConfirmation])

  // Universal Page Reader
  const readCurrentPage = useCallback(() => {
    const route = getNavigationRoute(pathname)
    const title = route?.label || 'Agronomy AI'

    let summary = ''
    if (pathname === '/scanning') {
      summary =
        language === 'te'
          ? 'ఇది పంట రోగాల స్కాన్ పేజీ. మీరు కెమెరాతో ఫోటో తీయవచ్చు లేదా గ్యాలరీ నుండి అప్‌లోడ్ చేయవచ్చు.'
          : language === 'hi'
          ? 'यह फसल रोग स्कैनिंग पेज है। आप कैमरे से फ़ोटो ले सकते हैं या गैलरी से अपलोड कर सकते हैं।'
          : 'This is the Plant Disease Scanning page. You can take a leaf photo with camera or upload from gallery.'
    } else if (pathname === '/crop-recommendation') {
      summary =
        language === 'te'
          ? 'ఇది పంట సిఫార్సుల పేజీ. మీ నేల నత్రజని, భాస్వరం, పొటాషియం మరియు వాతావరణ వివరాలను ఇవ్వండి.'
          : language === 'hi'
          ? 'यह फसल सिफारिश पेज है। अपनी मिट्टी के पोषक तत्व और मौसम की जानकारी दर्ज करें।'
          : 'This is the Crop Recommendation page. Enter your soil N, P, K, pH, and climate parameters for tailored crop advice.'
    } else if (pathname === '/weather') {
      summary =
        language === 'te'
          ? 'ఇది వ్యవసాయ వాతావరణ పేజీ. మీ గ్రామం లేదా పట్టణాన్ని శోధించండి.'
          : language === 'hi'
          ? 'यह कृषि मौसम पेज है। अपने गाँव या शहर का मौसम देखें।'
          : 'This is the Weather and Farming Insights page. You can search any village, town or locality.'
    } else {
      summary =
        language === 'te'
          ? `${title} పేజీ తెరవబడింది. నేను మీకు ఏ సహాయం చేయగలను?`
          : language === 'hi'
          ? `${title} पेज खुला है। मैं आपकी क्या मदद करूँ?`
          : `You are on the ${title} page. How can I assist you?`
    }

    speak(summary)
  }, [pathname, language, speak])

  // Multi-Turn Workflow Management
  const startWorkflow = useCallback(
    (type: 'crop_recommendation' | 'disease_scan', initialData: Record<string, any> = {}) => {
      const wf = createWorkflow(type, initialData)
      if (!wf) return
      setActiveWorkflow(wf)

      const prompt = getWorkflowPrompt(wf, language)
      if (prompt) {
        speak(prompt)
      }
    },
    [language, speak]
  )

  const cancelWorkflow = useCallback(() => {
    setActiveWorkflow(null)
    speak(
      language === 'te'
        ? 'ప్రక్రియ రద్దు చేయబడింది.'
        : language === 'hi'
        ? 'प्रक्रिया रद्द कर दी गई।'
        : 'Workflow cancelled.'
    )
  }, [language, speak])

  // Stop Voice OS Session completely
  const stopVoiceOS = useCallback(() => {
    isVoiceOSActiveRef.current = false
    setIsVoiceOSActive(false)
    stopSpeaking()
    if (audioRecorderRef.current) {
      audioRecorderRef.current.cancel()
      audioRecorderRef.current = null
    }
    setState('idle')
    setButtonState('idle')
    sessionHistoryRef.current = []
    setSubtitle(null)
  }, [stopSpeaking])

  // Command Processing Engine
  const processTextCommand = useCallback(
    async (commandText: string) => {
      const cleanCmd = (commandText || '').trim()
      if (!cleanCmd || isExecutingRef.current) return

      isExecutingRef.current = true
      console.log(`[VOS Pipeline] User command received: "${cleanCmd}" | Path: ${pathname} | Lang: ${language}`)
      setTranscript(cleanCmd)
      showSubtitle(`You: "${cleanCmd}"`, 4000)
      setState('understanding')
      setButtonState('understanding')

      try {
        const lowerCmd = cleanCmd.toLowerCase()

        // ─────────────────────────────────────────────────────────────
        // 1. Check for Stop Voice OS command
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd.includes('stop voice os') ||
          lowerCmd.includes('exit voice os') ||
          lowerCmd.includes('turn off voice os') ||
          lowerCmd.includes('close voice os') ||
          lowerCmd.includes('stop vos') ||
          lowerCmd.includes('వాయిస్ ఆపు') ||
          lowerCmd.includes('వాయిస్ ఓఎస్ ఆపు') ||
          lowerCmd.includes('वॉयस बंद करो') ||
          lowerCmd.includes('वॉयस ओएस बंद करो')
        ) {
          console.log('[VOS Action] Stopping Voice OS session completely')
          const stopResp =
            language === 'te'
              ? 'వాయిస్ ఓఎస్ ఆపివేయబడింది.'
              : language === 'hi'
              ? 'वॉयस ओएस बंद कर दिया गया है।'
              : 'Voice OS stopped.'
          showFeedback('Voice OS Stopped')
          stopVoiceOS()
          speak(stopResp)
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 1b. Stop Speaking / Silence
        // ─────────────────────────────────────────────────────────────
        if (
          ['stop speaking', 'be quiet', 'silence', 'pause', 'shut up', 'ఆపు', 'వద్దు', 'रुको', 'चुप रहो'].some(
            (w) => lowerCmd === w || lowerCmd.startsWith(w)
          )
        ) {
          console.log('[VOS Action] Silencing active audio output')
          stopSpeaking()
          setState('listening')
          setButtonState('listening')
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 2. Check if user is answering a pending confirmation
        // ─────────────────────────────────────────────────────────────
        if (pendingConfirmation) {
          if (
            ['yes', 'confirm', 'proceed', 'okay', 'sure', 'అవును', 'సరే', 'హా', 'हाँ', 'पुष्टि'].some((w) =>
              lowerCmd.includes(w)
            )
          ) {
            console.log('[VOS Action] Confirmed pending action:', pendingConfirmation.title)
            confirmPendingAction()
            isExecutingRef.current = false
            return
          }
          if (
            ['no', 'cancel', 'stop', 'abort', 'వద్దు', 'రద్దు', 'नहीं', 'रद्द'].some((w) =>
              lowerCmd.includes(w)
            )
          ) {
            console.log('[VOS Action] Cancelled pending action:', pendingConfirmation.title)
            cancelPendingAction()
            isExecutingRef.current = false
            return
          }
        }

        // ─────────────────────────────────────────────────────────────
        // 3. Check if active multi-turn workflow handles input
        // ─────────────────────────────────────────────────────────────
        if (activeWorkflow && activeWorkflow.status === 'in_progress') {
          const wfResult = advanceWorkflowWithInput(activeWorkflow, cleanCmd, language)
          if (wfResult.handled) {
            console.log('[VOS Action] Workflow step advanced:', wfResult)
            setActiveWorkflow(wfResult.updatedWorkflow)
            if (wfResult.nextPrompt) {
              speak(wfResult.nextPrompt)
            }
            if (wfResult.actionToExecute) {
              setButtonState('executing')
              await executeAction(
                wfResult.actionToExecute.actionId,
                wfResult.actionToExecute.params
              )
            }
            isExecutingRef.current = false
            return
          }
        }

        // ─────────────────────────────────────────────────────────────
        // 4. FAST-PATH: Scroll Commands (Direct Browser Execution)
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd.includes('scroll down') ||
          lowerCmd.includes('scroll bottom') ||
          lowerCmd.includes('move down') ||
          lowerCmd.includes('page down') ||
          lowerCmd.includes('క్రిందికి స్క్రోల్') ||
          lowerCmd.includes('नीचे स्क्रॉल')
        ) {
          console.log('[VOS FastPath] Executing Scroll Down')
          setButtonState('executing')
          window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' })
          showFeedback('✓ Scrolled Down')
          const resp =
            language === 'te'
              ? 'క్రిందికి స్క్రోల్ చేయబడింది.'
              : language === 'hi'
              ? 'नीचे स्क्रॉल किया गया।'
              : 'Scrolled down.'
          speak(resp)
          isExecutingRef.current = false
          return
        }

        if (
          lowerCmd.includes('scroll up') ||
          lowerCmd.includes('scroll top') ||
          lowerCmd.includes('move up') ||
          lowerCmd.includes('page up') ||
          lowerCmd.includes('పైకి స్క్రోల్') ||
          lowerCmd.includes('ऊपर स्क्रॉल')
        ) {
          console.log('[VOS FastPath] Executing Scroll Up')
          setButtonState('executing')
          window.scrollBy({ top: -window.innerHeight * 0.75, behavior: 'smooth' })
          showFeedback('✓ Scrolled Up')
          const resp =
            language === 'te'
              ? 'పైకి స్క్రోల్ చేయబడింది.'
              : language === 'hi'
              ? 'ऊपर स्क्रॉल किया गया।'
              : 'Scrolled up.'
          speak(resp)
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 5. FAST-PATH: Navigation Go Back / History
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd === 'go back' ||
          lowerCmd === 'back' ||
          lowerCmd.includes('previous page') ||
          lowerCmd.includes('take me back') ||
          lowerCmd.includes('వెనక్కి') ||
          lowerCmd.includes('వెనుకకు') ||
          lowerCmd.includes('पीछे जाओ') ||
          lowerCmd.includes('वापस जाओ')
        ) {
          console.log('[VOS FastPath] Executing Browser Go Back')
          setButtonState('executing')
          showFeedback('✓ Going Back')
          const resp =
            language === 'te'
              ? 'వెనుక పేజీకి వెళ్తున్నాను.'
              : language === 'hi'
              ? 'पिछले पेज पर जा रहे हैं।'
              : 'Going back.'
          speak(resp)
          router.back()
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 5b. FAST-PATH: Repeat That / Repeat
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd === 'repeat that' ||
          lowerCmd === 'repeat' ||
          lowerCmd === 'say that again' ||
          lowerCmd === 'say again' ||
          lowerCmd.includes('మళ్ళీ చెప్పు') ||
          lowerCmd.includes('फिर से कहो') ||
          lowerCmd.includes('दोहराओ')
        ) {
          console.log('[VOS FastPath] Repeating last spoken response')
          setButtonState('executing')
          const prevResp =
            lastSpokenRef.current ||
            (language === 'te'
              ? 'పునరావృతం చేయడానికి ముందు సమాధానం లేదు.'
              : language === 'hi'
              ? 'दोहराने के लिए कोई पिछला उत्तर नहीं है।'
              : 'There is no previous response to repeat.')
          speak(prevResp)
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 6. FAST-PATH: Read Current Page
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd.includes('read this page') ||
          lowerCmd.includes('read page') ||
          lowerCmd.includes('summarize page') ||
          lowerCmd.includes('what is on this page') ||
          lowerCmd.includes('ఈ పేజీ చదువు') ||
          lowerCmd.includes('यह पेज पढ़ो')
        ) {
          console.log('[VOS FastPath] Reading Current Page')
          setButtonState('executing')
          showFeedback('📖 Reading Page')
          readCurrentPage()
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 7a. FAST-PATH: Multi-Turn Disease Scanner Initiation ("Scan my plant")
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd === 'scan my plant' ||
          lowerCmd === 'scan plant' ||
          lowerCmd === 'scan the plant' ||
          lowerCmd === 'check my plant' ||
          lowerCmd.includes('నా మొక్కను స్కాన్') ||
          lowerCmd.includes('మొక్కను స్కాన్ చేయి') ||
          lowerCmd.includes('पौधे को स्कैन')
        ) {
          console.log('[VOS FastPath] Scan My Plant -> Initiating Disease Scan Workflow')
          setButtonState('executing')
          if (pathname !== '/scanning') {
            router.push('/scanning')
          }
          startWorkflow('disease_scan')
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 7b. FAST-PATH: "Take a photo" (Camera Facing Choice Prompt)
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd === 'take a photo' ||
          lowerCmd === 'take photo' ||
          lowerCmd === 'take picture' ||
          lowerCmd === 'open camera' ||
          lowerCmd === 'use camera' ||
          lowerCmd === 'ఫోటో తీయి' ||
          lowerCmd === 'కెమెరా తెరువు' ||
          lowerCmd === 'फोटो खींचो' ||
          lowerCmd === 'कैमरा खोलो'
        ) {
          console.log('[VOS FastPath] Take a photo -> Prompting Camera Facing')
          setButtonState('executing')
          if (pathname !== '/scanning') {
            router.push('/scanning')
          }
          const wf = createWorkflow('disease_scan')
          if (wf) {
            wf.currentStep = 1
            wf.currentStepIndex = 1
            wf.collectedData = { source: 'camera' }
            setActiveWorkflow(wf)
          }
          const prompt =
            language === 'te'
              ? 'మీరు ముందు కెమెరా లేదా వెనుక కెమెరా ఉపయోగించాలనుకుంటున్నారా?'
              : language === 'hi'
              ? 'क्या आप फ्रंट कैमरा या बैक कैमरा का उपयोग करना चाहते हैं?'
              : 'Would you like to use the front camera or back camera?'
          speak(prompt)
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 7c. FAST-PATH: Camera Selection ("Back camera" vs "Front camera")
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd.includes('back camera') ||
          lowerCmd.includes('rear camera') ||
          lowerCmd === 'back' ||
          lowerCmd === 'rear' ||
          lowerCmd.includes('వెనుక కెమెరా') ||
          lowerCmd.includes('బ్యాక్ కెమెరా') ||
          lowerCmd.includes('బ్యాక్') ||
          lowerCmd.includes('बैक कैमरा') ||
          lowerCmd.includes('बैक')
        ) {
          console.log('[VOS FastPath] Opening Rear Camera')
          setButtonState('executing')
          if (pathname !== '/scanning') {
            router.push('/scanning')
          }
          window.dispatchEvent(new CustomEvent('vos-open-camera', { detail: { facingMode: 'environment' } }))
          const resp =
            language === 'te'
              ? 'వెనుక కెమెరా తెరవబడింది. ఫోటో తీయడానికి క్యాప్చర్ అని చెప్పండి.'
              : language === 'hi'
              ? 'बैक कैमरा खुला है। फोटो खींचने के लिए कैप्चर कहें।'
              : 'Opening rear camera. Say capture to take the photo.'
          speak(resp)
          showFeedback('📷 Rear Camera Active')
          if (activeWorkflow && activeWorkflow.type === 'disease_scan') {
            setActiveWorkflow({
              ...activeWorkflow,
              currentStep: 2,
              currentStepIndex: 2,
              collectedData: { ...activeWorkflow.collectedData, cameraFacing: 'environment' },
            })
          }
          isExecutingRef.current = false
          return
        }

        if (
          lowerCmd.includes('front camera') ||
          lowerCmd.includes('selfie camera') ||
          lowerCmd === 'front' ||
          lowerCmd.includes('ముందు కెమెరా') ||
          lowerCmd.includes('ఫ్రంట్ కెమెరా') ||
          lowerCmd.includes('ఫ్రంట్') ||
          lowerCmd.includes('फ्रंट कैमरा') ||
          lowerCmd.includes('फ्रंट')
        ) {
          console.log('[VOS FastPath] Opening Front Camera')
          setButtonState('executing')
          if (pathname !== '/scanning') {
            router.push('/scanning')
          }
          window.dispatchEvent(new CustomEvent('vos-open-camera', { detail: { facingMode: 'user' } }))
          const resp =
            language === 'te'
              ? 'ముందు కెమెరా తెరవబడింది. ఫోటో తీయడానికి క్యాప్చర్ అని చెప్పండి.'
              : language === 'hi'
              ? 'फ्रंट कैमरा खुला है। फोटो खींचने के लिए कैप्चर कहें।'
              : 'Opening front camera. Say capture to take the photo.'
          speak(resp)
          showFeedback('📷 Front Camera Active')
          if (activeWorkflow && activeWorkflow.type === 'disease_scan') {
            setActiveWorkflow({
              ...activeWorkflow,
              currentStep: 2,
              currentStepIndex: 2,
              collectedData: { ...activeWorkflow.collectedData, cameraFacing: 'user' },
            })
          }
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 7d. FAST-PATH: Image Capture ("Capture")
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd === 'capture' ||
          lowerCmd === 'snap' ||
          lowerCmd === 'click' ||
          lowerCmd.includes('capture photo') ||
          lowerCmd.includes('capture image') ||
          lowerCmd.includes('క్యాప్చర్') ||
          lowerCmd.includes('कैप्चर')
        ) {
          console.log('[VOS FastPath] Capturing Camera Frame')
          setButtonState('executing')
          window.dispatchEvent(new CustomEvent('vos-take-photo'))
          showFeedback('📸 Photo Captured')
          const prompt =
            language === 'te'
              ? 'మీ మొక్క ఫోటో సిద్ధంగా ఉంది. విశ్లేషించమంటారా?'
              : language === 'hi'
              ? 'आपकी पौधे की फोटो तैयार है। क्या मैं इसका विश्लेषण करूँ?'
              : 'Your plant photo is ready. Should I analyze it?'
          speak(prompt)
          if (activeWorkflow && activeWorkflow.type === 'disease_scan') {
            setActiveWorkflow({
              ...activeWorkflow,
              currentStep: 3,
              currentStepIndex: 3,
              collectedData: { ...activeWorkflow.collectedData, captured: true },
            })
          }
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 7e. FAST-PATH: Analyze Image / Submit Scan
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd.includes('analyze this image') ||
          lowerCmd.includes('analyze image') ||
          lowerCmd.includes('analyze it') ||
          lowerCmd === 'analyze' ||
          lowerCmd.includes('విశ్లేషించు') ||
          lowerCmd.includes('తనిఖీ చేయి') ||
          lowerCmd.includes('विश्लेषण') ||
          (activeWorkflow?.type === 'disease_scan' &&
            (lowerCmd === 'yes' ||
              lowerCmd === 'proceed' ||
              lowerCmd === 'confirm' ||
              lowerCmd === 'అవును' ||
              lowerCmd === 'సరే' ||
              lowerCmd === 'హా' ||
              lowerCmd === 'हाँ'))
        ) {
          console.log('[VOS FastPath] Submitting Plant Disease Scan')
          setButtonState('executing')
          window.dispatchEvent(new CustomEvent('vos-analyze'))
          showFeedback('🔬 Analyzing Plant Leaf...')
          const resp =
            language === 'te'
              ? 'మొక్క తెగులును విశ్లేషిస్తున్నాను.'
              : language === 'hi'
              ? 'पौधे की बीमारी का विश्लेषण कर रहे हैं।'
              : 'Analyzing plant leaf image for diseases.'
          speak(resp)
          setActiveWorkflow(null)
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 7f. FAST-PATH: Retake Photo
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd === 'retake' ||
          lowerCmd === 'retake photo' ||
          lowerCmd.includes('మళ్ళీ తీయి') ||
          lowerCmd.includes('మళ్ళీ') ||
          lowerCmd.includes('फिर से खींचो') ||
          lowerCmd.includes('दोबारा खींचो')
        ) {
          console.log('[VOS FastPath] Retaking Camera Photo')
          setButtonState('executing')
          window.dispatchEvent(new CustomEvent('vos-retake'))
          showFeedback('📷 Returning to Camera')
          const resp =
            language === 'te'
              ? 'కెమెరా ప్రివ్యూకి తిరిగి వెళ్తున్నాను. ఫోటో తీయడానికి క్యాప్చర్ అని చెప్పండి.'
              : language === 'hi'
              ? 'कैमरा पूर्वावलोकन पर वापस जा रहे हैं। फोटो खींचने के लिए कैप्चर कहें।'
              : 'Returning to camera preview. Say capture to take the photo.'
          speak(resp)
          if (activeWorkflow && activeWorkflow.type === 'disease_scan') {
            setActiveWorkflow({
              ...activeWorkflow,
              currentStep: 2,
              currentStepIndex: 2,
            })
          }
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 7g. FAST-PATH: Explain Treatment & Diagnosis Results
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd.includes('how to treat') ||
          lowerCmd.includes('treatment') ||
          lowerCmd.includes('cure') ||
          lowerCmd.includes('నివారణ') ||
          lowerCmd.includes('చికిత్స') ||
          lowerCmd.includes('ఉపశమనం') ||
          lowerCmd.includes('उपचार') ||
          lowerCmd.includes('इलाज')
        ) {
          console.log('[VOS FastPath] Explaining Disease Treatment')
          setButtonState('executing')
          const treatAction = registeredActions.find((a) => a.id === 'explain_treatment')
          if (treatAction && treatAction.handler) {
            treatAction.handler()
          } else {
            window.dispatchEvent(new CustomEvent('vos-explain-treatment'))
          }
          isExecutingRef.current = false
          return
        }

        if (
          lowerCmd.includes('show the disease result') ||
          lowerCmd.includes('show disease result') ||
          lowerCmd.includes('disease result') ||
          lowerCmd.includes('read result') ||
          lowerCmd.includes('ఫలితం చూపు') ||
          lowerCmd.includes('పరిణామం చెప్పు') ||
          lowerCmd.includes('परिणाम दिखाओ')
        ) {
          console.log('[VOS FastPath] Reading Disease Result')
          setButtonState('executing')
          const resAction = registeredActions.find((a) => a.id === 'read_result')
          if (resAction && resAction.handler) {
            resAction.handler()
          } else {
            window.dispatchEvent(new CustomEvent('vos-read-result'))
          }
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 7h. FAST-PATH: Gallery Upload
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd.includes('upload from gallery') ||
          lowerCmd.includes('choose from gallery') ||
          lowerCmd.includes('open gallery') ||
          lowerCmd.includes('upload picture') ||
          lowerCmd.includes('upload photo') ||
          lowerCmd.includes('upload another image') ||
          lowerCmd.includes('గ్యాలరీ తెరువు') ||
          lowerCmd.includes('గ్యాలరీ') ||
          lowerCmd.includes('गैलरी खोलो') ||
          lowerCmd.includes('फ़ोटो अपलोड')
        ) {
          console.log('[VOS FastPath] Gallery Action Triggered')
          setButtonState('executing')
          const resp =
            language === 'te'
              ? 'గ్యాలరీ ఓపెన్ చేస్తున్నాను.'
              : language === 'hi'
              ? 'गैलरी खोल रहा हूँ।'
              : 'Opening gallery to select a leaf picture.'

          if (pathname === '/scanning') {
            window.dispatchEvent(new CustomEvent('vos-open-gallery'))
            showFeedback('📁 Gallery Picker Open')
          } else {
            router.push('/scanning?action=gallery')
            showFeedback('Navigating to Disease Scanner...')
          }
          speak(resp)
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 8. FAST-PATH: Search Actions (e.g. "search for rice", "find tomato")
        // ─────────────────────────────────────────────────────────────
        const searchPattern = /(?:search for|search|find|look up|గురించి వెతుకు|శోధించు|खोजो|ढूंढो)\s+([a-zA-Z0-9\s]+)/i
        const searchMatch = cleanCmd.match(searchPattern)
        if (searchMatch && searchMatch[1]) {
          const rawQuery = searchMatch[1].trim().replace(/^(?:for|the|a|an|about)\s+/i, '')
          if (rawQuery.length >= 2) {
            console.log(`[VOS FastPath] Search detected: "${rawQuery}" on page: ${pathname}`)
            setButtonState('executing')
            const resp =
              language === 'te'
                ? `${rawQuery} కోసం శోధిస్తున్నాను.`
                : language === 'hi'
                ? `${rawQuery} के लिए खोज रहे हैं।`
                : `Searching for ${rawQuery}.`

            if (pathname === '/crops') {
              const matchedSearchAction = registeredActions.find((a) => a.id === 'search_crops' || a.intent === 'SEARCH')
              if (matchedSearchAction && matchedSearchAction.handler) {
                matchedSearchAction.handler({ query: rawQuery })
              }
              showFeedback(`🔍 Search: ${rawQuery}`)
            } else if (pathname === '/weather') {
              const matchedWeatherSearch = registeredActions.find((a) => a.id === 'search_weather' || a.intent === 'SEARCH')
              if (matchedWeatherSearch && matchedWeatherSearch.handler) {
                matchedWeatherSearch.handler({ query: rawQuery })
              }
              showFeedback(`🔍 Weather: ${rawQuery}`)
            } else if (pathname === '/diseases') {
              const matchedDisAction = registeredActions.find((a) => a.id === 'search_diseases' || a.intent === 'SEARCH')
              if (matchedDisAction && matchedDisAction.handler) {
                matchedDisAction.handler({ query: rawQuery })
              }
              showFeedback(`🔍 Diseases: ${rawQuery}`)
            } else {
              router.push(`/crops?search=${encodeURIComponent(rawQuery)}`)
              showFeedback(`Navigating to Crop Guides for "${rawQuery}"...`)
            }
            speak(resp)
            isExecutingRef.current = false
            return
          }
        }

        // ─────────────────────────────────────────────────────────────
        // 9. FAST-PATH: Soil Parameter Form Filling (e.g. "fill nitrogen as 80")
        // ─────────────────────────────────────────────────────────────
        const fieldPattern = /(?:fill|set|enter|put|my)?\s*(nitrogen|phosphorus|potassium|temperature|humidity|ph|rainfall|నత్రజని|భాస్వరం|పొటాషియం|ఉష్ణోగ్రత|తేమ|పీహెచ్|వర్షపాతం|नाइट्रोजन|फास्फोरस|पोटेशियम|तापमान|नमी|पीएच|वर्षा)\s*(?:as|to|is|value|=)?\s*([0-9]+(?:\.[0-9]+)?)/i
        const fieldMatch = cleanCmd.match(fieldPattern)
        if (fieldMatch && fieldMatch[1] && fieldMatch[2]) {
          const rawField = fieldMatch[1].toLowerCase()
          const val = fieldMatch[2]
          const fieldMap: Record<string, string> = {
            nitrogen: 'nitrogen', నత్రజని: 'nitrogen', नाइट्रोजन: 'nitrogen',
            phosphorus: 'phosphorus', భాస్వరం: 'phosphorus', फास्फोरस: 'phosphorus',
            potassium: 'potassium', పొటాషియం: 'potassium', पोटेशियम: 'potassium',
            temperature: 'temperature', ఉష్ణోగ్రత: 'temperature', तापमान: 'temperature',
            humidity: 'humidity', తేమ: 'humidity', नमी: 'humidity',
            ph: 'ph', పీహెచ్: 'ph', पीएच: 'ph',
            rainfall: 'rainfall', వర్షపాతం: 'rainfall', वर्षा: 'rainfall',
          }
          const stdField = fieldMap[rawField] || rawField
          console.log(`[VOS FastPath] Form field matched: ${stdField} = ${val}`)
          setButtonState('executing')

          const fieldAction = registeredActions.find((a) => a.id === 'fill_crop_field' || a.intent === 'FILL_FIELD')
          if (fieldAction && fieldAction.handler) {
            fieldAction.handler({ field: stdField, value: val })
            showFeedback(`✓ ${stdField.toUpperCase()} = ${val}`)
          }

          const resp =
            language === 'te'
              ? `${stdField} విలువ ${val} గా నమోదు చేయబడింది.`
              : language === 'hi'
              ? `${stdField} का मान ${val} सेट किया गया।`
              : `${stdField.charAt(0).toUpperCase() + stdField.slice(1)} set to ${val}.`
          speak(resp)
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 10a. FAST-PATH: Recommend a Crop for My Soil (Start Workflow)
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd === 'recommend a crop for my soil' ||
          lowerCmd === 'recommend a crop' ||
          lowerCmd === 'recommend crop' ||
          lowerCmd === 'recommend crops' ||
          lowerCmd.includes('crop for my soil') ||
          lowerCmd.includes('నా నేలకు పంట') ||
          lowerCmd.includes('పంట సిఫార్సు చేయి') ||
          lowerCmd.includes('मेरी मिट्टी के लिए फसल') ||
          lowerCmd.includes('फसल सिफारिश करो')
        ) {
          console.log('[VOS FastPath] Recommend Crop -> Starting Crop Recommendation Workflow')
          setButtonState('executing')
          if (pathname !== '/crop-recommendation') {
            router.push('/crop-recommendation')
          }
          startWorkflow('crop_recommendation')
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 10b. FAST-PATH: Submit Crop Recommendation Form
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd.includes('submit and recommend') ||
          lowerCmd.includes('submit crop form') ||
          lowerCmd.includes('submit form') ||
          lowerCmd.includes('find best crops') ||
          lowerCmd.includes('పంటలను లెక్కించు') ||
          lowerCmd.includes('ఫసల్ సిఫారిష్ కరో') ||
          lowerCmd.includes('फसलें बताओ')
        ) {
          console.log('[VOS FastPath] Submitting Crop Recommendation Form')
          setButtonState('executing')
          const submitAction = registeredActions.find(
            (a) =>
              a.id === 'submit_crop_form' ||
              (pathname === '/crop-recommendation' && a.intent === 'SUBMIT_FORM')
          )

          if (submitAction && submitAction.handler) {
            submitAction.handler()
            showFeedback('Predicting Optimal Crops...')
          } else if (pathname !== '/crop-recommendation') {
            router.push('/crop-recommendation')
            showFeedback('Opening Crop Recommender...')
          }

          const resp =
            language === 'te'
              ? 'మీ నేల పరిస్థితులకు ఉత్తమ పంటలను సిఫార్సు చేస్తున్నాను.'
              : language === 'hi'
              ? 'आपकी मिट्टी की स्थिति के लिए सर्वोत्तम फसलों की सिफारिश कर रहे हैं।'
              : 'Recommending best crops for your soil.'
          speak(resp)
          setActiveWorkflow(null)
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 10c. FAST-PATH: Explain Recommended Crops
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd.includes('explain the recommended crops') ||
          lowerCmd.includes('explain recommended crops') ||
          lowerCmd.includes('explain crops') ||
          lowerCmd.includes('పంటలను వివరించు') ||
          lowerCmd.includes('సిఫార్సు పంటల వివరణ') ||
          lowerCmd.includes('फसलों के बारे में समझाओ')
        ) {
          console.log('[VOS FastPath] Explaining Recommended Crops')
          setButtonState('executing')
          const expAction = registeredActions.find((a) => a.id === 'explain_recommended_crops')
          if (expAction && expAction.handler) {
            expAction.handler()
          } else {
            const fallback =
              language === 'te'
                ? 'సిఫార్సు చేయబడిన పంటలు మీ నేల మరియు వాతావరణ పరిస్థితులకు అత్యంత అనుకూలమైనవి.'
                : language === 'hi'
                ? 'सिफारिश की गई फसलें आपकी मिट्टी और मौसम की स्थिति के लिए सबसे उपयुक्त हैं।'
                : 'The recommended crops are selected based on your soil NPK, pH, and climate data.'
            speak(fallback)
          }
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 10d. FAST-PATH: Show Crop Information / How to Grow Crop
        // ─────────────────────────────────────────────────────────────
        const cropInfoPattern = /(?:show|explain|tell me about|how to grow|guide for)\s+([a-zA-Z]+)(?:\s+information|\s+guide|\s+details)?/i
        const cropInfoMatch = cleanCmd.match(cropInfoPattern)
        if (cropInfoMatch && cropInfoMatch[1]) {
          const cropName = cropInfoMatch[1].trim().toLowerCase()
          if (!['my', 'the', 'this', 'a', 'page', 'fertilizer', 'disease', 'result'].includes(cropName)) {
            console.log(`[VOS FastPath] Crop info detected: "${cropName}"`)
            setButtonState('executing')
            const cropAction = registeredActions.find((a) => a.id === 'show_crop_info')
            if (cropAction && cropAction.handler) {
              cropAction.handler({ crop: cropName })
              isExecutingRef.current = false
              return
            } else if (pathname !== '/crops') {
              router.push(`/crops?search=${encodeURIComponent(cropName)}`)
              showFeedback(`Opening crop guide for ${cropName}...`)
              speak(`Opening cultivation guide for ${cropName}.`)
              isExecutingRef.current = false
              return
            }
          }
        }

        // ─────────────────────────────────────────────────────────────
        // 10e. FAST-PATH: Read Dashboard & Statistics
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd.includes('read my dashboard') ||
          lowerCmd.includes('read dashboard') ||
          lowerCmd.includes('show my statistics') ||
          lowerCmd.includes('show statistics') ||
          lowerCmd.includes('నా గణాంకాలు') ||
          lowerCmd.includes('డాష్‌బోర్డ్ చదువు') ||
          lowerCmd.includes('मेरे आंकड़े') ||
          lowerCmd.includes('डैशबोर्ड पढ़ो')
        ) {
          console.log('[VOS FastPath] Reading Dashboard Statistics')
          setButtonState('executing')
          if (pathname !== '/dashboard') {
            router.push('/dashboard')
          }
          const dashAction = registeredActions.find((a) => a.id === 'read_dashboard')
          if (dashAction && dashAction.handler) {
            dashAction.handler()
          } else {
            readCurrentPage()
          }
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 10f. FAST-PATH: Read History / Previous Scans & Recommendations
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd.includes('previous scans') ||
          lowerCmd.includes('my scans') ||
          lowerCmd.includes('past scans') ||
          lowerCmd.includes('scan history') ||
          lowerCmd.includes('show my crop recommendations') ||
          lowerCmd.includes('మునుపటి స్కాన్లు') ||
          lowerCmd.includes('చరిత్ర చూపు') ||
          lowerCmd.includes('पुराने स्कैन') ||
          lowerCmd.includes('इतिहास दिखाओ')
        ) {
          console.log('[VOS FastPath] Reading History')
          setButtonState('executing')
          if (pathname !== '/history') {
            router.push('/history')
          }
          const histAction = registeredActions.find((a) => a.id === 'read_history')
          if (histAction && histAction.handler) {
            histAction.handler()
          } else {
            const resp =
              language === 'te'
                ? 'మీ మునుపటి వ్యాధి స్కాన్లు మరియు పంట సిఫార్సుల చరిత్ర పేజీని చూపిస్తున్నాను.'
                : language === 'hi'
                ? 'आपके पिछले स्कैन और फसल सिफारिशों का इतिहास दिखाया जा रहा है।'
                : 'Displaying your previous disease scans and crop recommendation history.'
            speak(resp)
          }
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 10g. FAST-PATH: Fertilizer Guides & Search
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd.includes('explain fertilizer recommendations') ||
          lowerCmd.includes('explain fertilizer') ||
          lowerCmd.includes('fertilizer recommendations') ||
          lowerCmd.includes('ఎరువుల వివరాలు') ||
          lowerCmd.includes('उर्वरक सलाह')
        ) {
          console.log('[VOS FastPath] Reading Fertilizer Guide')
          setButtonState('executing')
          if (pathname !== '/fertilizer') {
            router.push('/fertilizer')
          }
          const fertAction = registeredActions.find((a) => a.id === 'read_fertilizer_guide')
          if (fertAction && fertAction.handler) {
            fertAction.handler()
          } else {
            readCurrentPage()
          }
          isExecutingRef.current = false
          return
        }

        if (
          lowerCmd.includes('search for nitrogen fertilizer') ||
          lowerCmd.includes('search fertilizer') ||
          lowerCmd.includes('nitrogen fertilizer')
        ) {
          console.log('[VOS FastPath] Searching Fertilizer')
          setButtonState('executing')
          if (pathname !== '/fertilizer') {
            router.push('/fertilizer')
          }
          const fertSearchAction = registeredActions.find((a) => a.id === 'search_fertilizer')
          if (fertSearchAction && fertSearchAction.handler) {
            fertSearchAction.handler({ query: 'nitrogen' })
          } else {
            showFeedback('Searching Fertilizer Guide...')
            speak('Searching fertilizer recommendations for nitrogen.')
          }
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 10h. FAST-PATH: Help / How to Use
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd.includes('how to use this website') ||
          lowerCmd.includes('how to use website') ||
          lowerCmd.includes('how to use') ||
          lowerCmd.includes('help me use') ||
          lowerCmd.includes('ఈ వెబ్‌సైట్ ఎలా ఉపయోగించాలి') ||
          lowerCmd.includes('సహాయం') ||
          lowerCmd.includes('इस वेबसाइट का उपयोग कैसे करें') ||
          lowerCmd.includes('मदद')
        ) {
          console.log('[VOS FastPath] Reading How to Use')
          setButtonState('executing')
          if (pathname !== '/how-to-use') {
            router.push('/how-to-use')
          }
          const helpAction = registeredActions.find((a) => a.id === 'read_how_to_use')
          if (helpAction && helpAction.handler) {
            helpAction.handler()
          } else {
            readCurrentPage()
          }
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 10i. FAST-PATH: Overview / Home
        // ─────────────────────────────────────────────────────────────
        if (
          lowerCmd.includes('show my overview') ||
          lowerCmd.includes('show overview') ||
          lowerCmd.includes('overview')
        ) {
          console.log('[VOS FastPath] Showing Home Overview')
          setButtonState('executing')
          if (pathname !== '/') {
            router.push('/')
          }
          const ovAction = registeredActions.find((a) => a.id === 'show_overview')
          if (ovAction && ovAction.handler) {
            ovAction.handler()
          } else {
            speak(
              language === 'te'
                ? 'అగ్రోనమీ AI హోమ్‌పేజీ మరియు ఫీచర్ల సారాంశం చూపిస్తున్నాను.'
                : language === 'hi'
                ? 'एग्रोनॉमी एआई का होमपेज और मुख्य विशेषताएं दिखाई जा रही हैं।'
                : 'Displaying Agronomy AI overview with Disease Scanner, Crop Recommender, and Cultivation Guides.'
            )
          }
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 11. FAST-PATH: All Website Navigation Routes
        // ─────────────────────────────────────────────────────────────
        const navRoute = getNavigationRoute(cleanCmd)
        if (navRoute) {
          console.log(`[VOS FastPath] Navigation route matched: ${navRoute.path} (${navRoute.label})`)
          setButtonState('executing')
          showFeedback(`✓ Navigating to ${navRoute.label}`)
          const resp =
            language === 'te'
              ? `${navRoute.label} పేజీకి వెళ్తున్నాను.`
              : language === 'hi'
              ? `${navRoute.label} पेज पर जा रहे हैं।`
              : `Navigating to ${navRoute.label}.`

          if (pathname !== navRoute.path) {
            router.push(navRoute.path)
          }
          speak(resp)
          isExecutingRef.current = false
          return
        }

        // ─────────────────────────────────────────────────────────────
        // 12. BACKEND VOS CLASSIFIER (Google Gemini Multimodal API)
        // ─────────────────────────────────────────────────────────────
        sessionHistoryRef.current.push({ role: 'user', content: cleanCmd })
        if (sessionHistoryRef.current.length > 8) {
          sessionHistoryRef.current = sessionHistoryRef.current.slice(-8)
        }

        console.log('[VOS Backend Dispatch] Sending command to backend classifier:', cleanCmd)
        const response: VOSCommandResponse = await sendVoiceCommand({
          command: cleanCmd,
          current_page: pathname,
          available_actions: registeredActions.map((a) => ({
            id: a.id,
            name: a.name || a.label || a.id,
            description: a.description,
          })),
          active_workflow: activeWorkflow,
          history: sessionHistoryRef.current,
          language: language,
        })

        console.log('[VOS Backend Response]', response)
        const { intent, target, parameters, spoken_response } = response

        if (spoken_response) {
          sessionHistoryRef.current.push({ role: 'assistant', content: spoken_response })
        }

        // Handle Stop Voice OS
        if (intent === 'STOP_VOICE_OS') {
          stopVoiceOS()
          speak(spoken_response || 'Voice OS stopped.')
          isExecutingRef.current = false
          return
        }

        // Handle Language Switch
        if (intent === 'CHANGE_LANGUAGE') {
          const newLang = (parameters?.language || 'en') as 'en' | 'te' | 'hi'
          setLanguage(newLang)
          speak(spoken_response || 'Language updated.', newLang)
          isExecutingRef.current = false
          return
        }

        // Handle Stop Speaking
        if (intent === 'STOP_SPEAKING') {
          stopSpeaking()
          isExecutingRef.current = false
          return
        }

        // Handle Scroll Intent from Backend
        if (intent === 'SCROLL') {
          setButtonState('executing')
          const dir = parameters?.direction || (target.includes('up') ? 'up' : 'down')
          if (dir === 'up') window.scrollBy({ top: -window.innerHeight * 0.75, behavior: 'smooth' })
          else window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' })
          showFeedback(dir === 'up' ? '✓ Scrolled Up' : '✓ Scrolled Down')
          speak(spoken_response || (dir === 'up' ? 'Scrolled up.' : 'Scrolled down.'))
          isExecutingRef.current = false
          return
        }

        // Handle Navigation Back from Backend
        if (intent === 'GO_BACK') {
          setButtonState('executing')
          showFeedback('✓ Going Back')
          speak(spoken_response || 'Going back.')
          router.back()
          isExecutingRef.current = false
          return
        }

        // Handle Navigation Intent from Backend
        if (intent === 'NAVIGATE' && target) {
          setButtonState('executing')
          let destPath = target
          if (!destPath.startsWith('/')) {
            const resolved = getNavigationRoute(destPath)
            destPath = resolved ? resolved.path : `/${destPath}`
          }

          if (pathname !== destPath) {
            router.push(destPath)
            showFeedback(`Navigating to ${destPath}`)
          }
          speak(spoken_response || `Navigating to ${destPath}`)
          isExecutingRef.current = false
          return
        }

        // Handle Page Reader Intent from Backend
        if (intent === 'READ_PAGE') {
          readCurrentPage()
          isExecutingRef.current = false
          return
        }

        // Handle Camera & Gallery Intents from Backend
        if (intent === 'OPEN_CAMERA' || intent === 'TAKE_PHOTO') {
          setButtonState('executing')
          if (pathname === '/scanning') {
            window.dispatchEvent(new CustomEvent('vos-open-camera'))
          } else {
            router.push('/scanning?action=camera')
          }
          speak(spoken_response || 'Opening camera.')
          isExecutingRef.current = false
          return
        }

        if (intent === 'OPEN_GALLERY') {
          setButtonState('executing')
          if (pathname === '/scanning') {
            window.dispatchEvent(new CustomEvent('vos-open-gallery'))
          } else {
            router.push('/scanning?action=gallery')
          }
          speak(spoken_response || 'Opening gallery.')
          isExecutingRef.current = false
          return
        }

        // Handle Search Intent from Backend
        if (intent === 'SEARCH' && parameters?.query) {
          setButtonState('executing')
          const q = parameters.query
          if (pathname === '/crops') {
            const matchedSearchAction = registeredActions.find((a) => a.id === 'search_crops' || a.intent === 'SEARCH')
            if (matchedSearchAction && matchedSearchAction.handler) matchedSearchAction.handler({ query: q })
          } else {
            router.push(`/crops?search=${encodeURIComponent(q)}`)
          }
          speak(spoken_response || `Searching for ${q}.`)
          isExecutingRef.current = false
          return
        }

        // Handle Form Parameter Filling from Backend
        if (intent === 'FILL_FIELD' && parameters) {
          setButtonState('executing')
          const fillAction = registeredActions.find((a) => a.id === 'fill_crop_field' || a.intent === 'FILL_FIELD')
          if (fillAction && fillAction.handler) {
            fillAction.handler(parameters)
          }
          speak(spoken_response || 'Form parameter updated.')
          isExecutingRef.current = false
          return
        }

        // Check structured action from backend response first
        const actionNameFromBackend = response.action || target
        if (actionNameFromBackend) {
          const directMatch = registeredActions.find(
            (a) => a.id.toLowerCase() === actionNameFromBackend.toLowerCase()
          )
          if (directMatch) {
            console.log(`[VOS Backend Dispatch] Executing direct matched action: ${directMatch.id}`)
            setButtonState('executing')
            await executeAction(directMatch.id, parameters)
            if (spoken_response) {
              speak(spoken_response)
            }
            isExecutingRef.current = false
            return
          }
        }

        // Handle Matched Registered Action
        const matchedAction = registeredActions.find(
          (a) =>
            a.id.toLowerCase() === target.toLowerCase() ||
            (intent !== 'SUBMIT_FORM' && a.intent === intent) ||
            a.id.toLowerCase().includes(target.toLowerCase())
        )

        if (matchedAction) {
          console.log(`[VOS Action Registry] Executing matched action: ${matchedAction.id}`)
          setButtonState('executing')
          await executeAction(matchedAction.id, parameters)
          if (spoken_response) {
            speak(spoken_response)
          }
          isExecutingRef.current = false
          return
        }

        // Handle Multi-Turn Workflow Start Triggers
        if (intent === 'START_WORKFLOW' || target === 'crop_workflow' || cleanCmd.toLowerCase().includes('guide me')) {
          startWorkflow('crop_recommendation')
          isExecutingRef.current = false
          return
        }

        // Fallback: Informational / Agricultural / General Conversation
        console.log('[VOS Fallback] Speaking informational response:', spoken_response)
        if (spoken_response) {
          speak(spoken_response)
        } else {
          const fallback =
            language === 'te'
              ? 'మీ ప్రశ్న అర్థమైంది. నేను మీకు సహాయం చేయడానికి సిద్ధంగా ఉన్నాను.'
              : language === 'hi'
              ? 'मुझे आपका अनुरोध समझ आ गया। मैं आपकी सहायता कर रहा हूँ।'
              : "I've processed your request."
          speak(fallback)
        }
      } catch (err) {
        console.error('[VOS] Command processing error:', err)
        setState('error')
        setButtonState('error')
        const errMsg =
          language === 'te'
            ? 'క్షమించండి, ఆదేశాన్ని ప్రాసెస్ చేయడంలో లోపం సంభవించింది.'
            : language === 'hi'
            ? 'क्षमा करें, आदेश को संसाधित करने में त्रुटि हुई।'
            : 'Sorry, there was an issue processing your voice command.'
        speak(errMsg)
      } finally {
        isExecutingRef.current = false
      }
    },
    [
      pathname,
      language,
      registeredActions,
      pendingConfirmation,
      activeWorkflow,
      router,
      speak,
      stopSpeaking,
      executeAction,
      confirmPendingAction,
      cancelPendingAction,
      readCurrentPage,
      setLanguage,
      showFeedback,
      showSubtitle,
      startWorkflow,
      stopVoiceOS,
    ]
  )

  // Single Shared Microphone Recording Flow
  const startListening = useCallback(async () => {
    if (state === 'transcribing') return

    // Stop ongoing speech before recording
    stopSpeaking()

    try {
      const recorder = new WavAudioRecorder()
      audioRecorderRef.current = recorder
      setState('listening')
      setButtonState('listening')
      showSubtitle(VOICE_FEEDBACK_MSGS.LISTENING[language] || 'Listening...', 3000)

      // Start recording with speech silence detector: auto-stops when user finishes speaking!
      await recorder.start({
        silenceTimeoutMs: 1600,
        maxDurationMs: 14000,
        onSpeechEnd: () => {
          if (stopListeningRef.current) {
            stopListeningRef.current()
          }
        },
      })
    } catch (err) {
      console.error('[VOS] Microphone access error:', err)
      setState('permission_denied')
      setButtonState('error')
      const prompt =
        language === 'te'
          ? 'దయచేసి మైక్రోఫోన్ అనుమతిని ఆమోదించండి.'
          : language === 'hi'
          ? 'कृपया माइक्रोफ़ोन अनुमति स्वीकार करें।'
          : 'Please allow microphone access to use voice controls.'
      showFeedback(prompt, 6000)
    }
  }, [state, language, stopSpeaking, showSubtitle, showFeedback])

  const stopListening = useCallback(async () => {
    if (!audioRecorderRef.current || state !== 'listening') return

    setState('transcribing')
    setButtonState('understanding')
    showSubtitle(VOICE_FEEDBACK_MSGS.THINKING[language] || 'Understanding...', 3000)

    try {
      const audioBlob = await audioRecorderRef.current.stop()
      audioRecorderRef.current = null

      if (!audioBlob || audioBlob.size < 800) {
        if (isVoiceOSActiveRef.current) {
          // If no sound captured but session active, quietly resume listening
          setTimeout(() => {
            if (isVoiceOSActiveRef.current && startListeningRef.current) {
              startListeningRef.current()
            }
          }, 300)
        } else {
          setState('idle')
          setButtonState('idle')
        }
        return
      }

      // Send to Gnani Prisma STT Endpoint
      const formData = new FormData()
      formData.append('audio_file', audioBlob, 'vos_command.wav')
      formData.append('language_code', language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'indic-auto')

      const response = await axios.post(`${API_BASE_URL}/assistant/transcribe/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 25000,
      })

      const transcribed = response.data?.transcription || response.data?.text || ''
      if (transcribed.trim()) {
        await processTextCommand(transcribed)
      } else {
        if (isVoiceOSActiveRef.current) {
          // Resume listening
          setTimeout(() => {
            if (isVoiceOSActiveRef.current && startListeningRef.current) {
              startListeningRef.current()
            }
          }, 400)
        } else {
          setState('idle')
          setButtonState('idle')
        }
      }
    } catch (err) {
      console.error('[VOS STT] Transcription failed:', err)
      setState('error')
      setButtonState('error')
      if (isVoiceOSActiveRef.current) {
        setTimeout(() => {
          if (isVoiceOSActiveRef.current && startListeningRef.current) {
            startListeningRef.current()
          }
        }, 1000)
      } else {
        setState('idle')
        setButtonState('idle')
      }
    }
  }, [state, language, showSubtitle, processTextCommand])

  // Connect mutual refs
  useEffect(() => {
    startListeningRef.current = startListening
    stopListeningRef.current = stopListening
  }, [startListening, stopListening])

  const cancelListening = useCallback(() => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.cancel()
      audioRecorderRef.current = null
    }
    setState('idle')
    setButtonState('idle')
  }, [])

  // Toggle Voice OS Activation: Starts continuous one-to-one conversation or stops it completely
  const toggleVoiceOS = useCallback(async () => {
    if (isVoiceOSActiveRef.current) {
      // User clicked to stop Voice OS
      stopVoiceOS()
    } else {
      // User clicked to start Voice OS
      isVoiceOSActiveRef.current = true
      setIsVoiceOSActive(true)
      sessionHistoryRef.current = []
      await startListening()
    }
  }, [stopVoiceOS, startListening])

  const openPanel = useCallback(() => setIsOpen(true), [])
  const closePanel = useCallback(() => setIsOpen(false), [])
  const togglePanel = useCallback(() => toggleVoiceOS(), [toggleVoiceOS])

  return (
    <VoiceOSContext.Provider
      value={{
        state,
        buttonState,
        isVoiceOSActive,
        isListening: state === 'listening',
        isSpeaking: state === 'speaking',
        isOpen,
        language,
        voice,
        transcript,
        lastSpoken,
        subtitle,
        feedbackMessage,
        activeWorkflow,
        registeredActions,
        pendingConfirmation,
        toggleVoiceOS,
        stopVoiceOS,
        openPanel,
        closePanel,
        togglePanel,
        startListening,
        stopListening,
        cancelListening,
        processTextCommand,
        speak,
        stopSpeaking,
        setLanguage,
        setVoice,
        registerAction,
        unregisterAction,
        executeAction,
        readCurrentPage,
        startWorkflow,
        cancelWorkflow,
        confirmPendingAction,
        cancelPendingAction,
      }}
    >
      {children}
    </VoiceOSContext.Provider>
  )
}

export function useVoiceOS() {
  const context = useContext(VoiceOSContext)
  if (!context) {
    throw new Error('useVoiceOS must be used within a VoiceOSProvider')
  }
  return context
}
