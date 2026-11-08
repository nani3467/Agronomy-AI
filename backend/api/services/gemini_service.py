"""
Agronomy AI - Google Gemini Multimodal Reasoning Service
=========================================================
Uses the official Google Gen AI SDK (`google-genai`) to provide expert
agricultural reasoning, plant pathology analysis, crop recommendations,
and multimodal vision inspection of crop/plant images.

Supported Languages:
- English (en / en-IN)
- Telugu (te / te-IN / తెలుగు)
- Hindi (hi / hi-IN / हिन्दी)

Grounding:
Integrates verified project data from `CROPS_DATABASE` and `DISEASE_DATABASE`
via `retrieve_project_context` to provide accurate, crop-specific guidance
grounded in real ICAR standards and PlantVillage research.
"""

import logging
import re
from typing import List, Dict, Any, Optional
from decouple import config
from .project_context import retrieve_project_context

logger = logging.getLogger(__name__)

GEMINI_API_KEY = config('GEMINI_API_KEY', default='').strip()
GEMINI_MODEL = config('GEMINI_MODEL', default='gemini-3.5-flash').strip()

# Supported Gemini Multimodal Models in order of preference
CANDIDATE_MODELS = [
    GEMINI_MODEL,
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
]

# Comprehensive Agricultural System Prompt for Indian Farmers & Agronomy
AGRICULTURAL_SYSTEM_PROMPT = """You are Agronomy AI, an expert agricultural advisor, certified plant pathologist, and crop scientist.
Your mission is to provide accurate, practical, empathetic, and culturally relevant agricultural guidance to farmers, growers, and agricultural professionals across India and globally.

CORE ADVISORY GUIDELINES:
1. Communication Style & Tone:
   - Speak respectfully, practically, clearly, and conversationally.
   - Use straightforward language accessible to grassroots farmers, while maintaining botanical and scientific precision.
   - For simple questions, provide concise, clear answers without unnecessary fluff.
   - For detailed questions, use structured explanations with clear headings and bullet points.
   - Avoid repeating the same introduction or repeating the user's question unnecessarily.

2. Multilingual Fluency:
   - Understand English, Telugu (తెలుగు), and Hindi (हिन्दी) deeply.
   - Respond completely in the user's selected language:
     * Telugu ('te' or Telugu script): Respond in fluent, natural Telugu using standard agricultural terms (e.g., యూరియా, డీఏపీ, బూజు తెగులు, బూడిద తెగులు, జీవామృతం, విత్తన శుద్ధి).
     * Hindi ('hi' or Devanagari script): Respond in fluent, natural Hindi using standard agricultural terms (e.g., यूरिया, डीएपी, झुलसा रोग, जीवामृत, बीज उपचार).
     * English ('en'): Respond in professional, practical English.
   - Never randomly switch languages mid-response.

3. Context-Aware Conversations & Follow-ups:
   - Understand pronouns and conversational context from previous turns (e.g., if previously discussing tomatoes, "it" or "them" refers to tomatoes and their diseases).
   - Address the user's specific crop or problem directly without giving generic, unrelated advice.

4. Responsible Agronomic Recommendations:
   - Tailor fertilizer guidance to soil testing (Soil Health Card), crop growth stages (Basal, Tillering, Panicle/Flowering), and balanced N-P-K nutrition.
   - Distinguish general best practices from confirmed laboratory diagnoses.
   - Emphasize Integrated Pest Management (IPM): Cultural, Mechanical, Biological remedies first (e.g., Neem oil, Trichoderma viride, Pseudomonas fluorescens, crop rotation).
   - For chemical treatments, recommend only standard approved active ingredients with accurate dilution guidelines (e.g., Mancozeb 75% WP @ 2-2.5 g/L).
   - ALWAYS include essential safety precautions when chemicals are mentioned: protective mask, gloves, spray timing (early morning/late evening), and Pre-Harvest Intervals (PHI).
   - NEVER invent synthetic chemicals, fake disease names, or arbitrary dosages. Clearly communicate uncertainty when symptoms could indicate multiple problems.

5. Multimodal Vision Inspection:
   - When a crop or leaf photograph is provided, examine visual symptoms (chlorosis, necrosis, lesions, halo patterns, mildew, insect feeding, wilting).
   - State the likely crop and the probable pathology or nutrient deficiency.
   - If the image is blurry, ambiguous, or insufficient for definitive diagnosis, clearly explain what is visible and ask for a well-lit close-up.
"""


class GeminiService:
    """Service client for Google Gemini Multimodal API using official google-genai SDK."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        self.api_key = (api_key or GEMINI_API_KEY or '').strip()
        self.model_name = (model_name or GEMINI_MODEL or 'gemini-2.5-flash').strip()
        self._client = None

    @property
    def client(self):
        """Lazily initialize Google GenAI Client on first actual inference call."""
        if self._client is None and self.is_configured():
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
                logger.info("[Agronomy AI] Gemini client initialized with model: %s", self.model_name)
            except Exception as exc:
                logger.error("[Agronomy AI] Failed to initialize Google GenAI Client: %s", exc)
                self._client = None
        return self._client

    def is_configured(self) -> bool:
        """Check if a valid Gemini API key is configured."""
        return bool(self.api_key and len(self.api_key) > 5)

    def get_model_name(self) -> str:
        """Return the active model name."""
        return self.model_name

    def _sanitize_history(self, history: Optional[List[Dict[str, str]]]) -> List[Any]:
        """
        Sanitize and format conversation history into valid google-genai Contents.
        Ensures alternating 'user' and 'model' turns without consecutive duplicates
        and filters out system error messages.
        """
        if not history:
            return []

        from google.genai import types

        cleaned_turns: List[types.Content] = []
        last_role = None

        # Process the last 8 items to stay focused and responsive
        for item in history[-8:]:
            raw_role = (item.get('role') or 'user').lower()
            content_str = (item.get('content') or '').strip()

            # Skip empty, welcome, or error messages
            if not content_str or content_str.startswith('⚠️') or 'Diagnostic Error' in content_str:
                continue

            genai_role = 'model' if raw_role in ['assistant', 'model', 'bot'] else 'user'

            # Avoid consecutive duplicate roles (Google GenAI requires strict alternation)
            if genai_role == last_role:
                # Append text to previous turn
                if cleaned_turns:
                    prev_parts = cleaned_turns[-1].parts or []
                    prev_parts.append(types.Part.from_text(text=f"\n{content_str}"))
                continue

            cleaned_turns.append(
                types.Content(
                    role=genai_role,
                    parts=[types.Part.from_text(text=content_str)]
                )
            )
            last_role = genai_role

        # Google GenAI requires history to start with 'user'
        while cleaned_turns and cleaned_turns[0].role != 'user':
            cleaned_turns.pop(0)

        # Google GenAI requires history to end with 'model' so current turn can be 'user'
        while cleaned_turns and cleaned_turns[-1].role != 'model':
            cleaned_turns.pop()

        return cleaned_turns

    def generate_response(
        self,
        prompt: str,
        image_bytes: Optional[bytes] = None,
        mime_type: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        language: str = 'en',
        context_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Generate multimodal agricultural response via Google Gemini API.

        :param prompt: User question or text instruction
        :param image_bytes: Optional raw bytes of uploaded plant/crop image
        :param mime_type: MIME type of image (image/jpeg, image/png, image/webp)
        :param history: Prior conversation history [{'role': 'user'|'assistant'|'model', 'content': str}]
        :param language: Target language ('en', 'te', 'hi')
        :param context_data: Optional telemetry dictionary from plant scan or recommendation
        :return: Dict containing 'success', 'reply', 'model', 'source', etc.
        """
        if not self.is_configured():
            return {
                'success': False,
                'code': 'GEMINI_NOT_CONFIGURED',
                'error': (
                    "Google Gemini API key is not configured on the server. "
                    "Please add a valid GEMINI_API_KEY in green-guardian-ml/backend/.env to enable live AI responses."
                ),
                'source': 'google_gemini',
            }

        try:
            from google import genai
            from google.genai import types

            if self._client is None:
                self._client = genai.Client(api_key=self.api_key)

            clean_prompt = (prompt or '').strip()

            # 1. Retrieve Project Ground Truth Knowledge (RAG)
            project_grounding = retrieve_project_context(clean_prompt, language=language)

            # 2. Build Target Language Instruction
            lang_instruction = {
                'te': "CRITICAL: Respond completely in Telugu (తెలుగు). Use natural, fluent Telugu agricultural terminology.",
                'hi': "CRITICAL: Respond completely in Hindi (हिन्दी). Use natural, fluent Hindi agricultural terminology.",
                'en': "CRITICAL: Respond in clear, professional, accessible English.",
            }.get((language or 'en').lower()[:2], "CRITICAL: Respond in clear, professional English.")

            system_instruction = f"{AGRICULTURAL_SYSTEM_PROMPT}\n\nTARGET OUTPUT LANGUAGE FOR THIS TURN: {lang_instruction}"

            if project_grounding:
                system_instruction += f"\n\n{project_grounding}"

            if context_data:
                system_instruction += f"\n\nSCAN / SENSOR TELEMETRY CONTEXT:\n{context_data}"

            config_obj = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3,
                top_p=0.95,
            )

            # 3. Prepare Current Turn Content Parts
            current_parts: List[types.Part] = []

            if image_bytes:
                img_mime = mime_type or 'image/jpeg'
                if img_mime not in ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']:
                    img_mime = 'image/jpeg'
                current_parts.append(types.Part.from_bytes(data=image_bytes, mime_type=img_mime))

            if not clean_prompt and image_bytes:
                clean_prompt = (
                    "Please inspect this crop/plant photograph in detail. "
                    "Identify the plant, diagnose visible disease symptoms, pest infestations, or nutrient deficiencies, "
                    "and provide immediate recommendations with organic and safe chemical treatment options."
                )
            elif not clean_prompt:
                clean_prompt = "Hello Agronomy AI, what agricultural advice or guidance can you provide today?"

            current_parts.append(types.Part.from_text(text=clean_prompt))

            # 4. Assemble Sanitized Multi-Turn Contents
            contents: List[types.Content] = []
            sanitized_history = self._sanitize_history(history)
            contents.extend(sanitized_history)

            # Append current turn as 'user'
            contents.append(
                types.Content(
                    role='user',
                    parts=current_parts
                )
            )

            # 5. Model Execution with Fallback Chain
            # Deduplicate candidate models
            models_to_try = []
            for m in CANDIDATE_MODELS:
                if m and m not in models_to_try:
                    models_to_try.append(m)

            last_exception = None
            response = None
            model_used = None

            for candidate_model in models_to_try:
                try:
                    logger.info(
                        "[Agronomy AI] Calling Gemini model '%s' | image=%s | lang=%s | turns=%d",
                        candidate_model,
                        bool(image_bytes),
                        language,
                        len(contents),
                    )

                    response = self._client.models.generate_content(
                        model=candidate_model,
                        contents=contents,
                        config=config_obj,
                    )
                    model_used = candidate_model
                    break  # Succeeded
                except Exception as model_err:
                    err_str = str(model_err)
                    logger.warning(
                        "[Agronomy AI] Model '%s' failed with error: %s. Checking fallback model...",
                        candidate_model,
                        err_str
                    )
                    last_exception = model_err
                    # If error is invalid API key, do not retry other models as all will fail
                    if 'API_KEY_INVALID' in err_str or 'API key not valid' in err_str:
                        return {
                            'success': False,
                            'code': 'API_KEY_INVALID',
                            'error': (
                                "The configured Google Gemini API key is invalid or unrecognized. "
                                "Please check your GEMINI_API_KEY in backend/.env."
                            ),
                            'source': 'google_gemini',
                        }

            if response is None:
                raise last_exception or Exception("All candidate Gemini models failed to generate a response.")

            # 6. Extract Response Text
            reply_text = ''
            if hasattr(response, 'text') and response.text:
                reply_text = response.text.strip()
            elif hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    reply_text = ''.join(
                        getattr(p, 'text', '') for p in candidate.content.parts if hasattr(p, 'text')
                    ).strip()

            if not reply_text:
                return {
                    'success': False,
                    'code': 'EMPTY_RESPONSE',
                    'error': "I was unable to formulate an answer for this specific query. Please try rephrasing your question.",
                    'source': 'google_gemini',
                }

            return {
                'success': True,
                'reply': reply_text,
                'response': reply_text,
                'model': model_used,
                'source': 'google_gemini',
                'has_image': bool(image_bytes),
                'language': language,
                'grounded': bool(project_grounding),
            }

        except Exception as exc:
            err_msg = str(exc)
            logger.error("[Agronomy AI] Gemini API execution exception: %s", err_msg, exc_info=True)

            code = 'GEMINI_API_ERROR'
            user_friendly_error = "I am unable to generate a response right now. Please try again."

            if 'RESOURCE_EXHAUSTED' in err_msg or '429' in err_msg or 'quota' in err_msg.lower():
                code = 'QUOTA_EXCEEDED'
                user_friendly_error = (
                    "Gemini API rate limit or quota has been reached. Please wait a moment and try again."
                )
            elif 'API_KEY_INVALID' in err_msg or 'API key not valid' in err_msg:
                code = 'API_KEY_INVALID'
                user_friendly_error = (
                    "The configured Google Gemini API key is invalid. Please verify GEMINI_API_KEY in backend/.env."
                )
            elif 'deadline' in err_msg.lower() or 'timeout' in err_msg.lower():
                code = 'TIMEOUT'
                user_friendly_error = (
                    "The request to Google Gemini timed out. Please check your network connection and try again."
                )

            return {
                'success': False,
                'code': code,
                'error': user_friendly_error,
                'source': 'google_gemini',
            }

    def understand_voice_command(
        self,
        command: str,
        current_page: str = '/',
        available_actions: Optional[List[Dict[str, Any]]] = None,
        active_workflow: Optional[Dict[str, Any]] = None,
        language: str = 'en',
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Intelligently classify user voice command into a structured VOS execution payload.
        Powered by Google Gemini with fast-path local pattern matching fallback.
        """
        import json
        clean_cmd = (command or '').strip()
        if not clean_cmd:
            return {
                'success': False,
                'intent': 'UNKNOWN',
                'target': 'unknown',
                'parameters': {},
                'language': language,
                'spoken_response': "I didn't catch that. Could you please repeat?",
                'confidence': 0.0,
                'needs_confirmation': False,
            }

        # ── Fast Local Matcher for Instant Responsiveness ──
        lower_cmd = clean_cmd.lower()

        # 1. Stop Voice OS completely
        if any(w in lower_cmd for w in ['stop voice os', 'exit voice os', 'turn off voice os', 'close voice os', 'stop vos', 'వాయిస్ ఆపు', 'వాయిస్ ఓఎస్ ఆపు', 'वॉयस बंद करो', 'वॉयस ओएस बंद करो']):
            resp = "Voice OS stopped." if language == 'en' else ("వాయిస్ ఓఎస్ ఆపివేయబడింది." if language == 'te' else "वॉयस ओएस बंद कर दिया गया है।")
            return {
                'success': True,
                'intent': 'STOP_VOICE_OS',
                'action': 'stop_voice_os',
                'target': 'stop_voice_os',
                'parameters': {},
                'language': language,
                'spoken_response': resp,
                'confidence': 1.0,
                'requires_confirmation': False,
            }

        # 1b. Stop / Silence
        if lower_cmd in ['stop speaking', 'be quiet', 'shut up', 'pause', 'ఆపు', 'వద్దు', 'रुको', 'चुप रहो']:
            return {
                'success': True,
                'intent': 'STOP_SPEAKING',
                'action': 'stop_speaking',
                'target': 'stop_speaking',
                'parameters': {},
                'language': language,
                'spoken_response': 'Stopped.',
                'confidence': 1.0,
                'requires_confirmation': False,
            }

        # 1c. Confirmations & Cancellations
        if any(w == lower_cmd or lower_cmd.startswith(w) for w in ['yes', 'okay', 'ok', 'do it', 'proceed', 'confirm', 'అవును', 'సరే', 'హా', 'ఖచ్చితంగా', 'हाँ', 'पुष्टि', 'ठीक है']):
            return {
                'success': True,
                'intent': 'CONFIRM_ACTION',
                'action': 'confirm_action',
                'target': 'confirm',
                'parameters': {},
                'language': language,
                'spoken_response': 'Confirmed.' if language == 'en' else ('నిర్ధారించబడింది.' if language == 'te' else 'पुष्टि की गई।'),
                'confidence': 0.99,
                'requires_confirmation': False,
            }

        if any(w == lower_cmd or lower_cmd.startswith(w) for w in ['no', 'cancel', 'abort', 'వద్దు', 'రద్దు', 'नहीं', 'रद्द']):
            return {
                'success': True,
                'intent': 'CANCEL_ACTION',
                'action': 'cancel_action',
                'target': 'cancel',
                'parameters': {},
                'language': language,
                'spoken_response': 'Cancelled.' if language == 'en' else ('రద్దు చేయబడింది.' if language == 'te' else 'रद्द किया गया।'),
                'confidence': 0.99,
                'requires_confirmation': False,
            }

        # 1d. Repeat that
        if any(w in lower_cmd for w in ['repeat that', 'repeat', 'say that again', 'మళ్ళీ చెప్పు', 'మరలా చెప్పు', 'फिर से बताओ', 'दोबारा बोलो']):
            return {
                'success': True,
                'intent': 'REPEAT_LAST',
                'action': 'repeat_last',
                'target': 'repeat',
                'parameters': {},
                'language': language,
                'spoken_response': 'Repeating.',
                'confidence': 0.98,
                'requires_confirmation': False,
            }

        # 2. Disease Scanning Specific Multi-Turn Voice Controls
        if any(w in lower_cmd for w in ['scan my plant', 'scan plant', 'plant scan', 'నా మొక్కను స్కాన్ చేయి', 'మొక్క స్కాన్ చేయి', 'పంట స్కాన్ చేయి', 'मेरा पौधा स्कैन करो', 'पौधा स्कैन करो', 'पौधे की जांच करो']):
            resp = (
                "Would you like to take a photo or upload an image from your gallery?"
                if language == 'en' else (
                    "మీరు ఫోటో తీయాలనుకుంటున్నారా లేదా మీ గ్యాలరీ నుండి చిత్రాన్ని అప్‌లోడ్ చేయాలనుకుంటున్నారా?"
                    if language == 'te' else
                    "क्या आप फोटो लेना चाहते हैं या गैलरी से छवि अपलोड करना चाहते हैं?"
                )
            )
            return {
                'success': True,
                'intent': 'NAVIGATE',
                'action': 'start_disease_workflow',
                'target': '/scanning',
                'parameters': {'workflow': 'disease_scan'},
                'language': language,
                'spoken_response': resp,
                'confidence': 0.99,
                'requires_confirmation': False,
            }

        # Camera facing selections
        if any(w in lower_cmd for w in ['back camera', 'rear camera', 'back', 'వెనుక కెమెరా', 'రియర్ కెమెరా', 'బ్యాక్ కెమెరా', 'बैक कैमरा', 'पिछला कैमरा']):
            resp = "Opening rear camera. Say capture to take the photo." if language == 'en' else ("వెనుక కెమెరా తెరవబడింది. ఫోటో తీయడానికి క్యాప్చర్ అని చెప్పండి." if language == 'te' else "बैक कैमरा खोला गया। फोटो खींचने के लिए कैप्चर कहें।")
            return {
                'success': True,
                'intent': 'OPEN_CAMERA',
                'action': 'open_back_camera',
                'target': 'open_camera',
                'parameters': {'camera': 'environment'},
                'language': language,
                'spoken_response': resp,
                'confidence': 0.99,
                'requires_confirmation': False,
            }

        if any(w in lower_cmd for w in ['front camera', 'front', 'selfie camera', 'ముందు కెమెరా', 'ఫ్రంట్ కెమెరా', 'फ्रंट कैमरा', 'सामने का कैमरा']):
            resp = "Opening front camera. Say capture to take the photo." if language == 'en' else ("ముందు కెమెరా తెరవబడింది. ఫోటో తీయడానికి క్యాప్చర్ అని చెప్పండి." if language == 'te' else "फ्रंट कैमरा खोला गया। फोटो खींचने के लिए कैप्चर कहें।")
            return {
                'success': True,
                'intent': 'OPEN_CAMERA',
                'action': 'open_front_camera',
                'target': 'open_camera',
                'parameters': {'camera': 'user'},
                'language': language,
                'spoken_response': resp,
                'confidence': 0.99,
                'requires_confirmation': False,
            }

        # Take photo question
        if lower_cmd in ['take a photo', 'take photo', 'use camera', 'open camera', 'ఫోటో తీయి', 'కెమెరా తెరువు', 'फोटो खींचो', 'कैमरा खोलो'] or (any(w in lower_cmd for w in ['take a photo', 'take photo']) and 'capture' not in lower_cmd):
            resp = (
                "Would you like to use the front camera or back camera?"
                if language == 'en' else (
                    "మీరు ముందు కెమెరా లేదా వెనుక కెమెరా ఉపయోగించాలనుకుంటున్నారా?"
                    if language == 'te' else
                    "क्या आप फ्रंट कैमरा या बैक कैमरा का उपयोग करना चाहते हैं?"
                )
            )
            return {
                'success': True,
                'intent': 'OPEN_CAMERA',
                'action': 'prompt_camera_facing',
                'target': 'open_camera',
                'parameters': {},
                'language': language,
                'spoken_response': resp,
                'confidence': 0.98,
                'requires_confirmation': False,
            }

        if any(w in lower_cmd for w in ['capture', 'capture photo', 'snap photo', 'click photo', 'shoot photo', 'snap', 'క్యాప్చర్', 'క్లిక్ చేయి', 'कैप्चर', 'फोटो लो']):
            resp = "Capturing photo." if language == 'en' else ("ఫోటో తీస్తున్నాను." if language == 'te' else "फ़ोटो खींच रहा हूँ।")
            return {
                'success': True,
                'intent': 'CAPTURE_IMAGE',
                'action': 'capture_plant_photo',
                'target': 'capture_photo',
                'parameters': {'camera': 'environment'},
                'language': language,
                'spoken_response': resp,
                'confidence': 0.99,
                'requires_confirmation': False,
            }

        if any(w in lower_cmd for w in ['analyze this image', 'analyze it', 'yes, analyze it', 'yes analyze it', 'analyze', 'diagnose', 'ఈ చిత్రాన్ని విశ్లేషించు', 'విశ్లేషించు', 'రోగం తనిఖీ చేయి', 'इसका विश्लेषण करो', 'जांच करो']):
            resp = "Analyzing plant image for diseases." if language == 'en' else ("మొక్క తెగులును విశ్లేషిస్తున్నాను." if language == 'te' else "पौधे की बीमारी का विश्लेषण कर रहे हैं।")
            return {
                'success': True,
                'intent': 'SUBMIT_FORM',
                'action': 'submit_scan',
                'target': 'submit_scan',
                'parameters': {},
                'language': language,
                'spoken_response': resp,
                'confidence': 0.98,
                'requires_confirmation': False,
            }

        if any(w in lower_cmd for w in ['retake', 'retake photo', 'try again', 'మళ్ళీ తీయి', 'మరలా ఫోటో', 'फिर से खींचो']):
            resp = "Returning to camera preview. Say capture to take the photo." if language == 'en' else ("కెమెరా ప్రివ్యూకి తిరిగి వెళ్తున్నాను. ఫోటో తీయడానికి క్యాప్చర్ అని చెప్పండి." if language == 'te' else "कैमरा पूर्वावलोकन पर वापस जा रहे हैं। फोटो खींचने के लिए कैप्चर कहें।")
            return {
                'success': True,
                'intent': 'RETAKE_PHOTO',
                'action': 'retake_photo',
                'target': 'retake_photo',
                'parameters': {},
                'language': language,
                'spoken_response': resp,
                'confidence': 0.98,
                'requires_confirmation': False,
            }

        if any(w in lower_cmd for w in ['upload another image', 'no, upload another image', 'upload from gallery', 'from gallery', 'choose from gallery', 'open gallery', 'upload photo', 'upload picture', 'choose photo', 'గ్యాలరీ తెరువు', 'గ్యాలరీ', 'ఫోటో అప్‌లోడ్', 'गैलरी खोलो', 'फ़ोटो अपलोड', 'गैलरी']):
            resp = "Please select an image from your gallery." if language == 'en' else ("దయచేసి మీ గ్యాలరీ నుండి చిత్రాన్ని ఎంచుకోండి." if language == 'te' else "कृपया अपनी गैलरी से एक छवि चुनें।")
            return {
                'success': True,
                'intent': 'OPEN_GALLERY',
                'action': 'open_gallery',
                'target': 'open_gallery',
                'parameters': {},
                'language': language,
                'spoken_response': resp,
                'confidence': 0.98,
                'requires_confirmation': False,
            }

        if any(w in lower_cmd for w in ['tell me how to treat it', 'how to treat it', 'explain treatment', 'treatment recommendations', 'చికిత్స చెప్పు', 'ఎలా నయం చేయాలి', 'उपचार बताओ', 'इलाज बताओ']):
            return {
                'success': True,
                'intent': 'EXPLAIN_CONTENT',
                'action': 'explain_treatment',
                'target': 'explain_treatment',
                'parameters': {},
                'language': language,
                'spoken_response': 'Here is the treatment advice for the detected disease.',
                'confidence': 0.98,
                'requires_confirmation': False,
            }

        if any(w in lower_cmd for w in ['show the disease result', 'show disease result', 'show result', 'ఫలితం చూపించు', 'परिणाम दिखाओ']):
            return {
                'success': True,
                'intent': 'READ_RESULT',
                'action': 'read_result',
                'target': 'read_result',
                'parameters': {},
                'language': language,
                'spoken_response': 'Here is the diagnosis result.',
                'confidence': 0.98,
                'requires_confirmation': False,
            }

        # 3. Crop Recommendation Multi-turn & Field Controls
        if any(w in lower_cmd for w in ['recommend a crop for my soil', 'recommend a crop', 'recommend crop', 'crop advice', 'suggest crop', 'నా నేలకు పంట సిఫార్సు చేయి', 'పంట సిఫార్సు చేయి', 'मेरी मिट्टी के लिए फसल बताओ', 'फसल सिफारिश करो']):
            resp = (
                "Please tell me your soil nutrient values. What is the Nitrogen content in your soil?"
                if language == 'en' else (
                    "దయచేసి మీ నేల పోషకాల వివరాలు చెప్పండి. మీ నేలలో నత్రజని పరిమాణం ఎంత?"
                    if language == 'te' else
                    "कृपया अपनी मिट्टी के पोषक तत्वों की जानकारी दें। आपकी मिट्टी में नाइट्रोजन की मात्रा कितनी है?"
                )
            )
            return {
                'success': True,
                'intent': 'START_WORKFLOW',
                'action': 'start_crop_workflow',
                'target': '/crop-recommendation',
                'parameters': {'workflow': 'crop_recommendation'},
                'language': language,
                'spoken_response': resp,
                'confidence': 0.99,
                'requires_confirmation': False,
            }

        if any(w in lower_cmd for w in ['submit and recommend crops', 'recommend crops', 'submit crop form', 'పంటలను సిఫార్సు చేయి', 'సమర్పించు', 'फसल की सिफारिश करो', 'सबमिट करो']):
            resp = "Recommending best crops for your soil conditions." if language == 'en' else ("మీ నేల పరిస్థితులకు ఉత్తమ పంటలను సిఫార్సు చేస్తున్నాను." if language == 'te' else "आपकी मिट्टी के लिए सर्वोत्तम फसलों की सिफारिश कर रहे हैं।")
            return {
                'success': True,
                'intent': 'SUBMIT_FORM',
                'action': 'submit_crop_form',
                'target': 'submit_crop_form',
                'parameters': {},
                'language': language,
                'spoken_response': resp,
                'confidence': 0.98,
                'requires_confirmation': False,
            }

        if any(w in lower_cmd for w in ['explain the recommended crops', 'explain recommended crops', 'explain crops', 'సిఫార్సు చేసిన పంటలను వివరించు', 'सिफारिश की गई फसल बताओ']):
            return {
                'success': True,
                'intent': 'READ_RESULT',
                'action': 'read_crop_result',
                'target': 'read_crop_result',
                'parameters': {},
                'language': language,
                'spoken_response': 'Explaining the recommended crops.',
                'confidence': 0.98,
                'requires_confirmation': False,
            }

        # 2b. Scroll Commands
        if any(w in lower_cmd for w in ['scroll down', 'scroll bottom', 'move down', 'page down', 'క్రిందికి స్క్రోల్', 'కిందికి', 'नीचे स्क्रॉल', 'नीचे जाओ']):
            resp = "Scrolling down." if language == 'en' else ("క్రిందికి స్క్రోల్ చేస్తున్నాను." if language == 'te' else "नीचे स्क्रॉल कर रहा हूँ।")
            return {
                'success': True,
                'intent': 'SCROLL',
                'target': 'scroll_down',
                'parameters': {'direction': 'down'},
                'language': language,
                'spoken_response': resp,
                'confidence': 0.99,
                'needs_confirmation': False,
            }

        if any(w in lower_cmd for w in ['scroll up', 'scroll top', 'move up', 'page up', 'పైకి స్క్రోల్', 'పైకి వెళ్ళు', 'ऊपर स्क्रॉल', 'ऊपर जाओ']):
            resp = "Scrolling up." if language == 'en' else ("పైకి స్క్రోల్ చేస్తున్నాను." if language == 'te' else "ऊपर स्क्रॉल कर रहा हूँ।")
            return {
                'success': True,
                'intent': 'SCROLL',
                'target': 'scroll_up',
                'parameters': {'direction': 'up'},
                'language': language,
                'spoken_response': resp,
                'confidence': 0.99,
                'needs_confirmation': False,
            }

        # 2c. Navigation Back / History
        if any(w in lower_cmd for w in ['go back', 'navigate back', 'previous page', 'take me back', 'వెనక్కి వెళ్ళు', 'వెనుకకు', 'పీచే', 'पीछे जाओ', 'वापस जाओ']):
            resp = "Going back." if language == 'en' else ("వెనక్కి వెళ్తున్నాను." if language == 'te' else "पीछे जा रहे हैं।")
            return {
                'success': True,
                'intent': 'GO_BACK',
                'target': 'go_back',
                'parameters': {},
                'language': language,
                'spoken_response': resp,
                'confidence': 0.99,
                'needs_confirmation': False,
            }

        # 2d. Page Reader Aloud
        if any(w in lower_cmd for w in ['read this page', 'read page', 'read aloud', 'summarize page', 'what is on this page', 'ఈ పేజీ చదువు', 'పేజీ వివరించు', 'यह पेज पढ़ो']):
            return {
                'success': True,
                'intent': 'READ_PAGE',
                'target': 'read_page',
                'parameters': {},
                'language': language,
                'spoken_response': 'Reading current page.',
                'confidence': 0.98,
                'needs_confirmation': False,
            }

        # 2e. Form Submission Shortcuts
        if any(w in lower_cmd for w in ['recommend crops', 'recommend crop', 'suggest crops', 'find best crop', 'predict crop', 'పంట సిఫార్సు చేయి', 'ఉత్తమ పంట చెప్పు', 'फसल सिफारिश करो', 'फसल बताओ']):
            resp = "Recommending best crops for your soil conditions." if language == 'en' else ("మీ నేల పరిస్థితులకు ఉత్తమ పంటలను సిఫార్సు చేస్తున్నాను." if language == 'te' else "आपकी मिट्टी के लिए सर्वोत्तम फसलों की सिफारिश कर रहे हैं।")
            return {
                'success': True,
                'intent': 'SUBMIT_FORM',
                'target': 'submit_crop_form',
                'parameters': {},
                'language': language,
                'spoken_response': resp,
                'confidence': 0.96,
                'needs_confirmation': False,
            }

        # 2f. Search Shortcuts (e.g., "search for rice", "find tomato")
        search_match = re.search(r'(?:search for|search|find|look up|గురించి వెతుకు|శోధించు|खोजो|ढूंढो)\s+([a-zA-Z0-9\s]+)', clean_cmd, re.IGNORECASE)
        if search_match:
            raw_query = search_match.group(1).strip()
            # Clean up common stopwords
            query_clean = re.sub(r'^(?:for|the|a|an|about)\s+', '', raw_query, flags=re.IGNORECASE).strip()
            if query_clean and len(query_clean) >= 2:
                resp = f"Searching for {query_clean}." if language == 'en' else (f"{query_clean} కోసం శోధిస్తున్నాను." if language == 'te' else f"{query_clean} के लिए खोज रहे हैं।")
                return {
                    'success': True,
                    'intent': 'SEARCH',
                    'target': 'search_crops' if current_page == '/crops' else ('search_diseases' if current_page == '/diseases' else 'search_query'),
                    'parameters': {'query': query_clean},
                    'language': language,
                    'spoken_response': resp,
                    'confidence': 0.95,
                    'needs_confirmation': False,
                }

        # 2g. Soil Parameter Filling (e.g., "fill nitrogen as 80", "nitrogen 80", "set ph to 6.5")
        field_match = re.search(
            r'(?:fill|set|enter|put|my)?\s*(nitrogen|phosphorus|potassium|temperature|humidity|ph|rainfall|నత్రజని|భాస్వరం|పొటాషియం|ఉష్ణోగ్రత|తేమ|పీహెచ్|వర్షపాతం|नाइट्रोजन|फास्फोरस|पोटेशियम|तापमान|नमी|पीएच|वर्षा)\s*(?:as|to|is|value|=)?\s*([0-9]+(?:\.[0-9]+)?)',
            clean_cmd,
            re.IGNORECASE
        )
        if field_match:
            raw_field = field_match.group(1).lower()
            val = field_match.group(2)
            field_name_map = {
                'nitrogen': 'nitrogen', 'నత్రజని': 'nitrogen', 'नाइट्रोजन': 'nitrogen',
                'phosphorus': 'phosphorus', 'భాస్వరం': 'phosphorus', 'फास्फोरस': 'phosphorus',
                'potassium': 'potassium', 'పొటాషియం': 'potassium', 'पोटेशियम': 'potassium',
                'temperature': 'temperature', 'ఉష్ణోగ్రత': 'temperature', 'तापमान': 'temperature',
                'humidity': 'humidity', 'తేమ': 'humidity', 'नमी': 'humidity',
                'ph': 'ph', 'పీహెచ్': 'ph', 'पीएच': 'ph',
                'rainfall': 'rainfall', 'వర్షపాతం': 'rainfall', 'वर्षा': 'rainfall',
            }
            std_field = field_name_map.get(raw_field, raw_field)
            resp = f"{std_field.capitalize()} set to {val}." if language == 'en' else (f"{std_field} విలువ {val} గా సెట్ చేయబడింది." if language == 'te' else f"{std_field} का मान {val} सेट किया गया।")
            return {
                'success': True,
                'intent': 'FILL_FIELD',
                'target': std_field,
                'parameters': {'field': std_field, 'value': val},
                'language': language,
                'spoken_response': resp,
                'confidence': 0.98,
                'needs_confirmation': False,
            }

        # 3. Direct Navigation Aliases
        nav_routes = [
            ('/scanning', ['scan', 'scanning', 'disease scan', 'plant scan', 'leaf scan', 'disease scanner', 'తెగులు స్కాన్', 'ఆకుల స్కాన్', 'రోగ స్కాన్']),
            ('/crop-recommendation', ['crop recommend', 'recommend crop', 'crop recommendation', 'soil recommendation', 'crop recommender', 'పంట సిఫార్సు', 'భూమి సిఫార్సు', 'फसल सिफारिश']),
            ('/crops', ['crop guides', 'crop guide', 'crop library', 'cultivation guide', 'crops', 'పంట మార్గదర్శకాలు', 'పంటల సమాచారం', 'సాగు పద్ధతులు', 'फसल मार्गदर्शिका', 'फसल लाइब्रेरी']),
            ('/weather', ['weather', 'forecast', 'rain', 'వాతావరణం', 'వర్షం', 'मौसम']),
            ('/diseases', ['disease library', 'disease encyclopedia', 'diseases', 'తెగుళ్ళ సమాచారం', 'రోగ సూచి', 'बीमारी लाइब्रेरी']),
            ('/dashboard', ['dashboard', 'analytics', 'statistics', 'డ్యాష్‌బోర్డు', 'విశ్లేషణ', 'डैशबोर्ड']),
            ('/fertilizer', ['fertilizer', 'fertiliser', 'npk', 'urea', 'ఎరువు', 'ఎరువుల గైడ్', 'उर्वरक', 'खाद']),
            ('/history', ['history', 'past scans', 'చరిత్ర', 'ఇతిహాసం', 'इतिहास']),
            ('/how-to-use', ['help', 'guide', 'faq', 'how to use', 'సహాయం', 'మదద్', 'मदद']),
            ('/', ['home', 'homepage', 'main page', 'హోమ్‌', 'ప్రధాన పేజీ', 'होम']),
        ]

        # Check if user explicitly wants to navigate
        is_nav_command = any(k in lower_cmd for k in ['go to', 'open', 'navigate to', 'take me to', 'వెళ్ళు', 'ఓపెన్ చేయి', 'చూపించు', 'जाओ', 'खोलो'])
        for route_path, aliases in nav_routes:
            if any(alias in lower_cmd for alias in aliases) and (is_nav_command or len(lower_cmd.split()) <= 4):
                page_name = route_path.replace('/', '').replace('-', ' ').title() or "Home"
                resp = f"Navigating to {page_name}." if language == 'en' else (f"{page_name} పేజీకి వెళ్తున్నాను." if language == 'te' else f"{page_name} पेज पर जा रहे हैं।")
                return {
                    'success': True,
                    'intent': 'NAVIGATE',
                    'target': route_path,
                    'parameters': {'path': route_path},
                    'language': language,
                    'spoken_response': resp,
                    'confidence': 0.95,
                    'needs_confirmation': False,
                }

        # 4. Language switches
        if 'telugu' in lower_cmd or 'తెలుగు' in lower_cmd:
            return {
                'success': True,
                'intent': 'CHANGE_LANGUAGE',
                'target': 'change_language',
                'parameters': {'language': 'te'},
                'language': 'te',
                'spoken_response': 'భాష తెలుగులోకి మార్చబడింది. నేను మీకు ఎలా సహాయపడగలను?',
                'confidence': 1.0,
                'needs_confirmation': False,
            }
        if 'hindi' in lower_cmd or 'हिन्दी' in lower_cmd or 'हिंदी' in lower_cmd:
            return {
                'success': True,
                'intent': 'CHANGE_LANGUAGE',
                'target': 'change_language',
                'parameters': {'language': 'hi'},
                'language': 'hi',
                'spoken_response': 'भाषा हिन्दी में बदल दी गई है। मैं आपकी क्या मदद कर सकता हूँ?',
                'confidence': 1.0,
                'needs_confirmation': False,
            }
        if 'english' in lower_cmd:
            return {
                'success': True,
                'intent': 'CHANGE_LANGUAGE',
                'target': 'change_language',
                'parameters': {'language': 'en'},
                'language': 'en',
                'spoken_response': 'Language changed to English. How can I assist you?',
                'confidence': 1.0,
                'needs_confirmation': False,
            }

        # ── Gemini LLM Intent Classification & Spoken Response Generation ──
        if not self.is_configured():
            return {
                'success': True,
                'intent': 'UNKNOWN',
                'target': 'unknown',
                'parameters': {},
                'language': language,
                'spoken_response': "I heard your request, but Gemini AI reasoning is currently unconfigured.",
                'confidence': 0.3,
                'needs_confirmation': False,
            }

        try:
            from google import genai
            from google.genai import types

            if self._client is None:
                self._client = genai.Client(api_key=self.api_key)

            lang_label = {'te': 'Telugu (తెలుగు)', 'hi': 'Hindi (हिन्दी)', 'en': 'English'}.get(language, 'English')

            prompt_text = f"""You are the Voice Operating System (VOS) controller for Agronomy AI.
Your task is to classify the user's spoken voice command into a structured action JSON and formulate a short, friendly spoken response (1-2 sentences maximum, strictly in {lang_label}).

CURRENT APPLICATION CONTEXT:
- Current Page Route: {current_page}
- Recent Conversation History: {json.dumps(history[-6:]) if history else "None"}
- Active Multi-Turn Workflow: {json.dumps(active_workflow) if active_workflow else "None"}
- Available Page Actions: {json.dumps(available_actions) if available_actions else "Standard Navigation & Controls"}
- User Target Language: {lang_label} ({language})

USER SPOKEN COMMAND:
"{clean_cmd}"

ALLOWLISTED INTENTS:
- NAVIGATE: user wants to go to a route ('/', '/scanning', '/crop-recommendation', '/weather', '/diseases', '/crops', '/dashboard', '/chat')
- SCROLL: user wants to scroll ('down', 'up', 'top', 'bottom') (parameters: {{"direction": "down"|"up"|"top"|"bottom"}})
- GO_BACK: user wants to return to previous page
- OPEN_CAMERA: user wants to open camera to take a photo
- OPEN_GALLERY: user wants to choose an image from storage
- TAKE_PHOTO: user wants to capture photo with camera
- RETAKE_PHOTO: user wants to retake/discard current photo
- SUBMIT_FORM: user wants to submit/analyze/calculate/scan/recommend
- CLEAR_FORM: user wants to reset or start over
- FILL_FIELD: user wants to fill a form input (target: field name, parameters: {{"field": name, "value": val}})
- SEARCH: user wants to search (parameters: {{"query": text}})
- READ_PAGE: user wants the page read aloud or summarized
- READ_RESULT: user wants scan diagnosis or recommendation result read aloud
- STOP_SPEAKING: user wants to stop audio output
- STOP_VOICE_OS: user wants to stop or exit Voice OS completely ("stop voice os", "exit voice os", "turn off voice os")
- CHANGE_LANGUAGE: user wants to switch language (parameters: {{"language": "en"|"te"|"hi"}})
- CONFIRM_ACTION: user confirms (yes, proceed, confirm)
- CANCEL_ACTION: user cancels (no, cancel, stop)
- HELP: user asks for help or commands
- AGRICULTURAL_QUESTION: user asks an agronomy/farming/disease/crop question
- GENERAL_CONVERSATION: greetings or conversational chit-chat
- UNKNOWN: unrecognizable request

CONTEXT & MULTI-TURN RULES:
- If user says "Scroll down", SCROLL with direction "down" and spoken_response: "Scrolling down."
- If user says "Go back", GO_BACK and spoken_response: "Going back."
- If the assistant previously asked "Which location would you like the weather for?" and the user speaks a city/town name like "Tirupati", treat as SEARCH for weather: {{"intent": "SEARCH", "target": "search_weather", "parameters": {{"query": "Tirupati"}}, "spoken_response": "Checking the weather for Tirupati."}}
- If user says "Open crop recommendation", NAVIGATE to '/crop-recommendation' with spoken_response: "Crop recommendation page opened. Tell me your soil details."
- If user says "Open crop guides", NAVIGATE to '/crops' with spoken_response: "Opening crop guides."
- If user says "My soil nitrogen is 80", FILL_FIELD nitrogen with 80 and spoken_response: "Nitrogen value set to 80."
- If user says "Recommend crops", SUBMIT_FORM with target 'submit_crop_form' and spoken_response: "Your crop recommendations are ready."
- If user says "Stop Voice OS", STOP_VOICE_OS with spoken_response: "Voice OS stopped."

Respond ONLY with valid JSON in this exact structure:
{{
  "intent": "<ALLOWLISTED_INTENT>",
  "target": "<target_action_or_route_or_field>",
  "parameters": {{}},
  "language": "{language}",
  "spoken_response": "<Natural, concise spoken reply in {lang_label}, max 2 sentences>",
  "confidence": 0.95,
  "needs_confirmation": false
}}
"""
            config_obj = types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            )

            models_to_try = [GEMINI_MODEL, 'gemini-3.5-flash', 'gemini-3.5-flash-lite']
            for mod in CANDIDATE_MODELS:
                if mod not in models_to_try:
                    models_to_try.append(mod)

            gemini_resp = None
            for candidate in models_to_try:
                try:
                    gemini_resp = self._client.models.generate_content(
                        model=candidate,
                        contents=prompt_text,
                        config=config_obj,
                    )
                    break
                except Exception as m_err:
                    logger.warning("[VOS Gemini] Model %s failed: %s", candidate, m_err)
                    continue

            if gemini_resp and hasattr(gemini_resp, 'text') and gemini_resp.text:
                raw_json = gemini_resp.text.strip()
                # Remove possible markdown fences
                if raw_json.startswith('```'):
                    raw_json = re.sub(r'^```(?:json)?\s*', '', raw_json)
                    raw_json = re.sub(r'\s*```$', '', raw_json)

                parsed = json.loads(raw_json)
                return {
                    'success': True,
                    'intent': parsed.get('intent', 'UNKNOWN'),
                    'action': parsed.get('action') or parsed.get('target', 'unknown'),
                    'target': parsed.get('target', 'unknown'),
                    'parameters': parsed.get('parameters', {}),
                    'language': parsed.get('language', language),
                    'spoken_response': parsed.get('spoken_response', 'Understood.'),
                    'confidence': float(parsed.get('confidence', 0.9)),
                    'requires_confirmation': bool(parsed.get('requires_confirmation') or parsed.get('needs_confirmation', False)),
                }

        except Exception as exc:
            logger.error("[VOS Gemini] Intent understanding failed: %s", exc)

        # Fallback response
        fallback_resp = "I understand. How else can I help?" if language == 'en' else ("అర్థమైంది. నేను మీకు ఎలా సహాయపడగలను?" if language == 'te' else "समझ गया। मैं और क्या मदद कर सकता हूँ?")
        return {
            'success': True,
            'intent': 'GENERAL_CONVERSATION',
            'action': 'general_conversation',
            'target': 'general_conversation',
            'parameters': {},
            'language': language,
            'spoken_response': fallback_resp,
            'confidence': 0.5,
            'requires_confirmation': False,
        }

