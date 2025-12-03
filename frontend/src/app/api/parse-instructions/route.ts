import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const InstructionStepSchema = z.object({
  order: z.number().describe('Step number starting from 1'),
  text: z.string().describe('The instruction text in clean, imperative form'),
  timer_seconds: z
    .number()
    .nullable()
    .describe('Duration in seconds if mentioned (e.g., "5 minutes" = 300)'),
  temperature_c: z
    .number()
    .nullable()
    .describe('Temperature in Celsius if mentioned (convert from Fahrenheit if needed)'),
});

const InstructionsStructuredSchema = z.object({
  steps: z.array(InstructionStepSchema),
});

export async function POST(request: Request) {
  try {
    const { instructions_raw } = await request.json();

    if (!instructions_raw?.trim()) {
      return Response.json(
        { error: 'No instructions provided' },
        { status: 400 }
      );
    }

    const result = await generateObject({
      model: openai('gpt-5.1-2025-11-13'),
      schema: InstructionsStructuredSchema,
      prompt: `You are a culinary assistant that parses recipe instructions into structured steps.

Parse the following recipe instructions into individual steps. For each step:

1. **text**: Extract the main instruction in clean, imperative form (e.g., "Mix the flour and sugar" not "You should mix...")
2. **timer_seconds**: If a duration is mentioned, convert to seconds:
   - "5 minutes" → 300
   - "1 hour" → 3600
   - "30 seconds" → 30
   - "1.5 hours" → 5400
   - If no time mentioned → null
3. **temperature_c**: If a temperature is mentioned, convert to Celsius:
   - "180°C" → 180
   - "350°F" → 177 (convert Fahrenheit to Celsius)
   - "Gas mark 4" → 180
   - If no temperature mentioned → null
4. **order**: Sequential step number starting from 1

Keep instructions concise but complete. Combine related actions into single steps where logical.

Instructions to parse:
${instructions_raw}`,
    });

    return Response.json(result.object);
  } catch (error) {
    console.error('Failed to parse instructions:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return Response.json(
          { error: 'AI service not configured' },
          { status: 503 }
        );
      }
      if (error.message.includes('rate limit')) {
        return Response.json(
          { error: 'Too many requests, please try again shortly' },
          { status: 429 }
        );
      }
    }

    return Response.json(
      { error: 'Failed to parse instructions' },
      { status: 500 }
    );
  }
}
