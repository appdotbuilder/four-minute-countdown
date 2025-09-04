import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { TimerStatus } from '../../../server/src/schema';

interface TimerDisplayProps {
  timerStatus: TimerStatus | null;
}

export function TimerDisplay({ timerStatus }: TimerDisplayProps) {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (): string => {
    if (!timerStatus) return 'bg-blue-500';
    if (timerStatus.is_finished) return 'bg-red-500';
    if (timerStatus.remaining_seconds <= 60) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  const getTimerGlow = (): string => {
    if (!timerStatus) return 'timer-glow';
    if (timerStatus.is_finished) return 'timer-finished-glow';
    if (timerStatus.remaining_seconds <= 60) return 'timer-warning-glow';
    return 'timer-glow';
  };

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      {timerStatus && (
        <div className="text-center">
          <Badge 
            variant={timerStatus.is_finished ? "destructive" : timerStatus.is_running ? "default" : "secondary"}
            className="text-sm"
          >
            {timerStatus.is_finished ? '🔔 Time\'s Up!' : timerStatus.is_running ? '▶️ Running' : '⏸️ Paused'}
          </Badge>
        </div>
      )}

      {/* Timer Display */}
      <div className="text-center">
        <div className={`text-6xl font-mono font-bold p-8 rounded-2xl text-white ${getTimerColor()} transition-all duration-500 ${getTimerGlow()}`}>
          {timerStatus ? formatTime(timerStatus.remaining_seconds) : '04:00'}
        </div>
        {timerStatus?.is_finished && (
          <p className="text-red-600 font-bold text-lg mt-2 animate-bounce-gentle">
            🚨 Timer Finished! 🚨
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {timerStatus && (
        <div className="space-y-2">
          <Progress 
            value={timerStatus.progress_percentage} 
            className="h-3"
          />
          <div className="text-center text-sm text-gray-500">
            {Math.round(timerStatus.progress_percentage)}% complete
          </div>
        </div>
      )}
    </div>
  );
}