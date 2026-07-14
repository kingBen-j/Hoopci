from django.contrib import admin
from .models import ProfilJoueur


@admin.register(ProfilJoueur)
class ProfilJoueurAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'poste', 'tournois_joues', 'tournois_gagnes', 'mvp_count', 'taux_victoire')
    list_filter = ('poste',)
    search_fields = ('utilisateur__email', 'utilisateur__username')
    readonly_fields = ('tournois_joues', 'tournois_gagnes', 'mvp_count')

    @admin.display(description='Taux victoire %')
    def taux_victoire(self, obj):
        return f"{obj.taux_victoire} %"
