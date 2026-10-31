import sqlite3

from app.timeutil import iso, now_vn


def new_run(client, level=5, name="An"):
    return client.post("/api/runs", json={"mode": "pro", "level": level, "playerName": name})


ACTIONS = {
    "actions": [
        {"docIndex": 0, "inspect": {"type": "valid"}},
        {
            "docIndex": 1,
            "inspect": {"type": "stamp", "field": "paymentMethod"},
            "entry": [{"side": "N", "acc": "642", "amt": 5940000}, {"side": "C", "acc": "111", "amt": 5940000}],
            "ms": 18450,
        },
    ],
    "clientScore": 1234,
}


def test_create_run_matches_contract(client):
    r = new_run(client)
    assert r.status_code == 201
    body = r.json()
    assert set(body) == {"runId", "seed", "date", "level", "mode", "expiresAt"}
    assert body["mode"] == "pro" and body["level"] == 5
    assert body["seed"].startswith(body["date"])
    assert new_run(client).json()["seed"] != body["seed"]  # mỗi ván một đề


def test_create_run_validation(client):
    bad = [
        {"mode": "normal", "level": 1, "playerName": "A"},  # Normal không có ván xếp hạng
        {"mode": "pro", "level": 2, "playerName": "A"},  # 2 không nằm trong startLevels của Pro
        {"mode": "pro", "level": 5, "playerName": ""},
        {"mode": "pro", "level": 5},
    ]
    for body in bad:
        assert client.post("/api/runs", json=body).status_code == 400, body


def test_runs_rate_limited(make_client):
    c = make_client(rate_limit_per_hour=2)
    assert [new_run(c).status_code for _ in range(2)] == [201, 201]
    r = new_run(c)
    assert r.status_code == 429 and r.json()["error"]["code"] == "rate_limited"


def test_submit_unknown_run_404(client):
    r = client.post("/api/runs/khong-co/submit", json=ACTIONS)
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_found"


def test_submit_invalid_action_400(client):
    run = new_run(client).json()["runId"]
    bad = {"actions": [{"docIndex": 0, "inspect": {"type": "lung-tung"}}]}
    r = client.post(f"/api/runs/{run}/submit", json=bad)
    assert r.status_code == 400 and r.json()["error"]["code"] == "invalid_action"
    bad_amt = {"actions": [{"docIndex": 0, "inspect": {"type": "valid"}, "entry": [{"side": "N", "acc": "111", "amt": 1.5}]}]}
    assert client.post(f"/api/runs/{run}/submit", json=bad_amt).status_code == 400


def test_submit_expired_410(client, tmp_path):
    run = new_run(client).json()["runId"]
    conn = sqlite3.connect(tmp_path / "test.db")
    conn.execute("UPDATE runs SET expires_at = ?", (iso(now_vn().replace(year=2020)),))
    conn.commit()
    r = client.post(f"/api/runs/{run}/submit", json=ACTIONS)
    assert r.status_code == 410 and r.json()["error"]["code"] == "run_expired"


def test_submit_already_submitted_409(client, tmp_path):
    run = new_run(client).json()["runId"]
    conn = sqlite3.connect(tmp_path / "test.db")
    conn.execute("UPDATE runs SET submitted_at = ?, score = 1", (iso(now_vn()),))
    conn.commit()
    r = client.post(f"/api/runs/{run}/submit", json=ACTIONS)
    assert r.status_code == 409 and r.json()["error"]["code"] == "already_submitted"


def test_submit_scoring_not_ready_does_not_consume_run(client, tmp_path):
    """Chờ PY-003: chưa chấm được thì 501 và run vẫn còn nguyên để nộp lại sau, không tin clientScore."""
    run = new_run(client).json()["runId"]
    r = client.post(f"/api/runs/{run}/submit", json=ACTIONS)
    assert r.status_code == 501 and r.json()["error"]["code"] == "not_implemented"
    conn = sqlite3.connect(tmp_path / "test.db")
    assert conn.execute("SELECT submitted_at, score FROM runs").fetchone() == (None, None)
    assert conn.execute("SELECT COUNT(*) FROM scores").fetchone()[0] == 0
