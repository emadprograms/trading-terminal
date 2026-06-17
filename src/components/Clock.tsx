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

  // Calculate US Eastern Time for market open
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  
  const nyTimeStr = formatter.format(time);
  const timeParts = nyTimeStr.split(':');
  let nyHour = parseInt(timeParts[0], 10);
  const nyMinute = parseInt(timeParts[1]?.substring(0, 2), 10);

  let borderStyle = '1px solid transparent';
  let boxShadow = 'none';
  let color = 'var(--text-secondary)';

  // US Market opens at 9:30 AM EST
  if (nyHour === 9) {
    if (nyMinute >= 25 && nyMinute < 29) {
      borderStyle = '1px solid rgba(239, 83, 80, 0.5)';
      boxShadow = '0 0 8px rgba(239, 83, 80, 0.3)';
      color = 'var(--text-primary)';
    } else if (nyMinute === 29) {
      borderStyle = '1px solid #ef5350';
      boxShadow = '0 0 12px rgba(239, 83, 80, 0.8)';
      color = '#ef5350';
    }
  }

  return (
    <div style={{ 
      fontSize: '0.75rem', 
      fontFamily: 'var(--font-mono)', 
      color,
      padding: '4px 8px',
      marginRight: '4px',
      display: 'flex',
      alignItems: 'center',
      border: borderStyle,
      boxShadow,
      borderRadius: '6px',
      transition: 'all 0.5s ease',
      fontWeight: (nyHour === 9 && nyMinute >= 25 && nyMinute < 30) ? 600 : 400
    }}>
      {timeString} BH
    </div>
  );
};
