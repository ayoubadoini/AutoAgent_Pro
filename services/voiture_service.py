"""
services/voiture_service.py — Service layer CRUD pour la table 'voiture'.
Utilise SQLModel async avec PostgreSQL (asyncpg).
"""
from typing import List, Optional

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from models.voiture import Voiture, VoitureCreate, VoitureUpdate


async def create_voiture(session: AsyncSession, data: VoitureCreate) -> Voiture:
    """Crée une nouvelle voiture et la persiste en base."""
    voiture = Voiture(**data.model_dump())
    session.add(voiture)
    await session.commit()
    await session.refresh(voiture)
    return voiture


async def get_voitures(session: AsyncSession) -> List[Voiture]:
    """Retourne toutes les voitures de la base."""
    result = await session.exec(select(Voiture))
    return result.all()


async def get_voiture(session: AsyncSession, voiture_id: int) -> Optional[Voiture]:
    """Récupère une voiture par son id entier."""
    return await session.get(Voiture, voiture_id)


async def update_voiture(
    session: AsyncSession, voiture_id: int, data: VoitureUpdate
) -> Optional[Voiture]:
    """Met à jour les champs fournis pour la voiture donnée (PATCH partiel)."""
    voiture = await session.get(Voiture, voiture_id)
    if not voiture:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(voiture, key, value)
    session.add(voiture)
    await session.commit()
    await session.refresh(voiture)
    return voiture


async def delete_voiture(session: AsyncSession, voiture_id: int) -> bool:
    """Supprime la voiture dont l'id est fourni. Retourne True si supprimée."""
    voiture = await session.get(Voiture, voiture_id)
    if not voiture:
        return False
    await session.delete(voiture)
    await session.commit()
    return True


async def recommend_voiture(
    session: AsyncSession, budget: float
) -> List[Voiture]:
    """
    Recommande des voitures dont le prix est <= budget, triées par prix décroissant.
    Utilisé comme outil MCP pour l'agent IA.
    """
    result = await session.exec(
        select(Voiture)
        .where(Voiture.prix <= budget)
        .where(Voiture.statut == "disponible")
        .order_by(Voiture.prix.desc())  # type: ignore
    )
    return result.all()
