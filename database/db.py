"""
database/db.py — Re-exports from postgres.py for backward compatibility.
"""
from .postgres import init_db, get_session, engine  # noqa: F401

__all__ = ["init_db", "get_session", "engine"]
