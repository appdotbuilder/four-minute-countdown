import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timersTable } from '../db/schema';
import { getAllTimers } from '../handlers/get_all_timers';

describe('getAllTimers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no timers exist', async () => {
    const result = await getAllTimers();
    
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all timers with correct structure', async () => {
    // Create test timer data
    const testTimers = [
      {
        remaining_seconds: 240,
        is_running: true,
        started_at: new Date()
      },
      {
        remaining_seconds: 0,
        is_running: false,
        started_at: null
      },
      {
        remaining_seconds: 120,
        is_running: false,
        started_at: new Date('2024-01-15T10:00:00Z')
      }
    ];

    // Insert test data
    await db.insert(timersTable)
      .values(testTimers)
      .execute();

    const result = await getAllTimers();

    // Verify all timers are returned
    expect(result).toHaveLength(3);

    // Verify structure of each timer
    result.forEach(timer => {
      expect(timer).toHaveProperty('id');
      expect(timer).toHaveProperty('remaining_seconds');
      expect(timer).toHaveProperty('is_running');
      expect(timer).toHaveProperty('started_at');
      expect(timer).toHaveProperty('created_at');
      
      expect(typeof timer.id).toBe('number');
      expect(typeof timer.remaining_seconds).toBe('number');
      expect(typeof timer.is_running).toBe('boolean');
      expect(timer.created_at).toBeInstanceOf(Date);
      
      // started_at can be null or Date
      if (timer.started_at !== null) {
        expect(timer.started_at).toBeInstanceOf(Date);
      }
    });
  });

  it('should return timers ordered by creation date (newest first)', async () => {
    // Create timers with different creation times
    const timer1 = await db.insert(timersTable)
      .values({
        remaining_seconds: 100,
        is_running: false,
        started_at: null
      })
      .returning()
      .execute();

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const timer2 = await db.insert(timersTable)
      .values({
        remaining_seconds: 200,
        is_running: true,
        started_at: new Date()
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const timer3 = await db.insert(timersTable)
      .values({
        remaining_seconds: 300,
        is_running: false,
        started_at: null
      })
      .returning()
      .execute();

    const result = await getAllTimers();

    expect(result).toHaveLength(3);
    
    // Verify order - newest first (timer3, timer2, timer1)
    expect(result[0].id).toBe(timer3[0].id);
    expect(result[0].remaining_seconds).toBe(300);
    
    expect(result[1].id).toBe(timer2[0].id);
    expect(result[1].remaining_seconds).toBe(200);
    
    expect(result[2].id).toBe(timer1[0].id);
    expect(result[2].remaining_seconds).toBe(100);
  });

  it('should handle different timer states correctly', async () => {
    const now = new Date();
    const pastDate = new Date('2024-01-01T12:00:00Z');
    
    // Create timers with different states
    await db.insert(timersTable)
      .values([
        {
          remaining_seconds: 0, // Finished timer
          is_running: false,
          started_at: pastDate
        },
        {
          remaining_seconds: 180, // Running timer
          is_running: true,
          started_at: now
        },
        {
          remaining_seconds: 60, // Paused timer
          is_running: false,
          started_at: pastDate
        },
        {
          remaining_seconds: 300, // Never started timer
          is_running: false,
          started_at: null
        }
      ])
      .execute();

    const result = await getAllTimers();

    expect(result).toHaveLength(4);

    // Find timers by their remaining seconds to verify state
    const finishedTimer = result.find(t => t.remaining_seconds === 0);
    const runningTimer = result.find(t => t.remaining_seconds === 180);
    const pausedTimer = result.find(t => t.remaining_seconds === 60);
    const neverStartedTimer = result.find(t => t.remaining_seconds === 300);

    // Verify finished timer
    expect(finishedTimer).toBeDefined();
    expect(finishedTimer!.is_running).toBe(false);
    expect(finishedTimer!.started_at).toBeInstanceOf(Date);

    // Verify running timer
    expect(runningTimer).toBeDefined();
    expect(runningTimer!.is_running).toBe(true);
    expect(runningTimer!.started_at).toBeInstanceOf(Date);

    // Verify paused timer
    expect(pausedTimer).toBeDefined();
    expect(pausedTimer!.is_running).toBe(false);
    expect(pausedTimer!.started_at).toBeInstanceOf(Date);

    // Verify never started timer
    expect(neverStartedTimer).toBeDefined();
    expect(neverStartedTimer!.is_running).toBe(false);
    expect(neverStartedTimer!.started_at).toBe(null);
  });

  it('should preserve database constraints and data integrity', async () => {
    // Insert timer with boundary values
    await db.insert(timersTable)
      .values([
        {
          remaining_seconds: 0, // Minimum value
          is_running: false,
          started_at: null
        },
        {
          remaining_seconds: 3600, // 1 hour
          is_running: true,
          started_at: new Date()
        }
      ])
      .execute();

    const result = await getAllTimers();

    expect(result).toHaveLength(2);
    
    // Verify boundary values are preserved
    const shortTimer = result.find(t => t.remaining_seconds === 0);
    const longTimer = result.find(t => t.remaining_seconds === 3600);

    expect(shortTimer).toBeDefined();
    expect(shortTimer!.remaining_seconds).toBe(0);
    expect(shortTimer!.is_running).toBe(false);

    expect(longTimer).toBeDefined();
    expect(longTimer!.remaining_seconds).toBe(3600);
    expect(longTimer!.is_running).toBe(true);
  });
});