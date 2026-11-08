# Agronomy AI — Google Gemini Multimodal Integration Guide

## Overview
Agronomy AI integrates the **Google Gemini API** (`gemini-2.5-flash`) via the official Google Gen AI SDK (`google-genai`) as its **exclusive** LLM and Multimodal Reasoning provider.

```
+-----------------------------------------------------------------------------------+
|                                  Agronomy AI                                      |
|                                                                                   |
|  [ Farmer Question (Text / Voice via Gnani Prisma v3) ]                           |
|  [ Optional Plant / Crop Image (JPG / PNG / WEBP <= 10MB) ]                       |
|                                      │                                            |
|                                      ▼                                            |
|                       Next.js 14 Floating AI Assistant                            |
|                                      │                                            |
|                                      ▼                                            |
|                        Django REST API (/api/ai/chat/)                            |
|                                      │                                            |
|                ┌─────────────────────┴──────────────────────┐                     |
|                ▼                                            ▼                     |
|      Google Gemini API                        Verified Local Botanical            |
|     (`google-genai` SDK)                         Knowledge Engine                 |
|   Multimodal Vision + Text              (5-Part ICAR & PlantVillage Rules)        |
|    gemini-2.5-flash                             (Graceful Zero-Crash Fallback)    |
|                │                                            │                     |
|                └─────────────────────┬──────────────────────┘                     |
|                                      ▼                                            |
|                       Structured 5-Part Agricultural Advice                       |
|                                      │                                            |
|                                      ▼                                            |
|                 Gnani Timbre v3.0 TTS (Voice Response)                            |
+-----------------------------------------------------------------------------------+
```

---

## 1. Features
1. **Multimodal Plant Diagnosis:** Upload crop leaf images directly in chat; Gemini analyzes visual lesions, chlorosis, necrosis, pest damage, and nutrient deficiencies.
2. **5-Part Structured Agricultural Guidance:**
   - Primary Assessment / Direct Diagnosis
   - Agronomic Explanation & Causes
   - Immediate Practical Actions
   - Organic & Biological Remedies (Neem oil, Trichoderma viride, Jeevamrutha)
   - Chemical Treatments with mandatory PPE, dilution rates, and safety precautions
3. **Multilingual Reasoning:**
   - English (`en` / `en-IN`)
   - Telugu (`te` / `te-IN` / తెలుగు)
   - Hindi (`hi` / `hi-IN` / हिन्दी)
4. **Resilient Offline / Unconfigured Fallback:**
   - If `GEMINI_API_KEY` is not provided or rate-limited, the system falls back to the verified botanical knowledge engine without fabricating answers or failing.

---

## 2. Configuration
In `backend/.env`:
```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Gnani AI Speech
GNANI_API_KEY=your_gnani_api_key
GNANI_STT_MODEL=prisma-v3.0
GNANI_TTS_MODEL=timbre-v3.0
```

---

## 3. Endpoints
- `GET /api/ai/status/` (alias: `/api/assistant/status/`): Returns Gemini, Gnani STT, and Gnani TTS readiness.
- `POST /api/ai/chat/` (alias: `/api/assistant/chat/`): Multimodal reasoning endpoint supporting text + image file upload.
- `POST /api/ai/speech-to-text/`: Transcribes farmer's speech using Gnani Prisma v3.
- `POST /api/ai/text-to-speech/`: Synthesizes spoken answer using Gnani Timbre v3 with broadcast audio loudness normalization.
