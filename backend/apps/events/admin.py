from django.contrib import admin
from .models import Evenement, InteretEvenement


@admin.register(Evenement)
class EvenementAdmin(admin.ModelAdmin):
    list_display = ('titre', 'sport', 'type_evenement', 'commune', 'date_debut', 'statut', 'organisateur')
    list_filter = ('type_evenement', 'statut', 'commune')
    search_fields = ('titre', 'commune', 'lieu', 'organisateur__email')
    date_hierarchy = 'date_debut'


@admin.register(InteretEvenement)
class InteretEvenementAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'evenement', 'created_at')
