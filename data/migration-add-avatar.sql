-- Migración incremental para bases ya creadas antes de agregar avatares.
-- En una base nueva la columna ya viene de migration-live-quiz.sql; este ALTER
-- es idempotente (IF NOT EXISTS), así que correrlo de más no rompe nada.
ALTER TABLE game_players
    ADD COLUMN IF NOT EXISTS avatar VARCHAR(20) NOT NULL DEFAULT 'fox'; -- personaje elegido por el jugador (ver lib/characters.ts)
