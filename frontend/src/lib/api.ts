import axios from 'axios'

/**
 * Normalizes and extracts the backend API base URL safely.
 * Handles missing environment variables, empty strings, and trailing slashes.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '').replace('//localhost:', '//127.0.0.1:')
  }
  return 'http://127.0.0.1:8000/api'
}

export const API_BASE_URL = getApiBaseUrl()

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // 45 seconds for ML processing
})

export function formatApiError(err: unknown, fallbackMessage: string): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.data?.error) {
      return String(err.response.data.error)
    }
    if (err.response?.data?.detail) {
      return String(err.response.data.detail)
    }
    if (err.code === 'ECONNABORTED') {
      return 'Request timed out while analyzing. Please try again with a smaller image.'
    }
    if (err.message === 'Network Error' || !err.response) {
      return 'Unable to reach backend server. Please verify that Django is running at ' + API_BASE_URL
    }
    return `Server error (${err.response.status}): ${err.message}`
  }
  if (err instanceof Error) {
    return err.message
  }
  return fallbackMessage
}

export interface ScanResult {
  id: string
  image?: string
  image_url: string | null
  disease_name: string
  status: 'Healthy' | 'Infected'
  accuracy: number
  symptoms: string
  causes: string
  spread: string
  organic_treatment: string
  chemical_treatment: string
  safety_precautions: string
  prevention: string
  crop_damage: string
  created_at?: string
  saved_to_history?: boolean
}

export interface CropResult {
  id: string
  nitrogen: number
  phosphorus: number
  potassium: number
  temperature: number
  humidity: number
  ph: number
  rainfall: number
  recommended_crop: string
  confidence?: number
  description: string
  emoji: string
  category: string
  soil_conditions: string
  growing_info: string
  fertilizer_guidance: string
  water_requirements: string
  ideal_ph_range?: string
  ideal_temp_range?: string
  harvest_duration?: string
  market_tips?: string
  created_at?: string
  used_ml_model?: boolean
}

export interface DiseaseInfo {
  disease_name: string
  plant: string
  status: 'Healthy' | 'Infected'
  category?: string
  severity?: 'Low' | 'Medium' | 'High' | 'Critical'
  scientific_name?: string
  affected_crops?: string[]
  short_description?: string
  pathogen?: string
  symptoms: string
  early_stage_symptoms?: string
  advanced_stage_symptoms?: string
  causes: string
  environmental_conditions?: string
  spread: string
  organic_treatment: string
  chemical_treatment: string
  safety_precautions: string
  prevention: string
  nutrient_management?: string
  recovery_recommendations?: string
  crop_damage: string
  is_ml_supported?: boolean
  image_url?: string
}

export interface GrowthStage {
  stage: string
  duration: string
  details: string
}

export interface CropDisease {
  name: string
  disease_name?: string
  scientific_name?: string
  category?: string
  severity?: string
  short_description?: string
  symptoms?: string
  early_stage_symptoms?: string
  advanced_stage_symptoms?: string
  causes?: string
  environmental_conditions?: string
  spread?: string
  prevention?: string
  organic_treatment?: string
  chemical_treatment?: string
  safety_precautions?: string
  crop_damage?: string
  image_url?: string
  gallery_images?: string[]
}

export interface CropGuide {
  name: string
  emoji: string
  category: string
  scientific_name?: string
  short_description?: string
  overview?: string
  growing_season?: string
  growing_duration?: string
  soil_requirements?: string
  climate_requirements?: string
  temperature?: string
  rainfall?: string
  seed_varieties?: string
  land_preparation?: string
  sowing_methods?: string
  seed_spacing?: string
  irrigation?: string
  fertilizer_requirements?: string
  npk_requirements?: string
  growth_stages?: GrowthStage[]
  common_diseases?: string[]
  diseases?: CropDisease[]
  disease_count?: number
  matched_diseases?: string[]
  common_pests?: string
  disease_prevention?: string
  harvesting?: string
  expected_yield?: string
  storage_methods?: string
  image_url?: string
  is_model_supported?: boolean
  // Legacy aliases
  description?: string
  soil_conditions?: string
  growing_info?: string
  fertilizer_guidance?: string
  water_requirements?: string
  ideal_ph_range?: string
  ideal_temp_range?: string
  harvest_duration?: string
  market_tips?: string
}

export interface DashboardStats {
  total_scans: number
  healthy_scans: number
  infected_scans: number
  healthy_rate: number
  total_recommendations: number
  supported_disease_classes: number
  supported_crop_classes: number
  model_accuracy: {
    disease_detector: string
    crop_recommender: string
  }
  top_diseases: Array<{ disease_name: string; count: number }>
  top_crops: Array<{ recommended_crop: string; count: number }>
  timestamp: string
}

export interface VoiceOption {
  language: string
  voice: string
  gender: string
  label: string
}

export interface AIStatus {
  gnani_stt_ready: boolean
  gnani_stt_model: string
  gnani_tts_ready: boolean
  gnani_tts_model: string
  gemini_ready: boolean
  gemini_model?: string
  ai_provider?: string
  supported_languages: Array<{ code: string; label: string; locale: string }>
  supported_voices?: VoiceOption[]
  timestamp?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  source?: 'google_gemini' | 'local_agronomy_knowledge' | string
  notice?: string
  timestamp: string
  audioBlobUrl?: string
  model_used?: string
  sources?: string[]
  imagePreview?: string
  has_image?: boolean
}

export interface VOSCommandPayload {
  command: string
  current_page?: string
  available_actions?: any[]
  active_workflow?: any
  language?: string
  history?: Array<{ role: string; content: string }>
}

export interface VOSCommandResponse {
  success: boolean
  intent: string
  action?: string
  target: string
  parameters: Record<string, any>
  language: string
  spoken_response: string
  confidence: number
  needs_confirmation: boolean
  requires_confirmation?: boolean
  error?: string
}

export async function sendVoiceCommand(payload: VOSCommandPayload): Promise<VOSCommandResponse> {
  const response = await apiClient.post<VOSCommandResponse>('/assistant/command/', payload)
  return response.data
}

