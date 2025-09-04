import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timersTable } from '../db/schema';
import { type StopTimerInput } from '../schema';
import { stopTimer } from '../handlers/stop_timer';
import { eq } from 'drizzle-orm';

describe('stopTimer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createRunningTimer = async (remainingSeconds: number = 240) => {
    const startTime = new Date();
    const result = await db.insert(timersTable)
      .values({
        remaining_seconds: remainingSeconds,
        is_running: true,
        started_at: startTime
      })
      .returning()
      .execute();
    
    return result[0];
  };

  const createStoppedTimer = async (remainingSeconds: number = 180) => {
    const result = await db.insert(timersTable)
      .values({
        remaining_seconds: remainingSeconds,
        is_running: false,
        started_at: null
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should stop a running timer', async () => {
    // Create a running timer
    const timer = await createRunningTimer(240);
    
    const input: StopTimerInput = {
      id: timer.id
    };

    const result = await stopTimer(input);

    // Verify the timer is stopped
    expect(result.id).toEqual(timer.id);
    expect(result.is_running).toBe(false);
    expect(result.started_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.remaining_seconds).toBeGreaterThanOrEqual(0);
    expect(result.remaining_seconds).toBeLessThanOrEqual(240);
  });

  it('should calculate remaining time correctly for running timer', async () => {
    // Create a running timer that started 30 seconds ago
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    const timer = await db.insert(timersTable)
      .values({
        remaining_seconds: 240,
        is_running: true,
        started_at: thirtySecondsAgo
      })
      .returning()
      .execute();

    const input: StopTimerInput = {
      id: timer[0].id
    };

    const result = await stopTimer(input);

    // Should have approximately 210 seconds remaining (240 - 30)
    // Allow for small timing variations in test execution
    expect(result.remaining_seconds).toBeGreaterThanOrEqual(205);
    expect(result.remaining_seconds).toBeLessThanOrEqual(215);
    expect(result.is_running).toBe(false);
    expect(result.started_at).toBeNull();
  });

  it('should handle timer that has already expired', async () => {
    // Create a timer that started 5 minutes ago with 4 minute duration
    const fiveMinutesAgo = new Date(Date.now() - 300000);
    const timer = await db.insert(timersTable)
      .values({
        remaining_seconds: 240, // 4 minutes
        is_running: true,
        started_at: fiveMinutesAgo
      })
      .returning()
      .execute();

    const input: StopTimerInput = {
      id: timer[0].id
    };

    const result = await stopTimer(input);

    // Timer should be set to 0 remaining seconds
    expect(result.remaining_seconds).toBe(0);
    expect(result.is_running).toBe(false);
    expect(result.started_at).toBeNull();
  });

  it('should handle stopping an already stopped timer', async () => {
    // Create a stopped timer
    const timer = await createStoppedTimer(180);
    
    const input: StopTimerInput = {
      id: timer.id
    };

    const result = await stopTimer(input);

    // Should remain stopped with same remaining time
    expect(result.id).toEqual(timer.id);
    expect(result.is_running).toBe(false);
    expect(result.started_at).toBeNull();
    expect(result.remaining_seconds).toBe(180);
  });

  it('should update timer in database', async () => {
    // Create a running timer
    const timer = await createRunningTimer(240);
    
    const input: StopTimerInput = {
      id: timer.id
    };

    await stopTimer(input);

    // Verify database was updated
    const updatedTimers = await db.select()
      .from(timersTable)
      .where(eq(timersTable.id, timer.id))
      .execute();

    expect(updatedTimers).toHaveLength(1);
    const updatedTimer = updatedTimers[0];
    expect(updatedTimer.is_running).toBe(false);
    expect(updatedTimer.started_at).toBeNull();
    expect(updatedTimer.remaining_seconds).toBeGreaterThanOrEqual(0);
    expect(updatedTimer.remaining_seconds).toBeLessThanOrEqual(240);
  });

  it('should throw error for non-existent timer', async () => {
    const input: StopTimerInput = {
      id: 99999 // Non-existent ID
    };

    await expect(stopTimer(input)).rejects.toThrow(/timer with id 99999 not found/i);
  });

  it('should handle timer with zero remaining seconds', async () => {
    // Create a timer with 0 remaining seconds
    const timer = await createRunningTimer(0);
    
    const input: StopTimerInput = {
      id: timer.id
    };

    const result = await stopTimer(input);

    expect(result.remaining_seconds).toBe(0);
    expect(result.is_running).toBe(false);
    expect(result.started_at).toBeNull();
  });

  it('should preserve created_at timestamp', async () => {
    // Create a timer
    const timer = await createRunningTimer(240);
    
    const input: StopTimerInput = {
      id: timer.id
    };

    const result = await stopTimer(input);

    // created_at should remain unchanged
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBe(timer.created_at!.getTime());
  });
});