"""
routes/voiture_routes.py — Routeur FastAPI pour les opérations CRUD sur les voitures.
Utilise Depends(get_session) pour l'injection de la session async PostgreSQL.
"""
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from database.postgres import get_session
from models.voiture import VoitureCreate, VoitureRead, VoitureUpdate
from services.n8n_service import notify_voiture_created
from services.voiture_service import (
    create_voiture,
    delete_voiture,
    get_voiture,
    get_voitures,
    recommend_voiture,
    update_voiture,
)

router = APIRouter(tags=["voitures"])
logger = logging.getLogger(__name__)


# ─── GET /voitures ────────────────────────────────────────────────────────────
@router.get("/", response_model=List[VoitureRead])
async def list_voitures(session: AsyncSession = Depends(get_session)):
    """Retourne toutes les voitures du catalogue."""
    return await get_voitures(session)


# ─── GET /voitures/{id} ───────────────────────────────────────────────────────
@router.get("/{voiture_id}", response_model=VoitureRead)
async def get_voiture_by_id(
    voiture_id: int, session: AsyncSession = Depends(get_session)
):
    """Récupère une voiture par son identifiant."""
    voiture = await get_voiture(session, voiture_id)
    if not voiture:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voiture introuvable")
    return voiture


# ─── POST /voitures ───────────────────────────────────────────────────────────
@router.post("/", response_model=VoitureRead, status_code=status.HTTP_201_CREATED)
async def add_voiture(
    payload: VoitureCreate, session: AsyncSession = Depends(get_session)
):
    """Crée une nouvelle voiture dans le catalogue."""
    voiture = await create_voiture(session, payload)

    sent = await notify_voiture_created(voiture)
    if not sent:
        logger.warning("Webhook n8n non envoyé pour la voiture %s", voiture.id)

    return voiture


# ─── PATCH /voitures/{id} ─────────────────────────────────────────────────────
@router.patch("/{voiture_id}", response_model=VoitureRead)
async def edit_voiture(
    voiture_id: int,
    payload: VoitureUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Met à jour partiellement une voiture existante."""
    voiture = await update_voiture(session, voiture_id, payload)
    if not voiture:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voiture introuvable")
    return voiture


# ─── DELETE /voitures/{id} ────────────────────────────────────────────────────
@router.delete("/{voiture_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_voiture(
    voiture_id: int, session: AsyncSession = Depends(get_session)
):
    """Supprime une voiture du catalogue."""
    deleted = await delete_voiture(session, voiture_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voiture introuvable")


# ─── GET /voitures/recommander/{budget} ─────────────────────────────────────
@router.get("/recommander/{budget}", response_model=List[VoitureRead])
async def recommander_voitures(
    budget: float, session: AsyncSession = Depends(get_session)
):
    """Recommande les voitures disponibles dont le prix est inférieur ou égal au budget."""
    voitures = await recommend_voiture(session, budget)
    if not voitures:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aucune voiture trouvée pour un budget de {budget} €",
        )
    return voitures
