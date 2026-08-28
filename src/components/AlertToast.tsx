import React, { useEffect, useState } from 'react';

export const AlertToast: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const handleAlertTriggered = (e: any) => {
      const msg = `Alert triggered at ${e.detail.currentPrice}`;
      setMessages(prev => [...prev, msg]);
      
      // Play audio notification
      try {
        // Create an audio context and a simple beep since we don't have an audio file
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.value = 880; // A5
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2); // beep for 0.2s
      } catch (err) {
        console.error('Audio playback failed', err);
      }

      // Remove after 5 seconds
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m !== msg));
      }, 5000);
    };

    window.addEventListener('alert-triggered', handleAlertTriggered);
    return () => window.removeEventListener('alert-triggered', handleAlertTriggered);
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {messages.map((msg, i) => (
        <div key={i} className="alert-toast bg-green-600 text-white px-4 py-2 rounded shadow-lg">
          {msg}
        </div>
      ))}
    </div>
  );
};
