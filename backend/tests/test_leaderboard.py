import sqlite3

from app.timeutil import iso, now_vn


def post(client, name, score, level=1):
    return client.post(
        "/api/scores", json={"mode": "normal", "score": score, "playerName": name, "level": level}
    )


def test_post_score_and_ranking_order(client):
    assert post(client, "An", 900).status_code == 201
    post(client, "Binh", 1200)
    post(client, "Chi", 900)
    r = client.get("/api/leaderboard", params={"board": "normal", "period": "all"})
    assert r.status_code == 200
    body = r.json()
    assert body["board"] == "normal" and body["from"] is None
    assert [(e["rank"], e["name"], e["score"]) for e in body["entries"]] == [
        (1, "Binh", 1200),
        (2, "An", 900),  # cùng điểm: ai đạt trước xếp trên
        (3, "Chi", 900),
    ]


def test_boards_are_separate_and_limit_applies(client):
    for i in range(5):
        post(client, f"P{i}", 100 + i)
    assert client.get("/api/leaderboard", params={"board": "pro", "period": "all"}).json()["entries"] == []
    r = client.get("/api/leaderboard", params={"board": "normal", "period": "all", "limit": 2})
    assert [e["score"] for e in r.json()["entries"]] == [104, 103]


def test_period_filters_old_scores(client, tmp_path):
    post(client, "Moi", 500)
    old = iso(now_vn().replace(year=2020))
    conn = sqlite3.connect(tmp_path / "test.db")
    conn.execute(
        "INSERT INTO scores (board, player, score, level, verified, ip, created_at)"
        " VALUES ('normal', 'Cu', 9999, 1, 0, 'x', ?)",
        (old,),
    )
    conn.commit()
    week = client.get("/api/leaderboard", params={"board": "normal", "period": "week"}).json()
    assert [e["name"] for e in week["entries"]] == ["Moi"] and week["from"]
    day = client.get("/api/leaderboard", params={"board": "normal", "period": "day"}).json()
    assert [e["name"] for e in day["entries"]] == ["Moi"]
    allp = client.get("/api/leaderboard", params={"board": "normal", "period": "all"}).json()
    assert [e["name"] for e in allp["entries"]] == ["Cu", "Moi"]


def test_leaderboard_bad_params(client):
    assert client.get("/api/leaderboard", params={"board": "xyz"}).status_code == 400
    assert client.get("/api/leaderboard", params={"period": "year"}).status_code == 400
    assert client.get("/api/leaderboard", params={"limit": 0}).status_code == 400
    assert client.get("/api/leaderboard", params={"limit": 999}).status_code == 400


def test_post_score_validation(client):
    bad = [
        {"mode": "pro", "score": 1, "playerName": "A", "level": 1},  # Pro phải qua /api/runs
        {"mode": "normal", "score": -1, "playerName": "A", "level": 1},
        {"mode": "normal", "score": 1, "playerName": "   ", "level": 1},
        {"mode": "normal", "score": 1, "playerName": "x" * 25, "level": 1},
        {"mode": "normal", "score": 1, "playerName": "A", "level": 0},
        {"mode": "normal", "score": 1, "playerName": "A", "level": 99},
        {"mode": "normal", "score": 10**9, "playerName": "A", "level": 1},
        {"mode": "normal", "score": 1.5, "playerName": "A", "level": 1},  # tiền/điểm là số nguyên
    ]
    for body in bad:
        r = client.post("/api/scores", json=body)
        assert r.status_code == 400, body
        assert r.json()["error"]["code"] == "bad_request"


def test_player_name_is_trimmed(client):
    post(client, "  Lan  ", 10)
    r = client.get("/api/leaderboard", params={"board": "normal", "period": "all"})
    assert r.json()["entries"][0]["name"] == "Lan"


def test_scores_rate_limited(make_client):
    c = make_client(rate_limit_per_hour=3)
    assert [post(c, "A", i).status_code for i in range(3)] == [201, 201, 201]
    r = post(c, "A", 9)
    assert r.status_code == 429 and r.json()["error"]["code"] == "rate_limited"
