import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timersTable } from '../db/schema';
import { type GetTimerInput } from '../schema';
import { getTimerStatus } from '../handlers/get_timer_status';

describe('getTimerStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get status for a stopped timer', async () => {
    // Create a stopped timer with 120 seconds remaining
    const insertResult = await db.insert(timersTable)
      .values({
        remaining_seconds: 120,
        is_running: false,
        started_at: null
      })
      .returning()
      .execute();

    const timerId = insertResult[0].id;

    const input: GetTimerInput = { id: timerId };
    const result = await getTimerStatus(input);

    expect(result.id).toEqual(timerId);
    expect(result.remaining_seconds).toEqual(120);
    expect(result.is_running).toBe(false);
    expect(result.is_finished).toBe(false);
    expect(result.progress_percentage).toEqual(0); // No progress on stopped timer
  });

  it('should get status for a running timer with time elapsed', async () => {
    // Create a running timer that started 60 seconds ago with 180 seconds originally
    const startedAt = new Date();
    startedAt.setSeconds(startedAt.getSeconds() - 60); // 60 seconds ago

    const insertResult = await db.insert(timersTable)
      .values({
        remaining_seconds: 180,
        is_running: true,
        started_at: startedAt
      })
      .returning()
      .execute();

    const timerId = insertResult[0].id;

    const input: GetTimerInput = { id: timerId };
    const result = await getTimerStatus(input);

    expect(result.id).toEqual(timerId);
    expect(result.remaining_seconds).toBeLessThanOrEqual(120); // Should be around 120 (180 - 60)
    expect(result.remaining_seconds).toBeGreaterThan(110); // Allow some variance for test execution time
    expect(result.is_running).toBe(true);
    expect(result.is_finished).toBe(false);
    expect(result.progress_percentage).toBeGreaterThan(30); // At least 33% progress (60/180)
    expect(result.progress_percentage).toBeLessThan(40); // But not too much more
  });

  it('should handle finished timer (remaining time <= 0)', async () => {
    // Create a running timer that should have finished (started more than remaining_seconds ago)
    const startedAt = new Date();
    startedAt.setSeconds(startedAt.getSeconds() - 300); // 5 minutes ago

    const insertResult = await db.insert(timersTable)
      .values({
        remaining_seconds: 60, // Only had 1 minute originally
        is_running: true,
        started_at: startedAt
      })
      .returning()
      .execute();

    const timerId = insertResult[0].id;

    const input: GetTimerInput = { id: timerId };
    const result = await getTimerStatus(input);

    expect(result.id).toEqual(timerId);
    expect(result.remaining_seconds).toEqual(0);
    expect(result.is_running).toBe(true); // Still marked as running in DB
    expect(result.is_finished).toBe(true);
    expect(result.progress_percentage).toEqual(100);
  });

  it('should handle timer with zero remaining seconds', async () => {
    // Create a timer that has zero seconds remaining
    const insertResult = await db.insert(timersTable)
      .values({
        remaining_seconds: 0,
        is_running: false,
        started_at: null
      })
      .returning()
      .execute();

    const timerId = insertResult[0].id;

    const input: GetTimerInput = { id: timerId };
    const result = await getTimerStatus(input);

    expect(result.id).toEqual(timerId);
    expect(result.remaining_seconds).toEqual(0);
    expect(result.is_running).toBe(false);
    expect(result.is_finished).toBe(true);
    expect(result.progress_percentage).toEqual(0);
  });

  it('should handle recently started timer', async () => {
    // Create a timer that just started (less than 1 second ago)
    const startedAt = new Date();
    startedAt.setMilliseconds(startedAt.getMilliseconds() - 500); // 0.5 seconds ago

    const insertResult = await db.insert(timersTable)
      .values({
        remaining_seconds: 240,
        is_running: true,
        started_at: startedAt
      })
      .returning()
      .execute();

    const timerId = insertResult[0].id;

    const input: GetTimerInput = { id: timerId };
    const result = await getTimerStatus(input);

    expect(result.id).toEqual(timerId);
    expect(result.remaining_seconds).toBeLessThanOrEqual(240);
    expect(result.remaining_seconds).toBeGreaterThan(235); // Should still have most time left
    expect(result.is_running).toBe(true);
    expect(result.is_finished).toBe(false);
    expect(result.progress_percentage).toBeGreaterThanOrEqual(0);
    expect(result.progress_percentage).toBeLessThan(5); // Very little progress
  });

  it('should throw error for non-existent timer', async () => {
    const input: GetTimerInput = { id: 99999 };

    await expect(getTimerStatus(input)).rejects.toThrow(/Timer with id 99999 not found/i);
  });

  it('should handle paused timer (not running, but has started_at)', async () => {
    // Create a timer that was running but is now paused
    const startedAt = new Date();
    startedAt.setSeconds(startedAt.getSeconds() - 30); // Started 30 seconds ago

    const insertResult = await db.insert(timersTable)
      .values({
        remaining_seconds: 150, // Paused with 150 seconds left
        is_running: false, // But now paused
        started_at: startedAt // Has a start time from when it was running
      })
      .returning()
      .execute();

    const timerId = insertResult[0].id;

    const input: GetTimerInput = { id: timerId };
    const result = await getTimerStatus(input);

    expect(result.id).toEqual(timerId);
    expect(result.remaining_seconds).toEqual(150); // Should use stored value for paused timer
    expect(result.is_running).toBe(false);
    expect(result.is_finished).toBe(false);
    expect(result.progress_percentage).toEqual(0); // Conservative approach for paused timers
  });
});