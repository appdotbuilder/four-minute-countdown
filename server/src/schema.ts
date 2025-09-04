import { z } from 'zod';

// Timer state schema
export const timerStateSchema = z.object({
  id: z.number(),
  remaining_seconds: z.number().int().min(0), // Remaining time in seconds
  is_running: z.boolean(), // Whether timer is currently running
  started_at: z.coerce.date().nullable(), // When timer was started (null if not started)
  created_at: z.coerce.date()
});

export type TimerState = z.infer<typeof timerStateSchema>;

// Input schema for starting a timer
export const startTimerInputSchema = z.object({
  duration_seconds: z.number().int().positive().default(240) // Default 4 minutes (240 seconds)
});

export type StartTimerInput = z.infer<typeof startTimerInputSchema>;

// Input schema for getting timer by ID
export const getTimerInputSchema = z.object({
  id: z.number().int().positive()
});

export type GetTimerInput = z.infer<typeof getTimerInputSchema>;

// Input schema for stopping/pausing timer
export const stopTimerInputSchema = z.object({
  id: z.number().int().positive()
});

export type StopTimerInput = z.infer<typeof stopTimerInputSchema>;

// Timer status response schema
export const timerStatusSchema = z.object({
  id: z.number(),
  remaining_seconds: z.number().int().min(0),
  is_running: z.boolean(),
  is_finished: z.boolean(), // Whether timer has reached zero
  progress_percentage: z.number().min(0).max(100) // Progress as percentage
});

export type TimerStatus = z.infer<typeof timerStatusSchema>;