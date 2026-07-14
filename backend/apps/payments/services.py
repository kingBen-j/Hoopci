"""
Client GeniusPay — https://pay.genius.ci/doc

Auth : headers X-API-Key (pk_sandbox_… / pk_live_…) + X-API-Secret (sk_…).
Sans clés dans l'environnement (dev), le mode simulation prend le relais
dans les vues : aucun appel réseau n'est fait.
"""
import hashlib
import hmac

import requests
from django.conf import settings


class GeniusPayError(Exception):
    pass


def est_configure():
    return bool(settings.GENIUSPAY_API_KEY and settings.GENIUSPAY_API_SECRET)


def _headers():
    return {
        'X-API-Key': settings.GENIUSPAY_API_KEY,
        'X-API-Secret': settings.GENIUSPAY_API_SECRET,
        'Content-Type': 'application/json',
    }


def _url(path):
    return f"{settings.GENIUSPAY_BASE_URL.rstrip('/')}{path}"


def initier_paiement(*, montant, reference, description, customer_email='', customer_phone='',
                     metadata=None, success_url='', error_url=''):
    """
    Crée un paiement GeniusPay (checkout hébergé : payment_method omis,
    le client choisit Wave / Orange Money / MTN / carte sur la page GeniusPay).
    Retourne le dict `data` de la réponse (genius reference MTX-…, checkout_url…).
    """
    payload = {
        'amount': int(montant),
        'currency': 'XOF',
        'description': description,
        'metadata': {**(metadata or {}), 'reference': reference},
        'success_url': success_url,
        'error_url': error_url,
    }
    customer = {}
    if customer_email:
        customer['email'] = customer_email
    if customer_phone:
        customer['phone'] = customer_phone
    if customer:
        payload['customer'] = customer

    try:
        r = requests.post(_url('/api/v1/merchant/payments'), json=payload, headers=_headers(), timeout=20)
    except requests.RequestException as exc:
        raise GeniusPayError(f"GeniusPay injoignable : {exc}") from exc

    if r.status_code not in (200, 201):
        raise GeniusPayError(f"GeniusPay a refusé le paiement (HTTP {r.status_code}) : {r.text[:300]}")

    body = r.json()
    data = body.get('data') or body
    if not data.get('reference'):
        raise GeniusPayError(f"Réponse GeniusPay inattendue : {body}")
    return data


def verifier_paiement(genius_reference):
    """GET /api/v1/merchant/payments/{reference} → dict avec status
    (pending, processing, completed, failed, cancelled, refunded, expired)."""
    try:
        r = requests.get(_url(f'/api/v1/merchant/payments/{genius_reference}'), headers=_headers(), timeout=20)
    except requests.RequestException as exc:
        raise GeniusPayError(f"GeniusPay injoignable : {exc}") from exc

    if r.status_code != 200:
        raise GeniusPayError(f"Vérification impossible (HTTP {r.status_code}) : {r.text[:300]}")
    body = r.json()
    return body.get('data') or body


def verifier_signature_webhook(raw_body: bytes, timestamp: str, signature: str) -> bool:
    """Signature = HMAC-SHA256(timestamp + '.' + json_payload, secret)."""
    if not (timestamp and signature and settings.GENIUSPAY_API_SECRET):
        return False
    message = f"{timestamp}.".encode() + raw_body
    attendu = hmac.new(settings.GENIUSPAY_API_SECRET.encode(), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(attendu, signature)


# Correspondance statut GeniusPay → statut Paiement
STATUT_GENIUS_VERS_LOCAL = {
    'completed': 'reussi',
    'failed': 'echoue',
    'cancelled': 'annule',
    'expired': 'expire',
    'refunded': 'annule',
    'pending': 'en_attente',
    'processing': 'en_attente',
}
