"""
Gnani AI Prisma v3 Speech-to-Text Service
==========================================
Official REST integration for https://api.vachana.ai/stt/v3
Features:
- Multilingual speech recognition (Telugu, Hindi, English, and Indic auto-detection).
- Audio format handling (WAV, MP3, WebM, OGG).
- Secure credential management (X-API-Key-ID header, no keys logged).
"""

import io
import logging
import requests
from typing import Optional, Dict, Any, Union
from decouple import config

logger = logging.getLogger(__name__)

VACHANA_STT_URL = config('GNANI_STT_URL', default='https://api.vachana.ai/stt/v3')
DEFAULT_STT_MODEL = config('GNANI_STT_MODEL', default='prisma-v3.0')


class GnaniSTTService:
    """Service client for Gnani AI Prisma Speech-to-Text."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or config('GNANI_API_KEY', default='')
        self.endpoint = VACHANA_STT_URL
        self.default_model = DEFAULT_STT_MODEL

    def is_configured(self) -> bool:
        """Check if a valid Gnani API key is configured."""
        return bool(self.api_key and self.api_key.strip().startswith('vach_'))

    def transcribe_audio(
        self,
        audio_data: Union[bytes, io.BytesIO],
        filename: str = 'speech.wav',
        content_type: str = 'audio/wav',
        language_code: str = 'indic-auto',
        model: Optional[str] = None,
        timeout_seconds: int = 30,
    ) -> Dict[str, Any]:
        """
        Transcribe an audio buffer using Gnani Prisma v3.

        :param audio_data: Raw audio bytes or BytesIO buffer
        :param filename: Filename with extension (e.g. 'audio.wav', 'mic.webm')
        :param content_type: MIME type of the uploaded audio
        :param language_code: Language code ('indic-auto', 'te-IN', 'hi-IN', 'en-IN')
        :param model: Specific STT model (defaults to prisma-v3.0)
        :param timeout_seconds: Maximum HTTP request wait time
        :return: Dict containing success flag, transcript, detected language, and metadata
        """
        if not self.is_configured():
            logger.error("[Gnani STT] Service call aborted: GNANI_API_KEY is not configured.")
            return {
                'success': False,
                'error': 'Gnani Speech-to-Text API key is not configured on the server.',
                'transcript': '',
            }

        if isinstance(audio_data, io.BytesIO):
            payload_bytes = audio_data.getvalue()
        else:
            payload_bytes = audio_data

        if not payload_bytes or len(payload_bytes) < 100:
            return {
                'success': False,
                'error': 'Provided audio stream is empty or too short for transcription.',
                'transcript': '',
            }

        headers = {
            'X-API-Key-ID': self.api_key.strip(),
        }

        files = {
            'audio_file': (filename, payload_bytes, content_type)
        }

        form_data = {
            'model': model or self.default_model,
            'language_code': language_code,
        }

        logger.info(
            "[Gnani STT] Sending %d bytes to %s (model=%s, lang=%s)...",
            len(payload_bytes), self.endpoint, form_data['model'], language_code
        )

        try:
            response = requests.post(
                self.endpoint,
                headers=headers,
                files=files,
                data=form_data,
                timeout=timeout_seconds,
            )

            if response.status_code == 200:
                result_json = response.json()
                transcript = result_json.get('transcript', '').strip()
                detected_lang = result_json.get('detected_language_code', language_code)

                logger.info(
                    "[Gnani STT] Transcription successful (lang=%s, length=%d chars).",
                    detected_lang, len(transcript)
                )

                return {
                    'success': True,
                    'transcript': transcript,
                    'detected_language': detected_lang,
                    'model': result_json.get('model', form_data['model']),
                    'processing_time': result_json.get('processing_time'),
                    'request_id': result_json.get('request_id'),
                }

            # Handle non-200 responses
            error_detail = response.text
            try:
                err_json = response.json()
                error_detail = err_json.get('error', {}).get('message') or err_json.get('message') or str(err_json)
            except Exception:
                pass

            logger.warning("[Gnani STT] API returned error %d: %s", response.status_code, error_detail[:300])

            if response.status_code == 401:
                user_msg = "Invalid or expired Gnani API credentials."
            elif response.status_code == 429:
                user_msg = "Gnani STT request limit reached. Please wait a moment and try again."
            else:
                user_msg = f"Speech transcription failed: {error_detail}"

            return {
                'success': False,
                'error': user_msg,
                'status_code': response.status_code,
                'transcript': '',
            }

        except requests.exceptions.Timeout:
            logger.error("[Gnani STT] Request timed out after %d seconds.", timeout_seconds)
            return {
                'success': False,
                'error': 'Speech transcription request timed out. Please record a shorter message.',
                'transcript': '',
            }
        except requests.exceptions.RequestException as req_err:
            logger.error("[Gnani STT] Network exception during transcription: %s", req_err)
            return {
                'success': False,
                'error': 'Network error communicating with Gnani AI speech recognition servers.',
                'transcript': '',
            }
