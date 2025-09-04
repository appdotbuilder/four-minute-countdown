import { db } from '../db';
import { timersTable } from '../db/schema';
import { desc } from 'drizzle-orm';
import { type TimerState } from '../schema';

export const getAllTimers = async (): Promise<TimerState[]> => {
  try {
    // Query all timers ordered by creation date (newest first)
    const results = await db.select()
      .from(timersTable)
      .orderBy(desc(timersTable.created_at))
      .execute();

    // Convert database results to schema format
    return results.map(timer => ({
      id: timer.id,
      remaining_seconds: timer.remaining_seconds,
      is_running: timer.is_running,
      started_at: timer.started_at,
      created_at: timer.created_at
    }));
  } catch (error) {
    console.error('Failed to retrieve timers:', error);
    throw error;
  }
};