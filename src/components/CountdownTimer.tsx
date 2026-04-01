import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  startTime: string; // ISO string từ DB
  durationMs: number; // Thời gian đếm ngược (ms)
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ startTime, durationMs }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const deadline = new Date(startTime).getTime() + durationMs;
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const remaining = deadline - now;
      setTimeLeft(remaining > 0 ? remaining : 0);
    };

    updateTimer(); // Gọi ngay lập tức
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [startTime, durationMs]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <span className={`font-mono font-bold ${timeLeft < 3600000 ? 'text-red-500' : 'text-accent'}`}>
      {timeLeft > 0 ? formatTime(timeLeft) : "Hết hạn"}
    </span>
  );
};

export default CountdownTimer;
