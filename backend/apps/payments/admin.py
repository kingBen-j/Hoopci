from django.contrib import admin
from .models import Paiement


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = ('reference', 'utilisateur', 'type_paiement', 'montant', 'statut', 'simulation', 'created_at')
    list_filter = ('statut', 'type_paiement', 'simulation')
    search_fields = ('reference', 'genius_reference', 'utilisateur__email')
    readonly_fields = ('reference', 'genius_reference', 'checkout_url', 'details', 'created_at', 'updated_at')
