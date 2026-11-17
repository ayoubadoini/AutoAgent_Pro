"""
mcp_app/tools_voiture.py — Outils MCP exposés à l'agent IA via FastMCP.

Chaque outil retourne des structures JSON simples (listes ou dicts)
afin que le LLM puisse les consommer directement.
"""
from typing import Any, Dict, List

from fastmcp import FastMCP

from database.postgres import AsyncSessionLocal
from services.voiture_service import get_voitures, recommend_voiture

mcp = FastMCP("auto-agent-mcp")


# ─── Outil 1 : liste complète du stock ───────────────────────────────────────
@mcp.tool()
async def get_stock_voitures() -> List[Dict[str, Any]]:
    """
    Retourne la liste complète des voitures disponibles dans le catalogue.
    Inclut : marque, modèle, année, prix, kilométrage, carburant, statut, options.
    """
    async with AsyncSessionLocal() as session:
        voitures = await get_voitures(session)
    return [v.model_dump() for v in voitures]


# ─── Outil 2 : recommandation selon budget ───────────────────────────────────
@mcp.tool()
async def recommander_voiture_par_budget(budget: float) -> List[Dict[str, Any]]:
    """
    Recommande les meilleures voitures disponibles dont le prix est inférieur
    ou égal au budget fourni (en euros), triées par prix décroissant.

    Args:
        budget: Budget maximum du client en euros (ex. 15000.0).

    Returns:
        Liste de voitures correspondantes avec tous leurs attributs.
    """
    async with AsyncSessionLocal() as session:
        voitures = await recommend_voiture(session, budget)
    if not voitures:
        return [{"message": f"Aucune voiture disponible pour un budget de {budget} €."}]
    return [v.model_dump() for v in voitures]
