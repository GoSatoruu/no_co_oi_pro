-- Bảng theo docs/05 §6, thêm cột ip để giới hạn tần suất (30 ván / giờ / IP).
CREATE TABLE runs (
    id           TEXT PRIMARY KEY,
    mode         TEXT NOT NULL,
    level        INTEGER NOT NULL,
    seed         TEXT NOT NULL,
    date         TEXT NOT NULL,
    player       TEXT NOT NULL,
    ip           TEXT NOT NULL DEFAULT '',
    created_at   TEXT NOT NULL,
    expires_at   TEXT NOT NULL,
    submitted_at TEXT,
    score        INTEGER
);
CREATE INDEX idx_runs_ip_time ON runs(ip, created_at);

CREATE TABLE scores (
    id         INTEGER PRIMARY KEY,
    board      TEXT NOT NULL,
    player     TEXT NOT NULL,
    score      INTEGER NOT NULL,
    level      INTEGER NOT NULL,
    verified   INTEGER NOT NULL DEFAULT 0,
    ip         TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE INDEX idx_scores_board_time ON scores(board, created_at);
CREATE INDEX idx_scores_ip_time ON scores(ip, created_at);
