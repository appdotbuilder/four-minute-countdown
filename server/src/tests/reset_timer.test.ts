import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timersTable } from '../db/schema';
import { type GetTimerInput } from '../schema';
import { resetTimer } from '../handlers/reset_timer';
import { eq } from 'drizzle-orm';

// Test input for resetting a timer
const testInput: GetTimerInput = {
  id: 1
};

describe('resetTimer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should reset a timer to its original state', async () => {
    // First, create a timer with some custom state
    const createdTimer = await db.insert(timersTable)
      .values({
        remaining_seconds: 120, // Half the original time
        is_running: true,
        started_at: new Date()
      })
      .returning()
      .execute();

    const timerId = createdTimer[0].id;

    const result = await resetTimer({ id: timerId });

    // Verify the timer was reset correctly
    expect(result.id).toEqual(timerId);
    expect(result.remaining_seconds).toEqual(240); // Reset to 4 minutes
    expect(result.is_running).toBe(false);
    expect(result.started_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save reset state to database', async () => {
    // Create a timer that's running with some elapsed time
    const createdTimer = await db.insert(timersTable)
      .values({
        remaining_seconds: 60, // 1 minute left
        is_running: true,
        started_at: new Date()
      })
      .returning()
      .execute();

    const timerId = createdTimer[0].id;

    await resetTimer({ id: timerId });

    // Query the database to verify the changes were persisted
    const timers = await db.select()
      .from(timersTable)
      .where(eq(timersTable.id, timerId))
      .execute();

    expect(timers).toHaveLength(1);
    const timer = timers[0];
    expect(timer.remaining_seconds).toEqual(240);
    expect(timer.is_running).toBe(false);
    expect(timer.started_at).toBeNull();
    expect(timer.created_at).toBeInstanceOf(Date);
  });

  it('should reset a paused timer', async () => {
    // Create a paused timer (not running but with time elapsed)
    const createdTimer = await db.insert(timersTable)
      .values({
        remaining_seconds: 180, // 3 minutes left
        is_running: false,
        started_at: null
      })
      .returning()
      .execute();

    const timerId = createdTimer[0].id;

    const result = await resetTimer({ id: timerId });

    // Verify it was reset to full duration
    expect(result.remaining_seconds).toEqual(240);
    expect(result.is_running).toBe(false);
    expect(result.started_at).toBeNull();
  });

  it('should reset an already finished timer', async () => {
    // Create a finished timer (0 seconds remaining)
    const createdTimer = await db.insert(timersTable)
      .values({
        remaining_seconds: 0,
        is_running: false,
        started_at: null
      })
      .returning()
      .execute();

    const timerId = createdTimer[0].id;

    const result = await resetTimer({ id: timerId });

    // Verify it was reset to full duration
    expect(result.remaining_seconds).toEqual(240);
    expect(result.is_running).toBe(false);
    expect(result.started_at).toBeNull();
  });

  it('should throw error when timer does not exist', async () => {
    const nonExistentId = 999;

    await expect(resetTimer({ id: nonExistentId }))
      .rejects.toThrow(/Timer with id 999 not found/i);
  });

  it('should handle multiple resets correctly', async () => {
    // Create a timer
    const createdTimer = await db.insert(timersTable)
      .values({
        remaining_seconds: 100,
        is_running: true,
        started_at: new Date()
      })
      .returning()
      .execute();

    const timerId = createdTimer[0].id;

    // Reset it once
    const firstReset = await resetTimer({ id: timerId });
    expect(firstReset.remaining_seconds).toEqual(240);

    // Reset it again - should still work
    const secondReset = await resetTimer({ id: timerId });
    expect(secondReset.remaining_seconds).toEqual(240);
    expect(secondReset.is_running).toBe(false);
    expect(secondReset.started_at).toBeNull();
  });
});