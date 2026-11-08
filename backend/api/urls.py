from django.urls import path
from . import views

urlpatterns = [
    # Health check
    path('health/', views.HealthCheckView.as_view(), name='health-check'),

    # Plant Disease Detection
    path('scan/', views.PlantScanView.as_view(), name='plant-scan'),
    path('scans/', views.ScanHistoryView.as_view(), name='scan-history'),
    path('scans/<str:pk>/', views.ReportDetailView.as_view(), name='report-detail'),

    # Crop Recommendation
    path('crop-recommend/', views.CropRecommendationView.as_view(), name='crop-recommend'),
    path('crop-recommendations/', views.CropRecommendationHistoryView.as_view(), name='crop-recommend-history'),
    path('crop-recommendations/<str:pk>/', views.CropRecommendationDetailView.as_view(), name='crop-recommend-detail'),

    # Botanical Disease Library
    path('diseases/', views.DiseaseLibraryView.as_view(), name='disease-library'),
    path('diseases/<str:name>/', views.DiseaseDetailView.as_view(), name='disease-detail'),

    # Crop Cultivation Guides
    path('crops/', views.CropLibraryView.as_view(), name='crop-library'),
    path('crops/<str:name>/', views.CropDetailView.as_view(), name='crop-detail'),

    # Agricultural Analytics Dashboard
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),

    # Gnani AI & Conversational Assistant (Both /ai/ and /assistant/ endpoints supported)
    path('ai/status/', views.AIStatusView.as_view(), name='ai-status'),
    path('ai/chat/', views.AIChatView.as_view(), name='ai-chat'),
    path('ai/command/', views.VoiceCommandView.as_view(), name='ai-command'),
    path('ai/speech-to-text/', views.SpeechToTextView.as_view(), name='ai-stt'),
    path('ai/text-to-speech/', views.TextToSpeechView.as_view(), name='ai-tts'),

    # Assistant Aliases
    path('assistant/status/', views.AIStatusView.as_view(), name='assistant-status'),
    path('assistant/chat/', views.AIChatView.as_view(), name='assistant-chat'),
    path('assistant/command/', views.VoiceCommandView.as_view(), name='assistant-command'),
    path('assistant/transcribe/', views.SpeechToTextView.as_view(), name='assistant-transcribe'),
    path('assistant/speak/', views.TextToSpeechView.as_view(), name='assistant-speak'),
]
