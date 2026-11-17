import os
import sys
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Ensure local package imports keep working in the reloader child process
sys.path.insert(0, os.path.dirname(__file__))

# Import local modules
from database.db import init_db
from routes.chatbot_routes import router as chatbot_router
from routes.voiture_routes import router as voiture_router

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise la base de donnees avant le demarrage du serveur."""
    await init_db()
    yield


app = FastAPI(lifespan=lifespan)

# CORS - autoriser tout le monde en dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enregistrement du routeur Voiture
app.include_router(voiture_router, prefix="/voitures")
app.include_router(chatbot_router, prefix="/chatbot")

# Servir les fichiers statiques (CSS, JS)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# Endpoint sante simple
@app.get("/health")
async def health():
    return {"status": "ok"}


# Servir la page de login a la racine
@app.get("/")
async def serve_frontend():
    return FileResponse(os.path.join(STATIC_DIR, "login.html"))


# Servir la page principale de gestion des voitures
@app.get("/app")
async def serve_app():
    return FileResponse(os.path.join(STATIC_DIR, "app.html"))


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
