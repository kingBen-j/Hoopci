from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

urlpatterns = [
    # Health check (Render) — répond 200 sans toucher à la base
    path('api/health/', lambda request: JsonResponse({'status': 'ok'})),
    # Admin Django masqué en production (settings.ADMIN_URL, voir DJANGO_ADMIN_URL)
    path(settings.ADMIN_URL, admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/tournaments/', include('apps.tournaments.urls')),
    path('api/players/', include('apps.players.urls')),
    path('api/market/', include('apps.market.urls')),
    path('api/events/', include('apps.events.urls')),
    path('api/promoteurs/', include('apps.accounts.urls_promoteurs')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/admin/', include('apps.core.urls_admin')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Sur Render il n'y a pas de nginx devant Django : c'est Django qui sert les médias
# (static() ci-dessus ne fonctionne qu'en DEBUG)
if getattr(settings, 'SERVE_MEDIA', False):
    from django.views.static import serve

    urlpatterns += [re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT})]
