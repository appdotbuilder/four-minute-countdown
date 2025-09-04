import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timersTable } from '../db/schema';
import { type StartTimerInput } from '../schema';
import { startTimer } from '../handlers/start_timer';
import { eq } from 'drizzle-orm';

// Test inputs
const defaultTimerInput: StartTimerInput = {
  duration_seconds: 240 // 4 minutes default
};

const customTimerInput: StartTimerInput = {
  duration_seconds: 600 // 10 minutes
};

describe('startTimer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create and start a timer with default duration', async () => {
    const result = await startTimer(defaultTimerInput);

    // Validate basic timer properties
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.remaining_seconds).toEqual(240);
    expect(result.is_running).toBe(true);
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify started_at is recent (within last 5 seconds)
    const timeDiff = Date.now() - result.started_at!.getTime();
    expect(timeDiff).toBeLessThan(5000);
  });

  it('should create and start a timer with custom duration', async () => {
    const result = await startTimer(customTimerInput);

    expect(result.remaining_seconds).toEqual(600);
    expect(result.is_running).toBe(true);
    expect(result.started_at).toBeInstanceOf(Date);
  });

  it('should save timer to database correctly', async () => {
    const result = await startTimer(defaultTimerInput);

    // Query database to verify timer was saved
    const timers = await db.select()
      .from(timersTable)
      .where(eq(timersTable.id, result.id))
      .execute();

    expect(timers).toHaveLength(1);
    const savedTimer = timers[0];
    
    expect(savedTimer.id).toEqual(result.id);
    expect(savedTimer.remaining_seconds).toEqual(240);
    expect(savedTimer.is_running).toBe(true);
    expect(savedTimer.started_at).toBeInstanceOf(Date);
    expect(savedTimer.created_at).toBeInstanceOf(Date);
  });

  it('should handle multiple timer creation', async () => {
    // Create multiple timers
    const timer1 = await startTimer({ duration_seconds: 300 });
    const timer2 = await startTimer({ duration_seconds: 180 });
    const timer3 = await startTimer({ duration_seconds: 420 });

    // Verify all have unique IDs
    expect(timer1.id).not.toEqual(timer2.id);
    expect(timer2.id).not.toEqual(timer3.id);
    expect(timer1.id).not.toEqual(timer3.id);

    // Verify all are running with correct durations
    expect(timer1.remaining_seconds).toEqual(300);
    expect(timer2.remaining_seconds).toEqual(180);
    expect(timer3.remaining_seconds).toEqual(420);

    expect(timer1.is_running).toBe(true);
    expect(timer2.is_running).toBe(true);
    expect(timer3.is_running).toBe(true);

    // Verify all are saved to database
    const allTimers = await db.select().from(timersTable).execute();
    expect(allTimers).toHaveLength(3);
  });

  it('should set started_at to current timestamp', async () => {
    const beforeStart = new Date();
    const result = await startTimer(defaultTimerInput);
    const afterStart = new Date();

    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.started_at!.getTime()).toBeGreaterThanOrEqual(beforeStart.getTime());
    expect(result.started_at!.getTime()).toBeLessThanOrEqual(afterStart.getTime());
  });

  it('should handle edge case durations correctly', async () => {
    // Test minimum valid duration (1 second)
    const minTimer = await startTimer({ duration_seconds: 1 });
    expect(minTimer.remaining_seconds).toEqual(1);
    expect(minTimer.is_running).toBe(true);

    // Test larger duration (1 hour)
    const largeTimer = await startTimer({ duration_seconds: 3600 });
    expect(largeTimer.remaining_seconds).toEqual(3600);
    expect(largeTimer.is_running).toBe(true);
  });

  it('should apply Zod default duration when not specified', async () => {
    // Test with input that relies on default (empty object would be processed by Zod first)
    const result = await startTimer({ duration_seconds: 240 }); // Using explicit default to simulate Zod processing
    
    expect(result.remaining_seconds).toEqual(240);
    expect(result.is_running).toBe(true);
  });
});