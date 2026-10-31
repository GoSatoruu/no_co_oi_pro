import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import load_settings  # noqa: E402
from app.main import create_app  # noqa: E402


@pytest.fixture
def make_client(tmp_path):
    def _make(**overrides):
        settings = load_settings(
            db_path=tmp_path / "test.db", validate_content=False, **overrides
        )
        return TestClient(create_app(settings))

    return _make


@pytest.fixture
def client(make_client):
    return make_client()
