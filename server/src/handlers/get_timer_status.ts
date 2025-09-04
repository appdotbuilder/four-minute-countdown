import { db } from '../db';
import { timersTable } from '../db/schema';
import { type GetTimerInput, type TimerStatus } from '../schema';
import { eq } from 'drizzle-orm';

export async function getTimerStatus(input: GetTimerInput): Promise<TimerStatus> {
  try {
    // Fetch the timer from database
    const results = await db.select()
      .from(timersTable)
      .where(eq(timersTable.id, input.id))
      .execute();

    if (results.length === 0) {
      throw new Error(`Timer with id ${input.id} not found`);
    }

    const timer = results[0];
    
    // Calculate current remaining seconds
    let currentRemainingSeconds = timer.remaining_seconds;
    let originalDuration = timer.remaining_seconds; // Default assumption
    
    if (timer.is_running && timer.started_at) {
      // Calculate elapsed time since timer started
      const now = new Date();
      const elapsedSeconds = Math.floor((now.getTime() - timer.started_at.getTime()) / 1000);
      
      // Update remaining seconds based on elapsed time
      currentRemainingSeconds = Math.max(0, timer.remaining_seconds - elapsedSeconds);
      
      // Calculate original duration (remaining + elapsed when timer was running)
      originalDuration = timer.remaining_seconds;
    }

    // Determine if timer is finished
    const isFinished = currentRemainingSeconds <= 0;

    // Calculate progress percentage
    // We need to estimate the original duration for progress calculation
    // If timer is not running, we use the current remaining_seconds as baseline
    // If timer is running, we use the original remaining_seconds when it started
    let progressPercentage = 0;
    
    if (timer.is_running && timer.started_at) {
      // For running timers, calculate based on time elapsed vs original duration
      const totalElapsed = originalDuration - currentRemainingSeconds;
      progressPercentage = originalDuration > 0 ? Math.min(100, (totalElapsed / originalDuration) * 100) : 100;
    } else if (!timer.is_running && originalDuration > 0) {
      // For paused/stopped timers, calculate based on what's left vs original
      // We assume some progress was made if remaining < what might be a typical duration
      // This is a limitation - we don't store original duration in the schema
      progressPercentage = 0; // Conservative approach for paused timers
    }

    return {
      id: timer.id,
      remaining_seconds: currentRemainingSeconds,
      is_running: timer.is_running,
      is_finished: isFinished,
      progress_percentage: Math.round(progressPercentage * 100) / 100 // Round to 2 decimal places
    };
  } catch (error) {
    console.error('Failed to get timer status:', error);
    throw error;
  }
}