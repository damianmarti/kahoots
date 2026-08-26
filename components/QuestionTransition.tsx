import React from 'react';

const ORBIT_COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c'];

// Cortina de 3 segundos entre el podio parcial y la siguiente pregunta:
// cuenta regresiva 3-2-1 con anillos expandiéndose y los colores de las
// opciones orbitando. El sonido lo dispara el host (efectos "tick"/"go").
const QuestionTransition: React.FC<{
  count: number; // 3, 2, 1 y 0 = "¡Ahí va!"
  questionNumber: number;
  totalQuestions: number;
}> = ({ count, questionNumber, totalQuestions }) => (
  <div
    role="status"
    aria-live="polite"
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 20,
      background: 'linear-gradient(135deg, #0d47a1 0%, #4a148c 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 34,
    }}
  >
    <div className="anim-fade-in-scale" style={{ color: 'rgba(255,255,255,0.9)', fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>
      Pregunta {questionNumber} de {totalQuestions}
    </div>

    <div style={{ position: 'relative', width: 300, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Anillos que se expanden, desfasados para que salga uno cada medio segundo */}
      {[0, 0.5].map(delay => (
        <div
          key={delay}
          className="anim-ring-out"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '5px solid rgba(255,255,255,0.55)',
            animationDelay: `${delay}s`,
          }}
        />
      ))}

      {/* Los 4 colores de las opciones girando alrededor del número */}
      <div className="anim-orbit" style={{ position: 'absolute', inset: 0 }}>
        {ORBIT_COLORS.map((color, i) => (
          <div
            key={color}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 26,
              height: 26,
              marginTop: -13,
              marginLeft: -13,
              borderRadius: 8,
              background: color,
              transform: `rotate(${i * 90}deg) translateY(-140px)`,
            }}
          />
        ))}
      </div>

      {/* key={count}: fuerza el remount para que la animación se repita en cada número */}
      <div
        key={count}
        className="anim-count-pop"
        style={{
          width: 190,
          height: 190,
          borderRadius: '50%',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: count > 0 ? 110 : 74,
          fontWeight: 900,
          color: '#1976d2',
          boxShadow: '0 0 60px rgba(255,255,255,0.45)',
        }}
      >
        {count > 0 ? count : '🚀'}
      </div>
    </div>

    <div className="anim-pulse" style={{ color: '#fff', fontSize: 32, fontWeight: 800 }}>
      {count > 0 ? '¡Prepárense!' : '¡Ahí va!'}
    </div>
  </div>
);

export default QuestionTransition;
