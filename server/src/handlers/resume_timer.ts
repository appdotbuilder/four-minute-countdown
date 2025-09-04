import { db } from '../db';
import { timersTable } from '../db/schema';
import { type GetTimerInput, type TimerState } from '../schema';
import { eq } from 'drizzle-orm';

export const resumeTimer = async (input: GetTimerInput): Promise<TimerState> => {
  try {
    // First, get the current timer state
    const existingTimers = await db.select()
      .from(timersTable)
      .where(eq(timersTable.id, input.id))
      .execute();

    if (existingTimers.length === 0) {
      throw new Error(`Timer with id ${input.id} not found`);
    }

    const timer = existingTimers[0];

    // Check if timer is already running
    if (timer.is_running) {
      throw new Error(`Timer with id ${input.id} is already running`);
    }

    // Check if timer has time remaining (not finished)
    if (timer.remaining_seconds <= 0) {
      throw new Error(`Timer with id ${input.id} has already finished`);
    }

    // Resume the timer by setting is_running to true and started_at to current time
    const result = await db.update(timersTable)
      .set({
        is_running: true,
        started_at: new Date() // Set current timestamp when resuming
      })
      .where(eq(timersTable.id, input.id))
      .returning()
      .execute();

    // Return the updated timer state
    const updatedTimer = result[0];
    return {
      id: updatedTimer.id,
      remaining_seconds: updatedTimer.remaining_seconds,
      is_running: updatedTimer.is_running,
      started_at: updatedTimer.started_at,
      created_at: updatedTimer.created_at
    };
  } catch (error) {
    console.error('Timer resume failed:', error);
    throw error;
  }
};