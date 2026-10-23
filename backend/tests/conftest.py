import pytest
from fastapi.testclient import TestClient

from app.buddy import RateLimiter
from app.content import load_content
from app.main import create_app


class FakeChat:
    def __init__(self):
        self.calls = []

    async def complete(self, system, messages):
        self.calls.append((system, messages))
        return "fake reply"


@pytest.fixture(scope="session")
def content():
    return load_content()


@pytest.fixture
def chat():
    return FakeChat()


@pytest.fixture
def client(chat):
    return TestClient(create_app(chat=chat, limiter=RateLimiter(limit=3), dist=None))


@pytest.fixture
def client_no_ai(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)  # isolate from the developer's environment
    return TestClient(create_app(chat=None, dist=None))


def all_correct(content):
    return {q["id"]: {"right": 1, "wrong": 0, "last": True} for q in content.questions}
