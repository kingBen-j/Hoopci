import django_filters
from .models import Tournoi


class TournoiFilter(django_filters.FilterSet):
    """Filtres de l'annuaire des tournois : ?sport=&commune=&format=&niveau=&statut=&gratuit=…"""
    date_debut_min = django_filters.DateFilter(field_name='date_debut', lookup_expr='gte')
    date_debut_max = django_filters.DateFilter(field_name='date_debut', lookup_expr='lte')
    frais_max = django_filters.NumberFilter(field_name='frais_inscription', lookup_expr='lte')
    gratuit = django_filters.BooleanFilter(method='filter_gratuit')

    class Meta:
        model = Tournoi
        fields = {
            'sport': ['exact'],
            'commune': ['exact', 'icontains'],
            'format': ['exact'],
            'niveau': ['exact'],
            'categorie_age': ['exact'],
            'statut': ['exact'],
        }

    def filter_gratuit(self, queryset, name, value):
        if value:
            return queryset.filter(frais_inscription=0)
        return queryset
