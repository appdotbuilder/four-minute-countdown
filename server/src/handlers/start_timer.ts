import { db } from '../db';
import { timersTable } from '../db/schema';
import { type StartTimerInput, type TimerState } from '../schema';

export const startTimer = async (input: StartTimerInput): Promise<TimerState> => {
  try {
    const now = new Date();
    
    // Insert new timer record with specified duration and start it immediately
    const result = await db.insert(timersTable)
      .values({
        remaining_seconds: input.duration_seconds,
        is_running: true,
        started_at: now
      })
      .returning()
      .execute();

    const timer = result[0];
    return {
      id: timer.id,
      remaining_seconds: timer.remaining_seconds,
      is_running: timer.is_running,
      started_at: timer.started_at,
      created_at: timer.created_at
    };
  } catch (error) {
    console.error('Timer creation failed:', error);
    throw error;
  }
};