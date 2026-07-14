from django.contrib import admin
from .models import CarteTransfert, Offre, RechercheRecruteur


@admin.register(CarteTransfert)
class CarteTransfertAdmin(admin.ModelAdmin):
    list_display = ('joueur', 'disponible', 'mise_en_avant', 'badge_verifie', 'updated_at')
    list_filter = ('disponible', 'mise_en_avant', 'badge_verifie')
    search_fields = ('joueur__email', 'joueur__username')
    actions = ['accorder_badge_verifie']

    @admin.action(description='Accorder le badge vérifié')
    def accorder_badge_verifie(self, request, queryset):
        queryset.update(badge_verifie=True)


@admin.register(Offre)
class OffreAdmin(admin.ModelAdmin):
    list_display = ('emetteur', 'joueur', 'statut', 'created_at')
    list_filter = ('statut',)
    search_fields = ('emetteur__email', 'joueur__email')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(RechercheRecruteur)
class RechercheRecruteurAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'poste', 'commune', 'grade', 'texte', 'created_at')
    list_filter = ('poste', 'grade')
    search_fields = ('utilisateur__email',)
