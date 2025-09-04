import { type GetTimerInput, type TimerState } from '../schema';

export async function resetTimer(input: GetTimerInput): Promise<TimerState> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is resetting a timer back to its original duration.
    // It should:
    // - Set remaining_seconds back to original duration (240 seconds for 4-minute timer)
    // - Set is_running to false
    // - Set started_at to null
    // This allows the timer to be restarted from the beginning
    return Promise.resolve({
        id: input.id,
        remaining_seconds: 240, // Reset to 4 minutes (240 seconds)
        is_running: false,
        started_at: null, // Null indicates reset state
        created_at: new Date() // Placeholder date
    } as TimerState);
}