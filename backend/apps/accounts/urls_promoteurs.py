from django.urls import path
from .views import PromoteurClassementView

urlpatterns = [
    path('', PromoteurClassementView.as_view(), name='classement-promoteurs'),
]
