from django.db.models.signals import post_save
from django.dispatch import receiver


def create_profil_joueur(sender, instance, created, **kwargs):
    if created and instance.role == 'joueur':
        from apps.players.models import ProfilJoueur
        ProfilJoueur.objects.create(utilisateur=instance)
