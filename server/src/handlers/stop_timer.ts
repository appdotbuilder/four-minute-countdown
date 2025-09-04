import { db } from '../db';
import { timersTable } from '../db/schema';
import { type StopTimerInput, type TimerState } from '../schema';
import { eq } from 'drizzle-orm';

export async function stopTimer(input: StopTimerInput): Promise<TimerState> {
  try {
    // First, get the current timer state
    const existingTimers = await db.select()
      .from(timersTable)
      .where(eq(timersTable.id, input.id))
      .execute();

    if (existingTimers.length === 0) {
      throw new Error(`Timer with id ${input.id} not found`);
    }

    const currentTimer = existingTimers[0];

    // Calculate remaining seconds if timer was running
    let newRemainingSeconds = currentTimer.remaining_seconds;
    
    if (currentTimer.is_running && currentTimer.started_at) {
      const now = new Date();
      const elapsedMs = now.getTime() - currentTimer.started_at.getTime();
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      
      // Calculate new remaining seconds (don't go below 0)
      newRemainingSeconds = Math.max(0, currentTimer.remaining_seconds - elapsedSeconds);
    }

    // Update the timer to stopped state
    const updatedTimers = await db.update(timersTable)
      .set({
        is_running: false,
        started_at: null, // Clear started_at to indicate paused state
        remaining_seconds: newRemainingSeconds
      })
      .where(eq(timersTable.id, input.id))
      .returning()
      .execute();

    const updatedTimer = updatedTimers[0];

    return {
      id: updatedTimer.id,
      remaining_seconds: updatedTimer.remaining_seconds,
      is_running: updatedTimer.is_running,
      started_at: updatedTimer.started_at,
      created_at: updatedTimer.created_at
    };
  } catch (error) {
    console.error('Timer stop failed:', error);
    throw error;
  }
}