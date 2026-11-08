import os
import subprocess
import pathlib
import pypdf
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

OUTPUT_DIR = pathlib.Path("submission").resolve()
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

HTML_FILE = OUTPUT_DIR / "Agronomy_AI_Solution_Pitch.html"
PDF_FILE = OUTPUT_DIR / "Agronomy_AI_Solution_Pitch.pdf"
DOCX_FILE = OUTPUT_DIR / "Agronomy_AI_Solution_Pitch.docx"
MD_FILE = OUTPUT_DIR / "Agronomy_AI_Solution_Pitch.md"

EDGE_BIN = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# ─────────────────────────────────────────────────────────────────────────────
# 1. HTML CONTENT FOR PIXEL-PERFECT ONE-PAGE A4 PDF
# ─────────────────────────────────────────────────────────────────────────────
HTML_CONTENT = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Agronomy AI — Solution Pitch | Gnani AI Challenge</title>
<style>
  @page {
    size: A4 portrait;
    margin: 7mm 9mm 6mm 9mm;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1f2937;
    background: #ffffff;
    font-size: 8.5pt;
    line-height: 1.25;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page-container {
    width: 100%;
    max-width: 192mm;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 5.5px;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #15803d;
    padding-bottom: 4px;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .logo-icon {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #15803d, #047857);
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-weight: 800;
    font-size: 16pt;
  }
  .title-group h1 {
    font-size: 15pt;
    font-weight: 800;
    color: #0f3a1f;
    letter-spacing: -0.3px;
    line-height: 1.1;
  }
  .title-group .tagline {
    font-size: 8pt;
    font-weight: 600;
    color: #15803d;
  }
  .header-right {
    text-align: right;
  }
  .challenge-badge {
    display: inline-block;
    background: #f0fdf4;
    border: 1px solid #86efac;
    color: #166534;
    font-size: 7.2pt;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 12px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .repo-link {
    font-size: 7.2pt;
    color: #4b5563;
    margin-top: 1px;
  }
  .repo-link a {
    color: #047857;
    text-decoration: none;
    font-weight: 600;
  }

  /* Grid layouts */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1.15fr;
    gap: 6px;
  }
  .card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 6px 8px;
  }
  .card-problem {
    background: #fffafa;
    border-color: #fecaca;
  }
  .card-solution {
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  .section-label {
    font-size: 7.2pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 3px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .label-red { color: #b91c1c; }
  .label-green { color: #15803d; }
  .label-gnani { color: #047857; }
  .label-dark { color: #111827; }

  /* Bullets */
  .bullet-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2.5px;
  }
  .bullet-list li {
    position: relative;
    padding-left: 10px;
    font-size: 7.6pt;
    color: #374151;
  }
  .bullet-list li::before {
    content: "•";
    position: absolute;
    left: 1px;
    font-weight: bold;
  }
  .bullet-list.problem-bullets li::before { color: #dc2626; }
  .bullet-list.solution-bullets li::before { color: #16a34a; }

  /* GNANI AI HIGHLIGHT SECTION (HERO) */
  .gnani-hero-container {
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%);
    border: 1.5px solid #86efac;
    border-radius: 7px;
    padding: 6px 9px 5px 9px;
    box-shadow: 0 1px 3px rgba(16, 185, 129, 0.08);
  }
  .gnani-hero-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  .gnani-title {
    font-size: 8.4pt;
    font-weight: 800;
    color: #065f46;
    letter-spacing: 0.2px;
  }
  .gnani-subbadge {
    background: #047857;
    color: #ffffff;
    font-size: 6.8pt;
    font-weight: 700;
    padding: 1.5px 6px;
    border-radius: 9px;
  }

  .gnani-cards-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 5px;
  }
  .speech-card {
    background: #ffffff;
    border-radius: 5px;
    padding: 5px 7px;
    border-left: 3px solid;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  }
  .card-stt {
    border-left-color: #0284c7;
    border-top: 1px solid #e0f2fe;
    border-right: 1px solid #e0f2fe;
    border-bottom: 1px solid #e0f2fe;
  }
  .card-tts {
    border-left-color: #10b981;
    border-top: 1px solid #d1fae5;
    border-right: 1px solid #d1fae5;
    border-bottom: 1px solid #d1fae5;
  }
  .speech-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
  }
  .speech-card-title {
    font-size: 7.8pt;
    font-weight: 800;
  }
  .stt-title { color: #0369a1; }
  .tts-title { color: #047857; }
  .tech-pill {
    font-size: 6.4pt;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 4px;
  }
  .pill-stt { background: #e0f2fe; color: #0369a1; }
  .pill-tts { background: #d1fae5; color: #065f46; }

  /* Workflow diagram */
  .workflow-strip {
    background: #ffffff;
    border: 1px solid #bbf7d0;
    border-radius: 5px;
    padding: 3.5px 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 3px;
  }
  .wf-step {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 2.5px 3px;
    text-align: center;
    min-height: 27px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .wf-step.wf-gnani-stt {
    background: #f0f9ff;
    border-color: #7dd3fc;
  }
  .wf-step.wf-gnani-tts {
    background: #ecfdf5;
    border-color: #6ee7b7;
  }
  .wf-step.wf-ai {
    background: #fefce8;
    border-color: #fde047;
  }
  .wf-label {
    font-size: 6.2pt;
    font-weight: 800;
    text-transform: uppercase;
    color: #475569;
    line-height: 1;
    margin-bottom: 1px;
  }
  .wf-gnani-stt .wf-label { color: #0284c7; }
  .wf-gnani-tts .wf-label { color: #059669; }
  .wf-ai .wf-label { color: #b45309; }
  .wf-desc {
    font-size: 6.6pt;
    color: #1e293b;
    font-weight: 600;
    line-height: 1.1;
  }
  .wf-arrow {
    color: #059669;
    font-size: 8.5pt;
    font-weight: 800;
  }

  /* Key Features Grid */
  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 5px;
  }
  .feat-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 5px;
    padding: 4px 6px;
    display: flex;
    flex-direction: column;
    gap: 1.5px;
  }
  .feat-title {
    font-size: 7.4pt;
    font-weight: 700;
    color: #166534;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .feat-desc {
    font-size: 6.8pt;
    color: #4b5563;
    line-height: 1.2;
  }
  .status-tag {
    font-size: 5.8pt;
    font-weight: 700;
    padding: 0.5px 3.5px;
    border-radius: 3px;
    text-transform: uppercase;
  }
  .tag-live { background: #dcfce7; color: #15803d; }
  .tag-wip { background: #fef3c7; color: #b45309; }

  /* Bottom Row: Tech Stack & Impact/Future */
  .grid-bottom {
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
    gap: 6px;
  }
  .tech-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 6.7pt;
  }
  .tech-table td {
    padding: 1.8px 4px;
    border-bottom: 1px solid #f3f4f6;
  }
  .tech-cat {
    font-weight: 700;
    color: #374151;
    width: 28%;
  }
  .tech-val {
    color: #1f2937;
  }
  .tech-val strong {
    color: #047857;
  }

  /* Footer */
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #e5e7eb;
    padding-top: 3px;
    font-size: 6.8pt;
    color: #6b7280;
  }
  .footer-left strong { color: #166534; }
  .footer-right strong { color: #1f2937; }
</style>
</head>
<body>
<div class="page-container">

  <!-- HEADER -->
  <header class="header">
    <div class="header-left">
      <div class="logo-icon">🌿</div>
      <div class="title-group">
        <h1>AGRONOMY AI</h1>
        <div class="tagline">Your Intelligent Voice-First Agricultural Assistant</div>
      </div>
    </div>
    <div class="header-right">
      <div class="challenge-badge">Great Indian AI Internship Challenge – Gnani AI</div>
      <div class="repo-link">GitHub: <a href="https://github.com/nani3467/Plant-Disease-Detection">github.com/nani3467/Plant-Disease-Detection</a></div>
    </div>
  </header>

  <!-- PROBLEM & SOLUTION ROW -->
  <div class="grid-2">
    <div class="card card-problem">
      <div class="section-label label-red">⚠️ Section 1: The Problem</div>
      <ul class="bullet-list problem-bullets">
        <li><strong>Early Disease Detection:</strong> Farmers struggle to identify crop infections early, risking severe yield loss and costly late interventions.</li>
        <li><strong>Complex Crop Selection:</strong> Selecting optimal crops requires intricate soil NPK balancing, pH understanding, and climate matching.</li>
        <li><strong>Information Barriers:</strong> Fragmented access to scientific ICAR agronomy guidelines leaves farmers dependent on hearsay.</li>
        <li><strong>Digital Literacy & Language Gap:</strong> Traditional typing-heavy apps fail rural farmers due to script and literacy barriers.</li>
      </ul>
    </div>
    <div class="card card-solution">
      <div class="section-label label-green">🌱 Section 2: Our Solution</div>
      <ul class="bullet-list solution-bullets">
        <li><strong>Voice-First Accessibility:</strong> Hands-free voice interface in native Indian languages powered by Gnani AI speech engines.</li>
        <li><strong>AI Vision Diagnostics:</strong> Instant leaf disease detection across 38 classes via deep learning MobileNetV2.</li>
        <li><strong>Intelligent Crop Recommendation:</strong> Data-driven soil and climate matching for 22 crops using trained Random Forest ML.</li>
        <li><strong>ICAR-Grounded Guidance:</strong> 5-part actionable reports covering organic remedies, approved chemicals, dosages, and safety PPE.</li>
      </ul>
    </div>
  </div>

  <!-- SECTION 3: GNANI AI INTEGRATION (MAIN HIGHLIGHT & HERO) -->
  <section class="gnani-hero-container">
    <div class="gnani-hero-header">
      <div class="gnani-title">🎙️ SECTION 3: GNANI AI INTEGRATION — CORE SPEECH ENGINE & ACCESSIBILITY HERO</div>
      <div class="gnani-subbadge">Verified Backend Vachana REST API Integration</div>
    </div>

    <div class="gnani-cards-grid">
      <!-- PRISMA STT CARD -->
      <div class="speech-card card-stt">
        <div class="speech-card-header">
          <div class="speech-card-title stt-title">GNANI PRISMA | SPEECH-TO-TEXT</div>
          <span class="tech-pill pill-stt">Model: prisma-v3.0</span>
        </div>
        <ul class="bullet-list">
          <li><strong>Spoken Query Conversion:</strong> Converts farmer's raw microphone audio (WAV/WebM) into high-accuracy text at <code>api.vachana.ai/stt/v3</code>.</li>
          <li><strong>Multilingual Speech Recognition:</strong> Built-in Indian vernacular support for Telugu (<code>te-IN</code>), Hindi (<code>hi-IN</code>), and English (<code>en-IN</code>) with auto-detection.</li>
          <li><strong>Typing-Free Navigation:</strong> Empowers farmers to issue hands-free voice commands, navigate pages, and trigger ML workflows without typing.</li>
        </ul>
      </div>

      <!-- TIMBRE TTS CARD -->
      <div class="speech-card card-tts">
        <div class="speech-card-header">
          <div class="speech-card-title tts-title">GNANI TIMBRE | TEXT-TO-SPEECH</div>
          <span class="tech-pill pill-tts">Model: timbre-v3.0</span>
        </div>
        <ul class="bullet-list">
          <li><strong>Spoken Agricultural Guidance:</strong> Synthesizes AI diagnosis & advice into natural, human-sounding speech via <code>api.vachana.ai/api/v1/tts/inference</code>.</li>
          <li><strong>Native Vernacular Voices:</strong> Dynamic voice allocation—Lakshmi (Telugu), Shivani (Hindi), and Avinash (Indian English).</li>
          <li><strong>Acoustic Optimization:</strong> Converts 24kHz linear PCM to valid RIFF WAV with broadcast loudness normalization (-14 dBFS) & HTML5 repair.</li>
        </ul>
      </div>
    </div>

    <!-- WORKFLOW DIAGRAM -->
    <div class="workflow-strip">
      <div class="wf-step">
        <span class="wf-label">1. Input</span>
        <span class="wf-desc">Farmer Speaks Voice Query</span>
      </div>
      <span class="wf-arrow">→</span>
      <div class="wf-step wf-gnani-stt">
        <span class="wf-label">2. Gnani Prisma STT</span>
        <span class="wf-desc">Transcribes Audio to Vernacular Text</span>
      </div>
      <span class="wf-arrow">→</span>
      <div class="wf-step wf-ai">
        <span class="wf-label">3. Agronomy AI & Gemini</span>
        <span class="wf-desc">Parses Intent & Formulates Agronomic Advice</span>
      </div>
      <span class="wf-arrow">→</span>
      <div class="wf-step wf-gnani-tts">
        <span class="wf-label">4. Gnani Timbre TTS</span>
        <span class="wf-desc">Synthesizes High-Quality Spoken Audio</span>
      </div>
      <span class="wf-arrow">→</span>
      <div class="wf-step">
        <span class="wf-label">5. Output</span>
        <span class="wf-desc">Farmer Hears Actionable Guidance</span>
      </div>
    </div>
  </section>

  <!-- SECTION 4: KEY FEATURES -->
  <section class="card" style="padding: 5px 8px;">
    <div class="section-label label-dark" style="margin-bottom: 3.5px;">⚡ Section 4: Key Platform Features</div>
    <div class="features-grid">
      <div class="feat-card">
        <div class="feat-title"><span>🦠 Plant Disease Detection</span> <span class="status-tag tag-live">Verified ML</span></div>
        <div class="feat-desc">Upload leaf photos to detect 38 plant disease classes across 14+ crops via PyTorch MobileNetV2 with non-plant heuristic filtering.</div>
      </div>
      <div class="feat-card">
        <div class="feat-title"><span>🌾 Crop Recommendation</span> <span class="status-tag tag-live">Verified ML</span></div>
        <div class="feat-desc">Recommends optimal crop out of 22 varieties based on soil N-P-K, pH, temperature, humidity, and rainfall using Random Forest (99.5% accuracy).</div>
      </div>
      <div class="feat-card">
        <div class="feat-title"><span>📖 Botanical & Crop Guides</span> <span class="status-tag tag-live">Verified</span></div>
        <div class="feat-desc">Comprehensive database of 22 crop manuals and 38 disease dossiers containing symptoms, pathogen info, and seasonal cultivation requirements.</div>
      </div>
      <div class="feat-card">
        <div class="feat-title"><span>🎙️ Voice-First Assistant</span> <span class="status-tag tag-live">Verified</span></div>
        <div class="feat-desc">Floating Voice OS assistant integrating Gnani Prisma STT and Timbre TTS for hands-free audio recording, intent execution, and voice playback.</div>
      </div>
      <div class="feat-card">
        <div class="feat-title"><span>🌐 Multilingual Fluency</span> <span class="status-tag tag-live">Verified</span></div>
        <div class="feat-desc">Full end-to-end support for English, Telugu (తెలుగు), and Hindi (हिन्दी) across voice recognition, reasoning, and speech synthesis.</div>
      </div>
      <div class="feat-card">
        <div class="feat-title"><span>🧪 Fertilizer & IoT Scouting</span> <span class="status-tag tag-wip">In Development</span></div>
        <div class="feat-desc">Interactive deficiency guide live; automated IoT telemetry sensors and drone aerial multispectral mapping currently under active development.</div>
      </div>
    </div>
  </section>

  <!-- ROW: TECH STACK (SEC 5) & IMPACT / FUTURE SCOPE (SEC 6) -->
  <div class="grid-bottom">
    <!-- TECH STACK -->
    <div class="card" style="padding: 4px 7px;">
      <div class="section-label label-dark">🛠️ Section 5: Verified Technology Stack</div>
      <table class="tech-table">
        <tr><td class="tech-cat">Speech AI</td><td class="tech-val"><strong>Gnani AI Prisma v3.0</strong> (STT) & <strong>Timbre v3.0</strong> (TTS) via Vachana API</td></tr>
        <tr><td class="tech-cat">Frontend</td><td class="tech-val">Next.js 14.0.4, React 18, TypeScript 5, Tailwind CSS 3.3, Axios, jsPDF</td></tr>
        <tr><td class="tech-cat">Backend</td><td class="tech-val">Django 5.2.5, Django REST Framework 3.15.2, Python 3.11, Gunicorn</td></tr>
        <tr><td class="tech-cat">Database</td><td class="tech-val">MongoDB Atlas / Community via <code>django-mongodb-backend</code></td></tr>
        <tr><td class="tech-cat">ML Models</td><td class="tech-val">PyTorch MobileNetV2 (38 diseases), scikit-learn Random Forest (22 crops)</td></tr>
        <tr><td class="tech-cat">Reasoning</td><td class="tech-val">Google Gemini (<code>gemini-2.5-flash</code> via <code>google-genai</code>) + Local ICAR Rules</td></tr>
      </table>
    </div>

    <!-- IMPACT & FUTURE SCOPE -->
    <div class="card" style="padding: 4px 7px;">
      <div class="section-label label-green">🎯 Section 6: Impact & Future Scope</div>
      <ul class="bullet-list solution-bullets">
        <li><strong>Bridges Rural Digital Divide:</strong> Enables farmers of any literacy level to access advanced AI diagnostics using natural spoken dialects.</li>
        <li><strong>Prevents Catastrophic Crop Losses:</strong> Rapid leaf-level diagnosis catches fungal and bacterial blights before widespread infestation.</li>
        <li><strong>Optimizes Soil Yields:</strong> Scientific NPK-based crop selection maximizes harvest returns and prevents soil nutrient depletion.</li>
        <li><strong>Future Roadmap:</strong> Real-time IoT soil telemetry integration, offline-capable mobile PWA, and drone aerial multispectral crop scouting.</li>
      </ul>
    </div>
  </div>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="footer-left">
      <strong>Agronomy AI</strong> • Built for the <strong>Great Indian AI Internship Challenge by Gnani AI</strong>
    </div>
    <div class="footer-right">
      Repository: <strong>https://github.com/nani3467/Plant-Disease-Detection</strong> • Single Page Pitch
    </div>
  </footer>

</div>
</body>
</html>
"""

# ─────────────────────────────────────────────────────────────────────────────
# 2. MARKDOWN CONTENT
# ─────────────────────────────────────────────────────────────────────────────
MD_CONTENT = """# AGRONOMY AI
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
"""

# ─────────────────────────────────────────────────────────────────────────────
# 3. BUILD DOCX SCRIPT
# ─────────────────────────────────────────────────────────────────────────────
def build_docx():
    doc = Document()
    
    # Set page margins to fit exactly 1 page (0.35 in margins)
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.32)
        section.bottom_margin = Inches(0.32)
        section.left_margin = Inches(0.4)
        section.right_margin = Inches(0.4)
        section.page_width = Inches(8.27)  # A4 width
        section.page_height = Inches(11.69) # A4 height

    # Color constants
    HEX_GREEN_DARK = RGBColor(15, 58, 31)
    HEX_GREEN_MID = RGBColor(21, 128, 61)
    HEX_GREEN_LIGHT = "F0FDF4"
    HEX_GRAY_TEXT = RGBColor(55, 65, 81)
    HEX_GRAY_MUTED = RGBColor(107, 114, 128)

    # Styles helper
    def set_font(run, size_pt, bold=False, italic=False, color=None):
        run.font.name = "Segoe UI"
        run.font.size = Pt(size_pt)
        run.bold = bold
        run.italic = italic
        if color:
            run.font.color.rgb = color

    # Helper to set cell background shading
    def set_cell_background(cell, hex_color):
        tcPr = cell._tc.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        tcPr.append(shd)

    # Helper to set table cell margins (padding)
    def set_cell_margins(cell, top=50, bottom=50, left=80, right=80):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(f'''
            <w:tcMar {nsdecls("w")}>
                <w:top w:w="{top}" w:type="dxa"/>
                <w:bottom w:w="{bottom}" w:type="dxa"/>
                <w:left w:w="{left}" w:type="dxa"/>
                <w:right w:w="{right}" w:type="dxa"/>
            </w:tcMar>
        ''')
        tcPr.append(tcMar)

    # HEADER TABLE (2 columns)
    header_table = doc.add_table(rows=1, cols=2)
    header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    header_table.autofit = False
    
    cell_left = header_table.cell(0, 0)
    cell_right = header_table.cell(0, 1)
    cell_left.width = Inches(4.5)
    cell_right.width = Inches(2.97)

    # Left header
    p_title = cell_left.paragraphs[0]
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(1)
    p_title.paragraph_format.line_spacing = 1.05
    run_t = p_title.add_run("AGRONOMY AI 🌿")
    set_font(run_t, 13, bold=True, color=HEX_GREEN_DARK)

    p_tag = cell_left.add_paragraph()
    p_tag.paragraph_format.space_before = Pt(0)
    p_tag.paragraph_format.space_after = Pt(2)
    p_tag.paragraph_format.line_spacing = 1.0
    run_tag = p_tag.add_run("Your Intelligent Voice-First Agricultural Assistant")
    set_font(run_tag, 7.8, bold=True, color=HEX_GREEN_MID)

    # Right header
    p_badge = cell_right.paragraphs[0]
    p_badge.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_badge.paragraph_format.space_before = Pt(0)
    p_badge.paragraph_format.space_after = Pt(1)
    p_badge.paragraph_format.line_spacing = 1.0
    run_badge = p_badge.add_run("Great Indian AI Internship Challenge – Gnani AI")
    set_font(run_badge, 7.2, bold=True, color=HEX_GREEN_DARK)

    p_gh = cell_right.add_paragraph()
    p_gh.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_gh.paragraph_format.space_before = Pt(0)
    p_gh.paragraph_format.space_after = Pt(2)
    run_gh = p_gh.add_run("GitHub: github.com/nani3467/Plant-Disease-Detection")
    set_font(run_gh, 6.8, color=HEX_GRAY_MUTED)

    # SECTION 1 & 2: PROBLEM & SOLUTION (2-column table)
    sec12_table = doc.add_table(rows=1, cols=2)
    sec12_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell_prob = sec12_table.cell(0, 0)
    cell_sol = sec12_table.cell(0, 1)
    cell_prob.width = Inches(3.6)
    cell_sol.width = Inches(3.87)
    set_cell_background(cell_prob, "FFF7F7")
    set_cell_background(cell_sol, "F0FDF4")
    set_cell_margins(cell_prob, 40, 40, 60, 60)
    set_cell_margins(cell_sol, 40, 40, 60, 60)

    # Problem cell
    p_phead = cell_prob.paragraphs[0]
    p_phead.paragraph_format.space_before = Pt(0)
    p_phead.paragraph_format.space_after = Pt(1.5)
    run_ph = p_phead.add_run("⚠️ SECTION 1: THE PROBLEM")
    set_font(run_ph, 7.2, bold=True, color=RGBColor(185, 28, 28))

    prob_bullets = [
        "Late Disease Detection: Farmers struggle to spot infections early, causing huge crop losses.",
        "Complex Crop Selection: Balancing soil NPK, pH, and climate is difficult without guidance.",
        "Scattered Information: Lack of accessible, ICAR-grounded agricultural intelligence.",
        "Digital & Script Barriers: Traditional typing-heavy apps fail rural, low-literacy farmers."
    ]
    for b in prob_bullets:
        p_b = cell_prob.add_paragraph()
        p_b.paragraph_format.space_before = Pt(0)
        p_b.paragraph_format.space_after = Pt(1)
        p_b.paragraph_format.line_spacing = 1.05
        run_b = p_b.add_run(f"• {b}")
        set_font(run_b, 6.5, color=HEX_GRAY_TEXT)

    # Solution cell
    p_shead = cell_sol.paragraphs[0]
    p_shead.paragraph_format.space_before = Pt(0)
    p_shead.paragraph_format.space_after = Pt(1.5)
    run_sh = p_shead.add_run("🌱 SECTION 2: OUR SOLUTION")
    set_font(run_sh, 7.2, bold=True, color=HEX_GREEN_MID)

    sol_bullets = [
        "Voice-First Interface: Spoken native language dialogue powered by Gnani AI.",
        "AI Plant Diagnosis: Rapid leaf disease detection across 38 classes (MobileNetV2).",
        "Crop Recommendations: Soil NPK & climate matching for 22 crops (Random Forest, 99.5%).",
        "ICAR-Grounded Guidance: 5-part reports with organic & chemical treatments and PPE safety."
    ]
    for b in sol_bullets:
        p_b = cell_sol.add_paragraph()
        p_b.paragraph_format.space_before = Pt(0)
        p_b.paragraph_format.space_after = Pt(1)
        p_b.paragraph_format.line_spacing = 1.05
        run_b = p_b.add_run(f"• {b}")
        set_font(run_b, 6.5, color=HEX_GRAY_TEXT)

    # SECTION 3: GNANI AI INTEGRATION (HERO)
    gnani_header_p = doc.add_paragraph()
    gnani_header_p.paragraph_format.space_before = Pt(3)
    gnani_header_p.paragraph_format.space_after = Pt(2)
    run_gnh = gnani_header_p.add_run("🎙️ SECTION 3: GNANI AI INTEGRATION — SPEECH ENGINE & ACCESSIBILITY HERO")
    set_font(run_gnh, 7.8, bold=True, color=HEX_GREEN_DARK)

    # 2 speech cards
    speech_table = doc.add_table(rows=1, cols=2)
    speech_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_stt = speech_table.cell(0, 0)
    c_tts = speech_table.cell(0, 1)
    c_stt.width = Inches(3.73)
    c_tts.width = Inches(3.74)
    set_cell_background(c_stt, "F0F9FF")
    set_cell_background(c_tts, "ECFDF5")
    set_cell_margins(c_stt, 40, 40, 60, 60)
    set_cell_margins(c_tts, 40, 40, 60, 60)

    # STT Card
    p_stt_title = c_stt.paragraphs[0]
    p_stt_title.paragraph_format.space_before = Pt(0)
    p_stt_title.paragraph_format.space_after = Pt(1.5)
    run_st = p_stt_title.add_run("GNANI PRISMA | SPEECH-TO-TEXT (prisma-v3.0)")
    set_font(run_st, 7.0, bold=True, color=RGBColor(3, 105, 161))

    stt_items = [
        "Converts spoken mic audio (WAV/WebM) to text via api.vachana.ai/stt/v3.",
        "Multilingual recognition for Telugu (te-IN), Hindi (hi-IN), & English (en-IN).",
        "Enables voice commands, hands-free navigation, and typing-free diagnostics."
    ]
    for item in stt_items:
        p_i = c_stt.add_paragraph()
        p_i.paragraph_format.space_before = Pt(0)
        p_i.paragraph_format.space_after = Pt(1)
        p_i.paragraph_format.line_spacing = 1.05
        run_i = p_i.add_run(f"• {item}")
        set_font(run_i, 6.4, color=HEX_GRAY_TEXT)

    # TTS Card
    p_tts_title = c_tts.paragraphs[0]
    p_tts_title.paragraph_format.space_before = Pt(0)
    p_tts_title.paragraph_format.space_after = Pt(1.5)
    run_tt = p_tts_title.add_run("GNANI TIMBRE | TEXT-TO-SPEECH (timbre-v3.0)")
    set_font(run_tt, 7.0, bold=True, color=HEX_GREEN_MID)

    tts_items = [
        "Synthesizes AI agricultural advice into natural audio via api.vachana.ai/api/v1/tts/inference.",
        "Native vernacular personas: Lakshmi (Telugu), Shivani (Hindi), & Avinash (English).",
        "Converts 24kHz linear PCM to WAV with broadcast loudness normalization (-14 dBFS)."
    ]
    for item in tts_items:
        p_i = c_tts.add_paragraph()
        p_i.paragraph_format.space_before = Pt(0)
        p_i.paragraph_format.space_after = Pt(1)
        p_i.paragraph_format.line_spacing = 1.05
        run_i = p_i.add_run(f"• {item}")
        set_font(run_i, 6.4, color=HEX_GRAY_TEXT)

    # Workflow row
    p_wf = doc.add_paragraph()
    p_wf.paragraph_format.space_before = Pt(2.5)
    p_wf.paragraph_format.space_after = Pt(2)
    p_wf.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_wf = p_wf.add_run("Workflow: Farmer Speaks ➔ Gnani Prisma (STT) ➔ Agronomy AI (Action / Gemini) ➔ Gnani Timbre (TTS) ➔ Farmer Hears Spoken Response")
    set_font(run_wf, 6.4, bold=True, color=HEX_GREEN_DARK)

    # SECTION 4: KEY FEATURES (3x2 Table)
    feat_header_p = doc.add_paragraph()
    feat_header_p.paragraph_format.space_before = Pt(2)
    feat_header_p.paragraph_format.space_after = Pt(1.5)
    run_fth = feat_header_p.add_run("⚡ SECTION 4: KEY PLATFORM FEATURES")
    set_font(run_fth, 7.4, bold=True, color=HEX_GREEN_DARK)

    feat_table = doc.add_table(rows=2, cols=3)
    feat_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    feats = [
        ("🦠 Plant Disease Detection", "38 classes across 14+ crops via MobileNetV2 with non-plant heuristic filter. [Verified ML]"),
        ("🌾 Crop Recommendation", "Evaluates soil NPK, pH & climate for 22 crops via Random Forest at 99.5% accuracy. [Verified ML]"),
        ("📖 Botanical Guides", "22 crop cultivation manuals & 38 disease dossiers with ICAR packaging practices. [Verified]"),
        ("🎙️ Voice Assistant", "Hands-free Voice OS integrating Gnani Prisma & Timbre for navigation & audio chat. [Verified]"),
        ("🌐 Multilingual Support", "End-to-end English, Telugu (తెలుగు), & Hindi (हिन्दी) across voice, LLM & UI. [Verified]"),
        ("🧪 Fertilizer & IoT Sensing", "Interactive deficiency guides live; automated IoT telemetry & drone scouting. [In Development]")
    ]
    for idx, (ftitle, fdesc) in enumerate(feats):
        r_idx = idx // 3
        c_idx = idx % 3
        cell = feat_table.cell(r_idx, c_idx)
        cell.width = Inches(2.49)
        set_cell_margins(cell, 30, 30, 40, 40)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(1)
        p.paragraph_format.line_spacing = 1.05
        rt = p.add_run(f"{ftitle}\n")
        set_font(rt, 6.5, bold=True, color=HEX_GREEN_MID)
        rd = p.add_run(fdesc)
        set_font(rd, 5.8, color=HEX_GRAY_TEXT)

    # SECTION 5 & 6 (Tech Stack & Impact)
    bottom_table = doc.add_table(rows=1, cols=2)
    bottom_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_tech = bottom_table.cell(0, 0)
    c_imp = bottom_table.cell(0, 1)
    c_tech.width = Inches(3.73)
    c_imp.width = Inches(3.74)
    set_cell_margins(c_tech, 30, 30, 50, 50)
    set_cell_margins(c_imp, 30, 30, 50, 50)

    # Tech Stack
    p_th = c_tech.paragraphs[0]
    p_th.paragraph_format.space_before = Pt(0)
    p_th.paragraph_format.space_after = Pt(1)
    run_th = p_th.add_run("🛠️ SECTION 5: VERIFIED TECH STACK")
    set_font(run_th, 7.0, bold=True, color=HEX_GREEN_DARK)

    techs = [
        "Speech AI: Gnani Prisma v3.0 (STT) & Timbre v3.0 (TTS)",
        "Frontend: Next.js 14.0.4, React 18, TypeScript 5, Tailwind CSS",
        "Backend: Django 5.2.5, Django REST Framework 3.15, Python 3.11",
        "Database: MongoDB Atlas via django-mongodb-backend",
        "ML: PyTorch MobileNetV2 (38 diseases), scikit-learn RF (22 crops)",
        "Reasoning: Google Gemini (gemini-2.5-flash) + Local ICAR Rules"
    ]
    for t in techs:
        pt = c_tech.add_paragraph()
        pt.paragraph_format.space_before = Pt(0)
        pt.paragraph_format.space_after = Pt(0.8)
        pt.paragraph_format.line_spacing = 1.05
        rt = pt.add_run(f"• {t}")
        set_font(rt, 5.8, color=HEX_GRAY_TEXT)

    # Impact
    p_ih = c_imp.paragraphs[0]
    p_ih.paragraph_format.space_before = Pt(0)
    p_ih.paragraph_format.space_after = Pt(1)
    run_ih = p_ih.add_run("🎯 SECTION 6: IMPACT & FUTURE SCOPE")
    set_font(run_ih, 7.0, bold=True, color=HEX_GREEN_MID)

    impacts = [
        "Grassroots Inclusion: Eliminates literacy barriers with vernacular voice.",
        "Crop Protection: Early leaf diagnosis stops blights before damage spreads.",
        "Higher Yields: Data-driven crop selection prevents soil exhaustion.",
        "Future Scope: IoT soil telemetry, offline PWA, & drone scouting."
    ]
    for imp in impacts:
        pi = c_imp.add_paragraph()
        pi.paragraph_format.space_before = Pt(0)
        pi.paragraph_format.space_after = Pt(0.8)
        pi.paragraph_format.line_spacing = 1.05
        ri = pi.add_run(f"• {imp}")
        set_font(ri, 5.8, color=HEX_GRAY_TEXT)

    # FOOTER
    p_ft = doc.add_paragraph()
    p_ft.paragraph_format.space_before = Pt(3)
    p_ft.paragraph_format.space_after = Pt(0)
    p_ft.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_ft1 = p_ft.add_run("Agronomy AI • Built for Great Indian AI Internship Challenge by Gnani AI • GitHub: https://github.com/nani3467/Plant-Disease-Detection")
    set_font(r_ft1, 6.2, color=HEX_GRAY_MUTED)

    doc.save(str(DOCX_FILE))
    print(f"Saved DOCX to {DOCX_FILE}")

# ─────────────────────────────────────────────────────────────────────────────
# 4. MAIN BUILD PROCESS
# ─────────────────────────────────────────────────────────────────────────────
def main():
    # 1. Write HTML
    HTML_FILE.write_text(HTML_CONTENT, encoding="utf-8")
    print(f"Wrote HTML to {HTML_FILE}")

    # 2. Write Markdown
    MD_FILE.write_text(MD_CONTENT, encoding="utf-8")
    print(f"Wrote Markdown to {MD_FILE}")

    # 3. Build DOCX
    build_docx()

    # 4. Generate PDF via Edge Headless
    cmd = [
        EDGE_BIN,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={PDF_FILE}",
        str(HTML_FILE)
    ]
    print(f"Executing: {' '.join(cmd)}")
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("Edge returncode:", res.returncode)

    # 5. Validate PDF page count
    if PDF_FILE.exists():
        reader = pypdf.PdfReader(str(PDF_FILE))
        page_count = len(reader.pages)
        print(f"==================================================")
        print(f"PDF VALIDATION: {PDF_FILE.name}")
        print(f"TOTAL PAGE COUNT: {page_count}")
        print(f"==================================================")
        if page_count == 1:
            print("SUCCESS: PDF IS EXACTLY ONE A4 PAGE!")
        else:
            print(f"WARNING: PDF HAS {page_count} PAGES. MUST ADJUST CSS/PADDING!")
    else:
        print("ERROR: PDF was not generated!")

if __name__ == "__main__":
    main()
