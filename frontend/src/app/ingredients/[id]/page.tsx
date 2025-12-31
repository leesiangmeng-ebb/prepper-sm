'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit2, ImagePlus, Package, DollarSign, Scale } from 'lucide-react';
import { useIngredient } from '@/lib/hooks';
import { Badge, Button, Card, CardContent, Skeleton } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';

interface IngredientPageProps {
  params: Promise<{ id: string }>;
}

export default function IngredientPage({ params }: IngredientPageProps) {
  const { id } = use(params);
  const ingredientId = parseInt(id, 10);

  const { data: ingredient, isLoading, error } = useIngredient(ingredientId);

  if (error) {
    return (
      <div className="p-6">
        <Link
          href="/ingredients"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ingredients
        </Link>
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-4 text-red-600 dark:text-red-400">
          Ingredient not found or failed to load.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Back Link */}
        <Link
          href="/ingredients"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ingredients
        </Link>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 rounded-lg" />
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
            </div>
          </div>
        ) : ingredient ? (
          <>
            {/* Ingredient Header */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  {/* Placeholder for hero image */}
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                    <ImagePlus className="h-8 w-8" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                          {ingredient.name}
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                          Base unit: {ingredient.base_unit}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={ingredient.is_active ? 'success' : 'warning'}>
                          {ingredient.is_active ? 'Active' : 'Archived'}
                        </Badge>
                        <Button variant="outline" size="sm" disabled>
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                      Created: {new Date(ingredient.created_at).toLocaleDateString()}
                      {ingredient.updated_at !== ingredient.created_at && (
                        <span className="ml-4">
                          Updated: {new Date(ingredient.updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Details Grid */}
            <div className="grid gap-6 md:grid-cols-2 mb-6">
              {/* Costing Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Costing
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-zinc-500 dark:text-zinc-400">Cost per {ingredient.base_unit}</span>
                      <span className="font-semibold text-xl text-zinc-900 dark:text-zinc-100">
                        {ingredient.cost_per_base_unit !== null
                          ? formatCurrency(ingredient.cost_per_base_unit)
                          : '-'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Measurement Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Measurement
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-zinc-500 dark:text-zinc-400">Base Unit</span>
                      <Badge variant="secondary">{ingredient.base_unit}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Usage Card - Placeholder for future feature */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Recipe Usage
                  </h2>
                </div>

                <div className="text-center py-8">
                  <Package className="h-8 w-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-zinc-400 dark:text-zinc-500">
                    Recipe usage tracking coming soon
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
