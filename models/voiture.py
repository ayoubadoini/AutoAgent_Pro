"""Modèle SQLModel pour la table 'voiture'."""
from typing import Optional, List
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import ARRAY, TEXT


class VoitureBase(SQLModel):
    marque: str
    modele: str
    annee: int
    prix: float
    kilometrage: int
    type_carburant: str          # Essence / Diesel / Electrique
    couleur: str
    nombre_portes: int
    transmission: str            # Manuelle / Automatique
    image_url: str = ""
    statut: str = "disponible"  # disponible / vendu / réservé


class Voiture(VoitureBase, table=True):
    """Table PostgreSQL 'voiture'."""
    __tablename__ = "voiture"

    id: Optional[int] = Field(default=None, primary_key=True)
    options: Optional[List[str]] = Field(
        default=None,
        sa_column=Column(ARRAY(TEXT), default=[]),
    )


class VoitureCreate(VoitureBase):
    """Schéma de création (corps de la requête POST)."""
    options: Optional[List[str]] = []


class VoitureRead(VoitureBase):
    """Schéma de réponse (inclut l'id)."""
    id: int
    options: Optional[List[str]] = []


class VoitureUpdate(SQLModel):
    """Schéma de mise à jour partielle (tous les champs optionnels)."""
    marque: Optional[str] = None
    modele: Optional[str] = None
    annee: Optional[int] = None
    prix: Optional[float] = None
    kilometrage: Optional[int] = None
    type_carburant: Optional[str] = None
    couleur: Optional[str] = None
    nombre_portes: Optional[int] = None
    transmission: Optional[str] = None
    options: Optional[List[str]] = None
    image_url: Optional[str] = None
    statut: Optional[str] = None
