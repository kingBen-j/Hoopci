import django_filters
from .models import CarteTransfert


class CarteTransfertFilter(django_filters.FilterSet):
    """Filtres du marché des transferts : ?sport=&poste=&grade=&commune=&disponible=…"""
    sport = django_filters.CharFilter(field_name='joueur__profil_joueur__sport', lookup_expr='iexact')
    poste = django_filters.CharFilter(field_name='joueur__profil_joueur__poste', lookup_expr='iexact')
    commune = django_filters.CharFilter(field_name='joueur__commune', lookup_expr='iexact')
    grade = django_filters.CharFilter(field_name='joueur__profil_joueur__grade', lookup_expr='iexact')
    taux_min = django_filters.NumberFilter(method='filter_taux_min')

    class Meta:
        model = CarteTransfert
        fields = {'disponible': ['exact'], 'badge_verifie': ['exact']}

    def filter_taux_min(self, queryset, name, value):
        # getattr : une carte peut exister pour un joueur sans profil (données anciennes)
        ids = []
        for c in queryset:
            profil = getattr(c.joueur, 'profil_joueur', None)
            if profil and profil.taux_victoire >= float(value):
                ids.append(c.pk)
        return queryset.filter(pk__in=ids)
