# AutoAgent Pro

AutoAgent Pro is a full-stack car inventory platform with:
- FastAPI backend
- PostgreSQL database (SQLModel + SQLAlchemy async)
- AI chatbot powered by Cohere
- n8n webhook integration after car creation
- MCP server tools for AI agents
- Web UI (login + car management dashboard)

## What the project does

This project lets you:
- Add, list, update, delete cars
- Recommend cars by budget
- Ask an AI assistant questions about the current inventory
- Trigger an n8n workflow when a new car is created
- Expose inventory/recommendation tools through MCP

## Architecture

- Frontend (HTML/CSS/JS) calls FastAPI endpoints
- FastAPI uses async PostgreSQL sessions
- Chatbot endpoint sends inventory context to Cohere
- Car creation endpoint calls n8n webhook
- MCP server exposes inventory/recommendation tools for external AI clients

Main files:
- main.py: FastAPI app entrypoint
- database/postgres.py: async DB engine/session/init
- routes/voiture_routes.py: car CRUD + recommendation routes
- routes/chatbot_routes.py: chatbot route
- services/chatbot_service.py: Cohere API logic
- services/n8n_service.py: n8n webhook call
- mcp_server.py: MCP server startup
- mcp_app/tools_voiture.py: MCP tools

## Prerequisites

- Python 3.10+
- PostgreSQL running locally or remotely
- (Optional) n8n instance for webhook automation
- (Optional) Cohere API key for chatbot

## Installation

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Environment variables

Create a .env file in the project root.

Minimal variables:

```env
# Async app DB URL used by FastAPI
POSTGRES_URL=postgresql+asyncpg://myuser:postSQL123@localhost:5432/auto_agent

# Setup script (admin connection) - used by setup_db.py
POSTGRES_ADMIN_URL=postgresql://postgres:your_admin_password@localhost:5432/postgres

# Optional chatbot
COHERE_API_KEY=your_cohere_api_key
COHERE_MODEL=command-r

# Optional n8n webhook
N8N_VOITURE_WEBHOOK_URL=http://localhost:5678/webhook/voiture-created

# Optional explicit DB setup values
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auto_agent
DB_USER=myuser
DB_PASSWORD=postSQL123
ADMIN_POSTGRES_PASSWORD=postgres
```

## Database setup

Run once to create DB user/database/privileges:

```bash
python setup_db.py
```

Then start the app. Tables are created automatically at startup.

## Run FastAPI app

```bash
uvicorn main:app --reload
```

Default URLs:
- App login page: http://127.0.0.1:8000/
- Main app page: http://127.0.0.1:8000/app
- Health check: http://127.0.0.1:8000/health

## Demo login

Current UI login is demo-only (frontend session storage):
- Email: ayoubadoini1994@gmail.com
- Password: 123456

Important: this is not production authentication.

## API overview

Base route for cars: /voitures

- GET /voitures/ -> list all cars
- GET /voitures/{voiture_id} -> get one car
- POST /voitures/ -> create car
- PATCH /voitures/{voiture_id} -> update car
- DELETE /voitures/{voiture_id} -> delete car
- GET /voitures/recommander/{budget} -> cars under budget (available only)

Chatbot:
- POST /chatbot/ask
  - body: { "message": "..." }
  - returns: { "answer": "..." }

## n8n integration

After creating a car (POST /voitures/), the backend sends a JSON payload to:
- N8N_VOITURE_WEBHOOK_URL

If webhook fails, car creation still succeeds and a warning is logged.

## MCP server

Start MCP server:

```bash
python mcp_server.py
```

Exposed tools:
- get_stock_voitures
- recommander_voiture_par_budget(budget)

## Frontend features

The dashboard includes:
- Car cards and inventory stats
- Add/Edit/Delete car forms
- Budget recommendation view
- Chatbot panel
- PDF export for email-style car summary

## Project structure

```text
auto_agent/
  main.py
  setup_db.py
  mcp_server.py
  requirements.txt
  database/
  models/
  routes/
  services/
  mcp_app/
  static/
```

## Troubleshooting

- DB connection errors:
  - verify PostgreSQL is running
  - verify POSTGRES_URL and credentials

- Chatbot returns key/config errors:
  - verify COHERE_API_KEY in .env

- n8n webhook not called:
  - verify N8N_VOITURE_WEBHOOK_URL
  - verify n8n instance is reachable

## Production notes

Before production:
- replace demo login by secure backend auth (JWT/session + hashed passwords)
- restrict CORS policy
- secure .env and secrets
- add validation hardening, logging, and tests
