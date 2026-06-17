import React, { useState, useEffect } from 'react';

export const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Bahrain',
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div style={{ 
      fontSize: '0.75rem', 
      fontFamily: 'var(--font-mono)', 
      color: 'var(--text-secondary)',
      padding: '0 8px',
      display: 'flex',
      alignItems: 'center'
    }}>
      {timeString} BH
    </div>
  );
};
