import { db } from '../db';
import { timersTable } from '../db/schema';
import { type GetTimerInput, type TimerState } from '../schema';
import { eq } from 'drizzle-orm';

export async function resetTimer(input: GetTimerInput): Promise<TimerState> {
  try {
    // First, check if the timer exists
    const existingTimer = await db.select()
      .from(timersTable)
      .where(eq(timersTable.id, input.id))
      .execute();

    if (existingTimer.length === 0) {
      throw new Error(`Timer with id ${input.id} not found`);
    }

    // Reset the timer back to its original duration (240 seconds for 4-minute timer)
    const result = await db.update(timersTable)
      .set({
        remaining_seconds: 240, // Reset to 4 minutes (240 seconds)
        is_running: false,
        started_at: null // Null indicates reset state
      })
      .where(eq(timersTable.id, input.id))
      .returning()
      .execute();

    const resetTimer = result[0];
    return {
      ...resetTimer,
      // Convert timestamp fields to Date objects if they're not already
      created_at: resetTimer.created_at instanceof Date 
        ? resetTimer.created_at 
        : new Date(resetTimer.created_at),
      started_at: resetTimer.started_at 
        ? (resetTimer.started_at instanceof Date 
            ? resetTimer.started_at 
            : new Date(resetTimer.started_at))
        : null
    };
  } catch (error) {
    console.error('Timer reset failed:', error);
    throw error;
  }
}