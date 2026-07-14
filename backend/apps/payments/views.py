import json
import logging
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import F

from apps.market.models import CarteTransfert
from apps.players.tasks import recalculer_stats_joueur
from apps.tournaments.models import Tournoi, Equipe
from . import services
from .models import Paiement, Portefeuille, MouvementPortefeuille

logger = logging.getLogger(__name__)


def _appliquer_paiement(paiement):
    """Valide le paiement et applique son effet : publication ou promotion
    du tournoi, ou confirmation de l'inscription d'une équipe."""
    with transaction.atomic():
        paiement.statut = Paiement.STATUT_REUSSI
        paiement.save(update_fields=['statut', 'updated_at'])
        if paiement.type_paiement == Paiement.TYPE_INSCRIPTION_EQUIPE:
            equipe = paiement.equipe
            if equipe and not equipe.payee:
                equipe.payee = True
                equipe.save(update_fields=['payee'])
            # L'inscription passe par la plateforme : elle prélève 500 FCFA et
            # crédite le reste (les frais du tournoi) au portefeuille du promoteur.
            tournoi = paiement.tournoi
            part_promoteur = int(paiement.montant) - settings.TARIF_INSCRIPTION_EQUIPE
            if tournoi and part_promoteur > 0:
                portefeuille, _ = Portefeuille.objects.select_for_update().get_or_create(
                    promoteur=tournoi.organisateur,
                )
                portefeuille.solde = F('solde') + part_promoteur
                portefeuille.total_credite = F('total_credite') + part_promoteur
                portefeuille.save(update_fields=['solde', 'total_credite', 'updated_at'])
                libelle = f"Inscription « {equipe.nom} » — {tournoi.titre}" if equipe else tournoi.titre
                MouvementPortefeuille.objects.create(
                    portefeuille=portefeuille,
                    type_mouvement=MouvementPortefeuille.TYPE_CREDIT_INSCRIPTION,
                    montant=part_promoteur, paiement=paiement, libelle=libelle,
                )
            return
        if paiement.type_paiement == Paiement.TYPE_PROMOTION_COMPTE:
            carte, _ = CarteTransfert.objects.get_or_create(joueur=paiement.utilisateur)
            carte.mise_en_avant = True
            carte.mise_en_avant_jusqu = timezone.now() + timedelta(days=settings.DUREE_PROMOTION_COMPTE_JOURS)
            carte.save(update_fields=['mise_en_avant', 'mise_en_avant_jusqu', 'updated_at'])
            # Le boost de grade s'applique aussi à l'historique : recalcul immédiat
            recalculer_stats_joueur.delay(paiement.utilisateur_id)
            return
        if paiement.type_paiement == Paiement.TYPE_PROMOTION_EQUIPE:
            equipe = paiement.equipe
            if equipe and not equipe.mise_en_avant:
                equipe.mise_en_avant = True
                equipe.save(update_fields=['mise_en_avant'])
                for joueur_id in equipe.membres.values_list('joueur_id', flat=True):
                    recalculer_stats_joueur.delay(joueur_id)
            return
        tournoi = paiement.tournoi
        if tournoi is None:
            return
        if paiement.type_paiement == Paiement.TYPE_CREATION_TOURNOI:
            # Frais de publication réglés : le tournoi devient visible dans l'annuaire
            if tournoi.statut == Tournoi.STATUT_EN_ATTENTE_PAIEMENT:
                tournoi.statut = Tournoi.STATUT_OUVERT
                tournoi.save(update_fields=['statut'])
        elif not tournoi.mis_en_avant:
            tournoi.mis_en_avant = True
            tournoi.save(update_fields=['mis_en_avant'])


def _reponse_checkout(paiement, request, objet, extra=None):
    """Prépare (si besoin) le checkout GeniusPay et renvoie la réponse standard."""
    base = {
        'reference': paiement.reference,
        'montant': int(paiement.montant),
        'devise': paiement.devise,
        'type_paiement': paiement.type_paiement,
        **(extra or {}),
    }

    if not services.est_configure():
        if settings.DEBUG:
            # Dev sans clés API : le front affichera un bouton « Simuler le paiement »
            return Response({**base, 'simulation': True})
        return Response(
            {'detail': "Le paiement n'est pas configuré sur le serveur (clés GeniusPay manquantes)."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if not paiement.checkout_url:
        retour = f"{settings.FRONTEND_URL}/paiement/retour?ref={paiement.reference}"
        try:
            data = services.initier_paiement(
                montant=paiement.montant,
                reference=paiement.reference,
                description=objet,
                customer_email=request.user.email,
                customer_phone=request.user.telephone,
                metadata={'tournoi_id': paiement.tournoi_id, 'type': paiement.type_paiement},
                success_url=retour,
                error_url=retour,
            )
        except services.GeniusPayError as exc:
            logger.error('Initiation GeniusPay échouée pour %s : %s', paiement.reference, exc)
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        paiement.genius_reference = data.get('reference', '')
        paiement.checkout_url = data.get('checkout_url') or data.get('payment_url') or ''
        paiement.details = {'initiation': data}
        paiement.save(update_fields=['genius_reference', 'checkout_url', 'details', 'updated_at'])

    return Response({**base, 'checkout_url': paiement.checkout_url, 'simulation': False})


class InitierPaiementTournoiView(APIView):
    """
    POST /api/payments/tournois/{id}/initier/
    Selon l'état du tournoi du promoteur propriétaire :
    - en attente de paiement → frais de publication (TARIF_CREATION_TOURNOI, 2 000 FCFA)
    - déjà publié → promotion optionnelle (TARIF_PUBLICATION_TOURNOI, 5 000 FCFA)
    Retourne l'URL de checkout GeniusPay (ou simulation=True en dev sans clés).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, tournoi_id):
        try:
            tournoi = Tournoi.objects.get(pk=tournoi_id)
        except Tournoi.DoesNotExist:
            return Response({'detail': 'Tournoi introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if tournoi.organisateur != request.user:
            return Response({'detail': "Ce tournoi ne t'appartient pas."}, status=status.HTTP_403_FORBIDDEN)

        if tournoi.statut == Tournoi.STATUT_EN_ATTENTE_PAIEMENT:
            type_paiement = Paiement.TYPE_CREATION_TOURNOI
            montant = settings.TARIF_CREATION_TOURNOI
            objet = f"Publication du tournoi « {tournoi.titre} » sur HoopCI"
        else:
            if tournoi.mis_en_avant:
                return Response({'detail': 'Ce tournoi est déjà promu.'}, status=status.HTTP_400_BAD_REQUEST)
            if tournoi.statut in (Tournoi.STATUT_TERMINE, Tournoi.STATUT_ANNULE):
                return Response({'detail': 'Ce tournoi est terminé ou annulé.'}, status=status.HTTP_400_BAD_REQUEST)
            type_paiement = Paiement.TYPE_PUBLICATION_TOURNOI
            montant = settings.TARIF_PUBLICATION_TOURNOI
            objet = f"Promotion du tournoi « {tournoi.titre} » sur HoopCI"

        # Réutiliser un paiement en attente plutôt que d'en empiler
        paiement = Paiement.objects.filter(
            tournoi=tournoi, utilisateur=request.user,
            statut=Paiement.STATUT_EN_ATTENTE, type_paiement=type_paiement,
        ).first()
        if paiement is None:
            paiement = Paiement.objects.create(
                utilisateur=request.user,
                tournoi=tournoi,
                type_paiement=type_paiement,
                montant=montant,
            )

        return _reponse_checkout(paiement, request, objet)


class InitierPaiementEquipeView(APIView):
    """
    POST /api/payments/equipes/{id}/initier/
    Inscription d'une équipe à un tournoi : part plateforme (TARIF_INSCRIPTION_EQUIPE,
    500 FCFA) + frais d'inscription du tournoi, encaissés en un seul paiement.
    L'équipe n'apparaît sur le tournoi qu'une fois le paiement confirmé.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, equipe_id):
        try:
            equipe = Equipe.objects.select_related('tournoi').get(pk=equipe_id)
        except Equipe.DoesNotExist:
            return Response({'detail': 'Équipe introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if equipe.payee:
            return Response({'detail': 'Cette équipe est déjà inscrite.'}, status=status.HTTP_400_BAD_REQUEST)
        tournoi = equipe.tournoi
        if tournoi.statut != Tournoi.STATUT_OUVERT:
            return Response({'detail': 'Les inscriptions de ce tournoi sont fermées.'}, status=status.HTTP_400_BAD_REQUEST)

        frais_plateforme = settings.TARIF_INSCRIPTION_EQUIPE
        frais_tournoi = int(tournoi.frais_inscription)
        montant = frais_plateforme + frais_tournoi

        paiement = Paiement.objects.filter(
            equipe=equipe, utilisateur=request.user,
            statut=Paiement.STATUT_EN_ATTENTE, type_paiement=Paiement.TYPE_INSCRIPTION_EQUIPE,
        ).first()
        if paiement is None:
            paiement = Paiement.objects.create(
                utilisateur=request.user,
                tournoi=tournoi,
                equipe=equipe,
                type_paiement=Paiement.TYPE_INSCRIPTION_EQUIPE,
                montant=montant,
            )

        objet = f"Inscription de l'équipe « {equipe.nom} » au tournoi « {tournoi.titre} » sur HoopCI"
        return _reponse_checkout(paiement, request, objet, extra={
            'equipe_id': equipe.id,
            'equipe_nom': equipe.nom,
            'tournoi_id': tournoi.id,
            'tournoi_titre': tournoi.titre,
            'frais_plateforme': frais_plateforme,
            'frais_tournoi': frais_tournoi,
        })


class InitierPromotionCompteView(APIView):
    """
    POST /api/payments/carte/initier/
    Promotion du compte joueur (TARIF_PROMOTION_COMPTE, 30 jours) : carte en tête
    du marché de talents et gains de points de grade boostés (×1,15).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != 'joueur':
            return Response({'detail': 'Réservé aux joueurs.'}, status=status.HTTP_403_FORBIDDEN)
        carte = getattr(request.user, 'carte_transfert', None)
        if carte and carte.mise_en_avant_active:
            return Response({'detail': 'Ton compte est déjà promu.'}, status=status.HTTP_400_BAD_REQUEST)

        paiement = Paiement.objects.filter(
            utilisateur=request.user,
            statut=Paiement.STATUT_EN_ATTENTE, type_paiement=Paiement.TYPE_PROMOTION_COMPTE,
        ).first()
        if paiement is None:
            paiement = Paiement.objects.create(
                utilisateur=request.user,
                type_paiement=Paiement.TYPE_PROMOTION_COMPTE,
                montant=settings.TARIF_PROMOTION_COMPTE,
            )

        nom = request.user.get_full_name() or request.user.username
        objet = f"Promotion du compte joueur {nom} sur HoopCI ({settings.DUREE_PROMOTION_COMPTE_JOURS} jours)"
        return _reponse_checkout(paiement, request, objet, extra={
            'duree_jours': settings.DUREE_PROMOTION_COMPTE_JOURS,
        })


class InitierPromotionEquipeView(APIView):
    """
    POST /api/payments/equipes/{id}/promouvoir/
    Promotion d'une équipe inscrite (TARIF_PROMOTION_EQUIPE) : badge sur la fiche
    du tournoi et gains de points de grade boostés (×1,15) pour tous ses membres.
    Réservée aux membres de l'équipe.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, equipe_id):
        try:
            equipe = Equipe.objects.select_related('tournoi').get(pk=equipe_id)
        except Equipe.DoesNotExist:
            return Response({'detail': 'Équipe introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if not equipe.payee:
            return Response({'detail': "Règle d'abord l'inscription de l'équipe."}, status=status.HTTP_400_BAD_REQUEST)
        if equipe.mise_en_avant:
            return Response({'detail': 'Cette équipe est déjà promue.'}, status=status.HTTP_400_BAD_REQUEST)
        if equipe.tournoi.statut in (Tournoi.STATUT_TERMINE, Tournoi.STATUT_ANNULE):
            return Response({'detail': 'Ce tournoi est terminé ou annulé.'}, status=status.HTTP_400_BAD_REQUEST)
        if not equipe.membres.filter(joueur=request.user).exists():
            return Response({'detail': "Tu ne fais pas partie de cette équipe."}, status=status.HTTP_403_FORBIDDEN)

        paiement = Paiement.objects.filter(
            equipe=equipe, utilisateur=request.user,
            statut=Paiement.STATUT_EN_ATTENTE, type_paiement=Paiement.TYPE_PROMOTION_EQUIPE,
        ).first()
        if paiement is None:
            paiement = Paiement.objects.create(
                utilisateur=request.user,
                tournoi=equipe.tournoi,
                equipe=equipe,
                type_paiement=Paiement.TYPE_PROMOTION_EQUIPE,
                montant=settings.TARIF_PROMOTION_EQUIPE,
            )

        objet = f"Promotion de l'équipe « {equipe.nom} » ({equipe.tournoi.titre}) sur HoopCI"
        return _reponse_checkout(paiement, request, objet, extra={
            'equipe_id': equipe.id,
            'equipe_nom': equipe.nom,
            'tournoi_titre': equipe.tournoi.titre,
        })


class PortefeuilleView(APIView):
    """GET /api/payments/portefeuille/ — solde et mouvements du promoteur connecté."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'promoteur':
            return Response({'detail': 'Réservé aux promoteurs.'}, status=status.HTTP_403_FORBIDDEN)
        portefeuille, _ = Portefeuille.objects.get_or_create(promoteur=request.user)
        mouvements = portefeuille.mouvements.select_related('paiement')[:100]
        return Response({
            'solde': int(portefeuille.solde),
            'total_credite': int(portefeuille.total_credite),
            'total_reverse': int(portefeuille.total_reverse),
            'part_plateforme': settings.TARIF_INSCRIPTION_EQUIPE,
            'mouvements': [{
                'id': m.id,
                'type': m.type_mouvement,
                'montant': int(m.montant),
                'libelle': m.libelle,
                'created_at': m.created_at,
            } for m in mouvements],
        })


class StatutPaiementView(APIView):
    """GET /api/payments/{reference}/ — statut du paiement (pollé par la page de retour)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, reference):
        try:
            paiement = Paiement.objects.select_related('tournoi').get(reference=reference, utilisateur=request.user)
        except Paiement.DoesNotExist:
            return Response({'detail': 'Paiement introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        # Filet de sécurité si le webhook n'est pas encore arrivé : re-vérifier chez GeniusPay
        if paiement.statut == Paiement.STATUT_EN_ATTENTE and paiement.genius_reference and services.est_configure():
            try:
                data = services.verifier_paiement(paiement.genius_reference)
                nouveau = services.STATUT_GENIUS_VERS_LOCAL.get(data.get('status'), paiement.statut)
                if nouveau == Paiement.STATUT_REUSSI:
                    _appliquer_paiement(paiement)
                elif nouveau != paiement.statut:
                    paiement.statut = nouveau
                    paiement.save(update_fields=['statut', 'updated_at'])
            except services.GeniusPayError as exc:
                logger.warning('Vérification GeniusPay impossible pour %s : %s', reference, exc)

        return Response({
            'reference': paiement.reference,
            'statut': paiement.statut,
            'montant': int(paiement.montant),
            'type_paiement': paiement.type_paiement,
            'tournoi_id': paiement.tournoi_id,
            'simulation': paiement.simulation,
        })


class SimulerPaiementView(APIView):
    """
    POST /api/payments/{reference}/simuler/ — dev uniquement (DEBUG sans clés API).
    Valide le paiement comme si le webhook GeniusPay était arrivé.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, reference):
        if not settings.DEBUG or services.est_configure():
            return Response({'detail': 'Simulation indisponible.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            paiement = Paiement.objects.select_related('tournoi').get(reference=reference, utilisateur=request.user)
        except Paiement.DoesNotExist:
            return Response({'detail': 'Paiement introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if paiement.statut != Paiement.STATUT_EN_ATTENTE:
            return Response({'detail': 'Ce paiement est déjà traité.'}, status=status.HTTP_400_BAD_REQUEST)

        paiement.simulation = True
        paiement.save(update_fields=['simulation', 'updated_at'])
        _appliquer_paiement(paiement)
        return Response({'reference': paiement.reference, 'statut': paiement.statut, 'tournoi_id': paiement.tournoi_id})


@method_decorator(csrf_exempt, name='dispatch')
class WebhookGeniusView(APIView):
    """
    POST /api/payments/webhook/genius/ — appelé par GeniusPay.
    Signature : HMAC-SHA256(timestamp + '.' + corps_json, secret) dans X-Webhook-Signature.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        signature = request.headers.get('X-Webhook-Signature', '')
        timestamp = request.headers.get('X-Webhook-Timestamp', '')
        if not services.verifier_signature_webhook(request.body, timestamp, signature):
            logger.warning('Webhook GeniusPay rejeté : signature invalide')
            return Response({'detail': 'Signature invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = json.loads(request.body.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return Response({'detail': 'JSON invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        evenement = request.headers.get('X-Webhook-Event', '')
        data = payload.get('data') or payload
        reference_interne = (data.get('metadata') or {}).get('reference', '')
        genius_reference = data.get('reference', '')

        paiement = Paiement.objects.filter(reference=reference_interne).first() \
            or Paiement.objects.filter(genius_reference=genius_reference).first()
        if paiement is None:
            logger.warning('Webhook GeniusPay : paiement inconnu (%s / %s)', reference_interne, genius_reference)
            return Response({'detail': 'Paiement inconnu.'}, status=status.HTTP_200_OK)

        paiement.details = {**paiement.details, 'webhook': payload, 'webhook_event': evenement}
        if evenement == 'payment.success' or data.get('status') == 'completed':
            if paiement.statut != Paiement.STATUT_REUSSI:
                paiement.save(update_fields=['details', 'updated_at'])
                _appliquer_paiement(paiement)
        else:
            nouveau = services.STATUT_GENIUS_VERS_LOCAL.get(data.get('status'))
            if nouveau and paiement.statut == Paiement.STATUT_EN_ATTENTE:
                paiement.statut = nouveau
            paiement.save(update_fields=['statut', 'details', 'updated_at'])

        return Response({'ok': True})
