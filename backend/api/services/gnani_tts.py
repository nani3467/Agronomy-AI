"""
Gnani AI Timbre v3.0 Text-to-Speech Service
============================================
Official REST integration for https://api.vachana.ai/api/v1/tts/inference
Features:
- Native Indian language voice synthesis (Telugu, Hindi, English).
- Automatically converts raw PCM audio into standard RIFF WAV container for HTML5 playback.
- Dynamic voice selection per language.
- Secure API key isolation.
"""

import io
import wave
import logging
import requests
from typing import Optional, Dict, Any
from decouple import config

logger = logging.getLogger(__name__)

VACHANA_TTS_URL = config('GNANI_TTS_URL', default='https://api.vachana.ai/api/v1/tts/inference')
DEFAULT_TTS_MODEL = config('GNANI_TTS_MODEL', default='timbre-v3.0')

# Verified timbre-v3.0 supported voices
DEFAULT_VOICES = {
    'hi-IN': 'Shivani',
    'hi': 'Shivani',
    'te-IN': 'Lakshmi',
    'te': 'Lakshmi',
    'en-IN': 'Avinash',
    'en': 'Avinash',
    'kn-IN': 'Kalpana',
    'ta-IN': 'Harshad',
}


def clean_text_for_speech(text: str) -> str:
    """
    Strips Markdown formatting, code blocks, URLs, and emojis so speech synthesis
    sounds natural without reading syntax symbols, asterisks, or hash signs aloud.
    Preserves natural sentence punctuation (periods, commas, question marks).
    """
    if not text:
        return ""

    import re
    t = text
    # Remove code blocks
    t = re.sub(r'```[\s\S]*?```', ' ', t)
    t = re.sub(r'`([^`]+)`', r'\1', t)

    # Remove markdown images and links: [label](url) -> label
    t = re.sub(r'!\[([^\]]*)\]\([^)]+\)', ' ', t)
    t = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', t)

    # Remove markdown headers (###, ##, #)
    t = re.sub(r'^#{1,6}\s*', '', t, flags=re.MULTILINE)

    # Remove bullet markers (*, -, +) at start of lines
    t = re.sub(r'^\s*[-*+•]\s+', '', t, flags=re.MULTILINE)

    # Remove bold and italic markers: **text** or *text* or __text__ or _text_
    t = re.sub(r'\*\*([^*]+)\*\*', r'\1', t)
    t = re.sub(r'\*([^*]+)\*', r'\1', t)
    t = re.sub(r'__([^_]+)__', r'\1', t)
    t = re.sub(r'_([^_]+)_', r'\1', t)

    # Remove emojis and pictographs
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF"
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "\U0001F900-\U0001F9FF"
        "\U0001FA70-\U0001FAFF"
        "\U00002600-\U000026FF"
        "]+",
        flags=re.UNICODE
    )
    t = emoji_pattern.sub('', t)

    # Replace special symbols
    t = t.replace('&', ' and ').replace('%', ' percent ')

    # Remove excess whitespace
    t = re.sub(r'\s+', ' ', t).strip()
    return t


def normalize_pcm_audio(pcm_bytes: bytes, target_rms_db: float = -14.0) -> bytes:
    """
    Applies professional loudness normalization and soft-knee peak limiting to 16-bit linear PCM audio.
    Ensures Gnani Timbre speech is articulate, loud, and clearly audible without distortion or clipping.
    """
    if not pcm_bytes or len(pcm_bytes) < 4:
        return pcm_bytes
    try:
        import numpy as np
        audio = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float64) / 32768.0
        current_peak = np.max(np.abs(audio))
        if current_peak < 1e-4:
            return pcm_bytes
        current_rms = np.sqrt(np.mean(audio ** 2))
        current_rms_db = 20 * np.log10(max(current_rms, 1e-5))

        # Calculate loudness boost required for broadcast conversational dialogue (~ -14 dBFS)
        needed_gain_db = min(9.5, max(1.5, target_rms_db - current_rms_db))
        linear_gain = 10.0 ** (needed_gain_db / 20.0)

        boosted = audio * linear_gain
        # Soft-knee limiter curve above 0.82
        mask = np.abs(boosted) > 0.82
        if np.any(mask):
            boosted[mask] = np.sign(boosted[mask]) * (0.82 + 0.16 * np.tanh((np.abs(boosted[mask]) - 0.82) / 0.4))

        out = np.clip(boosted * 32767.0, -32767.0, 32767.0).astype(np.int16)
        return out.tobytes()
    except Exception as exc:
        logger.warning("[Gnani TTS] Audio normalization fallback: %s", exc)
        return pcm_bytes


def fix_wav_header_sizes(wav_bytes: bytes) -> bytes:
    """
    Fixes streaming WAV headers where Gnani API sends 0xFFFFFFFF (4294967295)
    as the data and RIFF chunk sizes, allowing HTML5 audio players to correctly
    determine audio duration, timeline progress, and seeking.
    """
    if not wav_bytes.startswith(b'RIFF') or len(wav_bytes) < 44:
        return wav_bytes

    b = bytearray(wav_bytes)
    actual_riff_size = len(wav_bytes) - 8
    actual_data_size = len(wav_bytes) - 44

    b[4:8] = actual_riff_size.to_bytes(4, 'little')
    b[40:44] = actual_data_size.to_bytes(4, 'little')
    return bytes(b)


def pcm_to_wav(pcm_bytes: bytes, sample_rate: int = 24000, channels: int = 1, sample_width: int = 2, normalize: bool = True) -> bytes:
    """Wrap raw 16-bit linear PCM audio in a valid RIFF WAV container with loudness normalization."""
    if pcm_bytes.startswith(b'RIFF'):
        return fix_wav_header_sizes(pcm_bytes)

    if normalize:
        pcm_bytes = normalize_pcm_audio(pcm_bytes)

    wav_io = io.BytesIO()
    with wave.open(wav_io, 'wb') as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_bytes)
    return wav_io.getvalue()


class GnaniTTSService:
    """Service client for Gnani AI Timbre Text-to-Speech."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or config('GNANI_API_KEY', default='')
        self.endpoint = VACHANA_TTS_URL
        self.default_model = DEFAULT_TTS_MODEL

    def is_configured(self) -> bool:
        """Check if a valid Gnani API key is configured."""
        return bool(self.api_key and self.api_key.strip().startswith('vach_'))

    def synthesize_speech(
        self,
        text: str,
        language: str = 'en-IN',
        voice: Optional[str] = None,
        model: Optional[str] = None,
        speed: float = 1.0,
        timeout_seconds: int = 20,
    ) -> Dict[str, Any]:
        """
        Synthesize speech from text using Gnani Timbre.

        :param text: Text string to convert to speech
        :param language: Language code ('te-IN', 'hi-IN', 'en-IN')
        :param voice: Voice name (e.g. 'Shivani', 'Lakshmi', 'Avinash')
        :param model: Specific TTS model ('timbre-v3.0' or 'timbre-v2.5')
        :param speed: Playback speed multiplier (0.8 - 1.5)
        :param timeout_seconds: Maximum HTTP request wait time
        :return: Dict containing success flag, audio_bytes (WAV), and metadata
        """
        if not self.is_configured():
            logger.error("[Gnani TTS] Service call aborted: GNANI_API_KEY is not configured.")
            return {
                'success': False,
                'error': 'Gnani Text-to-Speech API key is not configured on the server.',
                'audio_bytes': b'',
            }

        cleaned_text = clean_text_for_speech(text or '').strip()
        if not cleaned_text:
            return {
                'success': False,
                'error': 'No text provided for speech synthesis.',
                'audio_bytes': b'',
            }

        # Truncate text if excessively long to prevent timeout (max ~1000 chars for single turn)
        if len(cleaned_text) > 1200:
            cleaned_text = cleaned_text[:1200] + '...'

        # Normalize language code
        norm_lang = language.strip()
        if '-' not in norm_lang and norm_lang in ['hi', 'te', 'en', 'kn', 'ta']:
            norm_lang = f"{norm_lang}-IN"

        selected_voice = voice or DEFAULT_VOICES.get(norm_lang, 'Avinash')
        selected_model = model or self.default_model

        headers = {
            'X-API-Key-ID': self.api_key.strip(),
            'Content-Type': 'application/json',
        }

        payload = {
            'text': cleaned_text,
            'language': norm_lang,
            'model': selected_model,
            'voice': selected_voice,
            'speed': max(0.5, min(speed, 2.0)),
            'audio_config': {
                'encoding': 'linear_pcm',
                'container': 'wav',
                'num_channels': 1,
                'sample_rate': 24000,
                'sample_width': 2,
            },
        }

        logger.info(
            "[Gnani TTS Diagnostics] Synthesizing speech: lang=%s, voice=%s, model=%s, rate=24000Hz, chars=%d",
            norm_lang, selected_voice, selected_model, len(cleaned_text)
        )

        try:
            response = requests.post(
                self.endpoint,
                headers=headers,
                json=payload,
                timeout=timeout_seconds,
            )

            if response.status_code == 200:
                raw_audio = response.content
                is_riff = raw_audio.startswith(b'RIFF')
                if is_riff:
                    wav_audio = fix_wav_header_sizes(raw_audio)
                else:
                    wav_audio = pcm_to_wav(raw_audio, sample_rate=24000)

                logger.info(
                    "[Gnani TTS Diagnostics] Success: status=200, lang=%s, voice=%s, model=%s, is_riff=%s, wav_bytes=%d",
                    norm_lang, selected_voice, selected_model, is_riff, len(wav_audio)
                )

                return {
                    'success': True,
                    'audio_bytes': wav_audio,
                    'content_type': 'audio/wav',
                    'language': norm_lang,
                    'voice': selected_voice,
                    'model': selected_model,
                    'sample_rate': 24000,
                    'channels': 1,
                    'bit_depth': 16,
                    'size_bytes': len(wav_audio),
                }

            # Handle non-200 responses
            error_detail = response.text
            try:
                err_json = response.json()
                error_detail = err_json.get('message') or err_json.get('error', {}).get('message') or str(err_json)
            except Exception:
                pass

            logger.warning("[Gnani TTS] API returned error %d: %s", response.status_code, error_detail[:300])

            if response.status_code == 401:
                user_msg = "Invalid or expired Gnani API credentials."
            elif response.status_code == 429:
                user_msg = "Gnani TTS rate limit reached. Please wait a moment."
            else:
                user_msg = f"Speech generation error: {error_detail}"

            return {
                'success': False,
                'error': user_msg,
                'status_code': response.status_code,
                'audio_bytes': b'',
            }

        except requests.exceptions.Timeout:
            logger.error("[Gnani TTS] Request timed out after %d seconds.", timeout_seconds)
            return {
                'success': False,
                'error': 'Speech generation timed out. Please try again with shorter text.',
                'audio_bytes': b'',
            }
        except requests.exceptions.RequestException as req_err:
            logger.error("[Gnani TTS] Network exception during speech generation: %s", req_err)
            return {
                'success': False,
                'error': 'Network error communicating with Gnani AI speech generation servers.',
                'audio_bytes': b'',
            }
