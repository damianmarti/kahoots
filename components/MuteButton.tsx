import React, { useEffect, useState } from 'react';
import { getHostAudio } from '../lib/audio';

// Botón flotante para silenciar/activar el audio del host. Refleja y modifica
// el estado de silencio del motor singleton (que persiste en localStorage), así
// que es seguro que se remonte en cada fase.
const MuteButton: React.FC = () => {
  const [muted, setMuted] = useState(false);

  // El estado real vive en el motor (y en localStorage); lo leemos al montar.
  useEffect(() => {
    setMuted(getHostAudio().muted);
  }, []);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = getHostAudio();
    audio.resume(); // por si el primer gesto es este click
    const next = !audio.muted;
    audio.setMuted(next);
    setMuted(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={muted ? 'Activar sonido' : 'Silenciar'}
      aria-label={muted ? 'Activar sonido' : 'Silenciar'}
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 20,
        background: 'rgba(255,255,255,0.2)',
        border: 'none',
        borderRadius: '50%',
        width: 48,
        height: 48,
        fontSize: 22,
        cursor: 'pointer',
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
};

export default MuteButton;
