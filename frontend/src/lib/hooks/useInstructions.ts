'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { InstructionsStructured } from '@/types';

export function useUpdateRawInstructions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeId,
      instructionsRaw,
    }: {
      recipeId: number;
      instructionsRaw: string;
    }) => api.updateRawInstructions(recipeId, instructionsRaw),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipe', variables.recipeId] });
    },
  });
}

export function useParseInstructions() {
  return useMutation({
    mutationFn: async ({
      instructionsRaw,
    }: {
      recipeId: number;
      instructionsRaw: string;
    }): Promise<InstructionsStructured> => {
      // Call our Next.js API route for AI-powered parsing
      const response = await fetch('/api/parse-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions_raw: instructionsRaw }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to parse instructions');
      }

      return response.json();
    },
  });
}

export function useUpdateStructuredInstructions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeId,
      structured,
    }: {
      recipeId: number;
      structured: InstructionsStructured;
    }) => api.updateStructuredInstructions(recipeId, structured),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipe', variables.recipeId] });
    },
  });
}
