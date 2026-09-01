// Sin dependencias de servidor: se importa tanto desde las API routes como
// desde las páginas (lib/game.ts arrastra el pool de pg y no sirve en el cliente).

export function cuatrimestreNow(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1 <= 7 ? 1 : 2}`;
}
