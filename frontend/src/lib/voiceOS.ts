/**
 * Agronomy AI — Voice Operating System (VOS)
 * Core Types, Constants & Intent Definitions
 */

// ── Voice OS States ───────────────────────────────────────────────────────────

export type VOSState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'understanding'
  | 'executing'
  | 'speaking'
  | 'waiting'
  | 'error'
  | 'permission_denied'

// ── Intent Types (Allowlisted — Gemini cannot create new ones) ────────────────

export type VOSIntent =
  | 'NAVIGATE'
  | 'CLICK_ELEMENT'
  | 'FILL_FIELD'
  | 'SELECT_OPTION'
  | 'SEARCH'
  | 'SUBMIT_FORM'
  | 'CLEAR_FORM'
  | 'SCROLL'
  | 'READ_PAGE'
  | 'READ_RESULT'
  | 'READ_SECTION'
  | 'EXPLAIN_CONTENT'
  | 'READ_OPTIONS'
  | 'REPEAT_LAST'
  | 'STOP_SPEAKING'
  | 'STOP_VOICE_OS'
  | 'CHANGE_LANGUAGE'
  | 'OPEN_CAMERA'
  | 'OPEN_GALLERY'
  | 'TAKE_PHOTO'
  | 'CAPTURE_IMAGE'
  | 'RETAKE_PHOTO'
  | 'CONFIRM_ACTION'
  | 'CANCEL_ACTION'
  | 'GO_BACK'
  | 'OPEN_ASSISTANT'
  | 'START_WORKFLOW'
  | 'HELP'
  | 'AGRICULTURAL_QUESTION'
  | 'FOLLOW_UP'
  | 'GENERAL_CONVERSATION'
  | 'UNKNOWN'

// ── Command Classification Categories ────────────────────────────────────────

export type CommandCategory =
  | 'website_action'      // navigation, clicking, form filling
  | 'agricultural_question' // crop disease, fertilizer, farming advice
  | 'follow_up'           // "explain in Telugu", "read it again"
  | 'general_conversation' // greetings, thanks
  | 'unknown'             // unclear or out-of-scope

// ── Structured Voice Command (returned by backend) ───────────────────────────

export interface VOSCommand {
  intent: VOSIntent
  action?: string           // structured action ID (e.g. "capture_plant_photo", "navigate_to_scanning")
  target: string            // action ID or route path
  parameters: Record<string, string | number | boolean>
  confidence: number        // 0.0 – 1.0
  raw_text: string
  category: CommandCategory
  speech_response: string   // what the assistant should say while/after executing
  language: string
  requires_confirmation: boolean
}

// ── Page Action (registered by each page) ────────────────────────────────────

export interface PageAction {
  id: string                        // unique: "scan.analyze", "crop.fill_nitrogen"
  label?: string                    // human-readable: "Analyze plant disease"
  name?: string                     // alias for label
  accessible_name?: string          // TTS-friendly: "Analyze the plant leaf image"
  description: string
  keywords?: string[]               // voice trigger keywords
  keywords_en?: string[]
  keywords_te?: string[]
  keywords_hi?: string[]
  intent?: VOSIntent
  parameters?: ActionParameter[]
  requires_confirmation?: boolean
  requiresConfirmation?: boolean    // alias
  confirmation_prompt?: string      // "Are you sure you want to submit the form?"
  page?: string                     // route this applies to, undefined = global
  execute?: (params?: Record<string, any>) => void | Promise<void>
  handler?: (params?: any) => void | Promise<void> // alias
}

export const DEFAULT_VOICE_BY_LANGUAGE: Record<string, string> = {
  en: 'Avinash',
  te: 'Lakshmi',
  hi: 'Shivani',
}

export const VOICE_FEEDBACK_MSGS = {
  LISTENING: { en: 'Listening...', te: 'వింటున్నాను...', hi: 'सुन रहा हूँ...' },
  THINKING: { en: 'Thinking...', te: 'ఆలోచిస్తున్నాను...', hi: 'सोच रहा हूँ...' },
  EXECUTING: { en: 'Executing...', te: 'అమలు చేస్తున్నాను...', hi: 'लागू कर रहा हूँ...' },
}

export const VOS_SUGGESTED_PROMPTS: Record<string, string[]> = {
  en: [
    'Go to Disease Scanner',
    'Recommend a crop for my soil',
    'Take a photo with camera',
    'What is the weather today?',
    'Read this page to me',
    'Switch to Telugu',
  ],
  te: [
    'ఆకుల స్కాన్ పేజీకి వెళ్ళు',
    'మా నేలకి ఏ పంట మంచిది?',
    'ఈ ఆకును ఫోటో తీయి',
    'ఈరోజు వాతావరణం ఎలా ఉంది?',
    'ఈ పేజీ వివరాలు చదువు',
    'భాషను ఇంగ్లీష్‌కి మార్చు',
  ],
  hi: [
    'रोग स्कैनिंग पेज पर जाओ',
    'मेरी मिट्टी के लिए फसल बताओ',
    'पत्ती की फोटो खींचो',
    'आज का मौसम कैसा है?',
    'इस पेज को पढ़कर सुनाओ',
    'अंग्रेज़ी में बदलो',
  ],
}

export interface ActionParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'choice'
  required: boolean
  min?: number
  max?: number
  choices?: string[]
  description: string
}

// ── Workflow State Machine ────────────────────────────────────────────────────

export type WorkflowType =
  | 'crop_recommendation'
  | 'disease_scan'
  | 'crop_search'
  | 'none'

export interface WorkflowStep {
  id: string
  question: string                  // what the assistant asks
  question_te?: string              // Telugu version
  question_hi?: string              // Hindi version
  prompt?: Record<string, string>   // alias: { en: string, te?: string, hi?: string }
  field: string                     // form field name
  type: 'number' | 'text' | 'choice' | 'confirm' | 'action'
  min?: number
  max?: number
  choices?: string[]
  validation?: (val: string) => string | null  // returns error message or null
}

export interface WorkflowState {
  type: WorkflowType
  currentStep: number
  currentStepIndex?: number         // alias
  status?: 'idle' | 'in_progress' | 'completed' | 'cancelled' | string
  steps: WorkflowStep[]
  collectedData: Record<string, string | number | boolean>
  isComplete: boolean
  isPending: boolean
}

// ── Multi-turn Conversation Context ──────────────────────────────────────────

export interface VOSConversationContext {
  language: 'en' | 'te' | 'hi'
  currentPage: string
  lastResponse: string
  lastActionId: string | null
  lastResult: Record<string, unknown> | null  // last scan result, crop result etc.
  workflow: WorkflowState | null
  pendingConfirmation: {
    actionId: string
    params: Record<string, string | number | boolean>
    prompt: string
  } | null
  history: Array<{ role: 'user' | 'assistant'; text: string }>
}

// ── Navigation Entry ──────────────────────────────────────────────────────────

export interface NavigationEntry {
  path: string
  label: string
  description: string
  keywords_en: string[]
  keywords_te: string[]
  keywords_hi: string[]
}

// ── VOS Context API (exposed by VoiceOSContext) ───────────────────────────────

export interface VoiceOSContextAPI {
  // State
  isVoiceOSActive: boolean
  voiceState: VOSState
  conversationCtx: VOSConversationContext
  transcript: string
  assistantMessage: string
  errorMessage: string | null
  isListening: boolean
  isSpeaking: boolean

  // Activation
  activateVoiceOS: () => void
  deactivateVoiceOS: () => void

  // Core voice actions
  startListening: () => Promise<void>
  stopListening: () => void
  cancelListening: () => void
  speak: (text: string, language?: string) => Promise<void>
  stopSpeaking: () => void

  // Command processing
  processVoiceCommand: (text: string) => Promise<void>

  // Action registry
  registerActions: (actions: PageAction[]) => void
  unregisterActions: (ids: string[]) => void
  getRegisteredActions: () => PageAction[]

  // Context updates
  setCurrentPage: (page: string) => void
  setLastResult: (result: Record<string, unknown>) => void
  setLanguage: (lang: 'en' | 'te' | 'hi') => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const ALLOWLISTED_INTENTS = new Set<VOSIntent>([
  'NAVIGATE', 'CLICK_ELEMENT', 'FILL_FIELD', 'SELECT_OPTION',
  'SEARCH', 'SUBMIT_FORM', 'CLEAR_FORM', 'SCROLL',
  'READ_PAGE', 'READ_RESULT', 'READ_SECTION', 'EXPLAIN_CONTENT',
  'READ_OPTIONS', 'REPEAT_LAST', 'STOP_SPEAKING', 'STOP_VOICE_OS',
  'CHANGE_LANGUAGE', 'OPEN_CAMERA', 'OPEN_GALLERY', 'TAKE_PHOTO',
  'CAPTURE_IMAGE', 'RETAKE_PHOTO', 'CONFIRM_ACTION', 'CANCEL_ACTION',
  'GO_BACK', 'OPEN_ASSISTANT', 'START_WORKFLOW', 'HELP',
  'AGRICULTURAL_QUESTION', 'FOLLOW_UP', 'GENERAL_CONVERSATION', 'UNKNOWN',
])

export function isAllowlistedIntent(intent: string): intent is VOSIntent {
  return ALLOWLISTED_INTENTS.has(intent as VOSIntent)
}

export const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  te: 'తెలుగు',
  hi: 'हिन्दी',
}

export const VOS_STATE_LABELS: Record<VOSState, string> = {
  idle: 'Ready',
  listening: 'Listening…',
  transcribing: 'Processing speech…',
  understanding: 'Understanding…',
  executing: 'Executing…',
  speaking: 'Speaking…',
  waiting: 'Waiting…',
  error: 'Error',
  permission_denied: 'Microphone access denied',
}
