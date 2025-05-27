import React from 'react';

const HomePage: React.FC = () => {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f8fa' }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '40px 32px',
        maxWidth: 480,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <img
          src="https://www.fi.uba.ar/images/logo-fiuba.png"
          alt="Facultad de Ingenieria UBA Logo"
          style={{ maxWidth: 180, width: '100%', marginBottom: 32, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }}
        />
        <h1 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 18, color: '#222' }}>
          Ciencia de Datos - Kahoots
        </h1>
        <p style={{ textAlign: 'center', maxWidth: 400, color: '#444', fontSize: 18 }}>
          Esta aplicación te permite cargar resultados de Kahoot, ver estadísticas detalladas y analizar el desempeño de los estudiantes de la Facultad de Ingeniería, Universidad de Buenos Aires en la materia Ciencia de Datos.
        </p>
      </div>
    </div>
  );
};

export default HomePage;