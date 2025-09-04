import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimerStatus, TimerState } from '../../server/src/schema';
import { TimerDisplay } from './components/TimerDisplay';
import { TimerControls } from './components/TimerControls';
import { AudioAlarm } from './components/AudioAlarm';
import { TimerNotification } from './components/TimerNotification';

function App() {
  const [currentTimer, setCurrentTimer] = useState<TimerState | null>(null);
  const [timerStatus, setTimerStatus] = useState<TimerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const [shouldPlayAlarm, setShouldPlayAlarm] = useState(false);
  const [shouldShowNotification, setShouldShowNotification] = useState(false);

  const handleAlarmPlayed = useCallback(() => {
    setShouldPlayAlarm(false);
  }, []);

  const handleNotificationShown = useCallback(() => {
    setShouldShowNotification(false);
  }, []);

  const updateTimerStatus = useCallback(async () => {
    if (!currentTimer) return;
    
    try {
      const status = await trpc.getTimerStatus.query({ id: currentTimer.id });
      setTimerStatus(status);
      
      // Trigger alarm and notification when timer finishes
      if (status.is_finished && !shouldPlayAlarm) {
        setShouldPlayAlarm(true);
        setShouldShowNotification(true);
      }
    } catch (error) {
      console.error('Failed to update timer status:', error);
    }
  }, [currentTimer, shouldPlayAlarm]);

  // Update timer status every second when timer is running
  useEffect(() => {
    if (currentTimer && timerStatus?.is_running) {
      intervalRef.current = window.setInterval(updateTimerStatus, 1000);
    } else {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [currentTimer, timerStatus?.is_running, updateTimerStatus]);

  // Initial status fetch when timer changes
  useEffect(() => {
    if (currentTimer) {
      updateTimerStatus();
    }
  }, [currentTimer, updateTimerStatus]);

  const startNewTimer = async () => {
    setIsLoading(true);
    setShouldPlayAlarm(false);
    setShouldShowNotification(false);
    try {
      const newTimer = await trpc.startTimer.mutate({ duration_seconds: 240 }); // 4 minutes
      setCurrentTimer(newTimer);
      // Get initial status
      const status = await trpc.getTimerStatus.query({ id: newTimer.id });
      setTimerStatus(status);
    } catch (error) {
      console.error('Failed to start timer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pauseTimer = async () => {
    if (!currentTimer) return;
    
    setIsLoading(true);
    try {
      const updatedTimer = await trpc.stopTimer.mutate({ id: currentTimer.id });
      setCurrentTimer(updatedTimer);
      await updateTimerStatus();
    } catch (error) {
      console.error('Failed to pause timer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resumeTimer = async () => {
    if (!currentTimer) return;
    
    setIsLoading(true);
    try {
      const updatedTimer = await trpc.resumeTimer.mutate({ id: currentTimer.id });
      setCurrentTimer(updatedTimer);
      await updateTimerStatus();
    } catch (error) {
      console.error('Failed to resume timer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetTimer = async () => {
    if (!currentTimer) return;
    
    setIsLoading(true);
    setShouldPlayAlarm(false);
    setShouldShowNotification(false);
    try {
      const updatedTimer = await trpc.resetTimer.mutate({ id: currentTimer.id });
      setCurrentTimer(updatedTimer);
      await updateTimerStatus();
    } catch (error) {
      console.error('Failed to reset timer:', error);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-bold text-gray-800 mb-2">
            ⏰ Four-Minute Timer
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {!currentTimer ? (
            <div className="text-center space-y-4">
              <p className="text-gray-600 text-lg">Ready to start your 4-minute countdown?</p>
              <Button 
                onClick={startNewTimer} 
                disabled={isLoading}
                size="lg"
                className="w-full text-lg py-6"
              >
                {isLoading ? 'Starting...' : '🚀 Start Timer'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <TimerDisplay timerStatus={timerStatus} />
              
              <TimerControls
                timerStatus={timerStatus}
                isLoading={isLoading}
                onPause={pauseTimer}
                onResume={resumeTimer}
                onReset={resetTimer}
                onNewTimer={startNewTimer}
              />
            </div>
          )}

          {/* Instructions */}
          <div className="text-center text-sm text-gray-500 border-t pt-4 space-y-1">
            <p>💡 Features:</p>
            <ul className="text-xs space-y-1">
              <li>🔊 Audio alarm when timer finishes</li>
              <li>📱 Browser notification (if enabled)</li>
              <li>⏸️ Pause and resume functionality</li>
              <li>🔄 Reset timer to 4 minutes</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <AudioAlarm 
        shouldPlay={shouldPlayAlarm} 
        onAlarmPlayed={handleAlarmPlayed} 
      />
      
      <TimerNotification 
        isTimerFinished={shouldShowNotification} 
        onNotificationShown={handleNotificationShown} 
      />
    </div>
  );
}

export default App;