"""Service Cohere pour le chatbot Auto-Agent."""
from __future__ import annotations

import asyncio
import json
import logging
import os
import urllib.error
import urllib.request
from typing import Iterable

from dotenv import load_dotenv

from models.voiture import Voiture

load_dotenv()

COHERE_API_KEY = os.environ.get("COHERE_API_KEY", "")
COHERE_MODEL = os.environ.get("COHERE_MODEL", "command-r")
COHERE_API_URL = "https://api.cohere.com/v2/chat"
logger = logging.getLogger(__name__)


def _format_inventory(cars: Iterable[Voiture]) -> str:
    items = []
    for car in list(cars)[:20]:
        options = ", ".join(car.options or []) if car.options else "aucune"
        items.append(
            f"- {car.id}: {car.marque} {car.modele} | {car.annee} | {car.prix} EUR | "
            f"{car.kilometrage} km | {car.type_carburant} | {car.transmission} | "
            f"{car.couleur} | {car.nombre_portes} portes | statut={car.statut} | options={options}"
        )

    if not items:
        return "Aucune voiture en base."

    return "\n".join(items)


def _friendly_cohere_error(status_code: int | None, error_body: str, reason: str | None) -> str:
    normalized_body = (error_body or "").lower()
    normalized_reason = (reason or "").lower()

    if status_code == 401:
        return "Cohere a refusé la clé API. Vérifie COHERE_API_KEY dans le fichier .env."

    if status_code == 403:
        return (
            "Cohere a refusé l'accès à la requête. "
            "Vérifie la clé API, le modèle demandé et les restrictions réseau/compte."
        )

    if status_code == 429:
        return "Cohere limite temporairement les requêtes. Réessaie dans quelques instants."

    if "access denied" in normalized_body or "access denied" in normalized_reason:
        return (
            "Cohere a renvoyé 'Access denied'. Vérifie la région autorisée, le compte Cohere "
            "et l'état de la clé API."
        )

    return f"Cohere a répondu avec une erreur: {status_code or 'inconnue'}."


def _generate_reply_sync(message: str, cars: list[Voiture]) -> str:
    if not COHERE_API_KEY:
        return (
            "La clé Cohere n'est pas configurée. Ajoute COHERE_API_KEY dans le fichier .env "
            "puis relance le serveur."
        )

    inventory_context = _format_inventory(cars)

    prompt = (
        "Tu es l'assistant commercial d'une plateforme automobile. "
        "Réponds en français, de manière concise et utile. "
        "Utilise uniquement le contexte du stock fourni ci-dessous. "
        "Si la demande concerne un budget, classe les voitures adaptées en donnant les meilleures options. "
        "Si une information n'est pas disponible, dis-le clairement sans inventer.\n\n"
        f"CONTEXTE STOCK:\n{inventory_context}"
    )

    payload = {
        "model": COHERE_MODEL,
        "stream": False,
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": message},
        ],
        "temperature": 0.4,
        "max_tokens": 500,
    }

    request = urllib.request.Request(
        COHERE_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {COHERE_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        logger.warning(
            "Cohere HTTPError status=%s reason=%s body=%s model=%s",
            exc.code,
            exc.reason,
            error_body,
            COHERE_MODEL,
        )
        return _friendly_cohere_error(exc.code, error_body, exc.reason)
    except Exception as exc:  # pragma: no cover - dépend du réseau et de l'API externe
        logger.exception("Cohere request failed unexpectedly for model=%s", COHERE_MODEL)
        return f"Erreur Cohere: {exc}"

    message_data = body.get("message") or {}
    if not message_data:
        return "Je n'ai pas pu générer de réponse."

    content_blocks = message_data.get("content") or []
    content = ""
    for block in content_blocks:
        if isinstance(block, dict) and block.get("type") == "text":
            content = (block.get("text") or "").strip()
            if content:
                break

    return content or "Je n'ai pas pu générer de réponse."


async def generate_reply(message: str, cars: list[Voiture]) -> str:
    return await asyncio.to_thread(_generate_reply_sync, message, cars)