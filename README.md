# Kahoot FIUBA

App para el curso de Ciencia de Datos / Organización de Datos (FIUBA): análisis de resultados de Kahoot y sistema de juego en vivo estilo Kahoot.

## Setup

```bash
npm install
cp .env.example .env.local   # completar DATABASE_URL, SESSION_SECRET, BLOB_READ_WRITE_TOKEN
```

- `DATABASE_URL`: usar el connection string **pooled** de Neon.
- `SESSION_SECRET`: `openssl rand -hex 32` (firma las cookies de sesión de admins).
- `BLOB_READ_WRITE_TOKEN`: token de Vercel Blob para las imágenes de preguntas (Vercel → Storage → Blob).

Aplicar el esquema del juego en vivo (una sola vez por base):

```bash
psql "$DATABASE_URL" -f data/migration-live-quiz.sql
```

Crear el primer usuario admin:

```bash
npm run seed:admin -- <usuario> <contraseña>
```

Levantar:

```bash
npm run dev
```

## Juego en vivo

1. Entrar a `/admin` (login con el usuario admin).
2. Crear un cuestionario (preguntas V/F, multiple choice de 4 con una correcta, o con una o más correctas; cada una con imagen opcional y tiempo de 30/45/60/90/120 segundos).
3. Click en **Jugar**: se genera un código y una URL `/play/<código>` para compartir.
4. Los alumnos entran con padrón + nickname. Si alguien entra con un padrón ya usado, la sesión anterior queda invalidada.
5. El host avanza con **Siguiente**: pregunta → respuesta correcta → podio parcial → siguiente pregunta… y al final, podio con suspenso (3º → 2º → 1º).
6. El puntaje premia respuestas correctas y rápidas (1000 puntos instantáneo, 500 sobre el final del tiempo).
7. Al terminar, los resultados se guardan en `kahoot_results` (cuatrimestre calculado por fecha) y aparecen en los reportes existentes. El detalle por pregunta queda en `/admin/games`.

Notas:

- Un cuestionario ya jugado no se puede editar: usá **Duplicar para editar**.
- Los admins pueden crear otros admins (`/admin/users`) y cargar alumnos por form o CSV `padron,nombre,apellido` (`/admin/students`).
- Todo queda auditado en la tabla `audit_logs` (quién creó/modificó/jugó cada cuestionario y cuándo).
- El tiempo real es por polling (1–2 s) contra Postgres: funciona en Vercel serverless sin websockets.
