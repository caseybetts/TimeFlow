// Optimize task order to minimize conflicts when running behind schedule.
'use server';

/**
 * @fileOverview Optimize task order to minimize conflicts when running behind schedule.
 *
 * - optimizeTaskOrder - A function that suggests an optimized task order.
 * - OptimizeTaskOrderInput - The input type for the optimizeTaskOrder function.
 * - OptimizeTaskOrderOutput - The return type for the optimizeTaskOrder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TaskSchema = z.object({
  id: z.string().describe('Unique identifier for the task.'),
  type: z.string().describe('Category of the task (e.g., work, personal, errand).'),
  startTime: z.string().describe('The start time of the task (ISO format).'),
  duration: z.number().describe('The duration of the task in minutes.'),
  buffer: z.number().describe('The buffer time for the task in minutes.'),
});

const OptimizeTaskOrderInputSchema = z.object({
  tasks: z.array(TaskSchema).describe('A list of tasks with their types, start times, durations, and buffer windows.'),
  currentTime: z.string().describe('The current time (ISO format).'),
});

export type OptimizeTaskOrderInput = z.infer<typeof OptimizeTaskOrderInputSchema>;

const OptimizeTaskOrderOutputSchema = z.object({
  optimizedOrder: z.array(z.string()).describe('An array of task IDs representing the suggested optimized task order.'),
  reasoning: z.string().describe('Explanation of why the suggested order is optimal.'),
});

export type OptimizeTaskOrderOutput = z.infer<typeof OptimizeTaskOrderOutputSchema>;

export async function optimizeTaskOrder(input: OptimizeTaskOrderInput): Promise<OptimizeTaskOrderOutput> {
  return optimizeTaskOrderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeTaskOrderPrompt',
  input: {schema: OptimizeTaskOrderInputSchema},
  output: {schema: OptimizeTaskOrderOutputSchema},
  prompt: `You are an AI assistant designed to optimize task orders for users who are running behind schedule.

  Given the current time and a list of tasks with their types, start times, durations, and buffer windows, suggest an optimized task order that minimizes conflicts and helps the user get back on track.

  Current Time: {{{currentTime}}}

  Tasks:
  {{#each tasks}}
  - ID: {{id}}, Type: {{type}}, Start Time: {{startTime}}, Duration: {{duration}} minutes, Buffer: {{buffer}} minutes
  {{/each}}

  Consider the task types and remaining time windows to prioritize tasks effectively.

  Return the optimized task order as an array of task IDs and explain your reasoning for the suggested order.
  `,
});

const optimizeTaskOrderFlow = ai.defineFlow(
  {
    name: 'optimizeTaskOrderFlow',
    inputSchema: OptimizeTaskOrderInputSchema,
    outputSchema: OptimizeTaskOrderOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
