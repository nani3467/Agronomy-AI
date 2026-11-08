from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

# ── ML Model paths ────────────────────────────────────────────────────────────
ML_MODELS_DIR       = BASE_DIR / 'models_ml'
CROP_MODEL_PATH     = ML_MODELS_DIR / 'crop_model.pkl'
LABEL_ENCODER_PATH  = ML_MODELS_DIR / 'label_encoder.pkl'

# Hugging Face model ID for plant disease detection (MobileNetV2 PlantVillage 38 classes)
HF_DISEASE_MODEL_ID = config(
    'HF_DISEASE_MODEL_ID',
    default='linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification'
)

# ── Gnani AI Speech Platform ──────────────────────────────────────────────────
GNANI_API_KEY       = config('GNANI_API_KEY', default='')
GNANI_STT_URL       = config('GNANI_STT_URL', default='https://api.vachana.ai/stt/v3')
GNANI_TTS_URL       = config('GNANI_TTS_URL', default='https://api.vachana.ai/api/v1/tts/inference')
GNANI_STT_MODEL     = config('GNANI_STT_MODEL', default='prisma-v3.0')
GNANI_TTS_MODEL     = config('GNANI_TTS_MODEL', default='timbre-v3.0')

# ── Google Gemini Multimodal Reasoning Engine ─────────────────────────────────
GEMINI_API_KEY      = config('GEMINI_API_KEY', default='')
GEMINI_MODEL        = config('GEMINI_MODEL', default='gemini-2.5-flash')

# ── Security & Environment ───────────────────────────────────────────────────
SECRET_KEY = config('SECRET_KEY', default='django-insecure-green-guardian-ml-safe-key-default-2025')
DEBUG = config('DEBUG', default=True, cast=bool)

# ALLOWED_HOSTS
ALLOWED_HOSTS = ['*'] if DEBUG else ['localhost', '127.0.0.1', '.onrender.com', '.vercel.app', '.railway.app']
ADDITIONAL_HOSTS = config('ALLOWED_HOSTS', default='').strip()
if ADDITIONAL_HOSTS and ADDITIONAL_HOSTS != '*':
    ALLOWED_HOSTS.extend([h.strip() for h in ADDITIONAL_HOSTS.split(',') if h.strip()])

# ── Installed Applications ───────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'api.apps.ApiConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'greenguardian.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'greenguardian.wsgi.application'

# ── MongoDB Database (Official Django MongoDB Backend / MongoDB Atlas) ───────
MONGO_URI = config('MONGO_URI', default='mongodb://localhost:27017/')
MONGO_DB_NAME = config('MONGO_DB_NAME', default='greenguardian')

DATABASES = {
    'default': {
        'ENGINE': 'django_mongodb_backend',
        'NAME': MONGO_DB_NAME,
        'CLIENT': {
            'host': MONGO_URI,
            'serverSelectionTimeoutMS': 5000,
        }
    }
}

DEFAULT_AUTO_FIELD = 'django_mongodb_backend.fields.ObjectIdAutoField'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ── Static & Media Files ──────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
MEDIA_ROOT.mkdir(exist_ok=True, parents=True)
(MEDIA_ROOT / 'scans').mkdir(exist_ok=True, parents=True)

# ── CORS Configuration ────────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    h.strip() for h in config(
        'CORS_ALLOWED_ORIGINS',
        default='http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001'
    ).split(',') if h.strip()
]

# ── Django REST Framework ────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'UNAUTHENTICATED_USER': None,
}

# ── Logging ───────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} [{name}] {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
