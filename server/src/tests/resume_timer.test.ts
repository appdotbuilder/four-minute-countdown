import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timersTable } from '../db/schema';
import { type GetTimerInput } from '../schema';
import { resumeTimer } from '../handlers/resume_timer';
import { eq } from 'drizzle-orm';

// Test input for resuming timer
const testInput: GetTimerInput = {
  id: 1
};

describe('resumeTimer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should resume a paused timer', async () => {
    // Create a paused timer first
    await db.insert(timersTable)
      .values({
        remaining_seconds: 180,
        is_running: false,
        started_at: null
      })
      .execute();

    const result = await resumeTimer(testInput);

    // Verify timer state is correctly updated
    expect(result.id).toEqual(1);
    expect(result.remaining_seconds).toEqual(180);
    expect(result.is_running).toEqual(true);
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save resumed timer state to database', async () => {
    // Create a paused timer
    await db.insert(timersTable)
      .values({
        remaining_seconds: 120,
        is_running: false,
        started_at: null
      })
      .execute();

    const result = await resumeTimer(testInput);

    // Verify database state is updated
    const timers = await db.select()
      .from(timersTable)
      .where(eq(timersTable.id, result.id))
      .execute();

    expect(timers).toHaveLength(1);
    const timer = timers[0];
    expect(timer.remaining_seconds).toEqual(120);
    expect(timer.is_running).toEqual(true);
    expect(timer.started_at).toBeInstanceOf(Date);
    expect(timer.started_at).not.toBeNull();
  });

  it('should throw error when timer not found', async () => {
    const nonExistentInput: GetTimerInput = { id: 999 };

    await expect(resumeTimer(nonExistentInput)).rejects.toThrow(/Timer with id 999 not found/i);
  });

  it('should throw error when timer is already running', async () => {
    // Create a running timer
    await db.insert(timersTable)
      .values({
        remaining_seconds: 240,
        is_running: true,
        started_at: new Date()
      })
      .execute();

    await expect(resumeTimer(testInput)).rejects.toThrow(/Timer with id 1 is already running/i);
  });

  it('should throw error when timer has finished (no time remaining)', async () => {
    // Create a finished timer
    await db.insert(timersTable)
      .values({
        remaining_seconds: 0,
        is_running: false,
        started_at: null
      })
      .execute();

    await expect(resumeTimer(testInput)).rejects.toThrow(/Timer with id 1 has already finished/i);
  });

  it('should preserve original remaining_seconds when resuming', async () => {
    // Create timer with specific remaining time
    const originalRemainingSeconds = 75;
    await db.insert(timersTable)
      .values({
        remaining_seconds: originalRemainingSeconds,
        is_running: false,
        started_at: null
      })
      .execute();

    const result = await resumeTimer(testInput);

    // Verify remaining seconds unchanged
    expect(result.remaining_seconds).toEqual(originalRemainingSeconds);

    // Also verify in database
    const timers = await db.select()
      .from(timersTable)
      .where(eq(timersTable.id, result.id))
      .execute();

    expect(timers[0].remaining_seconds).toEqual(originalRemainingSeconds);
  });

  it('should set started_at to current time when resuming', async () => {
    // Create paused timer
    await db.insert(timersTable)
      .values({
        remaining_seconds: 300,
        is_running: false,
        started_at: null
      })
      .execute();

    const beforeResume = new Date();
    const result = await resumeTimer(testInput);
    const afterResume = new Date();

    // Verify started_at is set to current time (within reasonable bounds)
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.started_at!.getTime()).toBeGreaterThanOrEqual(beforeResume.getTime());
    expect(result.started_at!.getTime()).toBeLessThanOrEqual(afterResume.getTime());
  });
});