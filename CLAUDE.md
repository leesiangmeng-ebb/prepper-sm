# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prepper is a **kitchen-first recipe workspace** for chefs and operators. It treats recipes as living objects on a single "recipe canvas" with drag-and-drop ingredients, freeform-to-structured instructions, and automatic costing. Key principles: clarity, immediacy, reversibility—no auth, no save buttons, just autosave.

## Common Commands

### Backend (FastAPI)

```bash
cd backend

# Setup
python -m venv venv && source venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env

# Run server
uvicorn app.main:app --reload

# Tests
pytest                          # Run all tests
pytest tests/test_recipes.py    # Single test file
pytest -k "test_create"         # By name pattern

# Linting
ruff check .
ruff format .
mypy app/
```

### Frontend (Next.js 15)

```bash
cd frontend

npm install
npm run dev     # Dev server at localhost:3000
npm run build   # Production build
npm run lint    # ESLint
```

**Requires backend running on localhost:8000**

## Architecture

### Backend (`backend/`)

```
app/
├── main.py              # FastAPI factory with lifespan, CORS, router mounting
├── config.py            # pydantic-settings (env-driven)
├── database.py          # SQLModel engine + session management
├── models/              # SQLModel entities (Ingredient, Recipe, RecipeIngredient)
├── domain/              # Business logic services
│   ├── ingredient_service.py
│   ├── recipe_service.py
│   ├── instructions_service.py   # Freeform → structured parsing
│   └── costing_service.py        # Unit conversion + cost calculations
├── api/                 # FastAPI routers (one per resource)
└── utils/               # Unit conversion helpers
```

**Key patterns:**
- Services receive SQLModel `Session` and return domain objects
- Routers depend on services via function calls (no DI framework)
- Tests use SQLite in-memory via `conftest.py` fixtures

### Frontend (`frontend/src/`)

```
lib/
├── api.ts               # Typed fetch wrapper for all 17 endpoints
├── providers.tsx        # QueryClientProvider + AppProvider composition
├── store.tsx            # React Context for selectedRecipeId, instructionsTab
└── hooks/               # TanStack Query hooks with cache invalidation
    ├── useRecipes.ts
    ├── useIngredients.ts
    ├── useRecipeIngredients.ts
    ├── useCosting.ts
    └── useInstructions.ts

components/
├── layout/              # AppShell, TopAppBar, LeftPanel, RightPanel, RecipeCanvas
├── recipe/              # RecipeIngredientsList, Instructions, InstructionsSteps
└── ui/                  # Button, Input, Select, Badge, Skeleton
```

**Key patterns:**
- All data flows through TanStack Query hooks—no local state for server data
- Drag-and-drop via `dnd-kit` (wrapped in AppShell's DndContext)
- Debounced autosave on all editable fields (no save buttons)
- `useAppState()` for global UI state (selected recipe, active tab)

### API Structure

All endpoints under `/api/v1`:
- `/ingredients` — CRUD + deactivate
- `/recipes` — CRUD + status + soft-delete
- `/recipes/{id}/ingredients` — add, update, remove, reorder
- `/recipes/{id}/instructions` — raw, parse (LLM), structured
- `/recipes/{id}/costing` — calculate, recompute

## Environment Variables

**Backend** (`.env`):
- `DATABASE_URL` — PostgreSQL connection (defaults to SQLite for local dev)
- `CORS_ORIGINS` — JSON array of allowed origins

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_API_URL` — Backend URL (default: `http://localhost:8000/api/v1`)
