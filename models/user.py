"""Modèle SQLModel pour la table 'user'."""
from typing import Optional
from sqlmodel import SQLModel, Field


class UserBase(SQLModel):
    nom: str
    prenom: str
    email: str
    role: str = "client"  # client / admin


class User(UserBase, table=True):
    """Table PostgreSQL 'user'."""
    __tablename__ = "user"

    id: Optional[int] = Field(default=None, primary_key=True)
    mot_de_passe: str


class UserCreate(UserBase):
    mot_de_passe: str


class UserRead(UserBase):
    id: int
