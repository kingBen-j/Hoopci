import django_filters
from .models import Evenement


class EvenementFilter(django_filters.FilterSet):
    """Filtres de l'agenda des événements : ?sport=&commune=&type_evenement=&statut=&gratuit=…"""
    date_debut_min = django_filters.DateFilter(field_name='date_debut', lookup_expr='gte')
    date_debut_max = django_filters.DateFilter(field_name='date_debut', lookup_expr='lte')
    gratuit = django_filters.BooleanFilter(method='filter_gratuit')

    class Meta:
        model = Evenement
        fields = {
            'sport': ['exact'],
            'commune': ['exact', 'icontains'],
            'type_evenement': ['exact'],
            'statut': ['exact'],
        }

    def filter_gratuit(self, queryset, name, value):
        if value:
            return queryset.filter(prix_entree=0)
        return queryset
