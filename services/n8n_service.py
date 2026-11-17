"""Intégration n8n pour déclencher des automatisations après ajout d'une voiture."""
from __future__ import annotations

import asyncio
import json
import logging
import os
import urllib.error
import urllib.request

from dotenv import load_dotenv

from models.voiture import Voiture

load_dotenv()

logger = logging.getLogger(__name__)

N8N_VOITURE_WEBHOOK_URL = os.environ.get(
    "N8N_VOITURE_WEBHOOK_URL",
    "http://localhost:5678/webhook/voiture-created",
)


def _post_json_sync(url: str, payload: dict) -> None:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=20) as response:
        # On ne dépend pas du contenu de réponse, on veut juste déclencher le flux.
        response.read()


async def notify_voiture_created(voiture: Voiture) -> bool:
    """Déclenche le webhook n8n après création d'une voiture.

    Retourne True si l'appel a réussi, False sinon.
    """
    if not N8N_VOITURE_WEBHOOK_URL:
        return False

    payload = voiture.model_dump()

    try:
        await asyncio.to_thread(_post_json_sync, N8N_VOITURE_WEBHOOK_URL, payload)
        logger.info("Webhook n8n envoyé vers %s pour la voiture %s", N8N_VOITURE_WEBHOOK_URL, voiture.id)
        return True
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError):
        logger.exception("Échec webhook n8n vers %s pour la voiture %s", N8N_VOITURE_WEBHOOK_URL, voiture.id)
        return False