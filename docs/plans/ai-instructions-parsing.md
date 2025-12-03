# AI Instructions Parsing Implementation Plan

## Overview

Integrate Vercel's AI SDK to transform freeform recipe instructions into structured JSON steps with extracted metadata (timers, temperatures).

**Current State**: The backend has a stub `parse_instructions_with_llm()` method that simply splits text by newlines. The frontend UI flow is complete and ready to consume properly structured data.

**Target State**: Real LLM-powered parsing that extracts meaningful steps with `order`, `text`, `timer_seconds`, and `temperature_c` fields.

---

## Architecture Decision: Frontend vs Backend

### Option A: Backend Integration (Python + Anthropic SDK)
- LLM calls happen in FastAPI backend
- API key stays server-side (secure)
- Simpler frontend, but adds Python dependency

### Option B: Frontend Integration (Vercel AI SDK) ✅ Recommended
- Use Vercel AI SDK in Next.js
- Leverage streaming for better UX
- API route keeps key server-side
- Native TypeScript, better DX for this stack
- Aligns with Vercel deployment

**Decision**: Option B — Vercel AI SDK in frontend with Next.js API route

---

## Implementation Steps

### Step 1: Install Dependencies

```bash
cd frontend
npm install ai @ai-sdk/anthropic
```

**Packages**:
- `ai` — Vercel AI SDK core
- `@ai-sdk/anthropic` — Claude provider for Vercel AI SDK

---

### Step 2: Environment Configuration

Add to `frontend/.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Add to `frontend/.env.example`:
```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

**Note**: No `NEXT_PUBLIC_` prefix — key stays server-side only.

---

### Step 3: Create API Route for LLM Parsing

Create `frontend/src/app/api/parse-instructions/route.ts`:

```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

const InstructionStepSchema = z.object({
  order: z.number(),
  text: z.string(),
  timer_seconds: z.number().nullable(),
  temperature_c: z.number().nullable(),
});

const InstructionsStructuredSchema = z.object({
  steps: z.array(InstructionStepSchema),
});

export async function POST(request: Request) {
  const { instructions_raw } = await request.json();

  if (!instructions_raw?.trim()) {
    return Response.json(
      { error: 'No instructions provided' },
      { status: 400 }
    );
  }

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: InstructionsStructuredSchema,
    prompt: `Parse the following recipe instructions into structured steps.

For each step:
- Extract the main instruction text (clean, imperative form)
- If a time/duration is mentioned (e.g., "5 minutes", "1 hour"), convert to timer_seconds
- If a temperature is mentioned (e.g., "180°C", "350°F"), convert to temperature_c (Celsius)
- If no time or temperature, set those fields to null

Instructions to parse:
${instructions_raw}`,
  });

  return Response.json(result.object);
}
```

**Key points**:
- Uses `generateObject` for structured output with Zod schema validation
- Claude returns JSON matching exactly the expected `InstructionsStructured` type
- Temperatures converted to Celsius, durations to seconds
- No streaming needed — structured output is atomic

---

### Step 4: Update Frontend Hook

Update `frontend/src/lib/hooks/useInstructions.ts`:

```typescript
export function useParseInstructions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipeId,
      instructionsRaw,
    }: {
      recipeId: number;
      instructionsRaw: string;
    }) => {
      // Call our Next.js API route instead of backend
      const response = await fetch('/api/parse-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions_raw: instructionsRaw }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse instructions');
      }

      return response.json() as Promise<InstructionsStructured>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipe', variables.recipeId] });
    },
  });
}
```

---

### Step 5: Update Instructions Component

Update `frontend/src/components/recipe/Instructions.tsx` to handle the new flow:

```typescript
const handleFormatIntoSteps = async () => {
  if (!localInstructions.trim()) {
    toast.error('Write some instructions first');
    return;
  }

  parseInstructions.mutate(
    { recipeId: recipe.id, instructionsRaw: localInstructions },
    {
      onSuccess: async (structured) => {
        // Save structured instructions to backend
        await updateStructured.mutateAsync({
          recipeId: recipe.id,
          structured,
        });
        setInstructionsTab('steps');
        toast.success('Instructions formatted into steps');
      },
      onError: () => {
        toast.error('Failed to parse instructions');
      },
    }
  );
};
```

---

### Step 6: Add Loading State UI

Enhance the "Format into steps" button with loading feedback:

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleFormatIntoSteps}
  disabled={parseInstructions.isPending || !localInstructions.trim()}
>
  {parseInstructions.isPending ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      Parsing...
    </>
  ) : (
    <>
      <Sparkles className="h-4 w-4" />
      Format into steps
    </>
  )}
</Button>
```

---

### Step 7: Backend Cleanup (Optional)

The backend `/recipes/{id}/instructions/parse` endpoint becomes unused. Options:

**A) Remove it**: Delete the endpoint and `parse_instructions_with_llm` method
**B) Keep as fallback**: Useful if frontend AI fails or for API-only clients

Recommendation: Keep for now, mark as deprecated in comments.

---

## Prompt Engineering Notes

The prompt should handle common recipe instruction patterns:

| Input | Expected Extraction |
|-------|---------------------|
| "Bake for 25 minutes at 180°C" | timer: 1500, temp: 180 |
| "Let rest 5 mins" | timer: 300, temp: null |
| "Preheat oven to 350°F" | timer: null, temp: 177 |
| "Mix until combined" | timer: null, temp: null |
| "Simmer on low heat for 1 hour" | timer: 3600, temp: null |

The Zod schema ensures Claude returns valid JSON matching our TypeScript types.

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Empty instructions | Return 400, show toast |
| API key missing | Return 500, log server-side |
| Claude rate limit | Return 429, show retry toast |
| Invalid response | Zod validation fails, return 500 |
| Network timeout | Mutation error, show toast |

---

## Testing Strategy

1. **Unit tests**: Mock `generateObject` response, verify schema mapping
2. **Integration tests**: Test API route with sample instructions
3. **E2E tests**: Full flow from textarea → parse → steps display

Sample test instructions:
```
Preheat oven to 200°C.
Mix flour, sugar, and butter for 5 minutes until crumbly.
Pour into baking tin and bake for 30 minutes.
Let cool for 10 minutes before serving.
```

Expected output:
```json
{
  "steps": [
    { "order": 1, "text": "Preheat oven", "timer_seconds": null, "temperature_c": 200 },
    { "order": 2, "text": "Mix flour, sugar, and butter until crumbly", "timer_seconds": 300, "temperature_c": null },
    { "order": 3, "text": "Pour into baking tin and bake", "timer_seconds": 1800, "temperature_c": null },
    { "order": 4, "text": "Let cool before serving", "timer_seconds": 600, "temperature_c": null }
  ]
}
```

---

## Deployment Checklist

- [ ] Add `ANTHROPIC_API_KEY` to Vercel environment variables
- [ ] Test API route locally with `npm run dev`
- [ ] Verify Zod schema matches backend expectations
- [ ] Test full flow: write → format → edit → save
- [ ] Monitor Anthropic usage dashboard for costs

---

## Cost Considerations

- **Model**: `claude-sonnet-4-20250514` (fast, cost-effective for structured extraction)
- **Tokens**: ~200-500 tokens per parse (input + output)
- **Estimated cost**: ~$0.001-0.003 per parse operation
- **Optimization**: Cache identical instruction parses (optional future enhancement)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `frontend/src/app/api/parse-instructions/route.ts` | Create |
| `frontend/src/lib/hooks/useInstructions.ts` | Modify |
| `frontend/src/components/recipe/Instructions.tsx` | Modify |
| `frontend/.env.local` | Add API key |
| `frontend/.env.example` | Add placeholder |
| `frontend/package.json` | Add dependencies |

---

## Timeline Estimate

| Step | Effort |
|------|--------|
| Dependencies + env setup | 5 min |
| API route implementation | 15 min |
| Hook + component updates | 15 min |
| Testing + refinement | 15 min |
| **Total** | ~50 min |
