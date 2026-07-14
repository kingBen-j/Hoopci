import django_filters
from .models import ProfilJoueur


class ProfilJoueurFilter(django_filters.FilterSet):
    """Filtres de l'annuaire des joueurs : ?sport=&poste=&grade=&commune=&taux_min=…"""
    commune = django_filters.CharFilter(field_name='utilisateur__commune', lookup_expr='iexact')
    taux_min = django_filters.NumberFilter(method='filter_taux_min')

    class Meta:
        model = ProfilJoueur
        fields = {'sport': ['exact'], 'poste': ['exact'], 'grade': ['exact']}

    def filter_taux_min(self, queryset, name, value):
        # Filtre post-queryset car taux_victoire est une property calculée
        ids = [p.pk for p in queryset if p.taux_victoire >= float(value)]
        return queryset.filter(pk__in=ids)
