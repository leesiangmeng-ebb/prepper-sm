'use client';

import { Info } from 'lucide-react';
import { useState } from 'react';
import { useAppState } from '@/lib/store';
import { useRecipe, useCosting } from '@/lib/hooks';
import { RecipeIngredientsList } from '@/components/recipe/RecipeIngredientsList';
import { SubRecipesList } from '@/components/recipe/SubRecipesList';
import { Instructions } from '@/components/recipe/Instructions';
import { Skeleton } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { LeftPanel } from '../LeftPanel';
import { RightPanel } from '../RightPanel';

function CostSummary({ recipeId }: { recipeId: number }) {
  const { data: costing, isLoading, error } = useCosting(recipeId);
  const [showTooltip, setShowTooltip] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-5 w-32" />
      </div>
    );
  }

  if (error || !costing) {
    return null;
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">Total batch cost:</span>
        <span className="font-semibold">{formatCurrency(costing.total_batch_cost)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-sm text-zinc-500">Cost per portion:</span>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded-md bg-zinc-900 p-2 text-xs text-white shadow-lg dark:bg-zinc-700">
                Calculated from ingredient and sub-recipe costs with yield of{' '}
                {costing.yield_quantity} {costing.yield_unit}.
              </div>
            )}
          </div>
        </div>
        <span className="font-semibold">{formatCurrency(costing.cost_per_portion)}</span>
      </div>
    </div>
  );
}

function CanvasContent() {
  const { selectedRecipeId, userId, userType } = useAppState();
  const { data: recipe } = useRecipe(selectedRecipeId);

  const canEdit =
    userType === 'admin' || (userId !== null && recipe?.owner_id === userId);

  if (!recipe) return null;

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Ingredients Section */}
      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Ingredients</h2>
          <p className="text-sm text-zinc-500">
            Drag ingredients from the right panel to add them
          </p>
        </div>
        <RecipeIngredientsList recipeId={recipe.id} canEdit={canEdit} />
      </section>

      {/* Sub-Recipes Section */}
      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Sub-Recipes</h2>
          <p className="text-sm text-zinc-500">
            Add other recipes as components of this recipe
          </p>
        </div>
        <SubRecipesList recipeId={recipe.id} canEdit={canEdit} />
      </section>

      {/* Cost Summary Section */}
      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Cost Summary</h2>
        </div>
        <CostSummary recipeId={recipe.id} />
      </section>

      {/* Instructions Section */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Instructions</h2>
        </div>
        <Instructions recipe={recipe} canEdit={canEdit} />
      </section>
    </div>
  );
}

export function CanvasTab() {
  return (
    <>
      <LeftPanel />
      <main className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950">
        <CanvasContent />
      </main>
      <RightPanel />
    </>
  );
}
