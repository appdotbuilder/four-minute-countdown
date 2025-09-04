import { Button } from '@/components/ui/button';
import type { TimerStatus } from '../../../server/src/schema';

interface TimerControlsProps {
  timerStatus: TimerStatus | null;
  isLoading: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onNewTimer: () => void;
}

export function TimerControls({ 
  timerStatus, 
  isLoading, 
  onPause, 
  onResume, 
  onReset, 
  onNewTimer 
}: TimerControlsProps) {
  return (
    <div className="space-y-3">
      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {timerStatus?.is_running ? (
          <Button 
            onClick={onPause}
            disabled={isLoading || timerStatus.is_finished}
            variant="secondary"
            size="lg"
          >
            {isLoading ? 'Pausing...' : '⏸️ Pause'}
          </Button>
        ) : (
          <Button 
            onClick={onResume}
            disabled={isLoading || timerStatus?.is_finished}
            size="lg"
          >
            {isLoading ? 'Resuming...' : '▶️ Resume'}
          </Button>
        )}
        
        <Button 
          onClick={onReset}
          disabled={isLoading}
          variant="outline"
          size="lg"
        >
          {isLoading ? 'Resetting...' : '🔄 Reset'}
        </Button>
      </div>

      {/* New Timer Button */}
      <Button 
        onClick={onNewTimer}
        disabled={isLoading}
        variant="default"
        size="lg"
        className="w-full"
      >
        {isLoading ? 'Starting...' : '🆕 New Timer'}
      </Button>
    </div>
  );
}