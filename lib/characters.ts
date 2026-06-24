// Personajes (avatares) que el jugador elige al unirse. Son emojis de animales,
// sin archivos, consistente con el resto del código. El id se guarda en la
// columna game_players.avatar.

export interface Character {
  id: string;
  emoji: string;
  label: string;
}

export const CHARACTERS: Character[] = [
  { id: 'fox', emoji: '🦊', label: 'Zorro' },
  { id: 'panda', emoji: '🐼', label: 'Panda' },
  { id: 'lion', emoji: '🦁', label: 'León' },
  { id: 'frog', emoji: '🐸', label: 'Rana' },
  { id: 'owl', emoji: '🦉', label: 'Búho' },
  { id: 'tiger', emoji: '🐯', label: 'Tigre' },
  { id: 'penguin', emoji: '🐧', label: 'Pingüino' },
  { id: 'turtle', emoji: '🐢', label: 'Tortuga' },
  { id: 'unicorn', emoji: '🦄', label: 'Unicornio' },
  { id: 'octopus', emoji: '🐙', label: 'Pulpo' },
];

export const DEFAULT_CHARACTER = 'fox';

const BY_ID = new Map(CHARACTERS.map(c => [c.id, c]));

export function isValidCharacter(id: unknown): id is string {
  return typeof id === 'string' && BY_ID.has(id);
}

// id -> emoji, con fallback al personaje por defecto.
export function characterEmoji(id: string | null | undefined): string {
  return (id && BY_ID.get(id)?.emoji) || BY_ID.get(DEFAULT_CHARACTER)!.emoji;
}
