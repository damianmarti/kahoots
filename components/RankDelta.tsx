import React from 'react';

// Indicador de cuánto subió (▲) o bajó (▼) un jugador en el ranking respecto
// del podio parcial anterior. delta > 0 = subió posiciones.
const RankDelta: React.FC<{ delta: number; light?: boolean; size?: number }> = ({ delta, light = false, size = 16 }) => {
  if (delta === 0) return null; // sin cambio de puesto: no se muestra nada
  const up = delta > 0;
  const color = up ? (light ? '#69f0ae' : '#2e7d32') : light ? '#ff8a80' : '#c62828';
  return (
    <span
      role="img"
      aria-label={up ? `Subió ${Math.abs(delta)} posiciones` : `Bajó ${Math.abs(delta)} posiciones`}
      style={{ color, fontSize: size, fontWeight: 800 }}
    >
      {up ? '▲' : '▼'}
      {Math.abs(delta)}
    </span>
  );
};

export default RankDelta;
