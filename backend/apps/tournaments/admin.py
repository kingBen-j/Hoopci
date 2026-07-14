from django.contrib import admin
from .models import Tournoi, Equipe, Participation, Resultat, FavoriTournoi


class EquipeInline(admin.TabularInline):
    model = Equipe
    extra = 0


@admin.register(Tournoi)
class TournoiAdmin(admin.ModelAdmin):
    list_display = ('titre', 'sport', 'commune', 'format', 'niveau', 'date_debut', 'statut', 'organisateur')
    list_filter = ('statut', 'format', 'niveau', 'commune')
    search_fields = ('titre', 'commune', 'lieu')
    ordering = ('-date_debut',)
    inlines = [EquipeInline]
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Resultat)
class ResultatAdmin(admin.ModelAdmin):
    list_display = ('tournoi', 'equipe_gagnante', 'mvp', 'created_at')
    list_filter = ('created_at',)
