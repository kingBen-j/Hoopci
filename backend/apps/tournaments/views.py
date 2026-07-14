from datetime import date

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction
from django.db.models import Count, Q

from apps.core.permissions import IsPromoteur, IsOrganisateurOwner, IsJoueur
from .models import Tournoi, Equipe, Participation, Resultat, FavoriTournoi
from .serializers import (
    TournoiListSerializer, TournoiDetailSerializer,
    TournoiCreateSerializer, EquipeSerializer, ResultatSerializer,
    PalmaresSerializer,
)
from .filters import TournoiFilter


class TournoiViewSet(viewsets.ModelViewSet):
    # Les tournois promus (payés par un promoteur) remontent en tête de liste
    queryset = Tournoi.objects.select_related('organisateur').prefetch_related('equipes').order_by('-mis_en_avant', '-date_debut')
    filterset_class = TournoiFilter
    search_fields = ('titre', 'commune', 'lieu')
    ordering_fields = ('date_debut', 'created_at', 'frais_inscription')

    def get_queryset(self):
        qs = super().get_queryset()
        # Un tournoi en attente de paiement n'est visible que par son promoteur
        impaye = Q(statut=Tournoi.STATUT_EN_ATTENTE_PAIEMENT)
        if self.request.user.is_authenticated:
            impaye &= ~Q(organisateur=self.request.user)
        return qs.exclude(impaye)

    def get_parsers(self):
        if self.request.method in ('POST', 'PUT', 'PATCH'):
            return [MultiPartParser(), FormParser(), JSONParser()]
        return super().get_parsers()

    def get_serializer_class(self):
        if self.action == 'list':
            return TournoiListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return TournoiCreateSerializer
        return TournoiDetailSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsPromoteur()]
        if self.action in ('update', 'partial_update', 'destroy', 'saisir_resultat'):
            return [permissions.IsAuthenticated(), IsOrganisateurOwner()]
        if self.action in ('favori', 'ajouter_equipe', 'rejoindre'):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    @action(detail=True, methods=['post'], url_path='resultat')
    def saisir_resultat(self, request, pk=None):
        tournoi = self.get_object()

        if tournoi.statut not in (Tournoi.STATUT_EN_COURS, Tournoi.STATUT_TERMINE):
            return Response({'detail': "Le tournoi doit être en cours ou terminé."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ResultatSerializer(
            data=request.data,
            context={'request': request, 'tournoi': tournoi},
        )
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            resultat, created = Resultat.objects.update_or_create(
                tournoi=tournoi,
                defaults={**serializer.validated_data, 'saisi_par': request.user},
            )
            tournoi.statut = Tournoi.STATUT_TERMINE
            tournoi.save(update_fields=['statut'])

        # Déclencher le recalcul des stats de tous les participants en asynchrone
        from apps.players.tasks import recalculer_stats_joueur
        from apps.tournaments.models import Participation
        joueur_ids = Participation.objects.filter(equipe__tournoi=tournoi).values_list('joueur_id', flat=True)
        for joueur_id in joueur_ids:
            recalculer_stats_joueur.delay(joueur_id)

        return Response(ResultatSerializer(resultat).data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def favori(self, request, pk=None):
        tournoi = self.get_object()
        favori, created = FavoriTournoi.objects.get_or_create(utilisateur=request.user, tournoi=tournoi)
        if not created:
            favori.delete()
            return Response({'favori': False})
        return Response({'favori': True}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='equipes')
    def ajouter_equipe(self, request, pk=None):
        tournoi = self.get_object()
        if tournoi.statut != Tournoi.STATUT_OUVERT:
            return Response({'detail': "Les inscriptions sont fermées."}, status=status.HTTP_400_BAD_REQUEST)
        if tournoi.nombre_equipes_max and tournoi.equipes.filter(payee=True).count() >= tournoi.nombre_equipes_max:
            return Response({'detail': "Le tournoi est complet."}, status=status.HTTP_400_BAD_REQUEST)
        # Classe d'âge : contrôlée pour le joueur qui inscrit (il rejoint l'équipe)
        if request.user.role == 'joueur':
            ok, message = tournoi.accepte_joueur(request.user)
            if not ok:
                return Response({'detail': message}, status=status.HTTP_400_BAD_REQUEST)
        serializer = EquipeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # L'inscription se paie (500 FCFA plateforme + frais du tournoi, apps.payments) ;
        # les équipes ajoutées par le promoteur du tournoi sont exemptées
        equipe = serializer.save(tournoi=tournoi, payee=(request.user == tournoi.organisateur))
        # Le joueur qui inscrit son équipe en devient automatiquement membre
        if request.user.role == 'joueur':
            Participation.objects.get_or_create(joueur=request.user, equipe=equipe)
        return Response(EquipeSerializer(equipe).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def rejoindre(self, request, pk=None):
        """Un joueur rejoint une équipe déjà inscrite au tournoi."""
        tournoi = self.get_object()
        if request.user.role != 'joueur':
            return Response({'detail': "Seul un joueur peut rejoindre une équipe."}, status=status.HTTP_403_FORBIDDEN)
        if tournoi.statut in (Tournoi.STATUT_TERMINE, Tournoi.STATUT_ANNULE):
            return Response({'detail': "Ce tournoi n'accepte plus de joueurs."}, status=status.HTTP_400_BAD_REQUEST)
        # Classe d'âge du tournoi : l'âge du joueur doit correspondre
        ok, message = tournoi.accepte_joueur(request.user)
        if not ok:
            return Response({'detail': message}, status=status.HTTP_400_BAD_REQUEST)
        # On ne peut rejoindre qu'une équipe dont l'inscription est payée
        equipe = tournoi.equipes.filter(pk=request.data.get('equipe'), payee=True).first()
        if not equipe:
            return Response({'detail': "Équipe introuvable dans ce tournoi."}, status=status.HTTP_400_BAD_REQUEST)
        _, created = Participation.objects.get_or_create(joueur=request.user, equipe=equipe)
        if not created:
            return Response({'detail': "Tu fais déjà partie de cette équipe."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(EquipeSerializer(equipe).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='mes-equipes', permission_classes=[permissions.IsAuthenticated, IsJoueur])
    def mes_equipes(self, request):
        """Les équipes du joueur connecté — effectif, promotion et tournoi associé."""
        participations = (
            Participation.objects.filter(joueur=request.user)
            .select_related('equipe__tournoi')
            .order_by('-equipe__tournoi__date_debut')
        )
        data = []
        for p in participations:
            equipe = p.equipe
            data.append({
                **EquipeSerializer(equipe).data,
                'tournoi': {
                    'id': equipe.tournoi_id,
                    'titre': equipe.tournoi.titre,
                    'statut': equipe.tournoi.statut,
                    'sport': equipe.tournoi.sport,
                    'format': equipe.tournoi.format,
                    'date_debut': equipe.tournoi.date_debut,
                },
            })
        return Response(data)

    @action(detail=False, methods=['get'], url_path='mes-tournois', permission_classes=[permissions.IsAuthenticated, IsPromoteur])
    def mes_tournois(self, request):
        qs = self.get_queryset().filter(organisateur=request.user)
        serializer = TournoiListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='favoris', permission_classes=[permissions.IsAuthenticated])
    def mes_favoris(self, request):
        tournoi_ids = FavoriTournoi.objects.filter(utilisateur=request.user).values_list('tournoi_id', flat=True)
        qs = self.get_queryset().filter(id__in=tournoi_ids)
        serializer = TournoiListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    # Barème du classement des équipes (agrégé par nom d'équipe, tous tournois confondus)
    POINTS_EQUIPE_VICTOIRE = 30
    POINTS_EQUIPE_FINALE = 15
    POINTS_EQUIPE_PARTICIPATION = 5

    @action(detail=False, methods=['get'], url_path='classement-equipes', permission_classes=[permissions.AllowAny])
    def classement_equipes(self, request):
        """
        Classement des équipes selon les tournois remportés et leurs performances :
        victoire ×30 · finale perdue ×15 · participation ×5, avec taux de victoire
        calculé sur les tournois ayant un résultat officiel.
        """
        # Filtre optionnel ?sport=basket|football (les équipes sont agrégées par nom,
        # on ne mélange donc pas les palmarès basket et football si le filtre est utilisé)
        equipes = Equipe.objects.filter(payee=True)
        sport = request.query_params.get('sport')
        if sport:
            equipes = equipes.filter(tournoi__sport=sport)

        agregat = (
            equipes
            .values('nom')
            .annotate(
                tournois_joues=Count('id', distinct=True),
                victoires=Count('victoires', distinct=True),
                finales_perdues=Count('finales_perdues', distinct=True),
                tournois_avec_resultat=Count('tournoi__resultat', distinct=True),
            )
        )

        classement = []
        for e in agregat:
            points = (
                e['victoires'] * self.POINTS_EQUIPE_VICTOIRE
                + e['finales_perdues'] * self.POINTS_EQUIPE_FINALE
                + e['tournois_joues'] * self.POINTS_EQUIPE_PARTICIPATION
            )
            taux = round(e['victoires'] / e['tournois_avec_resultat'] * 100, 1) if e['tournois_avec_resultat'] else 0.0
            classement.append({
                'nom': e['nom'],
                'tournois_joues': e['tournois_joues'],
                'victoires': e['victoires'],
                'finales_perdues': e['finales_perdues'],
                'taux_victoire': taux,
                'points': points,
            })

        classement.sort(key=lambda x: (-x['points'], -x['victoires'], -x['taux_victoire']))
        return Response(classement[:50])

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def palmares(self, request):
        """Récap public des tournois terminés : vainqueur, score de la finale, MVP."""
        qs = (
            Tournoi.objects.select_related('organisateur', 'resultat__equipe_gagnante',
                                           'resultat__equipe_finaliste', 'resultat__mvp')
            .filter(statut=Tournoi.STATUT_TERMINE, resultat__isnull=False)
            .order_by('-date_debut')
        )
        commune = request.query_params.get('commune')
        if commune:
            qs = qs.filter(commune__iexact=commune)
        # Filtre optionnel ?sport=basket|football
        sport = request.query_params.get('sport')
        if sport:
            qs = qs.filter(sport=sport)
        page = self.paginate_queryset(qs)
        serializer = PalmaresSerializer(page if page is not None else qs, many=True, context={'request': request})
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    # Niveau conseillé selon le grade du joueur (bronze → légende)
    NIVEAU_PAR_GRADE = {
        'bronze': Tournoi.NIVEAU_DEBUTANT,
        'argent': Tournoi.NIVEAU_INTERMEDIAIRE,
        'or': Tournoi.NIVEAU_INTERMEDIAIRE,
        'platine': Tournoi.NIVEAU_ELITE,
        'legende': Tournoi.NIVEAU_ELITE,
    }
    NIVEAU_ORDRE = [Tournoi.NIVEAU_DEBUTANT, Tournoi.NIVEAU_INTERMEDIAIRE, Tournoi.NIVEAU_ELITE]

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated, IsJoueur])
    def recommandes(self, request):
        """
        Tournois recommandés au joueur connecté, notés selon son profil :
        niveau adapté au grade et aux performances, commune, format habituel.
        """
        profil = getattr(request.user, 'profil_joueur', None)
        grade = getattr(profil, 'grade', 'bronze')
        taux = getattr(profil, 'taux_victoire', 0.0)

        niveau_cible = self.NIVEAU_PAR_GRADE.get(grade, Tournoi.NIVEAU_DEBUTANT)
        # Un joueur qui gagne beaucoup est poussé vers le niveau supérieur
        idx = self.NIVEAU_ORDRE.index(niveau_cible)
        if taux >= 60 and idx < len(self.NIVEAU_ORDRE) - 1:
            idx += 1
            niveau_cible = self.NIVEAU_ORDRE[idx]

        # Format le plus joué (3x3 ou 5x5) d'après l'historique de participations
        format_prefere = (
            Participation.objects.filter(joueur=request.user)
            .values('equipe__tournoi__format')
            .annotate(n=Count('id')).order_by('-n')
            .values_list('equipe__tournoi__format', flat=True).first()
        )

        deja_inscrits = set(
            Participation.objects.filter(joueur=request.user)
            .values_list('equipe__tournoi_id', flat=True)
        )

        # On ne recommande que des tournois du sport du joueur (un footballeur
        # ne reçoit pas de tournois de basket, et inversement)
        candidats = (
            Tournoi.objects.select_related('organisateur').prefetch_related('equipes')
            .filter(statut=Tournoi.STATUT_OUVERT, date_debut__gte=date.today(),
                    sport=getattr(profil, 'sport', 'basket') or 'basket')
            .exclude(id__in=deja_inscrits)
        )

        recommandations = []
        for t in candidats:
            score, raisons = 0, []
            ecart_niveau = abs(self.NIVEAU_ORDRE.index(t.niveau) - idx)
            if ecart_niveau == 0:
                score += 40
                raisons.append(f"Niveau adapté à ton grade ({grade.capitalize()})")
            elif ecart_niveau == 1:
                score += 15
            if request.user.commune and t.commune.lower() == request.user.commune.lower():
                score += 25
                raisons.append('Dans ta commune')
            if format_prefere and t.format == format_prefere:
                score += 15
                raisons.append(f'Format {t.format}, ton format habituel')
            if t.mis_en_avant:
                score += 10
                raisons.append('Promu par HoopCI')
            if profil and profil.tournois_joues == 0 and t.frais_inscription == 0:
                score += 10
                raisons.append('Gratuit, idéal pour débuter')
            recommandations.append((score, t, raisons))

        recommandations.sort(key=lambda x: (-x[0], x[1].date_debut))
        resultats = []
        for score, t, raisons in recommandations[:6]:
            data = TournoiListSerializer(t, context={'request': request}).data
            data['score_reco'] = score
            data['raisons'] = raisons
            resultats.append(data)
        return Response(resultats)
