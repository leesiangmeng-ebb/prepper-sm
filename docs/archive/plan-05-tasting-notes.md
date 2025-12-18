# Plan 05: Tasting Notes

**Status**: Draft
**Priority**: Medium
**Dependencies**: None (standalone feature)

---

## Overview

Capture feedback from tasting sessions and link to recipes for R&D iteration. This enables chefs to track how recipes evolve based on structured feedback, making the R&D process more systematic.

---

## Goal

Provide a system for:
1. **Creating tasting sessions** — Events where dishes are evaluated
2. **Recording feedback** — Ratings, notes, and action items per recipe
3. **Tracking decisions** — Approved, needs work, or rejected
4. **Viewing history** — See how a recipe has evolved through tastings

---

## Data Model

### TastingSession

```python
# backend/app/models/tasting.py

class TastingSession(SQLModel, table=True):
    """A tasting session event."""

    id: int = Field(primary_key=True)
    name: str = Field(max_length=200)  # "December Menu Tasting"
    date: date
    location: str | None = Field(max_length=200)
    attendees: list[str] | None = Field(sa_column=Column(JSON))
    notes: str | None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    tasting_notes: list["TastingNote"] = Relationship(back_populates="session")
```

### TastingNote

```python
class TastingNote(SQLModel, table=True):
    """A note/feedback for a specific recipe in a tasting session."""

    id: int = Field(primary_key=True)
    session_id: int = Field(foreign_key="tastingsession.id", index=True)
    recipe_id: int = Field(foreign_key="recipe.id", index=True)

    # Ratings (1-5 scale)
    taste_rating: int | None = Field(ge=1, le=5)
    presentation_rating: int | None = Field(ge=1, le=5)
    texture_rating: int | None = Field(ge=1, le=5)
    overall_rating: int | None = Field(ge=1, le=5)

    # Feedback
    feedback: str | None  # Free-form notes
    action_items: str | None  # What to change

    # Decision
    decision: str | None  # "approved", "needs_work", "rejected"

    # Metadata
    taster_name: str | None = Field(max_length=100)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    session: "TastingSession" = Relationship(back_populates="tasting_notes")
    recipe: "Recipe" = Relationship()
```

---

## API Endpoints

### Tasting Sessions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/tasting-sessions` | GET | List all sessions (with pagination) |
| `/tasting-sessions` | POST | Create new session |
| `/tasting-sessions/{id}` | GET | Get session with all notes |
| `/tasting-sessions/{id}` | PATCH | Update session details |
| `/tasting-sessions/{id}` | DELETE | Delete session (soft delete) |

### Tasting Notes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/tasting-sessions/{id}/notes` | GET | List notes for session |
| `/tasting-sessions/{id}/notes` | POST | Add note to session |
| `/tasting-sessions/{id}/notes/{note_id}` | PATCH | Update note |
| `/tasting-sessions/{id}/notes/{note_id}` | DELETE | Remove note |

### Recipe Integration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/recipes/{id}/tasting-notes` | GET | All tasting notes for a recipe |
| `/recipes/{id}/tasting-summary` | GET | Aggregated ratings and recent feedback |

---

## Frontend

### Routes

| Route | Description |
|-------|-------------|
| `/tastings` | Tasting sessions list |
| `/tastings/new` | Create new session |
| `/tastings/[id]` | Session detail with notes |
| `/tastings/[id]/add` | Add recipes to session |

### Tasting Session List Page

```
┌─────────────────────────────────────────────────────────────────┐
│  🍷 TASTING SESSIONS                        [+ New Session]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ December Menu Tasting                      Dec 15, 2024 │   │
│  │ The Loft Kitchen • 3 attendees • 5 recipes tasted       │   │
│  │ 3 approved • 2 needs work                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ New Desserts Review                        Dec 10, 2024 │   │
│  │ Main Kitchen • 2 attendees • 3 recipes tasted           │   │
│  │ 1 approved • 1 needs work • 1 rejected                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Session Detail Page

```
┌─────────────────────────────────────────────────────────────────┐
│  🍷 December Menu Tasting                              [Edit]   │
│  Date: Dec 15, 2024  •  The Loft Kitchen                        │
│  Attendees: Chef Marco, Sarah, James                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RECIPES TASTED                              [+ Add Recipe]     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Carbonara v3 (Premium)                    ✅ Approved    │   │
│  │ ────────────────────────────────────────────────────── │   │
│  │ Taste: ★★★★★  Presentation: ★★★★☆  Texture: ★★★★★     │   │
│  │                                                         │   │
│  │ "Guanciale perfectly rendered. Egg emulsion silky.      │   │
│  │  Consider slightly more black pepper."                  │   │
│  │                                                         │   │
│  │ Action: Add 0.5g more black pepper                      │   │
│  │                                                  [Edit] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ New Tiramisu                              🔄 Needs Work  │   │
│  │ ────────────────────────────────────────────────────── │   │
│  │ Taste: ★★★☆☆  Presentation: ★★★★☆  Texture: ★★☆☆☆     │   │
│  │                                                         │   │
│  │ "Too much coffee soaking. Mascarpone layer too thin.    │   │
│  │  Ladyfingers soggy."                                    │   │
│  │                                                         │   │
│  │ Actions:                                                │   │
│  │ • Reduce coffee soak time to 2 seconds                  │   │
│  │ • Increase mascarpone layer by 50%                      │   │
│  │ • Re-taste next week                                    │   │
│  │                                                  [Edit] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Recipe Page Integration

Add a "Tasting History" section to the recipe detail page:

```
┌─────────────────────────────────────────────────────────────────┐
│  TASTING HISTORY                                                │
│                                                                 │
│  Dec 15: ★★★★★ Approved - "Perfect!"                           │
│  Dec 8:  ★★★☆☆ Needs Work - "Adjust seasoning"                 │
│  Dec 1:  ★★☆☆☆ Needs Work - "Texture issues"                   │
│                                                                 │
│  [View All Notes]                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Backend

1. Create `backend/app/models/tasting.py` with both models
2. Create Alembic migration for new tables
3. Create `backend/app/domain/tasting_service.py`
4. Create `backend/app/api/tastings.py` router
5. Add router to `main.py`
6. Write tests in `tests/test_tastings.py`

### Frontend

1. Create TanStack Query hooks in `lib/hooks/useTastings.ts`
2. Add API functions to `lib/api.ts`
3. Create `/tastings` list page
4. Create `/tastings/[id]` detail page
5. Create tasting note form component
6. Add star rating component
7. Add "Tasting History" section to recipe detail page

---

## Open Questions

1. **Who can create/edit tasting sessions?** (No auth currently, so anyone)
2. **Should there be a workflow (draft → finalized)?** (Start simple, add later)
3. **Link to R&D page or standalone?** (Standalone `/tastings` route, but visible from R&D)
4. **Should notes support photos?** (Defer to future)

---

## Acceptance Criteria

- [ ] Tasting sessions can be created with date, location, and attendees
- [ ] Recipes can be added to sessions with ratings (1-5 stars)
- [ ] Feedback and action items are captured per recipe
- [ ] Decision status (approved/needs work/rejected) is tracked
- [ ] Recipe detail page shows tasting history
- [ ] Sessions list shows summary counts
- [ ] All data persists and is queryable
