-- Live quiz game system (Kahoot en vivo)
-- Apply with: psql "$DATABASE_URL" -f data/migration-live-quiz.sql

CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    created_by INT REFERENCES admin_users(id), -- NULL para el admin seed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_by INT NOT NULL REFERENCES admin_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    position INT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('true_false', 'single', 'multi')),
    text TEXT NOT NULL,
    image_url TEXT,
    time_limit INT NOT NULL CHECK (time_limit IN (30, 45, 60, 90, 120)),
    UNIQUE (quiz_id, position)
);

CREATE TABLE question_options (
    id SERIAL PRIMARY KEY,
    question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    position INT NOT NULL, -- 0..3 (0..1 para true_false: Verdadero/Falso)
    text VARCHAR(500) NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (question_id, position)
);

CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    code VARCHAR(8) UNIQUE NOT NULL,
    quiz_id INT NOT NULL REFERENCES quizzes(id),
    started_by INT NOT NULL REFERENCES admin_users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'lobby'
        CHECK (status IN ('lobby', 'title', 'question', 'reveal', 'leaderboard', 'podium')),
    current_question_index INT,
    question_started_at TIMESTAMPTZ,
    question_ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

CREATE TABLE game_players (
    id SERIAL PRIMARY KEY,
    game_id INT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    padron VARCHAR(20) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    avatar VARCHAR(20) NOT NULL DEFAULT 'fox', -- personaje elegido por el jugador (ver lib/characters.ts)
    session_token VARCHAR(64) NOT NULL, -- se rota cuando otro dispositivo entra con el mismo padron (kick)
    score INT NOT NULL DEFAULT 0,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (game_id, padron)
);

CREATE TABLE game_answers (
    id SERIAL PRIMARY KEY,
    game_id INT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id INT NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
    question_id INT NOT NULL REFERENCES questions(id),
    selected_options INT[] NOT NULL,
    is_correct BOOLEAN NOT NULL,
    response_ms INT NOT NULL, -- calculado en el server contra question_started_at
    points INT NOT NULL,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (player_id, question_id)
);
CREATE INDEX idx_game_answers_game_q ON game_answers(game_id, question_id);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL REFERENCES admin_users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(20),
    entity_id INT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
