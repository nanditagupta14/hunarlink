import sys
import os
from pathlib import Path

# Add hunarsathi-chatbot to sys.path
chatbot_dir = Path(__file__).resolve().parent.parent.parent / "hunarsathi-chatbot"
sys.path.insert(0, str(chatbot_dir))

import pytest
from fastapi.testclient import TestClient

try:
    from server import app as chatbot_app
    chatbot_client = TestClient(chatbot_app)
    CHATBOT_AVAILABLE = True
except Exception as e:
    CHATBOT_AVAILABLE = False
    chatbot_err = str(e)

@pytest.mark.skipif(not CHATBOT_AVAILABLE, reason="Chatbot dependencies not loaded")
def test_chatbot_health_and_warmup():
    res = chatbot_client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "HunarSathi" in data["bot"]

    res_w = chatbot_client.get("/api/warmup")
    assert res_w.status_code == 200
    assert res_w.json()["status"] == "warm"

@pytest.mark.skipif(not CHATBOT_AVAILABLE, reason="Chatbot dependencies not loaded")
def test_chatbot_reset():
    res = chatbot_client.post("/api/reset", json={"session_id": "buyer-default"})
    assert res.status_code == 200
    assert res.json()["status"] == "reset"

@pytest.mark.skipif(not CHATBOT_AVAILABLE, reason="Chatbot dependencies not loaded")
def test_chatbot_chat_and_stream():
    # Test standard JSON chat endpoint
    res_chat = chatbot_client.post("/api/chat", json={"message": "What is Pashmina?", "session_id": "test-buyer"})
    assert res_chat.status_code == 200
    data = res_chat.json()
    assert "reply" in data
    assert len(data["reply"]) > 0

    # Test SSE stream endpoint
    res_stream = chatbot_client.post("/api/chat/stream", json={"message": "Tell me about walnut wood", "session_id": "test-buyer"})
    assert res_stream.status_code == 200
    assert "text/event-stream" in res_stream.headers.get("content-type", "")
