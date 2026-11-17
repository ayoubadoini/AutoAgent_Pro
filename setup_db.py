"""
setup_db.py - Script de configuration automatique PostgreSQL.

Executez ce script UNE SEULE FOIS avant de lancer le serveur FastAPI.
Il va automatiquement :
  1. Creer le role/utilisateur PostgreSQL  (myuser)
  2. Creer la base de donnees              (auto_agent)
  3. Accorder tous les privileges necessaires

Usage :
    python setup_db.py

Prerequis :
    pip install psycopg2-binary python-dotenv
    Le serveur PostgreSQL doit tourner sur localhost:5432
    L'utilisateur admin (postgres) doit avoir acces
"""
# -*- coding: utf-8 -*-
import os
import sys
import re
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

load_dotenv()

ADMIN_USER = "postgres"

# Lire le mot de passe admin depuis POSTGRES_ADMIN_URL
_admin_url = os.getenv("POSTGRES_ADMIN_URL", "")
if _admin_url:
    _m = re.match(r"postgresql://[^:]+:([^@]+)@", _admin_url)
    ADMIN_PASS = _m.group(1) if _m else os.getenv("ADMIN_POSTGRES_PASSWORD", "postgres")
else:
    ADMIN_PASS = os.getenv("ADMIN_POSTGRES_PASSWORD", "postgres")

DB_HOST = os.getenv("DB_HOST",     "localhost")
DB_PORT = os.getenv("DB_PORT",     "5432")
DB_NAME = os.getenv("DB_NAME",     "auto_agent")
DB_USER = os.getenv("DB_USER",     "myuser")
DB_PASS = os.getenv("DB_PASSWORD", "postSQL123")


def get_admin_conn():
    return psycopg2.connect(
        host=DB_HOST,
        port=int(DB_PORT),
        dbname="postgres",
        user=ADMIN_USER,
        password=ADMIN_PASS,
    )


def step(msg):
    print("\n" + "=" * 55)
    print("  >> " + msg)
    print("=" * 55)


def ok(msg):
    print("  [OK]   " + msg)


def warn(msg):
    print("  [WARN] " + msg)


def create_role(conn):
    step("Creation du role '" + DB_USER + "'")
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (DB_USER,))
        if cur.fetchone():
            warn("Le role '" + DB_USER + "' existe deja -> ignore")
            return
        cur.execute(
            "CREATE ROLE " + DB_USER +
            " WITH LOGIN ENCRYPTED PASSWORD '" + DB_PASS +
            "' CREATEDB INHERIT;"
        )
        ok("Role '" + DB_USER + "' cree avec succes")


def create_database(conn):
    step("Creation de la base '" + DB_NAME + "'")
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
        if cur.fetchone():
            warn("La base '" + DB_NAME + "' existe deja -> ignoree")
            return
        cur.execute(
            "CREATE DATABASE " + DB_NAME +
            " OWNER " + DB_USER + " ENCODING 'UTF8';"
        )
        ok("Base '" + DB_NAME + "' creee et attribuee a '" + DB_USER + "'")


def grant_privileges():
    step("Attribution des privileges sur '" + DB_NAME + "' a '" + DB_USER + "'")
    conn = psycopg2.connect(
        host=DB_HOST,
        port=int(DB_PORT),
        dbname=DB_NAME,
        user=ADMIN_USER,
        password=ADMIN_PASS,
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    try:
        with conn.cursor() as cur:
            cur.execute("GRANT CONNECT ON DATABASE " + DB_NAME + " TO " + DB_USER + ";")
            cur.execute("GRANT ALL ON SCHEMA public TO " + DB_USER + ";")
            cur.execute(
                "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
                "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO " + DB_USER + ";"
            )
        ok("Tous les privileges accordes a '" + DB_USER + "' sur '" + DB_NAME + "'")
    finally:
        conn.close()


def main():
    print("\n" + "=" * 50)
    print("   Auto-Agent -- Setup PostgreSQL")
    print("=" * 50)

    try:
        conn = get_admin_conn()
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    except Exception as e:
        print("\n[ERROR] Impossible de se connecter a PostgreSQL.")
        print("    Verifiez que PostgreSQL tourne sur " + DB_HOST + ":" + DB_PORT)
        print("    Erreur : " + str(e))
        print()
        print("  SOLUTION : Modifiez POSTGRES_ADMIN_URL dans .env")
        print("  Exemple  : postgresql://postgres:VOTRE_PASS@localhost:5432/postgres")
        sys.exit(1)

    try:
        create_role(conn)
        create_database(conn)
    finally:
        conn.close()

    grant_privileges()

    print("\n" + "=" * 60)
    print("[OK] Setup termine avec succes !")
    print("  Base       : " + DB_NAME)
    print("  Utilisateur: " + DB_USER)
    print("  URL        : postgresql+asyncpg://" + DB_USER + ":***@" + DB_HOST + ":" + DB_PORT + "/" + DB_NAME)
    print()
    print("  Lancez maintenant le serveur avec :")
    print("    uvicorn main:app --reload")
    print("=" * 60)


if __name__ == "__main__":
    main()
