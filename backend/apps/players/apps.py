from django.apps import AppConfig


class PlayersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.players'
    verbose_name = 'Joueurs'

    def ready(self):
        from apps.accounts.models import Utilisateur
        from django.db.models.signals import post_save
        from apps.players.signals import create_profil_joueur
        post_save.connect(create_profil_joueur, sender=Utilisateur, dispatch_uid='create_profil_joueur')
