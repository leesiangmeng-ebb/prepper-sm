# Plan 06: Training Mode

**Status**: Draft
**Priority**: Low
**Dependencies**: Existing recipe and instructions data

---

## Overview

Provide a focused interface for kitchen staff to learn recipe execution with step-by-step guidance. Training mode transforms the recipe canvas into an instructional view optimized for learning and execution.

---

## Goal

Help kitchen staff learn recipes through:
1. **Step-by-step presentation** — One instruction at a time with large, readable text
2. **Integrated timers** — Auto-populated from recipe steps
3. **Progress tracking** — Mark steps as complete
4. **Personal notes** — Temporary notes during training (not saved to recipe)
5. **Quiz mode** — Optional knowledge testing

---

## Features

### Core Training Mode

| Feature | Description |
|---------|-------------|
| **Single-step focus** | Display one instruction prominently |
| **Step navigation** | Previous/Next with progress indicator |
| **Timer integration** | Auto-detect timers from step text, one-click start |
| **Ingredient callout** | Show relevant ingredients for current step |
| **Large typography** | Optimized for kitchen viewing (grease, distance) |

### Optional Enhancements

| Feature | Description |
|---------|-------------|
| **Quiz mode** | Test knowledge of ingredients and quantities |
| **Progress persistence** | Track which recipes staff have trained on |
| **Completion certificate** | Mark recipe as "trained" for a staff member |

---

## Data Model (Optional Persistence)

If we want to track training progress:

```python
# backend/app/models/training.py

class TrainingSession(SQLModel, table=True):
    """Track a training session for a recipe."""

    id: int = Field(primary_key=True)
    recipe_id: int = Field(foreign_key="recipe.id", index=True)
    staff_name: str = Field(max_length=100, index=True)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None
    notes: str | None  # Personal notes during training

    # Relationships
    recipe: "Recipe" = Relationship()


class TrainingProgress(SQLModel, table=True):
    """Track which recipes a staff member has been trained on."""

    id: int = Field(primary_key=True)
    staff_name: str = Field(max_length=100, index=True)
    recipe_id: int = Field(foreign_key="recipe.id", index=True)
    trained_at: datetime = Field(default_factory=datetime.utcnow)
    quiz_score: int | None = Field(ge=0, le=100)  # Percentage if quiz taken

    # Relationships
    recipe: "Recipe" = Relationship()
```

> **Note**: Training mode can work without persistence — progress tracking is optional and can be added later.

---

## API Endpoints

### Training Data (uses existing recipe endpoints)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/recipes/{id}` | GET | Get recipe details |
| `/recipes/{id}/instructions/structured` | GET | Get structured steps |
| `/recipes/{id}/ingredients` | GET | Get recipe ingredients |

### Training Progress (optional)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/training/sessions` | POST | Start training session |
| `/training/sessions/{id}` | PATCH | Update session (complete, add notes) |
| `/training/progress` | GET | List trained recipes for staff |
| `/training/progress/{recipe_id}` | POST | Mark recipe as trained |

---

## Frontend

### Routes

| Route | Description |
|-------|-------------|
| `/recipes/[id]/train` | Training mode for a recipe |
| `/recipes/[id]/train/quiz` | Quiz mode (optional) |
| `/training` | Training dashboard (optional) |

### Training Mode UI

```
┌─────────────────────────────────────────────────────────────────┐
│  🎓 TRAINING MODE: Carbonara                    [Exit Training] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                      ┌─────────────────────────┐               │
│                      │     STEP 3 of 6         │               │
│                      └─────────────────────────┘               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │   Cook the guanciale in a cold pan over                 │   │
│  │   medium heat until crispy and fat has                  │   │
│  │   rendered (about 8 minutes)                            │   │
│  │                                                         │   │
│  │              ⏱️ 8:00                                    │   │
│  │           [Start Timer]                                 │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Ingredients for this step:                                     │
│  • Guanciale: 200g                                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ My notes: _____________________________________________ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [← Previous]              ● ● ◉ ○ ○ ○              [Next →]    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Timer Component

```
┌───────────────────────────────┐
│         ⏱️ 8:00               │
│                               │
│    ┌─────────────────────┐    │
│    │       07:23         │    │  ← Large countdown display
│    └─────────────────────┘    │
│                               │
│   [Pause]  [Reset]  [+1 min]  │
│                               │
│   🔔 Alert when complete      │
└───────────────────────────────┘
```

### Quiz Mode (Optional)

```
┌─────────────────────────────────────────────────────────────────┐
│  📝 QUIZ: Carbonara                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Question 3 of 5                                                │
│                                                                 │
│  How much Pecorino Romano is needed for 4 portions?             │
│                                                                 │
│  ○ 50g                                                          │
│  ○ 100g                                                         │
│  ○ 150g                                                         │
│  ○ 200g                                                         │
│                                                                 │
│  [Submit Answer]                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Training Dashboard (Optional)

```
┌─────────────────────────────────────────────────────────────────┐
│  🎓 TRAINING DASHBOARD                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Staff: [Select staff member ▼]                                 │
│                                                                 │
│  TRAINED RECIPES                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✅ Carbonara            Trained Dec 15    Score: 100%   │   │
│  │ ✅ Tiramisu             Trained Dec 14    Score: 80%    │   │
│  │ ✅ Risotto Milanese     Trained Dec 10    No quiz       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  NEEDS TRAINING                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Beef Wellington                         [Start]       │   │
│  │ ○ Eggs Benedict                           [Start]       │   │
│  │ ○ Caesar Salad                            [Start]       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Timer Detection

Extract timer values from instruction text:

```typescript
// frontend/src/lib/utils/timer.ts

interface DetectedTimer {
  seconds: number;
  originalText: string;
}

function detectTimer(instructionText: string): DetectedTimer | null {
  // Match patterns like "8 minutes", "2-3 mins", "30 seconds", "1 hour"
  const patterns = [
    /(\d+)\s*(?:minutes?|mins?)/i,
    /(\d+)\s*(?:seconds?|secs?)/i,
    /(\d+)\s*(?:hours?|hrs?)/i,
  ];

  // Also use timer_seconds from structured instruction if available
  // ...
}
```

The structured instructions already have `timer_seconds` from AI parsing (Plan 0.0.5), so we can use that directly.

---

## Implementation Steps

### Phase 1: Core Training Mode (No Persistence)

1. Create `/recipes/[id]/train` route
2. Build `TrainingView` component with step navigation
3. Build `TrainingStep` component with large typography
4. Build `TrainingTimer` component with countdown
5. Add "Enter Training Mode" button to recipe detail page
6. Style for kitchen readability (large fonts, high contrast)

### Phase 2: Progress Tracking (Optional)

1. Create `training.py` models
2. Create Alembic migration
3. Create `training_service.py`
4. Create `/training` API endpoints
5. Add staff name input to training start
6. Persist completion status

### Phase 3: Quiz Mode (Optional)

1. Build quiz question generator from recipe data
2. Create `QuizView` component
3. Score tracking and display
4. Link quiz score to training progress

---

## Design Considerations

### Kitchen Environment

- **Large text**: 24px+ for instructions, readable at arm's length
- **High contrast**: Dark text on light background (or inverted)
- **Touch-friendly**: Large buttons for greasy fingers
- **Minimal UI**: Hide chrome, maximize instruction space
- **Audio alerts**: Timer completion sound

### Timer UX

- **One-click start**: No configuration needed
- **Visible from distance**: Large countdown numbers
- **Audio + visual alert**: Don't rely on watching the screen
- **Multiple timers**: Some recipes need concurrent timers

---

## Open Questions

1. **Should training progress be persisted?** (Start without, add if requested)
2. **Is quiz mode needed for MVP?** (Probably not, defer)
3. **Should there be a "certified" status for trained staff?** (Future feature)
4. **Multiple concurrent timers?** (Start with single, extend later)
5. **Offline support?** (Would be valuable in kitchen, but complex)

---

## Acceptance Criteria

### Core Training Mode
- [ ] Recipes can be viewed in step-by-step training mode
- [ ] Navigation between steps works (previous/next, progress dots)
- [ ] Timers auto-populate from `timer_seconds` in structured instructions
- [ ] Timer can be started, paused, and reset
- [ ] Timer plays audio alert on completion
- [ ] Relevant ingredients shown for each step
- [ ] Exit returns to recipe detail page

### Progress Tracking (Optional)
- [ ] Staff can enter their name when starting training
- [ ] Completed training sessions are recorded
- [ ] Training dashboard shows progress by staff member

### Quiz Mode (Optional)
- [ ] Quiz generates questions from recipe ingredients
- [ ] Quiz tracks correct/incorrect answers
- [ ] Final score is displayed and optionally saved
