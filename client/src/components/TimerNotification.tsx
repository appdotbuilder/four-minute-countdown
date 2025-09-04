import { useEffect, useCallback } from 'react';

interface TimerNotificationProps {
  isTimerFinished: boolean;
  onNotificationShown: () => void;
}

export function TimerNotification({ isTimerFinished, onNotificationShown }: TimerNotificationProps) {
  const showNotification = useCallback(() => {
    const notification = new Notification('⏰ Timer Finished!', {
      body: 'Your 4-minute countdown timer has reached zero.',
      icon: '⏰',
      badge: '⏰',
      tag: 'timer-finished',
      requireInteraction: true, // Keeps notification visible until user interacts
    });

    // Auto-close after 10 seconds if user doesn't interact
    setTimeout(() => {
      notification.close();
    }, 10000);

    notification.onclick = () => {
      window.focus(); // Bring the app window to focus
      notification.close();
    };

    onNotificationShown();
  }, [onNotificationShown]);

  useEffect(() => {
    if (isTimerFinished && 'Notification' in window) {
      // Request notification permission if not already granted
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            showNotification();
          }
        });
      } else if (Notification.permission === 'granted') {
        showNotification();
      }
    }
  }, [isTimerFinished, showNotification]);



  return null; // This component doesn't render anything visual
}