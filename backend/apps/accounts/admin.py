from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Utilisateur


@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    list_display = ('email', 'username', 'role', 'commune', 'is_minor', 'is_active', 'date_joined')
    list_filter = ('role', 'is_minor', 'is_active', 'commune')
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('-date_joined',)

    fieldsets = UserAdmin.fieldsets + (
        ('HoopCI', {'fields': ('role', 'commune', 'telephone', 'photo', 'is_minor', 'consentement_parental')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('HoopCI', {'fields': ('email', 'role', 'commune', 'telephone', 'is_minor')}),
    )
