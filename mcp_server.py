"""
mcp_server.py — Point d'entrée du serveur MCP (FastMCP).

Lance le serveur MCP qui expose les outils à l'agent IA.
Initialise d'abord la base de données PostgreSQL puis démarre le serveur.

Usage :
    python mcp_server.py
"""
import asyncio
import os
import sys

# Ajouter le dossier racine du projet au PYTHONPATH
sys.path.insert(0, os.path.dirname(__file__))

from database.postgres import init_db
from mcp_app.tools_voiture import mcp


async def startup():
    """Initialise la base PostgreSQL avant de démarrer le MCP server."""
    await init_db()
    print("✅  Base de données prête — démarrage du serveur MCP…")


if __name__ == "__main__":
    # Initialiser la DB puis lancer le serveur MCP (stdio par défaut)
    asyncio.run(startup())
    mcp.run()
