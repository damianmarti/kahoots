import React, { useEffect, useRef, useState } from 'react';

// Cuenta regresiva local re-sincronizada con remainingMs (que viene del server en cada poll)
const Countdown: React.FC<{ remainingMs: number; totalMs: number; size?: number }> = ({ remainingMs, totalMs, size = 96 }) => {
  const [display, setDisplay] = useState(remainingMs);
  const target = useRef(Date.now() + remainingMs);

  useEffect(() => {
    target.current = Date.now() + remainingMs;
  }, [remainingMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay(Math.max(0, target.current - Date.now()));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const seconds = Math.ceil(display / 1000);
  const fraction = totalMs > 0 ? display / totalMs : 0;
  const color = fraction > 0.5 ? '#388e3c' : fraction > 0.2 ? '#f57c00' : '#d32f2f';

  return (
    <div
      className={seconds <= 5 && seconds > 0 ? 'anim-pulse' : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#fff',
        border: `6px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 800,
        color,
      }}
    >
      {seconds}
    </div>
  );
};

export default Countdown;
