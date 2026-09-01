-- Migración incremental: puntaje del juego en vivo en kahoot_results.
-- Aplicar con: psql "$DATABASE_URL" -f data/migration-add-score.sql
-- En una base nueva la columna ya viene de data/database.sql; este ALTER es
-- idempotente (IF NOT EXISTS), así que correrlo de más no rompe nada.
ALTER TABLE kahoot_results
    ADD COLUMN IF NOT EXISTS score INT NOT NULL DEFAULT 0; -- puntos del juego en vivo; 0 en los kahoots importados desde Excel

-- Backfill de las partidas jugadas antes de esta migración: advance.ts guarda el
-- resultado con kahoot_name = "<quiz> (<code>)" y games.code es UNIQUE, así que
-- el sufijo "(<code>)" identifica la partida sin ambigüedad.
UPDATE kahoot_results k
   SET score = sub.score
  FROM (SELECT g.code, p.padron, p.score
          FROM game_players p
          JOIN games g ON g.id = p.game_id) sub
 WHERE k.score = 0
   AND k.padron = sub.padron
   AND k.kahoot_name LIKE '%(' || sub.code || ')';
