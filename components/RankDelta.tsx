import React from 'react';

// Indicador de cuánto subió (▲) o bajó (▼) un jugador en el ranking respecto
// del podio parcial anterior. delta > 0 = subió posiciones.
const RankDelta: React.FC<{ delta: number; light?: boolean; size?: number }> = ({ delta, light = false, size = 16 }) => {
  if (delta === 0) {
    return <span style={{ color: light ? 'rgba(255,255,255,0.6)' : '#9e9e9e', fontSize: size, fontWeight: 700 }}>±0</span>;
  }
  const up = delta > 0;
  const color = up ? (light ? '#69f0ae' : '#2e7d32') : light ? '#ff8a80' : '#c62828';
  return (
    <span style={{ color, fontSize: size, fontWeight: 800 }}>
      {up ? '▲' : '▼'}
      {Math.abs(delta)}
    </span>
  );
};

export default RankDelta;
