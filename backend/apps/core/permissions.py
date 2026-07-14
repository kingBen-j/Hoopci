from rest_framework.permissions import BasePermission


class IsPromoteur(BasePermission):
    """Rôle unique « Promoteur » — publie tournois et événements."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_promoteur


class IsJoueur(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_joueur


class IsOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        owner_field = getattr(obj, 'organisateur', None) or getattr(obj, 'utilisateur', None) or getattr(obj, 'joueur', None)
        return owner_field == request.user


class IsOrganisateurOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return getattr(obj, 'organisateur', None) == request.user
