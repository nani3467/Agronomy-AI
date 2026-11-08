from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.http import JsonResponse


def root_api_index(request):
    return JsonResponse({
        'name': 'Agronamy ML API',
        'version': '2.0.0',
        'status': 'online',
        'endpoints': {
            'health': '/api/health/',
            'scan': '/api/scan/ (POST)',
            'scans': '/api/scans/',
            'crop_recommend': '/api/crop-recommend/ (POST)',
            'crop_recommendations': '/api/crop-recommendations/',
            'diseases': '/api/diseases/',
            'crops': '/api/crops/',
            'dashboard_stats': '/api/dashboard/stats/',
            'media': '/media/<filename>',
        }
    })


urlpatterns = [
    path('', root_api_index, name='api-index'),
    path('api/', include('api.urls')),
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
