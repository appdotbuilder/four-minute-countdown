import { useEffect, useRef, useCallback } from 'react';

interface AudioAlarmProps {
  shouldPlay: boolean;
  onAlarmPlayed: () => void;
}

export function AudioAlarm({ shouldPlay, onAlarmPlayed }: AudioAlarmProps) {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context
  useEffect(() => {
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    } catch (error) {
      console.warn('Could not create audio context for alarm:', error);
    }
  }, []);

  const playBeepTone = useCallback((frequency: number, duration: number, delay: number = 0) => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    const startTime = audioContext.currentTime + delay;
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration - 0.01);
    gainNode.gain.setValueAtTime(0, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }, []);

  const playAlarmSequence = useCallback(() => {
    if (!audioContextRef.current) return;

    // Play a sequence of beeps with increasing frequency
    const beeps = [
      { frequency: 800, duration: 0.3, delay: 0 },
      { frequency: 1000, duration: 0.3, delay: 0.4 },
      { frequency: 1200, duration: 0.3, delay: 0.8 },
      { frequency: 800, duration: 0.5, delay: 1.3 },
      { frequency: 1000, duration: 0.5, delay: 1.9 },
      { frequency: 1200, duration: 0.5, delay: 2.5 }
    ];

    beeps.forEach(beep => {
      playBeepTone(beep.frequency, beep.duration, beep.delay);
    });

    // Call the callback after the alarm sequence completes
    setTimeout(() => {
      onAlarmPlayed();
    }, 3200);
  }, [playBeepTone, onAlarmPlayed]);

  useEffect(() => {
    if (shouldPlay) {
      playAlarmSequence();
    }
  }, [shouldPlay, playAlarmSequence]);

  return null; // This component doesn't render anything visual
}