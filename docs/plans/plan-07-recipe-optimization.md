# Plan 07: Recipe Optimization

**Status**: Draft
**Priority**: Medium
**Dependencies**: Plan 01 (multi-supplier pricing) ✅ Complete

---

## Overview

Help chefs make smarter ingredient choices by analyzing recipes for cost savings and supplier streamlining opportunities. The system suggests alternatives and calculates potential savings.

---

## Goal

Provide actionable optimization suggestions:
1. **Cost optimization** — Find cheaper alternatives for ingredients
2. **Supplier streamlining** — Reduce supplier count for simpler procurement
3. **One-click application** — Apply suggestions without manual editing

---

## Use Cases

### Cost Optimization

> "Your Carbonara uses Guanciale from ABC Foods at $40/kg. FMH has a similar product from XYZ Supply at $32/kg. Switching would save $1.60/batch."

### Supplier Streamlining

> "This recipe uses 3 suppliers. If you switch Pecorino to ABC Foods (same price), you'd only need 2 suppliers for this recipe."

---

## Data Requirements

This feature relies on Plan 01's multi-supplier data:

```python
# Ingredient.suppliers (JSONB array)
[
    {
        "supplier_id": "abc-001",
        "supplier_name": "ABC Foods",
        "price_per_pack": 40.00,
        "pack_size": 1.0,
        "pack_unit": "kg",
        "is_preferred": true
    },
    {
        "supplier_id": "xyz-002",
        "supplier_name": "XYZ Supply",
        "price_per_pack": 32.00,
        "pack_size": 1.0,
        "pack_unit": "kg",
        "is_preferred": false
    }
]
```

---

## Backend Implementation

### Optimization Service

```python
# backend/app/domain/optimization_service.py

from dataclasses import dataclass
from typing import Optional


@dataclass
class CostSuggestion:
    """A suggestion to switch to a cheaper supplier."""
    ingredient_id: int
    ingredient_name: str
    current_supplier: str
    current_price_per_unit: float
    suggested_supplier: str
    suggested_price_per_unit: float
    savings_per_unit: float
    savings_per_batch: float
    quantity_in_recipe: float
    unit: str


@dataclass
class ConsolidationSuggestion:
    """A suggestion to reduce supplier count."""
    ingredient_id: int
    ingredient_name: str
    from_supplier: str
    to_supplier: str
    price_change: float  # Positive = costs more, negative = saves money
    eliminates_supplier: bool  # True if this swap removes a supplier entirely


@dataclass
class OptimizationResult:
    """Complete optimization analysis for a recipe."""
    recipe_id: int
    recipe_name: str
    current_cost: float
    current_supplier_count: int
    cost_suggestions: list[CostSuggestion]
    consolidation_suggestions: list[ConsolidationSuggestion]
    total_potential_savings: float
    potential_supplier_reduction: int


class OptimizationService:
    def __init__(self, session: Session):
        self.session = session

    def analyze_recipe(self, recipe_id: int) -> OptimizationResult:
        """Analyze a recipe for optimization opportunities."""
        recipe = self._get_recipe(recipe_id)
        recipe_ingredients = self._get_recipe_ingredients(recipe_id)

        # Current state
        current_cost = self._calculate_current_cost(recipe_ingredients)
        current_suppliers = self._get_unique_suppliers(recipe_ingredients)

        # Find cost savings
        cost_suggestions = []
        for ri in recipe_ingredients:
            suggestion = self._find_cheaper_supplier(ri)
            if suggestion:
                cost_suggestions.append(suggestion)

        # Find consolidation opportunities
        consolidation_suggestions = self._analyze_consolidation(
            recipe_ingredients, current_suppliers
        )

        return OptimizationResult(
            recipe_id=recipe_id,
            recipe_name=recipe.name,
            current_cost=current_cost,
            current_supplier_count=len(current_suppliers),
            cost_suggestions=cost_suggestions,
            consolidation_suggestions=consolidation_suggestions,
            total_potential_savings=sum(s.savings_per_batch for s in cost_suggestions),
            potential_supplier_reduction=self._calculate_potential_reduction(
                consolidation_suggestions
            )
        )

    def _find_cheaper_supplier(
        self, recipe_ingredient: RecipeIngredient
    ) -> Optional[CostSuggestion]:
        """Find a cheaper supplier for an ingredient."""
        ingredient = recipe_ingredient.ingredient
        suppliers = ingredient.suppliers or []

        if len(suppliers) < 2:
            return None

        # Find current preferred supplier
        current = next((s for s in suppliers if s.get("is_preferred")), suppliers[0])
        current_price = self._normalize_price(current)

        # Find cheapest alternative
        alternatives = [s for s in suppliers if s != current]
        if not alternatives:
            return None

        cheapest = min(alternatives, key=lambda s: self._normalize_price(s))
        cheapest_price = self._normalize_price(cheapest)

        if cheapest_price >= current_price:
            return None

        # Calculate savings
        savings_per_unit = current_price - cheapest_price
        quantity = recipe_ingredient.quantity
        savings_per_batch = savings_per_unit * quantity

        return CostSuggestion(
            ingredient_id=ingredient.id,
            ingredient_name=ingredient.name,
            current_supplier=current.get("supplier_name", "Unknown"),
            current_price_per_unit=current_price,
            suggested_supplier=cheapest.get("supplier_name", "Unknown"),
            suggested_price_per_unit=cheapest_price,
            savings_per_unit=savings_per_unit,
            savings_per_batch=savings_per_batch,
            quantity_in_recipe=quantity,
            unit=recipe_ingredient.unit
        )

    def _analyze_consolidation(
        self,
        recipe_ingredients: list[RecipeIngredient],
        current_suppliers: set[str]
    ) -> list[ConsolidationSuggestion]:
        """Find opportunities to reduce supplier count."""
        suggestions = []

        if len(current_suppliers) <= 1:
            return suggestions

        for ri in recipe_ingredients:
            ingredient = ri.ingredient
            suppliers = ingredient.suppliers or []

            # Current supplier for this ingredient
            current = next((s for s in suppliers if s.get("is_preferred")), None)
            if not current:
                continue

            current_supplier_name = current.get("supplier_name")

            # Check if ingredient is available from another supplier we're already using
            for alt in suppliers:
                alt_supplier_name = alt.get("supplier_name")
                if alt_supplier_name == current_supplier_name:
                    continue

                # Is this alternative supplier already used in this recipe?
                if alt_supplier_name in current_suppliers:
                    price_change = self._normalize_price(alt) - self._normalize_price(current)

                    # Would switching eliminate the current supplier entirely?
                    eliminates = self._would_eliminate_supplier(
                        recipe_ingredients, current_supplier_name, ingredient.id
                    )

                    suggestions.append(ConsolidationSuggestion(
                        ingredient_id=ingredient.id,
                        ingredient_name=ingredient.name,
                        from_supplier=current_supplier_name,
                        to_supplier=alt_supplier_name,
                        price_change=price_change,
                        eliminates_supplier=eliminates
                    ))

        return suggestions

    def apply_suggestion(
        self,
        recipe_id: int,
        ingredient_id: int,
        new_supplier_id: str
    ) -> bool:
        """Apply an optimization suggestion by changing preferred supplier."""
        ingredient = self.session.get(Ingredient, ingredient_id)
        if not ingredient or not ingredient.suppliers:
            return False

        # Update preferred status
        updated_suppliers = []
        for supplier in ingredient.suppliers:
            supplier["is_preferred"] = supplier.get("supplier_id") == new_supplier_id
            updated_suppliers.append(supplier)

        ingredient.suppliers = updated_suppliers
        self.session.commit()
        return True
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/recipes/{id}/optimize` | GET | Get optimization suggestions |
| `/recipes/{id}/optimize/apply` | POST | Apply a specific suggestion |
| `/recipes/{id}/optimize/apply-all` | POST | Apply all cost suggestions |
| `/recipes/{id}/optimize/simulate` | POST | Preview cost with proposed changes |

### Request/Response Schemas

```python
# backend/app/api/optimization.py

class ApplySuggestionRequest(BaseModel):
    ingredient_id: int
    new_supplier_id: str


class SimulateRequest(BaseModel):
    changes: list[ApplySuggestionRequest]


class SimulateResponse(BaseModel):
    current_cost: float
    projected_cost: float
    savings: float
    new_supplier_count: int
```

---

## Frontend Implementation

### Components

| Component | Description |
|-----------|-------------|
| `OptimizationPanel` | Main container for suggestions |
| `CostSuggestionCard` | Individual cost saving suggestion |
| `ConsolidationSuggestionCard` | Supplier reduction suggestion |
| `SavingsSummary` | Total potential savings display |

### Optimization Panel UI

```
┌─────────────────────────────────────────────────────────────────┐
│  💡 OPTIMIZATION SUGGESTIONS                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  COST SAVINGS                          Potential: $3.20/batch   │
│  ─────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Guanciale: ABC Foods → XYZ Supply                       │   │
│  │ $40/kg → $32/kg  •  Saves $1.60/batch                   │   │
│  │ [Apply] [Ignore]                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Pecorino: Premium Cheese → ABC Foods                    │   │
│  │ $48/kg → $44/kg  •  Saves $0.40/batch                   │   │
│  │ [Apply] [Ignore]                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  SUPPLIER STREAMLINING                 Current: 4 suppliers     │
│  ─────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Switch Eggs to ABC Foods (same price) → 3 suppliers     │   │
│  │ [Apply] [Ignore]                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Apply All] [Dismiss]                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Points

1. **Recipe Detail Page** — Add "Optimize" button that opens panel
2. **Recipe Canvas** — Show optimization badge if suggestions available
3. **Costing Display** — Link to optimization from cost breakdown

### React Query Hook

```typescript
// frontend/src/lib/hooks/useOptimization.ts

export function useRecipeOptimization(recipeId: number) {
  return useQuery({
    queryKey: ['recipes', recipeId, 'optimization'],
    queryFn: () => api.getRecipeOptimization(recipeId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useApplyOptimization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recipeId, ingredientId, newSupplierId }) =>
      api.applyOptimization(recipeId, ingredientId, newSupplierId),
    onSuccess: (_, { recipeId }) => {
      // Invalidate optimization and costing queries
      queryClient.invalidateQueries(['recipes', recipeId, 'optimization']);
      queryClient.invalidateQueries(['recipes', recipeId, 'costing']);
    },
  });
}
```

---

## Implementation Steps

### Backend

1. Create `backend/app/domain/optimization_service.py`
2. Create `backend/app/api/optimization.py` router
3. Add router to `main.py`
4. Write tests in `tests/test_optimization.py`

### Frontend

1. Add API functions to `lib/api.ts`
2. Create hooks in `lib/hooks/useOptimization.ts`
3. Create `OptimizationPanel` component
4. Create `CostSuggestionCard` component
5. Create `ConsolidationSuggestionCard` component
6. Add "Optimize" button to recipe detail page
7. Add optimization badge to recipe cards

---

## Edge Cases

### Handling

| Case | Behavior |
|------|----------|
| No suppliers for ingredient | Skip ingredient in analysis |
| Single supplier only | No cost suggestions possible |
| All suppliers same price | No cost suggestions |
| Ingredient not in recipe | N/A (analyze recipe ingredients only) |
| Circular consolidation | Show best option only |

### Quality Considerations

The current design compares purely on price. Future enhancements could include:

- **Quality flags** — Mark suppliers as "premium" to avoid downgrade suggestions
- **Minimum order quantities** — Factor in MOQ constraints
- **Lead times** — Consider delivery speed
- **Reliability scores** — Track supplier performance

---

## Open Questions

1. **Should suggestions be auto-generated or on-demand?** (Start with on-demand)
2. **How to handle quality differences between suppliers?** (Add quality flag later)
3. **Should we track which suggestions were applied/ignored?** (Nice to have)
4. **Batch vs. single ingredient application?** (Support both)
5. **Undo after applying?** (Requires tracking previous state)

---

## Acceptance Criteria

### Core Functionality
- [ ] System identifies cheaper supplier alternatives
- [ ] System identifies supplier consolidation opportunities
- [ ] Savings are calculated accurately (per unit and per batch)
- [ ] Individual suggestions can be applied with one click
- [ ] "Apply All" applies all cost suggestions at once

### UX
- [ ] Optimization panel accessible from recipe detail page
- [ ] Clear display of current vs. suggested pricing
- [ ] Savings prominently displayed
- [ ] Applied suggestions update costing immediately
- [ ] "Ignore" dismisses suggestion from view

### Edge Cases
- [ ] Gracefully handles ingredients with no suppliers
- [ ] Gracefully handles single-supplier ingredients
- [ ] Handles same-price alternatives correctly
