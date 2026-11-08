# AGRONOMY AI
**Tagline:** Your Intelligent Voice-First Agricultural Assistant  
**Challenge:** Great Indian AI Internship Challenge – Gnani AI  
**GitHub Repository:** [https://github.com/nani3467/Plant-Disease-Detection](https://github.com/nani3467/Plant-Disease-Detection)

---

## SECTION 1: THE PROBLEM
* **Early Disease Detection Challenges:** Grassroots farmers struggle to identify plant pathology and foliar infections at early stages, frequently leading to devastating yield losses and emergency chemical overuse.
* **Complex Crop Selection:** Choosing suitable crops requires balancing complex soil chemical parameters (Nitrogen, Phosphorus, Potassium, pH) with regional climatic indicators (rainfall, temperature, humidity).
* **Access to Agricultural Intelligence:** Reliable, scientifically grounded agronomic advice (such as ICAR package-of-practices) is fragmented, inaccessible, or slow to reach smallholder farmers.
* **Digital Literacy & Vernacular Barriers:** Traditional mobile and desktop applications demand complex typing and textual navigation in English, creating a steep barrier for rural farmers.

---

## SECTION 2: OUR SOLUTION
Agronomy AI transforms agricultural advisory by combining computer vision diagnostics, intelligent machine learning recommendation, and a **voice-first vernacular interface powered by Gnani AI**.

* **Voice-Driven Accessibility:** Farmers interact naturally in their native languages through spoken audio without typing.
* **Image-Based Plant Disease Detection:** High-speed foliar diagnosis across 38 disease classes powered by PyTorch MobileNetV2.
* **Intelligent Crop Recommendation:** Multi-parameter crop selection across 22 crop varieties utilizing a trained Random Forest model (99.5% accuracy).
* **Actionable 5-Part Treatment Guidance:** Practical, ICAR-grounded guidance providing organic remedies, certified chemical treatments with exact dilution rates, safety PPE guidelines, and preventive measures.

---

## SECTION 3: GNANI AI INTEGRATION — MAIN HIGHLIGHT

### GNANI PRISMA | SPEECH-TO-TEXT (STT)
* **Model:** `prisma-v3.0` via official Vachana REST API (`https://api.vachana.ai/stt/v3`).
* **Conversion:** Converts farmer's spoken audio (WAV, WebM, MP3, OGG) recorded via browser microphone into high-fidelity text.
* **Multilingual Capability:** Verified native Indic recognition for Telugu (`te-IN`), Hindi (`hi-IN`), and Indian English (`en-IN`) with automatic dialect detection.
* **Hands-Free Control:** Allows farmers to trigger scans, request guidance, and operate the platform entirely through voice commands without typing.

### GNANI TIMBRE | TEXT-TO-SPEECH (TTS)
* **Model:** `timbre-v3.0` via official Vachana REST API (`https://api.vachana.ai/api/v1/tts/inference`).
* **Audio Synthesis:** Transforms structured agronomic diagnosis and advice into natural, human-sounding speech for auditory guidance.
* **Native Voices:** Verified speaker personas per language—**Lakshmi** (Telugu), **Shivani** (Hindi), and **Avinash** (English).
* **Signal Normalization:** Backend wraps 24kHz linear PCM into valid RIFF WAV containers, repairs streaming headers, and applies -14 dBFS broadcast loudness normalization for crystal-clear field listening.

### HOW THEY WORK TOGETHER: END-TO-END WORKFLOW
```
[Farmer Speaks] 
       ↓ 
[Gnani Prisma STT (prisma-v3.0)] → Transcribes Spoken Vernacular Audio into Text
       ↓ 
[Agronomy AI Orchestrator] → Interprets Intent, Analyzes Uploaded Leaf / Crop Parameters
       ↓ 
[Multimodal Reasoning & Models] → MobileNetV2 / Random Forest / Google Gemini ICAR Guidance
       ↓ 
[Gnani Timbre TTS (timbre-v3.0)] → Synthesizes Actionable Speech in Farmer's Native Dialect
       ↓ 
[Farmer Hears Spoken Response]
```
*Note: Gnani AI speech engines specifically power the voice interaction pipeline. Computer vision disease classification is handled by MobileNetV2, crop recommendations by Random Forest, and conversational reasoning by Google Gemini grounded on local ICAR knowledge bases.*

---

## SECTION 4: KEY FEATURES
1. **Plant Disease Detection (Verified):** Analyzes uploaded crop leaf photos across 38 disease classes using MobileNetV2 CNN, featuring an automated skin-tone heuristic filter to eliminate non-plant uploads.
2. **Actionable Disease Guidance (Verified):** Provides comprehensive 5-part reports: symptoms, causes, spread mechanisms, organic treatments (Neem oil, Jeevamrutha, Trichoderma viride), and approved chemical treatments with mandatory PPE safety precautions.
3. **Crop Recommendation (Verified):** Evaluates 7 soil and climate parameters (N, P, K, pH, temperature, humidity, rainfall) to recommend the optimal crop among 22 varieties using scikit-learn Random Forest (99.5% accuracy).
4. **Crop Cultivation Guides (Verified):** Complete botanical repository for 22 crops detailing sowing techniques, land preparation, spacing, NPK dosage schedules, and harvest methods.
5. **Voice-First Assistant (Verified):** Persistent Floating Voice OS interface powered by Gnani Prisma and Timbre with real-time audio recording and spoken playback.
6. **Multilingual Interaction (Verified):** Verified end-to-end multilingual workflow across English, Telugu (తెలుగు), and Hindi (हिन्दी).
7. **Fertilizer & IoT Sensing (In Development):** Interactive nutrient deficiency guides live; automated IoT telemetry sensors and drone multispectral aerial mapping under active development.

---

## SECTION 5: TECHNOLOGY STACK (VERIFIED)
| Layer | Verified Technologies |
|---|---|
| **Speech AI** | **Gnani AI Prisma v3.0** (Speech-to-Text) & **Gnani AI Timbre v3.0** (Text-to-Speech) via Vachana REST API |
| **Frontend** | Next.js 14.0.4, React 18, TypeScript 5, Tailwind CSS 3.3, Axios 1.6.2, jsPDF 4.2.1 |
| **Backend** | Django 5.2.5, Django REST Framework 3.15.2, Python 3.11, Gunicorn 22.0, WhiteNoise 6.7 |
| **Database** | MongoDB Atlas / Local MongoDB via `django-mongodb-backend` 5.2.4 & `pymongo` 4.10.1 |
| **Machine Learning** | PyTorch >=2.3.0, torchvision, Transformers (MobileNetV2 CNN); scikit-learn 1.5.0 (Random Forest Classifier) |
| **Conversational AI** | Google Gemini (`gemini-2.5-flash` / `gemini-3.5-flash` via `google-genai` SDK) + Verified ICAR Botanical Rules |

---

## SECTION 6: IMPACT AND FUTURE SCOPE
* **Grassroots Inclusion:** Eliminates literacy barriers for Indian farmers, making advanced agronomic AI accessible through spoken dialogue in their mother tongue.
* **Proactive Crop Protection:** Early visual disease identification prevents widespread foliar epidemics and protects farmer investments.
* **Precision Agriculture:** Soil-based crop matching increases agricultural productivity, optimizes water usage, and curtails soil degradation.
* **Future Scope (Roadmap):** Integration of real-time IoT soil sensor telemetry, offline PWA field mode for zero-connectivity zones, and drone aerial multispectral disease scouting.
