import sqlite3

from app import db


def test_health_and_version_header(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True and len(body["contentHash"]) == 40
    assert r.headers["X-Api-Version"] == "1"


def test_content_bundle_and_etag(client):
    r = client.get("/api/content")
    assert r.status_code == 200
    body = r.json()
    for key in ("hash", "accounts", "rules", "modes", "levels", "defects", "pools", "templates"):
        assert key in body
    assert len(body["templates"]) >= 13
    assert r.headers["ETag"] == f'"{body["hash"]}"'

    r2 = client.get("/api/content", headers={"If-None-Match": r.headers["ETag"]})
    assert r2.status_code == 304 and r2.content == b""
    r3 = client.get("/api/content", headers={"If-None-Match": '"khac"'})
    assert r3.status_code == 200


def test_content_hash_matches_health(client):
    assert client.get("/api/health").json()["contentHash"] == client.get("/api/content").json()["hash"]


def test_unknown_route_uses_error_shape(client):
    r = client.get("/api/khong-co")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "not_found"


def test_static_frontend_and_content_served(client):
    assert client.get("/frontend/").status_code == 200
    assert client.get("/content/rules.json").status_code == 200
    assert client.get("/", follow_redirects=False).status_code in (302, 307)


def test_migrations_run_once(tmp_path):
    path = tmp_path / "m.db"
    first = db.migrate(path)
    assert first == ["001_init"]
    assert db.migrate(path) == []
    conn = sqlite3.connect(path)
    assert conn.execute("SELECT COUNT(*) FROM schema_migrations").fetchone()[0] == 1
    tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"runs", "scores", "schema_migrations"} <= tables


def test_broken_migration_leaves_nothing_behind(tmp_path):
    mig = tmp_path / "mig"
    mig.mkdir()
    (mig / "001_bad.sql").write_text("CREATE TABLE a (x INT); CREATE TABLE a (x INT);", encoding="utf-8")
    path = tmp_path / "b.db"
    try:
        db.migrate(path, mig)
    except sqlite3.Error:
        pass
    conn = sqlite3.connect(path)
    names = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert "a" not in names
