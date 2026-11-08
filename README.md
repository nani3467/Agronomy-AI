<div align="center">

# Agronomy AI 🌿

**Intelligent Voice-First Agricultural Assistant powered by AI & Gnani AI Speech Technologies**

*Developed for the **Great Indian AI Internship Challenge by Gnani AI***

[![Gnani AI Prisma](https://img.shields.io/badge/Gnani_AI-Prisma_STT_(v3.0)-0284C7?logo=soundcharts&logoColor=white)](https://gnani.ai)
[![Gnani AI Timbre](https://img.shields.io/badge/Gnani_AI-Timbre_TTS_(v3.0)-10B981?logo=soundcharts&logoColor=white)](https://gnani.ai)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-Multimodal_Reasoning-4285F4?logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Next.js](https://img.shields.io/badge/Next.js-14.0.4-black?logo=next.js)](https://nextjs.org/)
[![Django](https://img.shields.io/badge/Django-5.2.5-092E20?logo=django)](https://www.djangoproject.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.3+-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.5.0-F7931E?logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Empowering grassroots farmers across India with natural vernacular voice interaction (Telugu, Hindi, English), instant deep learning plant disease diagnostics, and data-driven crop recommendations.**

[📄 Executive Solution Pitch (1-Page PDF)](submission/Agronomy_AI_Solution_Pitch.pdf) • [Documentation](docs/) • [Report Bug](https://github.com/nani3467/Agronomy-AI/issues)

</div>

---

## 🏆 Submission Highlight: Executive Solution Pitch

As part of the **Great Indian AI Internship Challenge by Gnani AI**, a dedicated, high-impact **One-Page Solution Pitch** has been prepared and verified:

* **[One-Page PDF Solution Pitch](submission/Agronomy_AI_Solution_Pitch.pdf)** — *Strictly formatted to exactly ONE A4 page covering Problem, Solution, Gnani Integration, Architecture, Verified Tech Stack, and Impact.*
* **[Word Document Pitch (DOCX)](submission/Agronomy_AI_Solution_Pitch.docx)** — *Formatted for A4 single-page distribution.*
* **[Markdown Pitch Dossier](submission/Agronomy_AI_Solution_Pitch.md)** — *Full technical narrative.*

---

## 🎙️ Gnani AI Speech Technologies — Core Accessibility Engine

Agronomy AI is designed from the ground up as a **voice-first agricultural platform** that breaks digital and literacy barriers for rural Indian farmers using Gnani AI's state-of-the-art speech intelligence:

```
+--------------------------------------------------------------------------------------------------+
|                                    AGRONOMY AI SPEECH WORKFLOW                                   |
|                                                                                                  |
|   [ 👨‍🌾 Farmer Speaks Query ]  (Telugu / Hindi / English)                                        |
|                │                                                                                 |
|                ▼                                                                                 |
|   [ 🎙️ GNANI PRISMA STT ]      (prisma-v3.0 via api.vachana.ai/stt/v3)                         |
|   • Converts raw microphone audio into accurate text                                             |
|   • Built-in Indic auto-detection & vernacular dialect handling                                  |
|                │                                                                                 |
|                ▼                                                                                 |
|   [ 🧠 AGRONOMY AI ENGINE ]    (Django REST API & VoiceOS)                                       |
|   • Classifies Intent & Voice Commands (Navigation, Scanning, Guidance)                          |
|   • Executes MobileNetV2 (38 Diseases) or Random Forest (22 Crops)                               |
|   • Multimodal agricultural reasoning via Google Gemini + ICAR Grounding                         |
|                │                                                                                 |
|                ▼                                                                                 |
|   [ 🔊 GNANI TIMBRE TTS ]      (timbre-v3.0 via api.vachana.ai/api/v1/tts/inference)             |
|   • Natural Indian voice personas: Lakshmi (Telugu), Shivani (Hindi), Avinash (English)          |
|   • 24kHz linear PCM with broadcast loudness normalization (-14 dBFS) & WAV repair              |
|                │                                                                                 |
|                ▼                                                                                 |
|   [ 📢 Farmer Hears Guidance ] Actionable, localized agronomic advice delivered through speech   |
+--------------------------------------------------------------------------------------------------+
```

### 1. Gnani Prisma v3.0 (Speech-to-Text)
* **Backend Service:** `backend/api/services/gnani_stt.py`
* **API Endpoint:** `https://api.vachana.ai/stt/v3`
* **Model:** `prisma-v3.0`
* **Features:** Live microphone ingestion (WAV, WebM, MP3, OGG), multi-dialect Indic transcription, zero-typing query input.

### 2. Gnani Timbre v3.0 (Text-to-Speech)
* **Backend Service:** `backend/api/services/gnani_tts.py`
* **API Endpoint:** `https://api.vachana.ai/api/v1/tts/inference`
* **Model:** `timbre-v3.0`
* **Verified Voices:**
  * **Telugu (`te-IN`):** Lakshmi (Female), Harshad (Male)
  * **Hindi (`hi-IN`):** Shivani (Female), Avinash (Male)
  * **English (`en-IN`):** Avinash (Male), Lakshmi (Female)
* **Signal Engineering:** Automatic RIFF WAV container assembly, `-14 dBFS` loudness normalization, and dynamic markdown stripping so speech sounds natural.

---

## 🚀 Key Features

* **🦠 Deep Learning Plant Disease Detection:** Upload leaf photographs to diagnose **38 disease classes** across 14+ crops using PyTorch MobileNetV2 CNN, complete with non-plant heuristic filtering.
* **🌾 Machine Learning Crop Recommendation:** Recommends optimal crops among **22 varieties** based on 7 soil & climate parameters (N, P, K, pH, temperature, humidity, rainfall) with **99.5% test accuracy** using scikit-learn Random Forest.
* **🗣️ Floating Voice OS Assistant:** Hands-free persistent voice assistant with live audio recording, voice command navigation, and audio playback powered by Gnani AI.
* **🌐 Multilingual Fluency:** Native end-to-end voice and text support for **Telugu (తెలుగు)**, **Hindi (हिन्दी)**, and **English**.
* **📊 5-Part Actionable Agronomic Reports:** Every diagnosis includes symptoms, causes, spread mechanisms, biological/organic remedies (Neem oil, Jeevamrutha, Trichoderma), and certified chemical treatments with strict safety PPE guidelines.
* **📖 Botanical & Crop Guides:** Complete reference libraries for 22 crops and 38 diseases grounded in ICAR standards.
* **📈 Agricultural Analytics Dashboard:** Real-time statistics tracking total scans, healthy vs. infected ratios, and prevalent disease patterns.
* **📄 Report Export:** One-click PDF diagnosis export for field documentation.

---

## 🧠 Machine Learning & AI Architecture

| AI Component | Purpose | Model / Engine | Provider / Framework | Key Metrics |
|---|---|---|---|---|
| **Speech-to-Text** | Spoken Vernacular Input | `prisma-v3.0` | Gnani AI (Vachana) | High Indic Accuracy (TE, HI, EN) |
| **Text-to-Speech** | Auditory Guidance | `timbre-v3.0` | Gnani AI (Vachana) | 24kHz Native Personas |
| **Disease Detection** | Foliar Disease Classification | MobileNetV2 CNN | PyTorch / Hugging Face | 38 Disease Classes, 14+ Crops |
| **Crop Recommendation** | Soil & Climate Matching | Random Forest | scikit-learn | **99.5% Accuracy** (22 Crops) |
| **Multimodal Reasoning** | Expert Advisory & Command Parsing | `gemini-2.5-flash` | Google GenAI SDK | Multimodal Vision + ICAR Grounding |

---

## 🛠️ Verified Tech Stack

* **Speech AI:** Gnani AI Prisma v3.0 (STT) & Gnani AI Timbre v3.0 (TTS) via Vachana REST API
* **Conversational Reasoning:** Google Gemini Multimodal API (`google-genai` SDK)
* **Frontend:** Next.js 14.0.4 (App Router), React 18, TypeScript 5, Tailwind CSS 3.3, Axios 1.6, jsPDF 4.2
* **Backend:** Django 5.2.5, Django REST Framework 3.15.2, Python 3.11, Gunicorn 22.0, WhiteNoise 6.7
* **Database:** MongoDB Atlas / Local MongoDB via `django-mongodb-backend` 5.2.4 & `pymongo` 4.10.1
* **ML Engines:** PyTorch 2.3+, scikit-learn 1.5.0, NumPy 1.26, Pandas 2.2, joblib 1.4

---

## 📁 Project Structure

```
Agronomy-AI/
├── submission/                      # Official Competition Deliverables
│   ├── Agronomy_AI_Solution_Pitch.pdf   # Exactly 1-Page A4 Pitch (Primary Submission)
│   ├── Agronomy_AI_Solution_Pitch.docx  # Formatted Word Pitch Document
│   └── Agronomy_AI_Solution_Pitch.md    # Markdown Technical Dossier
│
├── backend/                         # Django REST API & ML Backend
│   ├── api/
│   │   ├── services/                # AI Services Core
│   │   │   ├── gnani_stt.py         # Gnani Prisma v3 Speech-to-Text Integration
│   │   │   ├── gnani_tts.py         # Gnani Timbre v3.0 Text-to-Speech Integration
│   │   │   └── gemini_service.py    # Google Gemini Multimodal Reasoning Engine
│   │   ├── crop_data.py             # ICAR Grounded Crop Database (22 Crops)
│   │   ├── disease_data.py          # Plant Pathology Database (38 Diseases)
│   │   ├── models.py                # MongoDB Models (PlantScan, CropRecommendation)
│   │   ├── views.py                 # REST Endpoints & Inference Pipeline
│   │   └── urls.py                  # API Route Definitions
│   ├── models_ml/                   # Trained Machine Learning Artifacts
│   │   ├── crop_model.pkl           # RandomForest Classifier
│   │   └── label_encoder.pkl        # Label Encoder
│   ├── greenguardian/               # Django Settings & WSGI Configuration
│   ├── requirements.txt             # Python Dependencies
│   └── manage.py
│
├── frontend/                        # Next.js 14 React Application
│   └── src/
│       ├── app/
│       │   ├── (pages)/
│       │   │   ├── scanning/        # Disease Diagnosis Scanner
│       │   │   ├── crop-recommendation/ # Soil NPK Recommendation Tool
│       │   │   ├── crops/           # Crop Cultivation Manuals
│       │   │   ├── diseases/        # Botanical Disease Library
│       │   │   ├── fertilizer/      # Nutrient Deficiency Guide
│       │   │   ├── dashboard/       # Agricultural Analytics Dashboard
│       │   │   ├── history/         # Diagnostic Scan Logs
│       │   │   └── report/          # Full Diagnosis Report & Export
│       │   └── components/
│       │       ├── FloatingAIAssistant.tsx # Gnani AI Voice Assistant Widget
│       │       ├── VoiceOSPanel.tsx        # Voice Interface Overlay
│       │       ├── Navbar.tsx
│       │       └── Footer.tsx
│       ├── context/
│       │   └── VoiceOSContext.tsx   # Voice-First State Orchestrator
│       └── lib/
│           ├── api.ts               # REST Client
│           ├── audioRecorder.ts     # Microphone Audio Capture
│           └── voiceOS.ts           # Speech Dispatch & Sound Pipeline
│
├── docs/                            # Integration Architecture Guides
├── LICENSE                          # MIT License
└── README.md
```

---

## 🚀 Setup & Installation

### Prerequisites
* **Python 3.10+**
* **Node.js 18+**
* **MongoDB 4.4+** or **MongoDB Atlas**
* **Gnani AI API Key** (`vach_...`) & **Google Gemini API Key**

---

### 1️⃣ Database Setup
Use local MongoDB (`mongodb://localhost:27017/`) or create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).

---

### 2️⃣ Backend Setup
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Create .env configuration
cp .env.example .env
```

Configure `backend/.env`:
```env
SECRET_KEY=your_secure_django_secret_key
DEBUG=True
MONGO_URI=mongodb://localhost:27017/
MONGO_DB_NAME=greenguardian

# Gnani AI Speech Credentials
GNANI_API_KEY=your_gnani_vachana_api_key
GNANI_STT_MODEL=prisma-v3.0
GNANI_TTS_MODEL=timbre-v3.0

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Start Django backend:
```bash
python manage.py runserver
```
Backend runs at `http://127.0.0.1:8000/api`

---

### 3️⃣ Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
Frontend runs at `http://localhost:3000`

---

## 📡 API Endpoints

| Method | Endpoint | Description | Powered By |
|---|---|---|---|
| `GET` | `/api/health/` | System & model health check | Django |
| `POST` | `/api/scan/` | Plant disease leaf image inference | PyTorch MobileNetV2 |
| `POST` | `/api/crop-recommend/` | Soil NPK & climate recommendation | scikit-learn Random Forest |
| `POST` | `/api/ai/speech-to-text/` | Transcribes audio to vernacular text | **Gnani AI Prisma v3.0** |
| `POST` | `/api/ai/text-to-speech/` | Synthesizes spoken audio guidance | **Gnani AI Timbre v3.0** |
| `POST` | `/api/ai/chat/` | Conversational multimodal reasoning | Google Gemini + ICAR Rules |
| `POST` | `/api/ai/command/` | Voice command understanding & action | VoiceOS + Gemini |
| `GET` | `/api/ai/status/` | Live AI service readiness status | System |
| `GET` | `/api/diseases/` | Botanical disease library | Agronomy DB |
| `GET` | `/api/crops/` | Crop cultivation guides | Agronomy DB |
| `GET` | `/api/dashboard/stats/` | Field analytics & disease trends | MongoDB Aggregations |

---

## 🎯 Impact & Future Scope

### Grassroots Impact
* **Eliminating Digital Literacy Barriers:** Spoken voice interaction in regional Indian mother tongues enables every farmer to directly leverage state-of-the-art agricultural AI.
* **Mitigating Catastrophic Losses:** Early foliar disease diagnosis halts blight spread before systemic field damage occurs.
* **Sustainable Soil Nutrition:** Data-driven crop selection prevents soil nutrient exhaustion and balances fertilizer utilization.

### Future Roadmap
* **Continuous IoT Soil Sensing:** Live telemetry from soil moisture, EC, and NPK probes.
* **Drone Aerial Mapping:** Multispectral disease survey integration.
* **Offline Field PWA:** Edge inference for low-connectivity agricultural zones.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
