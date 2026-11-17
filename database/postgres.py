"""
Moteur async PostgreSQL + session + init_db()
Utilise SQLModel / SQLAlchemy async + asyncpg.
"""
import os
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

POSTGRES_URL: str = os.getenv(
    "POSTGRES_URL",
    "postgresql+asyncpg://myuser:postSQL123@localhost:5432/auto_agent",
)

# Moteur async (echo=True pour voir les requêtes SQL en dev)
engine = create_async_engine(POSTGRES_URL, echo=True, future=True)

# Factory de session async
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """
    Crée toutes les tables SQLModel au démarrage si elles n'existent pas.
    Appelé depuis main.py via le lifespan FastAPI.
    """
    async with engine.begin() as conn:
        # Importe tous les modèles pour que leurs métadonnées soient enregistrées
        from models import Voiture, User  # noqa: F401
        await conn.run_sync(SQLModel.metadata.create_all)
    print("[OK] Base de donnees initialisee (tables creees si necessaire)")


async def get_session():
    """
    Générateur de session — utilisé comme dépendance FastAPI (Depends).
    """
    async with AsyncSessionLocal() as session:
        yield session
